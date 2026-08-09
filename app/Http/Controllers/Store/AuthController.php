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
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request, $storeSlug = null)
    {
        // Get store from domain resolution or slug
        $store = $this->getStore($request, $storeSlug);
        
        // If store not found, return 404
        if (!$store) {
            abort(404, 'Store not found');
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
                Auth::guard('customer')->login($customer, $request->boolean('remember'));
                
                // Clear any intended URL that might contain /store/{slug} for custom domains
                if ($store->isCurrentDomain()) {
                    $request->session()->forget('url.intended');
                }
                
                return redirect()->to($this->getStoreHomeUrl($store));
            }

            throw ValidationException::withMessages([
                'email' => [__('The provided credentials are incorrect.')],
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
        // Get store from domain resolution or slug
        $store = $this->getStore($request, $storeSlug);
        
        if (!$store) {
            abort(404, 'Store not found');
        }
        
        if ($request->isMethod('post')) {
            $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255',
                'password' => 'required|string|min:8|confirmed',
                'phone' => 'required|string|max:255',
            ]);

            $existingCustomer = Customer::where('store_id', $store->id)
                ->where('email', $request->email)
                ->first();

            if ($existingCustomer) {
                throw ValidationException::withMessages([
                    'email' => [__('A customer with this email already exists.')],
                ]);
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

            Auth::guard('customer')->login($customer);

            // Clear any intended URL that might contain /store/{slug} for custom domains
            if ($store->isCurrentDomain()) {
                $request->session()->forget('url.intended');
            }

            return redirect()->to($this->getStoreHomeUrl($store));
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
            'password' => 'required|min:8|confirmed',
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
}