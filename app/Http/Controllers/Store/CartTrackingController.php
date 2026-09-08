<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\AbandonedCart;
use App\Models\Product;
use App\Services\AbandonedCartService;
use App\Services\CartService;
use Illuminate\Http\Request;

class CartTrackingController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Track cart state for abandoned cart recovery.
     */
    public function track(Request $request)
    {
        return $this->handleDraft($request);
    }

    /**
     * Draft capture — POST /api/cart/draft
     * Debounced handler from CheckoutForm phone/email fields.
     * Accepts cart items with selected options, contact info and store ID.
     */
    public function draft(Request $request)
    {
        return $this->handleDraft($request);
    }

    private function handleDraft(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'items' => 'nullable|array',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric',
            'items.*.product_id' => 'nullable|integer',
            'items.*.options' => 'nullable',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string|max:20',
        ]);

        $storeId = $request->store_id;
        $sessionId = session()->getId();
        $customerId = \Auth::guard('customer')->id();

        // Build cart items including options/variants for fidelity
        $items = [];
        $total = 0;
        foreach ($request->items ?? [] as $item) {
            $entry = [
                'name' => $item['name'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ];
            if (isset($item['product_id'])) $entry['product_id'] = $item['product_id'];
            if (isset($item['options'])) $entry['options'] = $item['options'];
            if (isset($item['variant'])) $entry['variant'] = $item['variant'];
            if (isset($item['selectedVariants'])) $entry['selectedVariants'] = $item['selectedVariants'];
            $items[] = $entry;
            $total += $item['price'] * $item['quantity'];
        }

        // Allow draft with contact info even if cart empty (update contact on existing draft)
        if (empty($items) && empty($request->customer_email) && empty($request->customer_phone)) {
            return response()->json(['success' => true, 'tracked' => false]);
        }
        if (empty($items)) {
            // Try to hydrate from existing cart to preserve items while updating contact
            $existing = \App\Models\AbandonedCart::where('store_id', $storeId)
                ->where('session_id', $sessionId)
                ->whereNotIn('status', ['recovered', 'expired', 'unsubscribed'])
                ->first();
            if ($existing && !empty($existing->cart_items)) {
                $items = $existing->cart_items;
                $total = (float) $existing->cart_total;
            } else {
                $items = [['name' => 'Draft', 'quantity' => 1, 'price' => 0]];
            }
        }

        // Get customer info if logged in, otherwise use provided draft contact
        $customerEmail = $request->customer_email;
        $customerPhone = $request->customer_phone;
        $customerName = null;
        if ($customerId) {
            $customer = \App\Models\Customer::find($customerId);
            if ($customer) {
                $customerEmail = $customerEmail ?: $customer->email;
                $customerPhone = $customerPhone ?: $customer->phone;
                $customerName = $customer->full_name;
            }
        }
        // Fallback to email/phone derived name
        if (!$customerName && ($customerEmail || $customerPhone)) {
            $customerName = trim(($request->input('customer_first_name', '') . ' ' . $request->input('customer_last_name', ''))) ?: null;
        }

        $cart = $this->abandonedCartService->trackCart(
            $storeId,
            $sessionId,
            $customerId,
            $customerEmail,
            $customerPhone,
            $customerName,
            $items,
            $total
        );

        // Ensure recovery token exists
        if (empty($cart->recovery_token)) {
            $cart->update([
                'recovery_token' => bin2hex(random_bytes(32)),
                'expires_at' => now()->addDays(7),
            ]);
            $cart->refresh();
        }

        return response()->json([
            'success' => true,
            'tracked' => true,
            'cart_id' => $cart->id,
            // The raw recovery token is intentionally NOT returned: it is a
            // one-way credential that only ever leaves the server inside the
            // recovery URL shown on the store's own domain.
            'recover_url' => $cart->getRecoverUrl(),
        ]);
    }

    /**
     * Restore an abandoned cart into the live cart for the authoritative store.
     *
     * Tenant authority is resolved server-side only (resolved host / session
     * store context). Client-supplied store_id / session_id / customer_id are
     * never accepted as authority. The token lookup is store-scoped. A valid
     * token restores from the snapshot, but CURRENT product/variant/inventory/
     * pricing always win — the snapshot is only the recovery source.
     */
    public function recover(Request $request)
    {
        $validated = $request->validate([
            'recover_token' => ['required', 'string', 'max:255'],
        ]);

        $storeId = getAuthoritativeStoreId($request);
        if ($storeId === null) {
            return response()->json(['message' => 'Link is invalid or expired.'], 403);
        }

        $cart = AbandonedCart::where('store_id', $storeId)
            ->where('recovery_token', $validated['recover_token'])
            ->first();

        if (!$cart
            || in_array($cart->status, ['recovered', 'expired', 'unsubscribed'], true)
            || ($cart->expires_at && $cart->expires_at->isPast())
        ) {
            // One generic, customer-safe shape for every invalid/terminal token state.
            return response()->json(['message' => 'Link is invalid or expired.'], 404);
        }

        /** @var CartService $cartService */
        $cartService = app(CartService::class);

        $restored = 0;
        $skipped = 0;
        foreach (is_array($cart->cart_items) ? $cart->cart_items : [] as $entry) {
            if (empty($entry['product_id'])) {
                $skipped++;
                continue;
            }
            // CURRENT product truth: only an active product of THIS store may be
            // restored. Deleted / disabled products are truthfully skipped.
            $product = Product::where('store_id', $storeId)
                ->where('is_active', true)
                ->find($entry['product_id']);
            if (!$product) {
                $skipped++;
                continue;
            }
            $rawVariants = $entry['selectedVariants'] ?? $entry['options'] ?? $entry['variant'] ?? null;
            $variants = is_array($rawVariants) ? $rawVariants : null;

            $result = $cartService->addItem(
                $storeId,
                $product,
                (int) ($entry['quantity'] ?? 1),
                $variants,
                true
            );

            if ($result['ok']) {
                $restored++;
            } else {
                // Current stock/variant truth rejects the snapshot entry — skip it.
                $skipped++;
            }
        }

        return response()->json([
            'success' => true,
            'restored' => $restored,
            'skipped' => $skipped,
        ]);
    }
}
