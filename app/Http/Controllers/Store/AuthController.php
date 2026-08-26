<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request, $storeSlug = null)
    {
        $store = $this->getStore($request, $storeSlug);
        if (!$store) {
            abort(404, 'المتجر غير موجود');
        }
        if (!$this->customerAccountsEnabled($store)) {
            abort(403, 'حسابات العملاء غير مفعلة في هذا المتجر.');
        }
        if (!$this->behavior($store)['enable_customer_login']) {
            abort(403, 'تسجيل الدخول غير متاح في هذا المتجر.');
        }
        
        if ($request->isMethod('post')) {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $customer = Customer::where('store_id', $store->id)
                ->where('email', $request->email)
                ->where('is_active', true)
                ->first();

            if ($customer && Hash::check($request->password, $customer->password)) {
                // Backward-compatible: legacy customers (created >1h ago) with null email_verified_at are considered verified
                $enforcedAt = \App\Services\CustomerEmailOtpService::ENFORCED_AT;
                if (is_null($customer->email_verified_at) && $customer->created_at && $customer->created_at->lt(\Carbon\Carbon::parse($enforcedAt))) {
                    $customer->update(['email_verified_at' => $customer->created_at]);
                    $customer->refresh();
                }
                if (is_null($customer->email_verified_at)) {
                    // Only enforce verification when store requires email verification
                    $method = $this->verificationMethod($store);
                    if ($method === 'none') {
                        // Auto-verify legacy unverified when store switched to none
                        $customer->update(['email_verified_at' => now()]);
                        $customer->refresh();
                    } else {
                        // Unverified — do not login, prompt verification
                        if ($request->expectsJson() || $request->header('X-Inertia')) {
                            return response()->json([
                                'success' => false,
                                'requires_verification' => true,
                                'email_verification_required' => true,
                                'email' => $customer->email,
                                'message' => 'يجب تأكيد بريدك الإلكتروني قبل تسجيل الدخول.',
                            ], 401);
                        }
                        throw ValidationException::withMessages([
                            'email' => ['يجب تأكيد بريدك الإلكتروني قبل تسجيل الدخول.'],
                        ]);
                    }
                }

                Auth::guard('customer')->login($customer, $request->boolean('remember'));
                $request->session()->regenerate();
                if ($store->isCurrentDomain()) {
                    $request->session()->forget('url.intended');
                }
                if ($request->expectsJson() || $request->wantsJson()) {
                    return response()->json(['success'=>true,'message'=>'تم تسجيل الدخول']);
                }
                return redirect()->to($this->getStoreHomeUrl($store));
            }

            throw ValidationException::withMessages([
                'email' => ['البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
            ]);
        }

        // // Get dynamic content from database
        // $storeContent = \App\Models\StoreSetting::getSettings($store->id, $store->theme ?? 'default');

        // // Use theme-specific login page
        // $loginPage = 'store/auth/login'; // default
        // if ($store->theme === 'fashion') $loginPage = 'store/fashion/FashionLogin';
        // if ($store->theme === 'electronics') $loginPage = 'store/electronics/ElectronicsLogin';
        // if ($store->theme === 'beauty-cosmetics') $loginPage = 'store/beauty-cosmetics/BeautyLogin';
        // if ($store->theme === 'jewelry') $loginPage = 'store/jewelry/JewelryLogin';
        // if ($store->theme === 'watches') $loginPage = 'store/watches/WatchesLogin';
        // if ($store->theme === 'cars-automotive') $loginPage = 'store/cars-automotive/CarsLogin';
        
        // return inertia($loginPage, [
        //     'store' => [
        //         'id' => $store->id,
        //         'name' => $store->name,
        //         'logo' => $store->logo,
        //         'theme' => $store->theme ?? 'default',
        //         'slug' => $store->slug
        //     ],
        //     'theme' => $store->theme ?? 'default',
        //     'storeContent' => $storeContent,
        //     'debug_theme' => $store->theme, // Add debug
        //     'customPages' => \App\Models\CustomPage::where('store_id', $store->id)
        //         ->where('status', 'published')
        //         ->where('show_in_navigation', true)
        //         ->orderBy('order')
        //         ->get()->map(function($page) use ($storeSlug) {
        //             return [
        //                 'id' => $page->id,
        //                 'name' => $page->title,
        //                 'href' => route('store.page', ['storeSlug' => $storeSlug, 'slug' => $page->slug])
        //             ];
        //         }),
        // ]);
    }

    public function register(Request $request, $storeSlug = null)
    {
        $store = $this->getStore($request, $storeSlug);
        if (!$store) {
            abort(404, 'المتجر غير موجود');
        }
        if (!$this->customerAccountsEnabled($store)) {
            abort(403, 'حسابات العملاء غير مفعلة في هذا المتجر.');
        }
        if (!$this->behavior($store)['customer_registration_enabled']) {
            if ($request->expectsJson() || $request->header('X-Inertia') || $request->wantsJson()) {
                return response()->json(['success'=>false,'registration_disabled'=>true,'message'=>'إنشاء الحسابات غير متاح في هذا المتجر.'], 403);
            }
            abort(403, 'إنشاء الحسابات غير متاح في هذا المتجر.');
        }
        
        if ($request->isMethod('post')) {
            $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255',
                'password' => ['required', 'string', 'confirmed', Rules\Password::defaults()],
                'phone' => 'required|string|max:255',
            ]);

            $existingCustomer = Customer::where('store_id', $store->id)
                ->where('email', $request->email)
                ->first();

            if ($existingCustomer) {
                $methodForExisting = $this->verificationMethod($store);
                // If existing is unverified (recent) and verification is email, allow resend instead of duplicate error
                if ($methodForExisting === 'email' && is_null($existingCustomer->email_verified_at) && $existingCustomer->created_at && $existingCustomer->created_at->gt(now()->subHour())) {
                    // Resend OTP for unverified recent duplicate
                    try {
                        app(\App\Services\CustomerEmailOtpService::class)->generate($existingCustomer, $store);
                    } catch (\Throwable $e) {
                        $msg = str_starts_with($e->getMessage(), 'email_failed') ? 'تعذر إرسال رمز التحقق. حاول مرة أخرى.' : ($e->getMessage() === 'rate_limited_hour' ? 'تم تجاوز الحد المسموح لإرسال الرموز.' : 'يرجى الانتظار قبل إعادة الإرسال.');
                        if ($request->expectsJson() || $request->header('X-Inertia')) {
                            return response()->json(['success'=>false,'message'=>$msg], 429);
                        }
                        throw ValidationException::withMessages(['email'=>[$msg]]);
                    }
                    if ($request->expectsJson() || $request->header('X-Inertia') || $request->wantsJson()) {
                        return response()->json(['success'=>true,'requires_verification'=>true,'email'=>$existingCustomer->email,'message'=>'تم إرسال رمز تحقق جديد.'], 200);
                    }
                    return back()->with(['requires_verification'=>true,'verification_email'=>$existingCustomer->email]);
                }
                throw ValidationException::withMessages([
                    'email' => [__('A customer with this email already exists.')],
                ]);
            }

            $verificationMethod = $this->verificationMethod($store);

            // CASE: verification none → create active customer and authenticate immediately
            if ($verificationMethod === 'none') {
                $customer = Customer::create([
                    'store_id' => $store->id,
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $request->email,
                    'password' => $request->password,
                    'phone' => $request->phone,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);
                Auth::guard('customer')->login($customer);
                $request->session()->regenerate();
                // Loyalty bonus after immediate verification
                try {
                    $existing = \App\Models\LoyaltyTransaction::where('store_id',$store->id)->where('customer_id',$customer->id)->where('type','signup_bonus')->exists();
                    if (!$existing) app(\App\Services\LoyaltyService::class)->awardSignupBonus($customer);
                } catch (\Throwable $e) {}
                // Dispatch welcome email event (idempotent)
                try { event(new \App\Events\CustomerVerified($customer)); } catch (\Throwable $e) {}
                if ($request->expectsJson() || $request->header('X-Inertia') || $request->wantsJson()) {
                    return response()->json(['success'=>true,'requires_verification'=>false,'email'=>$customer->email,'message'=>'تم إنشاء الحساب بنجاح'], 200);
                }
                return back()->with('success','تم إنشاء الحساب بنجاح');
            }

            $customer = Customer::create([
                'store_id' => $store->id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => $request->password,
                'phone' => $request->phone,
                'is_active' => true,
            ]);

            // Generate OTP — do NOT auto-login, require verification
            try {
                app(\App\Services\CustomerEmailOtpService::class)->generate($customer, $store);
            } catch (\Throwable $e) {
                // Email failed — keep customer unverified and inform frontend
                $msg = str_starts_with($e->getMessage(), 'email_failed') ? 'تعذر إرسال رمز التحقق. حاول مرة أخرى.' : ($e->getMessage() === 'rate_limited_hour' ? 'تم تجاوز الحد المسموح.' : 'يرجى الانتظار قبل إعادة الإرسال.');
                if ($request->expectsJson() || $request->header('X-Inertia') || $request->wantsJson()) {
                    return response()->json(['success'=>false,'requires_verification'=>true,'email'=>$customer->email,'message'=>$msg], 200);
                }
                return back()->withErrors(['email'=>[$msg]])->withInput();
            }

            if ($request->expectsJson() || $request->header('X-Inertia') || $request->wantsJson()) {
                return response()->json(['success'=>true,'requires_verification'=>true,'email'=>$customer->email,'message'=>'أرسلنا رمز تحقق إلى بريدك.'], 200);
            }
            return back()->with(['requires_verification'=>true,'verification_email'=>$customer->email]);
        }

        // // Get dynamic content from database
        // $storeContent = \App\Models\StoreSetting::getSettings($store->id, $store->theme ?? 'default');
        
        // // Use theme-specific register page
        // $registerPage = 'store/auth/register'; // default
        // if ($store->theme === 'fashion') $registerPage = 'store/fashion/FashionRegister';
        // if ($store->theme === 'electronics') $registerPage = 'store/electronics/ElectronicsRegister';
        // if ($store->theme === 'beauty-cosmetics') $registerPage = 'store/beauty-cosmetics/BeautyRegister';
        // if ($store->theme === 'jewelry') $registerPage = 'store/jewelry/JewelryRegister';
        // if ($store->theme === 'watches') $registerPage = 'store/watches/WatchesRegister';
        // if ($store->theme === 'cars-automotive') $registerPage = 'store/cars-automotive/CarsRegister';
        
        // return inertia($registerPage, [
        //     'store' => [
        //         'id' => $store->id,
        //         'name' => $store->name,
        //         'logo' => $store->logo,
        //         'theme' => $store->theme ?? 'default',
        //         'slug' => $store->slug
        //     ],
        //     'theme' => $store->theme ?? 'default',
        //     'storeContent' => $storeContent,
        //     'customPages' => \App\Models\CustomPage::where('store_id', $store->id)
        //         ->where('status', 'published')
        //         ->where('show_in_navigation', true)
        //         ->orderBy('order')
        //         ->get()->map(function($page) use ($storeSlug) {
        //             return [
        //                 'id' => $page->id,
        //                 'name' => $page->title,
        //                 'href' => route('store.page', ['storeSlug' => $storeSlug, 'slug' => $page->slug])
        //             ];
        //         }),
        // ]);
    }

    public function verifyEmail(Request $request, $storeSlug = null)
    {
        $store = $this->getStore($request, $storeSlug);
        if (!$store) abort(404, 'Store not found');
        if (!$this->customerAccountsEnabled($store)) abort(403, 'حسابات العملاء غير مفعلة');

        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        $customer = Customer::where('store_id', $store->id)->where('email', $request->email)->first();
        if (!$customer) {
            $msg = 'رمز التحقق غير صحيح';
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success'=>false,'message'=>$msg], 422);
            }
            throw ValidationException::withMessages(['code'=>[$msg]]);
        }

        $result = app(\App\Services\CustomerEmailOtpService::class)->verify($customer, $store, $request->code);
        if (!$result['ok']) {
            $map = [
                'invalid' => 'رمز التحقق غير صحيح',
                'expired' => 'انتهت صلاحية الرمز، اطلب رمزاً جديداً',
                'used' => 'تم استخدام الرمز مسبقاً، اطلب رمزاً جديداً',
                'too_many' => 'عدد المحاولات كثير، اطلب رمزاً جديداً',
                'store_mismatch' => 'رمز التحقق غير صحيح',
            ];
            $msg = $map[$result['error']] ?? 'رمز التحقق غير صحيح';
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success'=>false,'message'=>$msg], 422);
            }
            throw ValidationException::withMessages(['code'=>[$msg]]);
        }

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();
        if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
            return response()->json(['success'=>true,'message'=>'تم تأكيد البريد بنجاح'], 200);
        }
        return redirect()->to($this->getStoreHomeUrl($store))->with('success','تم تأكيد البريد بنجاح');
    }

    public function resendVerification(Request $request, $storeSlug = null)
    {
        $store = $this->getStore($request, $storeSlug);
        if (!$store) abort(404, 'Store not found');
        if (!$this->customerAccountsEnabled($store)) abort(403, 'حسابات العملاء غير مفعلة');

        $request->validate(['email'=>'required|email']);
        $customer = Customer::where('store_id',$store->id)->where('email',$request->email)->first();
        if (!$customer) {
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success'=>false,'message'=>'رمز التحقق غير صحيح'], 422);
            }
            throw ValidationException::withMessages(['email'=>['رمز التحقق غير صحيح']]);
        }
        if (!is_null($customer->email_verified_at)) {
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success'=>false,'message'=>'الحساب مفعل مسبقاً'], 422);
            }
            throw ValidationException::withMessages(['email'=>['الحساب مفعل مسبقاً']]);
        }
        try {
            app(\App\Services\CustomerEmailOtpService::class)->resend($customer, $store);
        } catch (\Throwable $e) {
            $msg = str_starts_with($e->getMessage(),'email_failed') ? 'تعذر إرسال رمز التحقق. حاول مرة أخرى.' : ($e->getMessage()==='rate_limited_hour' ? 'تم تجاوز الحد المسموح لإرسال الرموز.' : 'يرجى الانتظار قبل إعادة الإرسال.');
            $code = str_contains($e->getMessage(),'rate_limited') ? 429 : 422;
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success'=>false,'message'=>$msg], $code);
            }
            throw ValidationException::withMessages(['email'=>[$msg]]);
        }
        if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Inertia')) {
            return response()->json(['success'=>true,'message'=>'تم إرسال رمز جديد'], 200);
        }
        return back()->with('success','تم إرسال رمز جديد');
    }

    public function logout(Request $request, $storeSlug = null)
    {
        // Get store from domain resolution or slug
        $store = $this->getStore($request, $storeSlug);
        
        Auth::guard('customer')->logout();
        
        // Only regenerate token, don't invalidate entire session
        // This prevents affecting backend user authentication
        $request->session()->regenerateToken();

        if ($store) {
            return redirect()->to($this->getStoreHomeUrl($store));
        }
        
        return redirect()->to('/');
    }

    public function forgotPassword(Request $request, $storeSlug)
    {
        $store = Store::where('slug', $storeSlug)->firstOrFail();
        
        $request->validate([
            'email' => 'required|email'
        ]);

        $customer = Customer::where('store_id', $store->id)
            ->where('email', $request->email)
            ->where('is_active', true)
            ->first();

        // Always send the same response whether or not the customer exists,
        // to prevent account enumeration. If no customer was found we simply
        // skip sending a reset email but still report success.
        if (!$customer) {
            return back()->with('success', __('Password reset link sent to your email.'));
        }

        // Generate reset token
        $token = Str::random(60);
        
        // Store token in the store-scoped table (expires after 60 minutes)
        \DB::table('store_password_reset_tokens')->updateOrInsert(
            [
                'email' => $request->email,
                'store_id' => $store->id,
            ],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Configure mail settings
        $mailConfigured = \App\Services\MailConfigService::setStoreMailConfig($store->user_id,$store->id);
        
        if (!$mailConfigured) {
            throw ValidationException::withMessages([
                'email' => [__('Email service not configured. Please contact support.')],
            ]);
        }
        
        try {
            // Send email with reset link
            Mail::to($customer->email)->send(new \App\Mail\CustomerPasswordResetMail($token, $storeSlug));
            
            return back()->with('success', __('Password reset link sent to your email.'));
        } catch (\Exception $e) {
            \Log::error('Store password reset email failed: ' . $e->getMessage());
            throw ValidationException::withMessages([
                'email' => [__('Unable to send password reset email. Please contact support.')],
            ]);
        }
    }

    public function resetPassword(Request $request, $storeSlug)
    {
        $store = Store::where('slug', $storeSlug)->firstOrFail();
        
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Verify token (store-scoped, with a 60-minute expiry)
        $passwordReset = \DB::table('store_password_reset_tokens')
            ->where('email', $request->email)
            ->where('store_id', $store->id)
            ->first();

        $tokenExpired = !$passwordReset
            || !$passwordReset->created_at
            || \Carbon\Carbon::parse($passwordReset->created_at)->lt(now()->subMinutes(60));

        if (!$passwordReset || !Hash::check($request->token, $passwordReset->token) || $tokenExpired) {
            throw ValidationException::withMessages([
                'token' => [__('Invalid or expired reset token.')],
            ]);
        }

        // Update customer password
        $customer = Customer::where('store_id', $store->id)
            ->where('email', $request->email)
            ->firstOrFail();

        $customer->update([
            'password' => Hash::make($request->password)
        ]);

        // Delete the reset token (scoped to store + email)
        \DB::table('store_password_reset_tokens')
            ->where('email', $request->email)
            ->where('store_id', $store->id)
            ->delete();

        return back()->with('success', __('Password has been reset successfully.'));
    }

    public function showResetForm($storeSlug, $token)
    {
        $store = Store::where('slug', $storeSlug)->firstOrFail();
        
        $request = request();
        $request->merge([
            'showResetModal' => true,
            'resetToken' => $token
        ]);
        
        return app(\App\Http\Controllers\ThemeController::class)->home($storeSlug, $request);
    }
    
    /**
     * Get store from domain resolution or slug
     */
    private function getStore(Request $request, $storeSlug = null)
    {
        // Priority 1: Check if store was resolved by domain middleware
        if ($request->attributes->has('resolved_store')) {
            return $request->attributes->get('resolved_store');
        }
        
        // Priority 2: Find by slug if provided
        if ($storeSlug) {
            return Store::where('slug', $storeSlug)->first();
        }
        
        return null;
    }
    
    /**
     * Get proper store home URL (custom domain or default)
     */
    private function getStoreHomeUrl(Store $store)
    {
        // If on custom domain, return root URL
        if ($store->isCurrentDomain()) {
            return $store->getStoreUrl();
        }
        
        // Otherwise use default route
        return route('store.home', $store->slug);
    }

    /**
     * Read storefront behavior toggles for this store — single source of truth.
     */
    private function behavior(Store $store): array
    {
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $toBool = [\App\Models\StoreConfiguration::class, 'toBool'];
        $master = $toBool($config['customer_accounts_enabled'] ?? null, true);
        $loginRaw = $toBool($config['enable_customer_login'] ?? null, true);
        $showAuthRaw = $toBool($config['show_auth_button'] ?? null, true);
        $effectiveLogin = $master && $loginRaw && $showAuthRaw;
        $effectiveRegistration = $master && $toBool($config['customer_registration_enabled'] ?? $config['enable_customer_registration'] ?? null, true);
        $verificationMethod = strtolower(trim((string)($config['customer_verification_method'] ?? 'email')));
        $verificationMethod = in_array($verificationMethod, ['none','email'], true) ? $verificationMethod : 'email';

        return [
            'enable_customer_login' => $effectiveLogin,
            'enable_customer_registration' => $effectiveRegistration,
            'customer_registration_enabled' => $effectiveRegistration,
            'require_login_checkout' => $master && $toBool($config['require_login_checkout'] ?? null, false),
            'customer_accounts_enabled' => $master,
            'guest_checkout' => $master ? $toBool($config['guest_checkout'] ?? null, true) : true,
            'show_auth_button' => $effectiveLogin,
            'customer_verification_method' => $verificationMethod,
        ];
    }

    private function verificationMethod(Store $store): string
    {
        return $this->behavior($store)['customer_verification_method'];
    }

    private function customerAccountsEnabled(Store $store): bool
    {
        return $this->behavior($store)['customer_accounts_enabled'];
    }
}