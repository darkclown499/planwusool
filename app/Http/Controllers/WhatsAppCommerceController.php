<?php

namespace App\Http\Controllers;

use App\Models\StoreConfiguration;
use App\Models\WhatsAppTemplate;
use App\Services\PhoneNormalizer;
use App\Services\Payment\PaymentSettingsService;
use App\Services\WhatsAppCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * WhatsApp Commerce settings page (Phase 1). This page is entirely about
 * configuring wa.me DEEP LINKS — it never registers, verifies, or sends via a
 * messaging API. The UI is honest about that.
 */
class WhatsAppCommerceController extends Controller
{
    public function __construct(private readonly WhatsAppCommerceService $whatsAppCommerce)
    {
    }

    /**
     * Settings page: enable/disable feature + customer actions + product share,
     * the store WhatsApp number (deep-link target), and per-locale editable
     * templates with a safe placeholder allowlist.
     */
    public function index(int $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403);
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);
        $this->whatsAppCommerce->ensureDefaults($store->id);

        $config = StoreConfiguration::getConfiguration($store->id);

        $templates = [];
        foreach (WhatsAppTemplate::locales() as $locale) {
            foreach (WhatsAppTemplate::keys() as $key) {
                $templates[] = [
                    'key' => $key,
                    'locale' => $locale,
                    'label' => WhatsAppCommerceService::TEMPLATE_DEFINITIONS[$key][$locale] ?? $key,
                    'body' => WhatsAppTemplate::where('store_id', $store->id)
                        ->where('key', $key)
                        ->where('locale', $locale)
                        ->value('body') ?? WhatsAppCommerceService::DEFAULT_TEMPLATES[$locale][$key] ?? '',
                ];
            }
        }

        // Canonical store WhatsApp number lives in the payment settings
        // (whatsapp_number key, scoped by user_id + store_id). We reuse that
        // single source of truth — the page shows it, and edits it directly.
        $rawPhone = getPaymentMethodConfig('whatsapp', $store->user_id, $store->id)['number'] ?? null;
        $storePhoneE164 = $this->whatsAppCommerce->phoneDigits($rawPhone);

        return Inertia::render('stores/whatsapp-commerce', [
            'store' => $store,
            'settings' => [
                'enabled' => $this->whatsAppCommerce->isEnabled($store->id),
                'customer_actions_enabled' => (bool) filter_var($config[WhatsAppCommerceService::KEY_CUSTOMER_ACTIONS_ENABLED] ?? true, FILTER_VALIDATE_BOOLEAN),
                'product_share_enabled' => (bool) filter_var($config[WhatsAppCommerceService::KEY_PRODUCT_SHARE_ENABLED] ?? true, FILTER_VALIDATE_BOOLEAN),
                'store_phone' => $storePhoneE164,
                'store_phone_raw' => $rawPhone,
                'store_phone_configured' => $storePhoneE164 !== null,
                'store_name' => $store->name,
            ],
            'templates' => $templates,
            'placeholders' => WhatsAppCommerceService::PLACEHOLDERS,
            'templateKeys' => array_map(
                fn ($key) => ['key' => $key, 'label' => WhatsAppCommerceService::TEMPLATE_DEFINITIONS[$key]],
                WhatsAppTemplate::keys()
            ),
        ]);
    }

    /**
     * Persist the WhatsApp Commerce settings + custom templates. Only the exact
     * allowlisted keys are saved; phone is read from payment settings elsewhere.
     */
    public function update(Request $request, int $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403);
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        $validated = $request->validate([
            'enabled' => 'nullable',
            'customer_actions_enabled' => 'nullable',
            'product_share_enabled' => 'nullable',
            // The canonical store number is edited here but persisted into the
            // same payment-settings key used everywhere else (single source of
            // truth). Optional: only written when a non-empty value is sent.
            'store_phone' => 'nullable|string|max:20',
            'templates' => 'nullable|array',
            'templates.*' => 'required|array:key,locale,body',
            'templates.*.key' => ['required', Rule::in(WhatsAppTemplate::keys())],
            'templates.*.locale' => ['required', Rule::in(WhatsAppTemplate::locales())],
            'templates.*.body' => ['nullable', 'string', 'max:2000'],
        ]);

        // Persist toggles (only explicit boolean keys).
        $settingsToSave = [];
        foreach ([
            WhatsAppCommerceService::KEY_ENABLED => 'enabled',
            WhatsAppCommerceService::KEY_CUSTOMER_ACTIONS_ENABLED => 'customer_actions_enabled',
            WhatsAppCommerceService::KEY_PRODUCT_SHARE_ENABLED => 'product_share_enabled',
        ] as $configKey => $field) {
            if (array_key_exists($field, $validated)) {
                $settingsToSave[$configKey] = filter_var($validated[$field], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
            }
        }
        if ($settingsToSave) {
            StoreConfiguration::updateConfiguration($store->id, $settingsToSave);
        }

        // Persist the canonical WhatsApp number into the payment settings
        // source of truth (reused by orders, product share, and the storefront).
        // Server-side validation + normalization consistent with wa.me helper.
        $storePhone = $request->input('store_phone');
        if (is_string($storePhone) && trim($storePhone) !== '') {
            $normalized = PhoneNormalizer::normalize(trim($storePhone));
            if ($normalized === null) {
                return back()
                    ->withErrors(['store_phone' => __('رقم واتساب غير صالح، تأكد من استخدام رقم دولي صحيح مثل +970591234567.')])
                    ->withInput();
            }

            $settingsService = app(PaymentSettingsService::class);
            $settingsService->updatePaymentSetting('whatsapp_number', $normalized, $store->user_id, $store->id);
            Cache::forget('payment_settings.' . $store->user_id . '.' . $store->id);
        }

        // Persist templates (upsert by store+key+locale).
        foreach ($validated['templates'] ?? [] as $template) {
            $body = is_string($template['body']) ? trim($template['body']) : '';
            WhatsAppTemplate::updateOrCreate(
                ['store_id' => $store->id, 'key' => $template['key'], 'locale' => $template['locale']],
                ['body' => $body]
            );
        }

        return redirect()->back()->with('success', __('تم حفظ إعدادات واتساب بنجاح'));
    }
}