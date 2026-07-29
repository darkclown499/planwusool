<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Plan;
use App\Models\Referral;
use App\Models\ReferralSetting;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class OtpController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    /**
     * Step 1: Validate form data, save to session, send OTP email, return success.
     */
    public function send(Request $request): JsonResponse
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'terms' => 'accepted',
        ];

        $recaptchaEnabled = \App\Models\Setting::where('key', 'recaptchaEnabled')->value('value');
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $rules['recaptcha_token'] = 'required|string';
        }

        $validated = $request->validate($rules);

        // Verify reCAPTCHA if enabled
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $token = $request->input('recaptcha_token');
            $secretKey = \App\Models\Setting::where('key', 'recaptchaSecretKey')->value('value');

            if (!empty($token) && !empty($secretKey)) {
                $response = \Illuminate\Support\Facades\Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);
                $result = $response->json();
                if (!$result['success']) {
                    return response()->json(['errors' => ['recaptcha_token' => ['reCAPTCHA verification failed.']]], 422);
                }
            }
        }

        // Store registration data in session for step 2
        $request->session()->put('pending_registration', [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'plan_id' => $request->input('plan_id'),
            'referral_code' => $request->input('referral_code'),
        ]);

        // Generate and send OTP
        $code = $this->otpService->generate($validated['email'], 'register');
        $this->otpService->send($validated['email'], $code, 'register');

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
            'email' => $validated['email'],
        ]);
    }

    /**
     * Step 2: Verify OTP code, complete registration, login user.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        $success = $this->otpService->verify($validated['email'], $validated['code'], 'register');

        if (!$success) {
            return response()->json([
                'message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
            ], 422);
        }

        // Retrieve pending registration from session
        $pending = $request->session()->get('pending_registration');

        if (!$pending || $pending['email'] !== $validated['email']) {
            return response()->json([
                'message' => 'انتهت صلاحية بيانات التسجيل. يُرجى إعادة التسجيل.',
            ], 422);
        }

        // Create user
        $userData = [
            'name' => $pending['name'],
            'email' => $pending['email'],
            'password' => $pending['password'],
            'type' => 'company',
            'is_active' => 1,
            'is_enable_login' => 1,
            'created_by' => 0,
            'plan_is_active' => 0,
            'terms_accepted_at' => now(),
            'email_verified_at' => now(),
        ];

        if (!empty($pending['referral_code'])) {
            $referrer = \App\Models\User::where('referral_code', $pending['referral_code'])
                ->where('type', 'company')
                ->first();
            if ($referrer) {
                $userData['used_referral_code'] = $pending['referral_code'];
            }
        }

        $user = \App\Models\User::create($userData);
        defaultRoleAndSetting($user);

        // Create referral record
        if ($user->used_referral_code && $user->plan_id) {
            $settings = ReferralSetting::current();
            if ($settings->is_enabled) {
                $referrer = \App\Models\User::where('referral_code', $user->used_referral_code)->first();
                if ($referrer && $user->plan) {
                    $planPrice = $user->plan->price ?? 0;
                    $commissionAmount = ($planPrice * $settings->commission_percentage) / 100;
                    if ($commissionAmount > 0) {
                        Referral::create([
                            'user_id' => $user->id,
                            'company_id' => $referrer->id,
                            'commission_percentage' => $settings->commission_percentage,
                            'amount' => $commissionAmount,
                            'plan_id' => $user->plan_id,
                        ]);
                    }
                }
            }
        }

        // Login
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->forget('pending_registration');

        $redirectUrl = $pending['plan_id']
            ? route('plans.index', ['selected' => $pending['plan_id']])
            : route('dashboard');

        return response()->json([
            'success' => true,
            'redirect' => $redirectUrl,
        ]);
    }

    /**
     * Resend OTP code.
     */
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $pending = $request->session()->get('pending_registration');
        if (!$pending || $pending['email'] !== $validated['email']) {
            return response()->json([
                'message' => 'انتهت صلاحية بيانات التسجيل. يُرجى إعادة التسجيل.',
            ], 422);
        }

        // Mark old codes as used
        \App\Models\VerificationCode::where('email', $validated['email'])
            ->where('type', 'register')
            ->where('used', false)
            ->update(['used' => true]);

        $code = $this->otpService->generate($validated['email'], 'register');
        $this->otpService->send($validated['email'], $code, 'register');

        return response()->json([
            'success' => true,
            'message' => 'تم إعادة إرسال رمز التحقق.',
        ]);
    }
}
