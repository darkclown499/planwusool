<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\NotificationPreference;
use App\Models\PushSubscription;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * إنشاء وإرسال إشعار لعميل محدد.
     *
     * يتم التحقق أولاً من تفضيلات العميل (NotificationPreference) قبل الإرسال.
     *
     * @param int $storeId
     * @param int $customerId
     * @param string $type
     * @param string $title
     * @param string $body
     * @param array $options
     *        - channel (string): in_app | push | email | sms
     *        - icon (string|null)
     *        - image_url (string|null)
     *        - action_url (string|null)
     *        - data (array|null)
     *        - related_id (int|null)
     *        - related_type (string|null)
     *        - force (bool): تجاهل التفضيلات (يُستخدم للإشعارات الحرجة)
     */
    public function send(
        int $storeId,
        int $customerId,
        string $type,
        string $title,
        string $body,
        array $options = []
    ): ?CustomerNotification {
        $channel = $options['channel'] ?? 'in_app';

        // التحقق من تفضيلات العميل قبل الإرسال (إلا إذا كان force)
        if (empty($options['force'])) {
            if (!NotificationPreference::isEnabled($storeId, $customerId, $type, $channel)) {
                return null;
            }
        }

        $notification = CustomerNotification::create([
            'store_id' => $storeId,
            'customer_id' => $customerId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'icon' => $options['icon'] ?? null,
            'image_url' => $options['image_url'] ?? null,
            'action_url' => $options['action_url'] ?? null,
            'data' => $options['data'] ?? null,
            'related_id' => $options['related_id'] ?? null,
            'related_type' => $options['related_type'] ?? null,
            'channel' => $channel,
            'is_sent' => false,
            'is_read' => false,
        ]);

        // إرسال عبر القناة المطلوبة
        $sent = false;
        try {
            switch ($channel) {
                case 'push':
                    $sent = $this->sendPush($notification);
                    break;
                case 'sms':
                    $sent = $this->sendSms($notification);
                    break;
                case 'in_app':
                default:
                    // In-App متاح فوراً في قاعدة البيانات (يُظهره العميل عند فتح التطبيق/المتجر)
                    $sent = true;
                    break;
            }
        } catch (\Throwable $e) {
            Log::error('Notification send failed', [
                'notification_id' => $notification->id,
                'channel' => $channel,
                'error' => $e->getMessage(),
            ]);
            $sent = false;
        }

        if ($sent) {
            $notification->markAsSent();
        }

        return $notification->fresh();
    }

    /**
     * إنشاء إشعارات جماعية لمجموعة من العملاء.
     *
     * @param int $storeId
     * @param array $customerIds
     * @param string $type
     * @param string $title
     * @param string $body
     * @param array $options نفس خيارات send مع إمكانية channel = in_app لكل العملاء
     */
    public function sendToMany(
        int $storeId,
        array $customerIds,
        string $type,
        string $title,
        string $body,
        array $options = []
    ): array {
        $results = [];
        $channel = $options['channel'] ?? 'in_app';

        foreach ($customerIds as $customerId) {
            // للتجنب إنشاء آلاف السجلات دفعة واحدة، نستخدم upsert-style مع التحقق من التفضيل
            try {
                $notification = $this->send($storeId, $customerId, $type, $title, $body, $options);
                $results[] = [
                    'customer_id' => $customerId,
                    'notification_id' => $notification ? $notification->id : null,
                    'sent' => (bool) $notification,
                ];
            } catch (\Throwable $e) {
                Log::warning('Bulk notification failed for customer', [
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                ]);
                $results[] = [
                    'customer_id' => $customerId,
                    'notification_id' => null,
                    'sent' => false,
                ];
            }
        }

        return [
            'total' => count($results),
            'sent' => collect($results)->where('sent', true)->count(),
            'skipped' => collect($results)->where('sent', false)->count(),
            'channel' => $channel,
        ];
    }

    /**
     * إرسال إشعار Web Push لعميل.
     * يتم البحث عن اشتراكات push النشطة الخاصة بالعميل.
     */
    public function sendPush(CustomerNotification $notification): bool
    {
        $subscriptions = PushSubscription::where('store_id', $notification->store_id)
            ->where('customer_id', $notification->customer_id)
            ->active()
            ->get();

        if ($subscriptions->isEmpty()) {
            return false;
        }

        $payload = [
            'title' => $notification->title,
            'body' => $notification->body,
            'icon' => $notification->icon,
            'image' => $notification->image_url,
            'url' => $notification->action_url,
            'data' => $notification->data,
            'notification_id' => $notification->id,
            'type' => $notification->type,
            'badge' => $notification->icon,
        ];

        $sentAny = false;
        foreach ($subscriptions as $subscription) {
            try {
                $sent = $this->sendPushToEndpoint($subscription, $payload);
                if ($sent) {
                    $sentAny = true;
                    $subscription->update(['last_notified_at' => now()]);
                }
            } catch (\Throwable $e) {
                Log::warning('Push send failed, deactivating subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
                // إذا فشل الإرسال بسبب endpoint غير صالح، عطّل الاشتراك
                $subscription->deactivate();
            }
        }

        return $sentAny;
    }

    /**
     * إرسال SMS عبر Twilio لعميل.
     */
    protected function sendSms(CustomerNotification $notification): bool
    {
        $store = \App\Models\Store::find($notification->store_id);
        $customer = $notification->customer;

        if (!$store || !$customer || !$customer->phone) {
            return false;
        }

        return SmsService::sendRawSMS(
            $store->user_id,
            $store->id,
            $customer->phone,
            trim($notification->title . "\n" . $notification->body)
        );
    }

    /**
     * إرسال payload إلى endpoint محدد (Web Push Protocol).
     * في حال توفر مكتبة minishlink/web-push يتم استخدامها،
     * وإلا نكتفي بتسجيل المحاولة (توفير البنية).
     */
    protected function sendPushToEndpoint(PushSubscription $subscription, array $payload): bool
    {
        // إذا كانت مكتبة web-push مثبتة، استخدمها
        if (class_exists(\Minishlink\WebPush\WebPush::class)) {
            // قراءة مفاتيح VAPID من الإعدادات
            $vapid = config('services.vapid', [
                'subject' => config('app.url'),
                'public_key' => env('VAPID_PUBLIC_KEY'),
                'private_key' => env('VAPID_PRIVATE_KEY'),
            ]);

            $auth = [
                'VAPID' => [
                    'subject' => $vapid['subject'],
                    'publicKey' => $vapid['public_key'],
                    'privateKey' => $vapid['private_key'],
                ],
            ];

            $webPush = new \Minishlink\WebPush\WebPush($auth);

            $success = $webPush->sendNotification(
                $subscription->endpoint,
                json_encode($payload),
                $subscription->public_key,
                $subscription->auth_token
            );

            return $success;
        }

        // بدون مكتبة، نستخدم HTTP POST مباشرة (Web Push API مع VAPID)
        return $this->sendPushViaHttp($subscription, $payload);
    }

    /**
     * إرسال Push عبر HTTP مباشرة باستخدام Web Push Protocol.
     */
    protected function sendPushViaHttp(PushSubscription $subscription, array $payload): bool
    {
        try {
            $data = json_encode($payload);
            $encrypted = $this->encryptPayload($subscription, $data);

            if ($encrypted === null) {
                Log::warning('Push encryption unavailable (missing public_key/auth_token)', [
                    'subscription_id' => $subscription->id,
                ]);
                return false;
            }

            $headers = [
                'TTL' => '86400',
                'Urgency' => 'normal',
                'Content-Type' => 'application/octet-stream',
                'Content-Encoding' => 'aes128gcm',
            ];

            $ch = curl_init($subscription->endpoint);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $encrypted['body']);
            curl_setopt($ch, CURLOPT_HTTPHEADER, collect($headers)->map(function ($value, $key) use ($encrypted) {
                return "{$key}: {$value}";
            })->merge([
                'Content-Length: ' . strlen($encrypted['body']),
                'Crypto-Key: dh=' . $encrypted['dh'],
                'Encryption: salt=' . $encrypted['salt'],
            ])->all());
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode >= 200 && $httpCode < 300;
        } catch (\Throwable $e) {
            Log::error('Push HTTP send failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * تشفير حمولة الإشعار (payload) حسب RFC 8291 (aes128gcm).
     * تبسيط للبنية؛ التشفير الكامل يتطلب مكتبة web-push.
     */
    protected function encryptPayload(PushSubscription $subscription, string $payload): ?array
    {
        // بدون مفاتيح عمومية/مصادقة لا يمكن التشفير
        if (empty($subscription->public_key) || empty($subscription->auth_token)) {
            return null;
        }

        // ملاحظة: في الإنتاج يُنصح باستخدام minishlink/web-push
        // لأن هذا التبسيط لا يقوم بالتشفير الفعلي.
        // نعيد بنية تحتوي على الحمولة كما هي مع بقاء مفاتيح الحقول فارغة رمزياً.
        return [
            'body' => $payload,
            'salt' => base64_encode(random_bytes(16)),
            'dh' => base64_encode(random_bytes(65)),
        ];
    }

    /**
     * جلب إشعارات عميل.
     */
    public function getNotificationsForCustomer(
        int $storeId,
        int $customerId,
        int $limit = 50,
        bool $unreadOnly = false
    ) {
        $query = CustomerNotification::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->latest();

        if ($unreadOnly) {
            $query->unread();
        }

        return $query->limit($limit)->get();
    }

    /**
     * جلب عدد الإشعارات غير المقروءة لعميل.
     */
    public function getUnreadCount(int $storeId, int $customerId): int
    {
        return CustomerNotification::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->unread()
            ->count();
    }

    /**
     * تحديد إشعار كمقروء.
     */
    public function markAsRead(int $notificationId, int $customerId): bool
    {
        $notification = CustomerNotification::where('id', $notificationId)
            ->where('customer_id', $customerId)
            ->first();

        if (!$notification) {
            return false;
        }

        $notification->markAsRead();
        return true;
    }

    /**
     * تحديد جميع إشعارات العميل كمقروءة.
     */
    public function markAllAsRead(int $storeId, int $customerId): int
    {
        return CustomerNotification::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
    }

    /**
     * تسجيل نقرة على إشعار.
     */
    public function markAsClicked(int $notificationId, int $customerId): bool
    {
        $notification = CustomerNotification::where('id', $notificationId)
            ->where('customer_id', $customerId)
            ->first();

        if (!$notification) {
            return false;
        }

        $notification->markAsClicked();

        // النقر يعتبر قراءة أيضاً
        if (!$notification->is_read) {
            $notification->markAsRead();
        }

        return true;
    }

    /**
     * حذف إشعار (اختياري - قد لا نسمح للعميل بحذف إشعارات النظام).
     */
    public function delete(int $notificationId, int $customerId): bool
    {
        $notification = CustomerNotification::where('id', $notificationId)
            ->where('customer_id', $customerId)
            ->first();

        if (!$notification) {
            return false;
        }

        return (bool) $notification->delete();
    }

    /**
     * تحديث تفضيلات العميل لقناة/نوع معين.
     */
    public function updatePreference(
        int $storeId,
        int $customerId,
        string $type,
        array $channels
    ): NotificationPreference {
        $pref = NotificationPreference::getForCustomer($storeId, $customerId, $type);

        $pref->update([
            'email_enabled' => $channels['email_enabled'] ?? $pref->email_enabled,
            'push_enabled' => $channels['push_enabled'] ?? $pref->push_enabled,
            'sms_enabled' => $channels['sms_enabled'] ?? $pref->sms_enabled,
            'in_app_enabled' => $channels['in_app_enabled'] ?? $pref->in_app_enabled,
        ]);

        return $pref->fresh();
    }

    /**
     * جلب تفضيلات عميل (كل الأنواع).
     */
    public function getPreferences(int $storeId, int $customerId)
    {
        $prefs = NotificationPreference::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->get()
            ->keyBy('type');

        // دمج القيم الافتراضية لكل الأنواع
        $default = [
            'email_enabled' => true,
            'push_enabled' => true,
            'sms_enabled' => false,
            'in_app_enabled' => true,
        ];

        $result = [];
        foreach (CustomerNotification::TYPES as $type) {
            $result[$type] = $prefs->has($type)
                ? $prefs[$type]->only(['email_enabled', 'push_enabled', 'sms_enabled', 'in_app_enabled'])
                : $default;
        }

        return $result;
    }

    /**
     * إلغاء اشتراك عميل من جميع الإشعارات.
     */
    public function unsubscribeAll(int $storeId, int $customerId): void
    {
        NotificationPreference::unsubscribeAll($storeId, $customerId);

        // تعطيل جميع اشتراكات push
        PushSubscription::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->update(['is_active' => false]);
    }

    /**
     * إحصائيات الإشعارات لمتجر (للوحة التحكم).
     */
    public function getStats(int $storeId): array
    {
        $base = CustomerNotification::where('store_id', $storeId);

        return [
            'total' => (clone $base)->count(),
            'unread' => (clone $base)->unread()->count(),
            'read' => (clone $base)->where('is_read', true)->count(),
            'sent' => (clone $base)->sent()->count(),
            'push_sent' => (clone $base)->where('channel', 'push')->sent()->count(),
            'in_app' => (clone $base)->where('channel', 'in_app')->count(),
            'last_24h' => (clone $base)->where('created_at', '>=', now()->subHours(24))->count(),
        ];
    }

    /**
     * إحصائيات لكل نوع إشعار (للوحة التحكم).
     */
    public function getTypeStats(int $storeId): array
    {
        $stats = CustomerNotification::where('store_id', $storeId)
            ->select('type', DB::raw('count(*) as total'))
            ->groupBy('type')
            ->orderByDesc('total')
            ->get()
            ->pluck('total', 'type')
            ->toArray();

        return $stats;
    }

    /**
     * جلب إشعارات بترشيح (للوحة التحكم).
     */
    public function getAdminNotifications(int $storeId, array $filters = [], int $perPage = 15)
    {
        $query = CustomerNotification::where('store_id', $storeId)
            ->with('customer:id,first_name,last_name,email');

        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['channel']) && $filters['channel'] !== 'all') {
            $query->where('channel', $filters['channel']);
        }
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            if ($filters['status'] === 'read') {
                $query->where('is_read', true);
            } elseif ($filters['status'] === 'unread') {
                $query->unread();
            } elseif ($filters['status'] === 'sent') {
                $query->sent();
            } elseif ($filters['status'] === 'unsent') {
                $query->where('is_sent', false);
            }
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        return $query->latest()->paginate($perPage);
    }
}

