<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    /**
     * API: تسجيل اشتراك Web Push جديد.
     *
     * يُستدعى من متصفح العميل بعد موافقته على استقبال الإشعارات.
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'endpoint' => 'required|string',
            'public_key' => 'nullable|string',
            'auth_token' => 'nullable|string',
            'content_encoding' => 'nullable|string',
            'device_name' => 'nullable|string|max:255',
        ]);

        $storeId = $request->store_id;
        $customerId = Auth::guard('customer')->id();
        $sessionId = session()->getId();

        // التحقق من وجود الاشتراك مسبقاً
        $existing = PushSubscription::where('endpoint', $request->endpoint)->first();
        if ($existing) {
            // إعادة تفعيله إذا كان معطلاً، وتحديث بياناته
            $existing->update([
                'store_id' => $storeId,
                'customer_id' => $customerId ?? $existing->customer_id,
                'session_id' => $sessionId ?? $existing->session_id,
                'public_key' => $request->public_key ?? $existing->public_key,
                'auth_token' => $request->auth_token ?? $existing->auth_token,
                'content_encoding' => $request->content_encoding ?? 'aes128gcm',
                'device_name' => $request->device_name ?? $existing->device_name,
                'browser' => $this->detectBrowser(),
                'platform' => $this->detectPlatform(),
                'user_agent' => $request->userAgent(),
                'is_active' => true,
                'expires_at' => now()->addMonths(3),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push subscription updated successfully.',
                'subscription_id' => $existing->id,
            ]);
        }

        // إنشاء اشتراك جديد
        $subscription = PushSubscription::create([
            'store_id' => $storeId,
            'customer_id' => $customerId,
            'session_id' => $sessionId,
            'endpoint' => $request->endpoint,
            'public_key' => $request->public_key,
            'auth_token' => $request->auth_token,
            'content_encoding' => $request->content_encoding ?? 'aes128gcm',
            'device_name' => $request->device_name,
            'browser' => $this->detectBrowser(),
            'platform' => $this->detectPlatform(),
            'user_agent' => $request->userAgent(),
            'is_active' => true,
            'expires_at' => now()->addMonths(3),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Push subscription created successfully.',
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * API: إلغاء اشتراك Web Push.
     *
     * يُستدعى من المتصفح عندما يلغي العميل الإشعارات يدوياً.
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $subscription = PushSubscription::where('endpoint', $request->endpoint)->first();

        if ($subscription) {
            $subscription->deactivate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Push subscription deactivated.',
        ]);
    }

    /**
     * API: التحقق من حالة الاشتراك.
     * يُستخدم لمعرفة ما إذا كان العميل مشتركاً في الإشعارات على هذا الجهاز.
     */
    public function status(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $sessionId = session()->getId();
        $storeId = $request->store_id;

        $query = PushSubscription::where('store_id', $storeId)
            ->where(function ($q) use ($customerId, $sessionId) {
                if ($customerId) {
                    $q->where('customer_id', $customerId);
                } else {
                    $q->where('session_id', $sessionId);
                }
            });

        $hasActive = (clone $query)->active()->exists();
        $totalSubscriptions = (clone $query)->count();
        $activeSubscriptions = (clone $query)->active()->count();

        return response()->json([
            'success' => true,
            'has_active_subscription' => $hasActive,
            'active_subscriptions' => $activeSubscriptions,
            'total_subscriptions' => $totalSubscriptions,
            'customer_id' => $customerId,
        ]);
    }

    /**
     * API: الحصول على مفاتيح VAPID العامة (للمتصفح).
     */
    public function vapidPublicKey()
    {
        $publicKey = config('services.vapid.public_key', env('VAPID_PUBLIC_KEY'));

        return response()->json([
            'success' => true,
            'public_key' => $publicKey,
        ]);
    }

    /**
     * الكشف عن اسم المتصفح من User-Agent.
     */
    protected function detectBrowser(): ?string
    {
        $ua = request()->userAgent();
        if (!$ua) return null;

        if (str_contains($ua, 'Chrome')) return 'Chrome';
        if (str_contains($ua, 'Firefox')) return 'Firefox';
        if (str_contains($ua, 'Safari')) return 'Safari';
        if (str_contains($ua, 'Edge')) return 'Edge';
        if (str_contains($ua, 'Opera') || str_contains($ua, 'OPR')) return 'Opera';

        return 'Unknown';
    }

    /**
     * الكشف عن المنصة من User-Agent.
     */
    protected function detectPlatform(): ?string
    {
        $ua = request()->userAgent();
        if (!$ua) return null;

        if (str_contains($ua, 'Windows')) return 'Windows';
        if (str_contains($ua, 'Mac')) return 'macOS';
        if (str_contains($ua, 'Linux')) return 'Linux';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'iOS') || str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) return 'iOS';

        return 'Unknown';
    }
}

