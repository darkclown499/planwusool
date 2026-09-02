<?php

namespace App\Services;

use App\Models\AbandonedCart;
use App\Models\Order;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\WhatsAppTemplate;
use Illuminate\Support\Facades\Cache;

/**
 * WhatsApp Commerce — Phase 1 foundation.
 *
 * This service is 100% deep-link (wa.me) based. It NEVER sends messages, never
 * touches the WhatsApp Business/Cloud API, and never performs automated or bulk
 * messaging. It only renders merchant-side message templates with an explicit
 * placeholder allowlist and produces wa.me:// links the merchant can open.
 *
 * Security model:
 *  - Message templates are store-isolated via the whatsapp_templates table
 *    (unique store_id+key+locale).
 *  - Placeholders are replaced through an ALLOWLIST ONLY; anything not in
 *    PLACEHOLDERS is left as literal text. No eval, no dynamic code, no URLs in
 *    placeholders (URLs are constructed by the service from Store URLs only).
 *  - Unknown placeholders are left UNRESOLVED (not stripped) so merchants always
 *    see exactly what a customer would receive.
 *
 * Honest-feature contract: all returns are deep links + rendered message text.
 * Nothing here configures, registers, or claims automatic delivery.
 */
class WhatsAppCommerceService
{
    /**
     * Settings keys persisted on StoreConfiguration (per store).
     */
    public const KEY_ENABLED = 'whatsapp_commerce_enabled';
    public const KEY_CUSTOMER_ACTIONS_ENABLED = 'whatsapp_actions_enabled';
    public const KEY_PRODUCT_SHARE_ENABLED = 'whatsapp_product_share_enabled';

    /**
     * Placeholders allowed inside merchant templates. Anything else is left
     * verbatim. Keys used for order context, customer context, cart context.
     */
    public const PLACEHOLDERS = [
        'store_name',
        'customer_name',
        'order_number',
        'order_total',
        'order_status',
        'order_date',
        'currency',
        'store_url',
        'cart_total',
        'cart_items',
        'recover_url',
        'product_name',
        'product_price',
        'product_url',
    ];

    /**
     * Canonical template keys + bilingual labels (settings page + action menus).
     */
    public const TEMPLATE_DEFINITIONS = [
        'order_received' => ['ar' => 'استلام الطلب', 'en' => 'Order received'],
        'order_confirmed' => ['ar' => 'تأكيد الطلب', 'en' => 'Order confirmed'],
        'preparing' => ['ar' => 'جاري التحضير', 'en' => 'Preparing'],
        'shipped' => ['ar' => 'تم الشحن', 'en' => 'Shipped'],
        'delivered' => ['ar' => 'تم التسليم', 'en' => 'Delivered'],
        'payment_reminder' => ['ar' => 'تذكير بالدفع', 'en' => 'Payment reminder'],
        'abandoned_cart' => ['ar' => 'استرداد سلة متروكة', 'en' => 'Abandoned cart recovery'],
        'customer_followup' => ['ar' => 'متابعة العميل', 'en' => 'Customer follow-up'],
    ];

