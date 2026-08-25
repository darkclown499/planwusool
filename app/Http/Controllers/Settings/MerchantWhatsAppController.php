<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\MerchantWhatsAppNotifier;
use App\Services\PhoneNormalizer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MerchantWhatsAppController extends Controller
{
    public function index(Request $request, $id = null)
    {
        $user = auth()->user();
        if (!$user) abort(403);
        if ($id) {
            $store = \App\Models\Store::find($id);
            if ($store && !$this->userCanManageStore($user, $store)) abort(403);
        } elseif (!$this->userCanManageStore($user, null)) {
            // For superadmin/company without explicit store, allow
            if (!$user->hasPermissionTo('manage-settings') && $user->type !== 'company' && $user->type !== 'superadmin') {
                abort(403);
            }
        }

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);

        $notifier = app(MerchantWhatsAppNotifier::class);
        $status = $notifier->getStatusForStore($userId, $storeId);

        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);
        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $normalized = PhoneNormalizer::normalize($rawNumber);

        return Inertia::render('settings/merchant-whatsapp', [
            'whatsappSettings' => [
                'is_enabled' => $isEnabled,
                'whatsapp_number' => $rawNumber,
                'whatsapp_number_normalized' => $normalized,
                'whatsapp_number_masked' => $normalized ? PhoneNormalizer::mask($normalized) : '',
                'status' => $status,
            ],
            'providerConfigured' => $notifier->detectProvider() !== null,
            'providerStatus' => $notifier->detectProviderStatus(),
        ]);
    }

    public function update(Request $request, $id = null)
    {
        $user = auth()->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 403);
        if ($id) {
            $store = \App\Models\Store::find($id);
            if ($store && !$this->userCanManageStore($user, $store)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $request->validate([
            'is_whatsapp_enabled' => 'required|boolean',
            'whatsapp_number' => 'nullable|string|max:20',
        ]);

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);

        $isEnabled = $request->boolean('is_whatsapp_enabled');
        $rawNumber = trim((string) $request->input('whatsapp_number', ''));

        if ($isEnabled) {
            if (empty($rawNumber)) {
                return back()->withErrors(['whatsapp_number' => 'رقم واتساب مطلوب عند تفعيل الإشعارات']);
            }
            $normalized = PhoneNormalizer::normalize($rawNumber);
            if (!$normalized) {
                return back()->withErrors(['whatsapp_number' => 'رقم واتساب غير صالح. استخدم صيغة مثل 0591234567 أو +970591234567']);
            }
            $rawNumber = $normalized;
        } else {
            if (!empty($rawNumber)) {
                $normalized = PhoneNormalizer::normalize($rawNumber);
                if (!$normalized) {
                    return back()->withErrors(['whatsapp_number' => 'رقم واتساب غير صالح']);
                }
                $rawNumber = $normalized;
            }
        }

        $this->saveWhatsAppSettings($userId, $storeId, $isEnabled, $rawNumber);

        return back()->with('success', 'تم حفظ إعدادات واتساب بنجاح');
    }

    public function sendTest(Request $request, $id = null)
    {
        $user = auth()->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 403);
        if ($id) {
            $store = \App\Models\Store::find($id);
            if ($store && !$this->userCanManageStore($user, $store)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);

        $notifier = app(MerchantWhatsAppNotifier::class);
        $result = $notifier->sendTestMessage($userId, $storeId);

        if ($result['sent']) {
            return response()->json(['success' => true, 'message' => $result['message'] ?? 'تم إرسال رسالة الاختبار']);
        }

        return response()->json([
            'success' => false,
            'message' => $result['message'] ?? 'تعذر إرسال رسالة الاختبار',
            'reason' => $result['reason'] ?? 'unknown',
        ], 400);
    }

    public function status(Request $request, $id = null)
    {
        $user = auth()->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);
        $notifier = app(MerchantWhatsAppNotifier::class);
        $status = $notifier->getStatusForStore($userId, $storeId);

        return response()->json($status);
    }

    private function userCanManageStore($user, $store): bool
    {
        if (!$store) return $user->type === 'company' || $user->type === 'superadmin';
        if ($user->type === 'superadmin') return true;
        if ($user->type === 'company' && (int) $user->id === (int) $store->user_id) return true;
        if ($user->created_by && (int) $user->created_by === (int) $store->user_id) return true;
        // Fallback to permission
        try {
            return $user->hasPermissionTo('manage-settings') || $user->hasPermissionTo('manage-orders');
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function resolveStoreContext($user, $id = null): array
    {
        if ($id) {
            $store = \App\Models\Store::find($id);
            if ($store) {
                $ownerId = $store->user_id;
                $isOwner = $user->id === $ownerId || $user->created_by === $ownerId || $user->type === 'superadmin';
                if ($isOwner) {
                    $userId = $user->type === 'company' ? $user->id : ($user->type === 'superadmin' ? $user->id : $user->created_by);
                    if ($user->type !== 'company' && $user->type !== 'superadmin') {
                        $userId = $user->created_by;
                    } elseif ($user->type === 'company') {
                        $userId = $user->id;
                    }
                    return [$userId, (int) $id];
                }
            }
        }

        if ($user->type === 'superadmin') {
            return [$user->id, $id ? (int) $id : null];
        }

        if ($user->type === 'company') {
            $storeId = $id ? (int) $id : getCurrentStoreId($user);
            return [$user->id, $storeId];
        }

        $companyUser = \App\Models\User::find($user->created_by);
        $storeId = $id ? (int) $id : ($companyUser ? getCurrentStoreId($companyUser) : null);
        return [$user->created_by, $storeId];
    }

    private function saveWhatsAppSettings(int $userId, ?int $storeId, bool $isEnabled, string $number): void
    {
        \App\Models\PaymentSetting::updateOrCreateSetting($userId, 'is_whatsapp_enabled', $isEnabled ? '1' : '0', $storeId);
        \App\Models\PaymentSetting::updateOrCreateSetting($userId, 'whatsapp_number', $number, $storeId);

        if ($storeId) {
            \App\Models\StoreConfiguration::setConfiguration($storeId, 'is_whatsapp_enabled', $isEnabled ? '1' : '0');
            \App\Models\StoreConfiguration::setConfiguration($storeId, 'whatsapp_number', $number);
        }
    }
}
