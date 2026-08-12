<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginAlertService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PasswordlessLoginController extends Controller
{
    /**
     * Maximum failed verification attempts per email/IP before a lockout.
     * Kept below the shared 5/min route throttle so the lockout triggers
     * through the real flow before the throttler does.
     */
    private const MAX_VERIFY_ATTEMPTS = 3;

    public function __construct(
        private OtpService $otpService
    ) {}

    /**
     * Send a one-time login code to the email address. The response is the
     * same whether or not the account exists so email addresses cannot be
     * enumerated through this endpoint.
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = strtolower(trim($request->input('email')));

        // Hard per-email cap on top of the route throttle.
        $key = 'login_otp_send_' . $email . '|' . $request->ip();
        $attempts = (int) Cache::get($key, 0);
        if ($attempts >= 3) {
            return response()->json([
                'message' => __('Too many requests. Please try again later.'),
            ], 429);
        }
        Cache::put($key, $attempts + 1, now()->addMinutes(10));

        $user = User::where('email', $email)
            ->where('status', 'active')
            ->where('is_enable_login', 1)
            ->first();

        if ($user) {
            $request->session()->put('login_otp_pending', [
                'email' => $email,
                'created_at' => now()->toDateTimeString(),
            ]);

            try {
                $code = $this->otpService->generate($email, 'login');
                $this->otpService->send($email, $code, 'login');
            } catch (\Throwable $e) {
                // A delivery failure must never produce a 500 for the caller,
                // and it must not leak whether an account exists.
                Log::warning('Failed to send passwordless login code: ' . $e->getMessage());
            }
        }

        // Always report success to avoid account enumeration.
        return response()->json([
            'success' => true,
            'message' => __('If an account exists for this email, a login code has been sent.'),
        ]);
    }

    /**
     * Verify the login code and authenticate the user.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'code'  => 'required|string|size:6',
        ]);

        $email = strtolower(trim($request->input('email')));
        $code = $request->input('code');

        $pending = $request->session()->get('login_otp_pending');
        if (! $pending || $pending['email'] !== $email) {
            throw ValidationException::withMessages([
                'code' => [__('Please request a login code first.')],
            ]);
        }

        $createdAt = $pending['created_at'] ?? null;
        if ($createdAt && now()->diffInMinutes($createdAt) > 10) {
            $request->session()->forget('login_otp_pending');
            throw ValidationException::withMessages([
                'code' => [__('This login code has expired. Please request a new one.')],
            ]);
        }

        // Per-email brute-force guard on top of the route throttle. Failed
        // attempts are capped so a 6-digit code cannot be guessed in bulk.
        $attemptKey = 'login_otp_verify_' . $email . '|' . $request->ip();
        $failedAttempts = (int) Cache::get($attemptKey, 0);
        if ($failedAttempts >= self::MAX_VERIFY_ATTEMPTS) {
            return response()->json([
                'message' => __('Too many attempts. Please try again later.'),
            ], 429);
        }

        $user = User::where('email', $email)
            ->where('status', 'active')
            ->where('is_enable_login', 1)
            ->first();

        if (! $user || ! $this->otpService->verify($email, $code, 'login')) {
            Cache::put($attemptKey, $failedAttempts + 1, now()->addMinutes(10));
            throw ValidationException::withMessages([
                'code' => [__('Invalid login code. Please try again.')],
            ]);
        }

        Cache::forget($attemptKey);
        $request->session()->forget('login_otp_pending');

        // Delivering a code to this address proves ownership, so the email can
        // be treated as verified without a separate verification-email loop.
        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        Auth::login($user);
        $request->session()->regenerate();

        LoginAlertService::checkAndAlert($user, $request);

        if ($user->type === 'company' && $user->onboarded_at === null) {
            return response()->json([
                'success' => true,
                'redirect' => route('onboarding'),
            ]);
        }

        return response()->json([
            'success' => true,
            'redirect' => route('dashboard'),
        ]);
    }
}