    /**
     * Default bilingual templates (Arabic + English). Merchants can override
     * per store; defaults are the safe fallback and established values.
     */
    public const DEFAULT_TEMPLATES = [
        'ar' => [
            'order_received' => "أهلاً {customer_name}،\nوصلنا طلبك رقم {order_number} من متجر {store_name}.\nإجمالي الطلب: {order_total} {currency}. سنبدأ بتجهيزه قريباً.",
            'order_confirmed' => "أهلاً {customer_name}،\nتم تأكيد طلبك رقم {order_number} من متجر {store_name}.\nإجمالي الطلب: {order_total} {currency}. شكراً لثقتك بنا!",
            'preparing' => "أهلاً {customer_name}،\nطلبك رقم {order_number} من متجر {store_name} قيد التحضير الآن وسيتم شحنه قريباً.",
            'shipped' => "أهلاً {customer_name}،\nتم شحن طلبك رقم {order_number} من متجر {store_name}. سنراسلك عند وصوله.",
            'delivered' => "أهلاً {customer_name}،\nتم تسليم طلبك رقم {order_number} من متجر {store_name}. نتمنى أن ينال إعجابك!",
            'payment_reminder' => "أهلاً {customer_name}،\nنود تذكيرك أن طلبك رقم {order_number} من متجر {store_name} ما زال بانتظار الدفع.\nالمبلغ المطلوب: {order_total} {currency}.",
            'abandoned_cart' => "أهلاً {customer_name}،\nلاحظنا أنك تركت بعض المنتجات في سلة التسوق في متجر {store_name}:\n{cart_items}\nإجمالي السلة: {cart_total} {currency}\nأكمل طلبك الآن عبر الرابط:\n{recover_url}",
            'customer_followup' => "أهلاً {customer_name}،\nشكراً لتسوقك من متجر {store_name}.\nهل تحتاج أي مساعدة بخصوص طلبك؟ نحن في خدمتك.",
        ],
        'en' => [
            'order_received' => "Hi {customer_name},\nWe received your order {order_number} from {store_name}.\nOrder total: {order_total} {currency}. We'll start preparing it soon.",
            'order_confirmed' => "Hi {customer_name},\nYour order {order_number} from {store_name} is confirmed.\nOrder total: {order_total} {currency}. Thank you!",
            'preparing' => "Hi {customer_name},\nYour order {order_number} from {store_name} is being prepared now and will ship soon.",
            'shipped' => "Hi {customer_name},\nYour order {order_number} from {store_name} has been shipped. We'll let you know when it arrives.",
            'delivered' => "Hi {customer_name},\nYour order {order_number} from {store_name} has been delivered. Enjoy!",
            'payment_reminder' => "Hi {customer_name},\nA quick reminder that order {order_number} from {store_name} is still awaiting payment.\nAmount due: {order_total} {currency}.",
            'abandoned_cart' => "Hi {customer_name},\nYou left some items in your cart at {store_name}:\n{cart_items}\nCart total: {cart_total} {currency}\nComplete your order here:\n{recover_url}",
            'customer_followup' => "Hi {customer_name},\nThank you for shopping at {store_name}.\nDo you need any help with your order? We're here for you.",
        ],
    ];

    /**
     * Lazily seed a store's template rows with the defaults (safe, idempotent).
     * Merchants edit copies afterwards. Ensures the settings page and deep-link
     * renderer agree on the same body.
     */
    public function seedDefaults(int $storeId): void
    {
        foreach (WhatsAppTemplate::locales() as $locale) {
            foreach (WhatsAppTemplate::keys() as $key) {
                $defaultBody = self::DEFAULT_TEMPLATES[$locale][$key] ?? '';
                WhatsAppTemplate::firstOrCreate(
                    ['store_id' => $storeId, 'key' => $key, 'locale' => $locale],
                    ['body' => $defaultBody]
                );
            }
        }
    }

    /**
     * Seed defaults on the settings page render. Cheap: only inserts missing
     * rows per store (typically the first visit).
     */
    public function ensureDefaults(int $storeId): void
    {
        $this->seedDefaults($storeId);
    }

    /**
     * Resolve the effective template body for a store/key/locale.
     * Fallback chain: store row → default for locale → default 'ar' → ''.
     */
    public function templateUrlForStore(int $storeId, string $key, string $locale = 'ar'): string
    {
        $storeVersion = WhatsAppTemplate::where('store_id', $storeId)
            ->where('key', $key)
            ->where('locale', $locale)
            ->value('body');

        if ($storeVersion !== null && $storeVersion !== '') {
            return $storeVersion;
        }

        return self::DEFAULT_TEMPLATES[$locale][$key]
            ?? self::DEFAULT_TEMPLATES['ar'][$key]
            ?? '';
    }

