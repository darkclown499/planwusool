<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\StoreWhatsappIntegration;
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
        }

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);
        if (!$storeId) abort(404);

        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();
        $notifier = app(MerchantWhatsAppNotifier::class);
        $status = $notifier->getStatusForStore($userId, $storeId);

        // For form, decrypt token is hidden
        $hasToken = $integration && !empty($integration->getAttributes()['access_token']);

        return Inertia::render('settings/merchant-whatsapp', [
            'whatsappSettings' => [
                'is_enabled' => $integration ? (bool) $integration->is_enabled : false,
                'has_token' => $hasToken,
                'token_masked' => $hasToken ? '••••••••••••••••' : '',
                'phone_number_id' => $integration->phone_number_id ?? '',
                'waba_id' => $integration->waba_id ?? '',
                'business_phone' => $integration->business_phone ?? '',
                'notification_phone' => $integration->notification_phone ?? '',
                'notification_phone_masked' => $integration && $integration->notification_phone ? PhoneNormalizer::mask(PhoneNormalizer::normalize($integration->notification_phone) ?: $integration->notification_phone) : '',
                'message_mode' => $integration->message_mode ?? config('services.whatsapp.message_mode','text'),
                'template_name' => $integration->template_name ?? config('services.whatsapp.template_name',''),
                'template_language' => $integration->template_language ?? config('services.whatsapp.template_language','ar'),
                'status' => $status,
                'integration' => $integration ? [
                    'id' => $integration->id,
                    'provider' => $integration->provider,
                    'message_mode' => $integration->message_mode ?? 'text',
                    'template_name' => $integration->template_name,
                    'template_language' => $integration->template_language,
                    'connection_status' => $integration->connection_status,
                    'last_verified_at' => $integration->last_verified_at,
                    'last_error' => $integration->last_error,
                ] : null,
            ],
            'storeId' => $storeId,
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
            'access_token' => 'nullable|string|max:500',
            'phone_number_id' => 'nullable|string|max:50',
            'waba_id' => 'nullable|string|max:50',
            'business_phone' => 'nullable|string|max:20',
            'notification_phone' => 'nullable|string|max:20',
            'is_enabled' => 'required|boolean',
            'message_mode' => 'nullable|in:text,template',
            'template_name' => 'nullable|string|max:100',
            'template_language' => 'nullable|string|max:20',
        ]);

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);
        if (!$storeId) return response()->json(['message' => 'Store not found'], 404);

        $integration = StoreWhatsappIntegration::firstOrNew(['store_id' => $storeId]);
        $integration->provider = 'meta';

        // Only update token if provided and not masked
        $newToken = trim((string) $request->input('access_token', ''));
        if ($newToken !== '' && $newToken !== '••••••••••••••••' && $newToken !== '*************') {
            $integration->access_token = $newToken;
        }

        if ($request->has('phone_number_id')) {
            $integration->phone_number_id = trim((string) $request->input('phone_number_id'));
        }
        if ($request->has('waba_id')) {
            $integration->waba_id = trim((string) $request->input('waba_id'));
        }
        if ($request->has('business_phone')) {
            $bp = trim((string) $request->input('business_phone'));
            if ($bp !== '') {
                $norm = PhoneNormalizer::normalize($bp);
                if (!$norm) {
                    return back()->withErrors(['business_phone' => 'رقم واتساب التجاري غير صالح']);
                }
                $integration->business_phone = $norm;
            } else {
                $integration->business_phone = null;
            }
        }

        $isEnabled = $request->boolean('is_enabled');
        $integration->is_enabled = $isEnabled;

        // Message mode & template
        if ($request->has('message_mode')) {
            $mode = strtolower(trim((string)$request->input('message_mode')));
            if (in_array($mode, ['text','template'], true)) $integration->message_mode = $mode;
        } elseif (!$integration->exists || empty($integration->message_mode)) {
            $integration->message_mode = config('services.whatsapp.message_mode','text');
        }
        if ($request->has('template_name')) $integration->template_name = trim((string)$request->input('template_name')) ?: null;
        if ($request->has('template_language')) $integration->template_language = trim((string)$request->input('template_language')) ?: null;
        if (($integration->message_mode ?? 'text') === 'template') {
            if ($isEnabled && empty($integration->template_name)) {
                return back()->withErrors(['template_name'=>'اسم القالب مطلوب عند اختيار وضع القالب']);
            }
            if ($isEnabled && empty($integration->template_language)) {
                $integration->template_language = config('services.whatsapp.template_language','ar');
            }
        }

        // Notification phone (recipient)
        $notifPhone = trim((string) $request->input('notification_phone', ''));
        if ($notifPhone !== '') {
            $norm = PhoneNormalizer::normalize($notifPhone);
            if (!$norm) {
                return back()->withErrors(['notification_phone' => 'رقم استقبال الإشعارات غير صالح']);
            }
            $integration->notification_phone = $norm;
        } elseif ($isEnabled) {
            // If enabling, require notification phone
            if (empty($integration->notification_phone)) {
                return back()->withErrors(['notification_phone' => 'رقم استقبال الإشعارات مطلوب عند التفعيل']);
            }
        }

        // If credentials or template changed, reset connection status to disconnected
        $wasDirty = $integration->isDirty(['access_token', 'phone_number_id', 'waba_id','message_mode','template_name','template_language']);
        if ($wasDirty) {
            $integration->connection_status = 'disconnected';
            $integration->last_verified_at = null;
            $integration->last_error = null;
        }

        $integration->save();

        return back()->with('success', 'تم حفظ إعدادات واتساب بنجاح');
    }

    public function verify(Request $request, $id = null)
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
        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();
        if (!$integration || !$integration->access_token || !$integration->phone_number_id) {
            return response()->json(['success' => false, 'message' => 'إعداد واتساب غير مكتمل'], 400);
        }

        $notifier = app(MerchantWhatsAppNotifier::class);
        $result = $notifier->verifyConnection($integration);

        if ($result['connected']) {
            return response()->json(['success' => true, 'message' => 'تم ربط واتساب بنجاح', 'data' => $result['data'] ?? null]);
        }

        return response()->json(['success' => false, 'message' => 'تعذر الاتصال بحساب واتساب. ' . ($result['error'] ?? ''), 'error' => $result['error'] ?? null], 400);
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

    public function disconnect(Request $request, $id = null)
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
        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();
        if ($integration) {
            $integration->update([
                'is_enabled' => false,
                'connection_status' => 'disconnected',
                'access_token' => null,
                'last_error' => null,
            ]);
        }

        return back()->with('success', 'تم فصل واتساب بنجاح');
    }

    public function status(Request $request, $id = null)
    {
        $user = auth()->user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        // Ownership guard: users may only read the WhatsApp status of a store
        // they manage. Without this, any authenticated tenant could query any
        // store id and read its (previously unmasked) notification phone.
        if ($id) {
            $store = \App\Models\Store::find($id);
            if (!$store || !$this->userCanManageStore($user, $store)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        [$userId, $storeId] = $this->resolveStoreContext($user, $id);
        if (!$storeId) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        $notifier = app(MerchantWhatsAppNotifier::class);
        $status = $notifier->getStatusForStore($userId, $storeId);

        return response()->json($status);
    }

    private function userCanManageStore($user, $store): bool
    {
        if (!$store) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        // Company owner — preserve access (owner has manage-settings via seed, but don't weaken)
        if ($user->type === 'company' && (int) $user->id === (int) $store->user_id) return true;
        // Staff: must be same tenant AND have manage-settings (no dedicated whatsapp permission exists — reuse narrowest existing)
        if ($user->created_by && (int) $user->created_by === (int) $store->user_id) {
            try { return $user->hasPermissionTo('manage-settings'); } catch (\Throwable $e) { return false; }
        }
        return false;
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

        // Non-superadmin users may only resolve a store id they manage. The
        // $id branch above already returned for owners; if we reach here with
        // an explicit $id it is a store the caller does NOT own, so refuse
        // rather than falling through to read a foreign tenant's data.
        if ($id) {
            return [$user->type === 'company' ? $user->id : (int) ($user->created_by ?: 0), null];
        }

        if ($user->type === 'company') {
            return [$user->id, getCurrentStoreId($user)];
        }

        $companyUser = \App\Models\User::find($user->created_by);
        return [$user->created_by ?? 0, $companyUser ? getCurrentStoreId($companyUser) : null];
    }
}
