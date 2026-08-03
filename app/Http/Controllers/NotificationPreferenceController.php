<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationPreferenceController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * API: جلب تفضيلات الإشعارات للعميل.
     *
     * GET api/notifications/preferences?store_id={storeId}
     */
    public function index(Request $request)
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
     * API: تحديث تفضيل إشعار واحد للعميل.
     *
     * PUT api/notifications/preferences
     * Body: { store_id, type, email_enabled?, push_enabled?, sms_enabled?, in_app_enabled? }
     */
    public function update(Request $request)
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
     *
     * POST api/notifications/unsubscribe-all
     * Body: { store_id }
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