    /**
     * Store whether the whole WhatsApp commerce feature (deep-link actions) is
     * enabled for a store. Default: enabled.
     */
    public function isEnabled(int $storeId): bool
    {
        $config = StoreConfiguration::getConfiguration($storeId);

        return filter_var($config[self::KEY_ENABLED] ?? true, FILTER_VALIDATE_BOOLEAN);
    }

    public function areOrderActionsEnabled(int $storeId): bool
    {
        return $this->isEnabled($storeId)
            && filter_var(StoreConfiguration::getConfiguration($storeId)[self::KEY_CUSTOMER_ACTIONS_ENABLED] ?? true, FILTER_VALIDATE_BOOLEAN);
    }

    public function isProductShareEnabled(int $storeId): bool
    {
        return $this->isEnabled($storeId)
            && filter_var(StoreConfiguration::getConfiguration($storeId)[self::KEY_PRODUCT_SHARE_ENABLED] ?? true, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Safe allowlist renderer. Replaces ONLY the placeholders present in
     * $context; anything else is left exactly as typed. Never evals.
     */
    public function render(string $body, array $context): string
    {
        foreach (self::PLACEHOLDERS as $placeholder) {
            if (array_key_exists($placeholder, $context)) {
                $body = str_replace('{'.$placeholder.'}', (string) $context[$placeholder], $body);
            }
        }

        return $body;
    }

    /**
     * Build a ready-to-open wa.me deep link with a prefilled message.
     */
    public function deepLink(?string $phoneE164, string $message): ?string
    {
        $identity = app(CustomerIdentityService::class);
        $digits = $identity->whatsappDigits($phoneE164);
        if ($digits === null) {
            return null;
        }

        return 'https://wa.me/' . $digits . '?text=' . rawurlencode($message);
    }

    /**
     * Normalize a store WhatsApp/phone value to wa.me digits if possible.
     */
    public function phoneDigits(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        return app(CustomerIdentityService::class)->whatsappDigits(PhoneNormalizer::normalize($phone));
    }

    public function storeUrl(Store $store): string
    {
        return $store->getStoreUrl();
    }

    public function currencySymbol(int $storeId): string
    {
        $config = StoreConfiguration::getConfiguration($storeId);

        return $config['currency_symbol'] ?? '₪';
    }

    /**
     * Build the order message context from a real order + store.
     */
    public function orderContext(Order $order, Store $store, string $currency, string $statusLabel): array
    {
        return [
            'store_name' => $store->name,
            'customer_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name) ?: 'زبون',
            'order_number' => $order->order_number,
            'order_total' => number_format((float) $order->total_amount, 2),
            'order_status' => $statusLabel,
            'order_date' => $order->created_at ? $order->created_at->format('d/m/Y H:i') : '',
            'currency' => $currency,
            'store_url' => $this->storeUrl($store),
        ];
    }

    /**
     * Order WhatsApp action block used by the merchant order detail page.
     * Returns the available action (or null) — the page renders a compose
     * dialog that opens with the prefilled message. Never sends anything.
     */
    public function orderAction(Order $order, string $key, string $locale = 'ar'): ?array
    {
        $store = $order->store;
        if (!$store) {
            return null;
        }

        if (!$this->areOrderActionsEnabled((int) $store->id)) {
            return null;
        }

        $phoneE164 = PhoneNormalizer::normalize($order->customer_phone ?? '');
        if ($phoneE164 === null) {
            return null;
        }

        $currency = $this->currencySymbol((int) $store->id);
        $statusLabel = $this->statusLabel($order->status, $locale);
        $body = $this->templateUrlForStore((int) $store->id, $key, $locale);
        $message = $this->render($body, $this->orderContext($order, $store, $currency, $statusLabel));

        return [
            'key' => $key,
            'label' => self::TEMPLATE_DEFINITIONS[$key][$locale] ?? $key,
            'message' => $message,
            'phone' => $phoneE164,
            'url' => $this->deepLink($phoneE164, $message),
        ];
    }

    /**
     * Customer CRM follow-up action for the customer 360 profile page.
     */
    public function customerAction(int $storeId, ?string $phoneE164, ?string $customerName, string $locale = 'ar'): ?array
    {
        if (!$this->areOrderActionsEnabled($storeId)) {
            return null;
        }

        if ($phoneE164 === null || $phoneE164 === '') {
            return null;
        }

        $store = Store::find($storeId);
        if (!$store) {
            return null;
        }

        $body = $this->templateUrlForStore($storeId, 'customer_followup', $locale);
        $message = $this->render($body, [
            'store_name' => $store->name,
            'customer_name' => trim((string) $customerName) ?: 'زبون',
            'store_url' => $this->storeUrl($store),
        ]);

        return [
            'key' => 'customer_followup',
            'label' => self::TEMPLATE_DEFINITIONS['customer_followup'][$locale],
            'message' => $message,
            'phone' => $phoneE164,
            'url' => $this->deepLink($phoneE164, $message),
        ];
    }

    /**
     * Abandoned-cart recovery deep-link action for the merchant dashboard.
     * Bound to the real cart record (owner store must match). Message is
     * rendered from the store template with real cart totals + recovery URL.
     */
    public function abandonedCartAction(int $abandonedCartId, string $locale = 'ar'): ?array
    {
        $cart = AbandonedCart::find($abandonedCartId);
        if (!$cart) {
            return null;
        }

        $storeId = (int) $cart->store_id;
        if (!$this->areOrderActionsEnabled($storeId)) {
            return null;
        }

        $phoneE164 = PhoneNormalizer::normalize($cart->customer_phone ?? '');
        if ($phoneE164 === null) {
            return null;
        }

        $store = Store::find($storeId);
        if (!$store) {
            return null;
        }

        $recoverUrl = $cart->getRecoverUrl();
        $items = collect($cart->cart_items ?? [])
            ->take(5)
            ->map(function ($item) {
                $name = $item['name'] ?? $item['product_name'] ?? 'منتج';
                $qty = $item['quantity'] ?? 1;

                return "• {$name} × {$qty}";
            })
            ->join("\n");

        $body = $this->templateUrlForStore($storeId, 'abandoned_cart', $locale);
        $message = $this->render($body, [
            'store_name' => $store->name,
            'customer_name' => trim((string) $cart->customer_name) ?: 'زبون',
            'cart_total' => number_format((float) $cart->cart_total, 2),
            'cart_items' => $items ?: '-',
            'recover_url' => $recoverUrl,
            'currency' => $this->currencySymbol($storeId),
            'store_url' => $this->storeUrl($store),
        ]);

        return [
            'key' => 'abandoned_cart',
            'label' => self::TEMPLATE_DEFINITIONS['abandoned_cart'][$locale],
            'message' => $message,
            'phone' => $phoneE164,
            'url' => $this->deepLink($phoneE164, $message),
        ];
    }

    /**
     * Localized order status label (best effort; falls back to raw status).
     */
    public function statusLabel(?string $status, string $locale = 'ar'): string
    {
        $labels = [
            'pending' => ['ar' => 'قيد الانتظار', 'en' => 'Pending'],
            'confirmed' => ['ar' => 'مؤكد', 'en' => 'Confirmed'],
            'processing' => ['ar' => 'قيد المعالجة', 'en' => 'Processing'],
            'preparing' => ['ar' => 'قيد التحضير', 'en' => 'Preparing'],
            'shipped' => ['ar' => 'تم الشحن', 'en' => 'Shipped'],
            'delivered' => ['ar' => 'تم التسليم', 'en' => 'Delivered'],
            'cancelled' => ['ar' => 'ملغي', 'en' => 'Cancelled'],
            'failed' => ['ar' => 'فشل', 'en' => 'Failed'],
            'refunded' => ['ar' => 'مسترجع', 'en' => 'Refunded'],
            'returned' => ['ar' => 'مرتجع', 'en' => 'Returned'],
        ];

        $key = strtolower((string) $status);

        return $labels[$key][$locale] ?? $labels[$key]['ar'] ?? (string) $status;
    }
}