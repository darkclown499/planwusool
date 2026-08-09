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
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'terms' => 'accepted',
        ];
        
        $recaptchaEnabled = Setting::where('key', 'recaptchaEnabled')->value('value');
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $rules['recaptcha_token'] = 'required|string';
        }
        
        $validated = $request->validate($rules);
        
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
            'is_active' => 1,
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
        }
        
        $user = User::create($userData);

        // Assign role and settings to the user
        defaultRoleAndSetting($user);
        
        Auth::login($user);
        
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
