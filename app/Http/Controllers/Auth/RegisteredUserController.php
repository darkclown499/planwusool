<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Plan;
use App\Services\UserService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Setting;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request): Response
    {
        $referralCode = $request->get('ref');
        $encryptedPlanId = $request->get('plan');
        $planId = null;
        $referrer = null;
        
        // Decrypt and validate plan ID
        if ($encryptedPlanId) {
            $planId = $this->decryptPlanId($encryptedPlanId);
            if ($planId && !Plan::find($planId)) {
                $planId = null; // Invalid plan ID
            }
        }
        
        if ($referralCode) {
            $referrer = User::where('referral_code', $referralCode)
                ->where('type', 'company')
                ->first();
        }
        
        return Inertia::render('auth/register', [
            'title' => __('Create your account'),
            'referralCode' => $referralCode,
            'planId' => $planId,
            'referrer' => $referrer ? $referrer->name : null,
            'settings' => settings(),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            // Enforced server-side to match the password strength meter shown in
            // the registration form (8+ chars, mixed case, at least one number).
            'password' => ['required', 'confirmed', (new Rules\Password(8))->letters()->mixedCase()->numbers()],
            'terms' => 'accepted',
        ];
        
        $recaptchaEnabled = Setting::where('key', 'recaptchaEnabled')->value('value');
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $rules['recaptcha_token'] = 'required|string';
        }
        
        $validated = $request->validate($rules);

        // SECURITY: backend OTP enforcement. The session marker is only set by
        // OtpController::verify after a successful email OTP verification, so
        // this route cannot be used to register without proving the email.
        if ($request->session()->get('otp_verified_' . strtolower($validated['email'])) !== true) {
            return back()
                ->withErrors(['email' => __('Email OTP verification is required before registration.')])
                ->withInput();
        }
        
        // Validate reCAPTCHA if enabled
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $token = $request->input('recaptcha_token');
            $secretKey = Setting::where('key', 'recaptchaSecretKey')->value('value');
            
            if (!empty($token) && !empty($secretKey)) {
                $response = \Illuminate\Support\Facades\Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);
                
                $result = $response->json();
                if (!$result['success']) {
                    return back()->withErrors(['recaptcha_token' => 'reCAPTCHA verification failed. Please try again.'])->withInput();
                }
            }
        }

        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'type' => 'company',
            'is_enable_login' => 1,
            'created_by' => 0,
            'plan_is_active' => 0,
            'terms_accepted_at' => now(),
        ];
        
        // Handle referral code
        if ($request->referral_code) {
            $referrer = User::where('referral_code', $request->referral_code)
                ->where('type', 'company')
                ->first();
            
            if ($referrer) {
                $userData['used_referral_code'] = $request->referral_code;
            }

            // Partner / agency attribution: only an APPROVED partner's public
            // code may attribute a new merchant. Any other value is ignored
            // safely and never persisted (no tampering possible from the client).
            $partner = \App\Models\Partner::where('referral_code', $request->referral_code)
                ->where('status', \App\Models\Partner::STATUS_APPROVED)
                ->first();

            if ($partner) {
                $userData['partner_id'] = $partner->id;
            }
        }
        
        $user = User::forceCreate($userData);

        // Assign role and settings to the user
        defaultRoleAndSetting($user);
        
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->forget('otp_verified_' . strtolower($validated['email']));
        
        // Check if email verification is enabled
        $emailVerificationEnabled = getSetting('emailVerification', false);
        if ($emailVerificationEnabled) {
            try {
                // Send verification email
                $user->sendEmailVerificationNotification();
                return redirect()->route('verification.notice');
            } catch (\Exception $e) {
                \Log::error('Email verification failed during registration: ' . $e->getMessage());

                // User is created & logged in — just skip the email requirement
                // and show a friendly admin-facing error
                return to_route('onboarding')
                    ->with('error', __('Your account was created, but the verification email could not be sent. Please contact the administrator to configure SMTP email settings.'));
            }
        }

        // New company users must complete the onboarding wizard first.
        return to_route('onboarding');
    }
    
    /**
     * Decrypt plan ID from encrypted string using Laravel's encryption
     */
    private function decryptPlanId($encryptedPlanId)
    {
        try {
            return (int) \Illuminate\Support\Facades\Crypt::decryptString($encryptedPlanId);
        } catch (\Exception $e) {
            return null;
        }
    }
    
    /**
     * Encrypt plan ID using Laravel's encryption
     */
    private function encryptPlanId($planId)
    {
        try {
            return \Illuminate\Support\Facades\Crypt::encryptString((string)$planId);
        } catch (\Exception $e) {
            return null;
        }
    }
    
}
