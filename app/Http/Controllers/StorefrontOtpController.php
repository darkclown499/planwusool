<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\StorefrontPhoneOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Storefront phone OTP verification (HotSMS / Twilio SMS gateway).
 *
 * The storefront "express checkout" flow verifies the shopper's phone before
 * submitting an order. Codes are stored hashed in `storefront_phone_otps`,
 * explicitly scoped to the store resolved server-side (never a client-supplied
 * store_id / type string), one-time, expiring, attempt-limited and
 * resend-limited. Delivery is truthful: a confirmed SMS provider failure
 * invalidates the generated OTP and returns a generic customer-safe failure —
 * it never reports success for a message that was not sent.
 *
 * The platform/merchant email OTP flows (OtpService + VerificationCode via
 * auth.php) are untouched.
 */
class StorefrontOtpController extends Controller
{
    public function __construct(private StorefrontPhoneOtpService $otpService)
    {
    }

    /**
     * Resolve the store owning the current storefront request
     * (server-side authority, via DomainResolver or the subdomain slug).
     */
    protected function getStore(Request $request): ?Store
    {
        if ($request->attributes->has('resolved_store')) {
            return $request->attributes->get('resolved_store');
        }

        $slug = $request->route('storeSlug');
        if ($slug) {
            return Store::where('slug', $slug)->first();
        }

        return null;
    }

    /**
     * POST /otp/send  { phone, store_id? }  — store_id is intentionally ignored.
     */
    public function send(Request $request): JsonResponse
    {
        $phone = $this->validatePhone($request->input('phone'));
        if ($phone === null) {
            return response()->json(['success' => false, 'message' => 'رقم الهاتف غير صحيح.'], 422);
        }

        $store = $this->getStore($request);
        if (!$store) {
            return response()->json(['success' => false, 'message' => 'المتجر غير موجود.'], 404);
        }

        // Rate limit: max 5 OTP requests per phone per store per minute
        // (route throttle: 6/min on top). Counts requests regardless of outcome.
        $key = 'storefront_otp_' . $store->id . '_' . $phone;
        $attempts = (int) cache()->get($key, 0);
        if ($attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'تم إرسال رموز التحقق كثيراً. يرجى المحاولة لاحقاً.',
            ], 429);
        }
        cache()->put($key, $attempts + 1, now()->addMinute());

        try {
            $this->otpService->generate($store, $phone);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (str_starts_with($msg, 'rate_limited_cooldown')) {
                return response()->json(['success' => false, 'message' => 'يرجى الانتظار قبل إعادة الإرسال.'], 429);
            }
            if ($msg === 'rate_limited_hour') {
                return response()->json(['success' => false, 'message' => 'تم تجاوز الحد المسموح لإرسال الرموز.'], 429);
            }
            if ($msg === 'sms_failed') {
                return response()->json(['success' => false, 'message' => 'تعذر إرسال رمز التحقق. حاول مرة أخرى.'], 422);
            }
            return response()->json(['success' => false, 'message' => 'تعذر إرسال رمز التحقق. حاول مرة أخرى.'], 422);
        }

        return response()->json(['success' => true, 'message' => 'تم إرسال رمز التحقق برسالة نصية']);
    }

    /**
     * POST /otp/verify  { phone, code, store_id? }  — store_id is intentionally ignored.
     */
    public function verify(Request $request): JsonResponse
    {
        $phone = $this->validatePhone($request->input('phone'));
        $code = (string) $request->input('code');

        if ($phone === null || !preg_match('/^\d{6}$/', $code)) {
            return response()->json(['verified' => false, 'message' => 'بيانات التحقق غير صحيحة.'], 422);
        }

        $store = $this->getStore($request);
        if (!$store) {
            return response()->json(['verified' => false, 'message' => 'المتجر غير موجود.'], 404);
        }

        $result = $this->otpService->verify($store, $phone, $code);

        return response()->json([
            'verified' => $result['ok'],
            'message' => $result['ok'] ? 'تم التحقق من رقمك بنجاح' : 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
        ], $result['ok'] ? 200 : 422);
    }

    /**
     * POST /otp/resend  { phone, store_id? }
     */
    public function resend(Request $request): JsonResponse
    {
        return $this->send($request);
    }

    /**
     * Validate, then return the canonical digit-only phone form (or null).
     */
    protected function validatePhone(mixed $value): ?string
    {
        $phone = preg_replace('/[^0-9+]/', '', (string) $value);
        if (!is_string($phone) || !preg_match('/^\+?[0-9]{7,15}$/', $phone)) {
            return null;
        }
        try {
            return StorefrontPhoneOtpService::normalize($phone);
        } catch (\InvalidArgumentException) {
            return null;
        }
    }
}
