<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    // =========================================================================
    // أقسام لوحة التحكم (Admin Panel)
    // =========================================================================

    /**
     * عرض صفحة إدارة الإشعارات في لوحة التحكم.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $filters = $request->only(['type', 'channel', 'status', 'search', 'per_page']);
        $notifications = $this->notificationService->getAdminNotifications($currentStoreId, $filters, $request->get('per_page', 15));

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'filters' => $filters,
            'stats' => $this->notificationService->getStats($currentStoreId),
            'typeStats' => $this->notificationService->getTypeStats($currentStoreId),
            'types' => array_keys(CustomerNotification::TYPES),
            'channels' => CustomerNotification::CHANNELS,
        ]);
    }

    /**
     * عرض صفحة إرسال إشعار يدوي للعملاء.
     */
    public function create()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $customers = Customer::where('store_id', $currentStoreId)
            ->select('id', 'first_name', 'last_name', 'email', 'phone')
            ->orderBy('first_name')
            ->get();

        return Inertia::render('notifications/create', [
            'customers' => $customers,
            'types' => array_keys(CustomerNotification::TYPES),
        ]);
    }

    /**
     * إرسال إشعار يدوي (فردي أو جماعي) للعملاء من لوحة التحكم.
     */
    public function send(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'type' => 'required|string|in:' . implode(',', array_keys(CustomerNotification::TYPES)),
            'channel' => 'required|string|in:' . implode(',', array_keys(CustomerNotification::CHANNELS)),
            'customer_ids' => 'required|array|min:1',
            'customer_ids.*' => 'integer|exists:customers,id',
            'action_url' => 'nullable|string|max:500',
            'data' => 'nullable|array',
        ]);

        $customerIds = $request->customer_ids;
        $options = [
            'channel' => $request->channel,
            'action_url' => $request->action_url,
            'data' => $request->data,
            'force' => $request->boolean('force', true), // إشعار يدوي يُرسل حتى لو كانت التفضيلات تعطله
        ];

        $result = $this->notificationService->sendToMany(
            $currentStoreId,
            $customerIds,
            $request->type,
            $request->title,
            $request->body,
            $options
        );

        return redirect()->route('notifications.index')->with('success', __(
            'Notification sent: :sent of :total (skipped: :skipped)',
            ['sent' => $result['sent'], 'total' => $result['total'], 'skipped' => $result['skipped']]
        ));
    }

    /**
     * عرض تفاصيل إشعار من لوحة التحكم.
     */
    public function show(int $id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $notification = CustomerNotification::where('store_id', $currentStoreId)
            ->with('customer:id,first_name,last_name,email,phone')
            ->findOrFail($id);

        return Inertia::render('notifications/show', [
            'notification' => $notification,
        ]);
    }

    /**
     * حذف إشعار من لوحة التحكم.
     */
    public function destroy(int $id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $notification = CustomerNotification::where('store_id', $currentStoreId)->findOrFail($id);
        $notification->delete();

        return redirect()->route('notifications.index')->with('success', __('Notification deleted successfully.'));
    }

    // =========================================================================
    // أقسام واجهة المتجر (Storefront API)
    // =========================================================================

    /**
     * API: جلب إشعارات العميل.
     */
    public function indexApi(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $notifications = $this->notificationService->getNotificationsForCustomer(
            $storeId,
            $customerId,
            $request->get('limit', 50),
            $request->boolean('unread_only', false)
        );

        $unreadCount = $this->notificationService->getUnreadCount($storeId, $customerId);

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * API: جلب عدد الإشعارات غير المقروءة.
     */
    public function unreadCount(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $count = $this->notificationService->getUnreadCount($storeId, $customerId);

        return response()->json([
            'success' => true,
            'unread_count' => $count,
        ]);
    }

    /**
     * API: تحديد إشعار كمقروء.
     */
    public function markRead(Request $request, int $id)
    {
        $customerId = Auth::guard('customer')->id();

        if (!$customerId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $marked = $this->notificationService->markAsRead($id, $customerId);

        if (!$marked) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        return response()->json(['success' => true]);
    }

    /**
     * API: تحديد جميع الإشعارات كمقروءة.
     */
    public function markAllRead(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $count = $this->notificationService->markAllAsRead($storeId, $customerId);

        return response()->json([
            'success' => true,
            'marked' => $count,
        ]);
    }

    /**
     * API: تسجيل نقرة على إشعار.
     */
    public function markClicked(Request $request, int $id)
    {
        $customerId = Auth::guard('customer')->id();

        if (!$customerId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $marked = $this->notificationService->markAsClicked($id, $customerId);

        if (!$marked) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        return response()->json(['success' => true]);
    }

    /**
     * API: حذف إشعار.
     */
    public function destroyApi(Request $request, int $id)
    {
        $customerId = Auth::guard('customer')->id();

        if (!$customerId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $deleted = $this->notificationService->delete($id, $customerId);

        if (!$deleted) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        return response()->json(['success' => true]);
    }

    /**
     * API: جلب تفضيلات الإشعارات للعميل.
     */
    public function getPreferences(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $preferences = $this->notificationService->getPreferences($storeId, $customerId);

        return response()->json([
            'success' => true,
            'preferences' => $preferences,
        ]);
    }

    /**
     * API: تحديث تفضيلات الإشعارات للعميل.
     */
    public function updatePreferences(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $request->validate([
            'type' => 'required|string|in:' . implode(',', array_keys(CustomerNotification::TYPES)),
            'email_enabled' => 'nullable|boolean',
            'push_enabled' => 'nullable|boolean',
            'sms_enabled' => 'nullable|boolean',
            'in_app_enabled' => 'nullable|boolean',
        ]);

        $pref = $this->notificationService->updatePreference($storeId, $customerId, $request->type, [
            'email_enabled' => $request->boolean('email_enabled'),
            'push_enabled' => $request->boolean('push_enabled'),
            'sms_enabled' => $request->boolean('sms_enabled'),
            'in_app_enabled' => $request->boolean('in_app_enabled'),
        ]);

        return response()->json([
            'success' => true,
            'preference' => $pref,
        ]);
    }

    /**
     * API: إلغاء اشتراك العميل من جميع الإشعارات.
     */
    public function unsubscribeAll(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $this->notificationService->unsubscribeAll($storeId, $customerId);

        return response()->json([
            'success' => true,
            'message' => 'Unsubscribed from all notifications.',
        ]);
    }
}

