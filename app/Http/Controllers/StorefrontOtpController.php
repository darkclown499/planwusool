<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Storefront phone OTP verification (HotSMS / Twilio SMS gateway).
 *
 * The storefront "express checkout" flow verifies the shopper's phone before
 * submitting an order (or before handing the order to WhatsApp). Codes are
 * generated/stored through the same OtpService used by the platform auth flow,
 * but sent as an SMS through the store's configured gateway (HotSMS by default
 * on wusool.ps, with automatic Twilio fallback) - never an email.
 */
class StorefrontOtpController extends Controller
{
    public function __construct(private OtpService $otpService)
    {
    }

    /**
     * Resolve the store owning the current storefront request.
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

    protected function otpType(Store $store): string
    {
        return 'storefront_' . $store->id;
    }

    /**
     * POST /otp/send  { phone, store_id? }
     */
    public function send(Request $request): JsonResponse
    {
        $phone = $request->input('phone');
        $phone = preg_replace('/[^0-9+]/', '', (string) $phone);

        if (!preg_match('/^\+?[0-9]{7,15}$/', $phone)) {
            return response()->json(['success' => false, 'message' => 'رقم الهاتف غير صحيح.'], 422);
        }

        $store = $this->getStore($request);
        if (!$store) {
            return response()->json(['success' => false, 'message' => 'المتجر غير موجود.'], 404);
        }

        // Rate limit: max 6 OTP requests per phone per store per minute
        $key = 'storefront_otp_' . $store->id . '_' . $phone;
        $attempts = (int) cache()->get($key, 0);
        if ($attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'تم إرسال رموز التحقق كثيراً. يرجى المحاولة لاحقاً.',
            ], 429);
        }
        cache()->put($key, $attempts + 1, now()->addMinute());

        $code = $this->otpService->generate($phone, $this->otpType($store));

        $message = "رمز التحقق الخاص بك في {$store->name} هو: {$code}. صالح لمدة 10 دقائق.";

        // Send through the store's SMS gateway (HotSMS by default on wusool.ps,
        // Twilio fallback). $store->user_id resolves the owner settings.
        try {
            SmsService::sendRawSMS($store->user_id, $store->id, $phone, $message);
        } catch (\Throwable $e) {
            logger()->error('Storefront OTP SMS error', ['store' => $store->id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => true,
                'message' => 'تم إرسال رمز التحقق. (تنبيه: فشل إرسال الرسالة النصية)',
            ]);
        }

        return response()->json(['success' => true, 'message' => 'تم إرسال رمز التحقق برسالة نصية']);
    }

    /**
     * POST /otp/verify  { phone, code, store_id? }
     */
    public function verify(Request $request): JsonResponse
    {
        $phone = preg_replace('/[^0-9+]/', '', (string) $request->input('phone'));
        $code = (string) $request->input('code');

        if (!preg_match('/^\+?[0-9]{7,15}$/', $phone) || !preg_match('/^\d{6}$/', $code)) {
            return response()->json(['verified' => false, 'message' => 'بيانات التحقق غير صحيحة.'], 422);
        }

        $store = $this->getStore($request);
        if (!$store) {
            return response()->json(['verified' => false, 'message' => 'المتجر غير موجود.'], 404);
        }

        $ok = $this->otpService->verify($phone, $code, $this->otpType($store));

        return response()->json([
            'verified' => $ok,
            'message' => $ok ? 'تم التحقق من رقمك بنجاح' : 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
        ], $ok ? 200 : 422);
    }

    /**
     * POST /otp/resend  { phone, store_id? }
     */
    public function resend(Request $request): JsonResponse
    {
        return $this->send($request);
    }
}