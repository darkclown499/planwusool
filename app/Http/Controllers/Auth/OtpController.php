<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Models\User;
use App\Models\Referral;
use App\Models\ReferralSetting;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;

class OtpController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    /**
     * Step 1: Validate form data, save to session, send OTP email, return success.
     */
    public function send(SendOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = $validated['email'];

        $recaptchaEnabled = \App\Models\Setting::where('key', 'recaptchaEnabled')->value('value');
        $recaptchaEnabled = $recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1';

        if ($recaptchaEnabled && empty($validated['recaptcha_token'])) {
            return response()->json(['errors' => ['recaptcha_token' => ['reCAPTCHA token is required.']]], 422);
        }

        // Rate limit: max 5 OTP requests per email per minute (checked AFTER validation)
        $key = 'otp_send_' . $email;
        $attempts = cache()->get($key, 0);
        if ($attempts >= 5) {
            return response()->json([
                'message' => 'تم إرسال رموز التحقق كثيراً. يرجى المحاولة لاحقاً.',
            ], 429);
        }
        cache()->put($key, $attempts + 1, now()->addMinute());

        // Verify reCAPTCHA if enabled
        if ($recaptchaEnabled) {
            $token = $validated['recaptcha_token'];
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

        // Store registration data in session for step 2.
        // IMPORTANT: The password is encrypted before being stored in the session
        // to prevent it from being exposed as plaintext in session storage files.
        $request->session()->put('pending_registration', [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Crypt::encryptString($validated['password']),
            'plan_id' => $request->input('plan_id'),
            'referral_code' => $request->input('referral_code'),
            'created_at' => now()->toDateTimeString(),
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
    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Rate limit: max 5 verification attempts per email per minute
        $key = 'otp_verify_' . $validated['email'];
        $attempts = cache()->get($key, 0);
        if ($attempts >= 5) {
            return response()->json([
                'message' => 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى المحاولة لاحقاً.',
            ], 429);
        }
        cache()->put($key, $attempts + 1, now()->addMinute());

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

        // Prove to the backend that this email passed OTP verification so the
        // fallback registration route (RegisteredUserController::store) cannot
        // create accounts without an OTP.
        $request->session()->put('otp_verified_' . strtolower($validated['email']), true);

        // Expire the OTP verification rate limiter on success
        cache()->forget($key);

        // Decrypt the password that was encrypted before session storage
        $decryptedPassword = $pending['password']
            ? Crypt::decryptString($pending['password']) : null;

        if (!$decryptedPassword) {
            return response()->json([
                'message' => 'حدث خطأ في البيانات. يُرجى إعادة التسجيل.',
            ], 422);
        }

        // Check that the pending registration hasn't expired (5 minute TTL)
        $createdAt = $pending['created_at'] ?? null;
        if ($createdAt && now()->diffInMinutes($createdAt) > 5) {
            $request->session()->forget('pending_registration');
            return response()->json([
                'message' => 'انتهت صلاحية بيانات التسجيل. يُرجى إعادة التسجيل.',
            ], 422);
        }
        unset($createdAt);

        // If this email is already registered, tell the user instead of
        // crashing with a duplicate-key error. The OTP already proved that
        // the person completing the form owns this email address.
        if (\App\Models\User::where('email', $pending['email'])->exists()) {
            $request->session()->forget('pending_registration');
            return response()->json([
                'errors' => [
                    'email' => ['هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة.'],
                ],
            ], 422);
        }

        // Create user
        $userData = [
            'name' => $pending['name'],
            'email' => $pending['email'],
            'password' => $decryptedPassword,
            'type' => 'company',
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
        $request->session()->forget('otp_verified_' . strtolower($validated['email']));

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
    public function resend(ResendOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Rate limit: max 5 resend requests per minute per email+IP.
        // The counter is NOT cleared on success, so the limit always applies.
        $key = 'otp_resend_' . strtolower($validated['email']) . '|' . $request->ip();
        $attempts = cache()->get($key, 0);
        if ($attempts >= 5) {
            return response()->json([
                'message' => 'تم تجاوز الحد الأقصى لعدد مرات إعادة الإرسال. يرجى المحاولة لاحقاً.',
            ], 429);
        }
        cache()->put($key, $attempts + 1, now()->addMinute());

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
