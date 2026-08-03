<?php

namespace App\Http\Controllers;

use App\Models\MerchantNotification;
use App\Services\MerchantNotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MerchantNotificationController extends Controller
{
    protected $notificationService;

    public function __construct(MerchantNotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * عرض صفحة الإشعارات الشاملة للتاجر.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $storeId = $request->get('store_id') ?: $user->current_store;

        $filters = $request->only(['type', 'status', 'search']);

        $query = MerchantNotification::where('user_id', $user->id)
            ->when($storeId, function ($q) use ($storeId) {
                $q->where(function ($sub) use ($storeId) {
                    $sub->where('store_id', $storeId)->orWhereNull('store_id');
                });
            })
            ->when(!empty($filters['type']), fn ($q) => $q->ofType($filters['type']))
            ->when(!empty($filters['search']), function ($q) use ($filters) {
                $q->where(function ($sub) use ($filters) {
                    $sub->where('title', 'like', '%' . $filters['search'] . '%')
                        ->orWhere('body', 'like', '%' . $filters['search'] . '%');
                });
            })
            ->when(($filters['status'] ?? null) === 'unread', fn ($q) => $q->unread())
            ->when(($filters['status'] ?? null) === 'read', fn ($q) => $q->where('is_read', true))
            ->orderByDesc('created_at');

        $notifications = $query->paginate($request->get('per_page', 15))
            ->withQueryString();

        return Inertia::render('merchant-notifications/index', [
            'notifications' => $notifications,
            'filters' => $filters,
            'stats' => [
                'total' => MerchantNotification::where('user_id', $user->id)->count(),
                'unread' => MerchantNotification::where('user_id', $user->id)->unread()->count(),
                'urgent' => MerchantNotification::where('user_id', $user->id)->urgent()->count(),
            ],
            'types' => array_keys(MerchantNotification::TYPES),
        ]);
    }

    /**
     * API: جلب إشعارات التاجر (لجرس الإشعارات).
     */
    public function apiIndex(Request $request)
    {
        $user = auth()->user();
        $storeId = $request->get('store_id') ?: $user->current_store;

        $notifications = $this->notificationService->getForUser(
            $user->id,
            $storeId,
            (int) $request->get('limit', 20)
        );

        $unreadCount = $this->notificationService->unreadCount($user->id, $storeId);

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
        $user = auth()->user();
        $storeId = $request->get('store_id') ?: $user->current_store;

        return response()->json([
            'success' => true,
            'unread_count' => $this->notificationService->unreadCount($user->id, $storeId),
        ]);
    }

    /**
     * API: تحديد إشعار كمقروء.
     */
    public function markRead(Request $request, int $id)
    {
        $user = auth()->user();

        $marked = $this->notificationService->markAsRead($id, $user->id);

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
        $user = auth()->user();
        $storeId = $request->get('store_id') ?: $user->current_store;

        $count = $this->notificationService->markAllAsRead($user->id, $storeId);

        return response()->json([
            'success' => true,
            'marked' => $count,
        ]);
    }
}
