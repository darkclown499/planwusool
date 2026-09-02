<?php

namespace App\Services;

use App\Models\MerchantNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Collection;

class MerchantNotificationService
{
    /**
     * Create a new merchant notification.
     */
    public static function create(array $data): MerchantNotification
    {
        $type = $data['type'] ?? 'system';
        $data['color'] = $data['color'] ?? MerchantNotification::getColorForType($type);

        return MerchantNotification::create($data);
    }

    /**
     * Create a notification for a new order.
     */
    public static function orderCreated(Order $order): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        // Idempotency: exactly once per order for new_order
        $exists = MerchantNotification::where('store_id', $order->store_id)
            ->where('related_id', $order->id)
            ->where('related_type', 'order')
            ->where('type', 'new_order')
            ->exists();
        if ($exists) return;

        $customerName = trim($order->customer_first_name . ' ' . $order->customer_last_name);
        $amount = $order->total_amount;

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'new_order',
            'title' => 'طلب جديد',
            'body' => "طلب جديد #{$order->order_number} من {$customerName} بقيمة {$amount}",
            'icon' => 'ShoppingCart',
            'color' => 'green',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => [
                'order_number' => $order->order_number,
                'order_total' => $amount,
                'customer_name' => $customerName,
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification for an order status change.
     */
    public static function orderStatusChanged(Order $order, string $oldStatus, string $newStatus): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'order_status_changed',
            'title' => 'تحديث حالة الطلب',
            'body' => "تم تغيير حالة الطلب #{$order->order_number} من {$oldStatus} إلى {$newStatus}",
            'icon' => 'Package',
            'color' => 'blue',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => [
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ],
            'is_urgent' => $newStatus === 'cancelled',
        ]);
    }

    /**
     * Create a notification when a delivery driver is assigned to an order.
     */
    public static function deliveryDriverAssigned(Order $order, string $driverName): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'delivery_driver_assigned',
            'title' => 'تم تعيين سائق',
            'body' => "تم تعيين السائق {$driverName} للطلب #{$order->order_number}",
            'icon' => 'Truck',
            'color' => 'blue',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => ['order_number' => $order->order_number, 'driver_name' => $driverName],
            'is_urgent' => false,
        ]);
    }

    /**
     * Create a notification when a delivery fails.
     */
    public static function deliveryFailed(Order $order, ?string $reason = null): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'delivery_failed',
            'title' => 'فشل التوصيل',
            'body' => "فشل توصيل الطلب #{$order->order_number}" . ($reason ? ": {$reason}" : ''),
            'icon' => 'AlertTriangle',
            'color' => 'red',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => ['order_number' => $order->order_number, 'reason' => $reason],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification when delivery completes.
     * NOTE: this does NOT touch payment status — COD collection stays separate.
     */
    public static function deliveryCompleted(Order $order): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'delivery_completed',
            'title' => 'تم التسليم',
            'body' => "تم تسليم الطلب #{$order->order_number}",
            'icon' => 'CheckCircle',
            'color' => 'green',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => ['order_number' => $order->order_number],
            'is_urgent' => false,
        ]);
    }

    /**
     * Create a notification for a cancelled order.
     */
    public static function orderCancelled(Order $order, string $reason = 'طلب ملغي'): void
    {        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => 'order_cancelled',
            'title' => 'تم إلغاء طلب',
            'body' => "تم إلغاء الطلب #{$order->order_number}. {$reason}",
            'icon' => 'XCircle',
            'color' => 'red',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => [
                'order_number' => $order->order_number,
                'reason' => $reason,
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification for low stock product(s).
     */
    public static function lowStock(Product $product, int $threshold = 5): void
    {
        $store = $product->store;
        if (!$store || !$store->user) {
            return;
        }

        $isOutOfStock = $product->stock <= 0;
        $type = $isOutOfStock ? 'out_of_stock' : 'low_stock';

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $product->store_id,
            'type' => $type,
            'title' => $isOutOfStock ? 'نفد المخزون' : 'مخزون منخفض',
            'body' => $isOutOfStock
                ? "المنتج «{$product->name}» نفد من المخزون."
                : "المنتج «{$product->name}» بقي منه {$product->stock} فقط (الحد الأدنى: {$threshold}).",
            'icon' => $isOutOfStock ? 'AlertTriangle' : 'Boxes',
            'color' => $isOutOfStock ? 'red' : 'amber',
            'action_url' => route('products.edit', $product->id, false),
            'related_id' => $product->id,
            'related_type' => 'product',
            'data' => [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'stock' => $product->stock,
                'threshold' => $threshold,
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification when a customer adds a product to wishlist.
     */
    public static function wishlistAdded(Product $product): void
    {
        $store = $product->store;
        if (!$store || !$store->user) {
            return;
        }

        $productName = $product->name ?? 'منتج';
        $productImage = $product->cover_image ?? $product->thumbnail ?? null;

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $product->store_id,
            'type' => 'wishlist_added',
            'title' => 'إضافة جديدة للمفضلة ❤️',
            'body' => "قام عميل بإضافة المنتج {$productName} إلى قائمة المفضلة.",
            'icon' => 'Heart',
            'color' => 'pink',
            'action_url' => route('products.show', $product->id, false),
            'related_id' => $product->id,
            'related_type' => 'product',
            'data' => [
                'product_id' => $product->id,
                'product_name' => $productName,
                'product_image' => $productImage,
            ],
            'is_urgent' => false,
        ]);
    }

    /**
     * Create a notification when an order payment is financially confirmed
     * (COD collected / bank transfer confirmed). Idempotent: one notification
     * per order & type regardless of how many paths converge on the same state.
     */
    public static function paymentCollected(Order $order, string $type = 'cod_collected'): void
    {
        $store = $order->store;
        if (!$store || !$store->user) {
            return;
        }

        $exists = MerchantNotification::where('store_id', $order->store_id)
            ->where('related_id', $order->id)
            ->where('related_type', 'order')
            ->where('type', $type)
            ->exists();
        if ($exists) return;

        $customerName = trim($order->customer_first_name . ' ' . $order->customer_last_name);
        $amount = $order->total_amount;
        $title = $type === 'bank_transfer' ? 'تم تأكيد التحويل البنكي' : 'تم تحصيل المبلغ';
        $body = $type === 'bank_transfer'
            ? "تم تأكيد التحويل البنكي للطلب #{$order->order_number} بقيمة {$amount}"
            : "تم تحصيل مبلغ الطلب #{$order->order_number} من {$customerName} بقيمة {$amount}";

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $order->store_id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'icon' => 'Banknote',
            'color' => 'green',
            'action_url' => route('orders.show', $order->id, false),
            'related_id' => $order->id,
            'related_type' => 'order',
            'data' => [
                'order_number' => $order->order_number,
                'order_total' => $amount,
                'customer_name' => $customerName,
            ],
            'is_urgent' => false,
        ]);
    }

    /**
     * Create a notification for a new product review.
     */
    public static function newReview(ProductReview $review): void
    {
        $store = $review->store;
        if (!$store || !$store->user) {
            return;
        }

        $productName = $review->product?->name ?? 'منتج';
        $customerName = $review->customer?->name ?? 'عميل';

        self::create([
            'user_id' => $store->user_id,
            'store_id' => $review->store_id,
            'type' => 'new_review',
            'title' => 'تقييم جديد',
            'body' => "قام {$customerName} بتقييم «{$productName}» بـ {$review->rating} نجوم.",
            'icon' => 'Star',
            'color' => 'purple',
            'action_url' => route('product-reviews.index', [], false),
            'related_id' => $review->id,
            'related_type' => 'review',
            'data' => [
                'product_id' => $review->product_id,
                'product_name' => $productName,
                'rating' => $review->rating,
                'customer_name' => $customerName,
            ],
            'is_urgent' => false,
        ]);
    }

    /**
     * Create a notification for an expiring plan.
     */
    public static function planExpiring(User $user, int $daysLeft = 7): void
    {
        $planName = $user->plan?->name ?? 'خطة';

        self::create([
            'user_id' => $user->id,
            'store_id' => $user->current_store,
            'type' => 'plan_expiring',
            'title' => 'اشتراكك على وشك الانتهاء',
            'body' => "خطتك ({$planName}) ستنتهي خلال {$daysLeft} يوم. جدّد اشتراكك ليستمر عمل متجرك دون انقطاع.",
            'icon' => 'Timer',
            'color' => 'amber',
            'action_url' => route('plans.index', [], false),
            'related_id' => $user->plan_id,
            'related_type' => 'plan',
            'data' => [
                'plan_id' => $user->plan_id,
                'plan_name' => $user->plan?->name,
                'days_left' => $daysLeft,
                'expire_date' => $user->plan_expire_date?->toDateString(),
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification for an expired plan.
     */
    public static function planExpired(User $user): void
    {
        $planName = $user->plan?->name ?? 'خطة';

        self::create([
            'user_id' => $user->id,
            'store_id' => $user->current_store,
            'type' => 'plan_expired',
            'title' => 'انتهى اشتراكك',
            'body' => "انتهى اشتراكك في خطة ({$planName}). جدّد اشتراكك لاستعادة الوصول إلى متجرك.",
            'icon' => 'ShieldAlert',
            'color' => 'red',
            'action_url' => route('plans.index', [], false),
            'related_id' => $user->plan_id,
            'related_type' => 'plan',
            'data' => [
                'plan_id' => $user->plan_id,
                'plan_name' => $planName,
                'expire_date' => $user->plan_expire_date?->toDateString(),
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Create a notification for a login from a new device (security alert).
     */
    public static function newDeviceLogin(User $user, string $ip, string $ua, ?int $storeId = null): void
    {
        self::create([
            'user_id' => $user->id,
            'store_id' => $storeId ?? $user->current_store,
            'type' => 'system',
            'title' => 'تسجيل دخول جديد من جهاز جديد',
            'body' => "تم تسجيل الدخول إلى حسابك من جهاز جديد (IP: {$ip}). إذا لم تكن أنت، غيّر كلمة مرورك فوراً.",
            'icon' => 'AlertTriangle',
            'color' => 'amber',
            'related_id' => $user->id,
            'related_type' => 'user',
            'data' => [
                'ip' => $ip,
                'user_agent' => $ua,
                'logged_in_at' => now()->toDateTimeString(),
            ],
            'is_urgent' => true,
        ]);
    }

    /**
     * Get notifications for a user (optionally filtered by store).
     */
    public static function getForUser(int $userId, ?int $storeId = null, int $limit = 20, bool $unreadOnly = false): Collection
    {
        $query = MerchantNotification::where('user_id', $userId)
            ->orderBy('created_at', 'desc');

        if ($storeId) {
            $query->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->orWhereNull('store_id');
            });
        }

        if ($unreadOnly) {
            $query->unread();
        }

        return $query->limit($limit)->get();
    }

    /**
     * Get the unread count for a user.
     */
    public static function unreadCount(int $userId, ?int $storeId = null): int
    {
        $query = MerchantNotification::where('user_id', $userId)->unread();

        if ($storeId) {
            $query->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->orWhereNull('store_id');
            });
        }

        return $query->count();
    }

    /**
     * Get urgent (vital alert) notifications for a user.
     */
    public static function getUrgentForUser(int $userId, ?int $storeId = null, int $limit = 10): Collection
    {
        $query = MerchantNotification::where('user_id', $userId)
            ->urgent()
            ->orderBy('created_at', 'desc');

        if ($storeId) {
            $query->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->orWhereNull('store_id');
            });
        }

        return $query->limit($limit)->get();
    }

    /**
     * Mark a notification as read.
     */
    public static function markAsRead(int $id, int $userId): bool
    {
        $notification = MerchantNotification::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$notification) {
            return false;
        }

        $notification->markAsRead();
        return true;
    }

    /**
     * Mark all notifications as read for a user.
     */
    public static function markAllAsRead(int $userId, ?int $storeId = null): int
    {
        $query = MerchantNotification::where('user_id', $userId)->unread();

        if ($storeId) {
            $query->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->orWhereNull('store_id');
            });
        }

        return $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Build the alert payload for a given user (used in dashboard + bell).
     * Returns the list of unread urgent notifications.
     */
    public static function buildAlertsForUser(int $userId, ?int $storeId = null): Collection
    {
        return self::getUrgentForUser($userId, $storeId, 10);
    }
}
