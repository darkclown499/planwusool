# Manual Merchant Order Creation (Phase 5B — Task B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Wusool merchant create a real, server-authoritative order in the dashboard on behalf of a customer who orders by phone/WhatsApp/offline (order_source `manual`), reusing the same canonical order + inventory + lifecycle pipeline the storefront and POS use.

**Architecture:** A new `ManualOrderService` mirrors `PointOfSaleService`: it validates inputs store-scoped, computes every money field from canonical product/variant/tax/shipping data (never from the client), then delegates to `OrderService::createOrder` (same `InventoryService::decrementForCartLine` ledger path). The controller adds `POST orders → orders.store`, and the stub `orders/create.tsx` becomes a real RTL/mobile form. Order stays `pending`/`pending`, joinable with the existing transition/collect-Cod/confirm-bank/PDF-invoice/bulk flows.

**Tech Stack:** Laravel 12, Inertia 2, React 19 + TypeScript, Tailwind 4, PHPUnit (sqlite `:memory:`), spatie/laravel-permission, React i18next.

**Spec:** Phase 5B Task B1 (manual merchant order creation) — see `docs/superpowers/plans/2026-09-10-manual-order-create.md` (this plan is the working spec until the canonical Phase 5B design doc lands). Business rules are pinned in `AGENTS.md` (Order terminology, end-to-end rule, plan/entitlement, tenant isolation, payment truth).

## Global Constraints

- **Server-authoritative money.** Subtotals, tax, shipping, totals, unit prices are computed ONLY from canonical records. Client-supplied `price`, `subtotal`, `tax_amount`, `shipping_amount`, `discount_amount`, `total_amount`, `status`, `payment_status` must be ignored (never read, never stored from the request). The forged-payload tests depend on this.
- **Tenant isolation.** Never trust a request `store_id`. Store identity comes from `getCurrentStoreId($user)` (`app/Helpers/helper.php:1664`). Every product/variant/customer/shipping-method lookup is `where('store_id', $storeId)`-scoped. Unscoped `exists` validation rules are banned — use scoped `Rule::exists(...)->where('store_id', $storeId)`.
- **Payment truth.** Only `OrderTransitionService::OFFLINE_PAYMENT_METHODS` (`['cod','cash','cash_on_delivery','bank','bank_transfer','whatsapp','offline']`) are allowed. No gateway/card method; the order is created with `payment_status = 'pending'` and can only become paid through the existing authoritative flows (`collectCod`, `confirmBankTransfer`, `canManuallyMarkPaid`).
- **Reuse, don't rebuild.** Manual orders are ordinary Wusool orders. Do NOT copy inventory decrement, do NOT build a parallel status machine, do NOT touch the six storefront templates, and do NOT change `CartCalculationService`, `OrderService::createOrder` signature, or any migration.
- **Order lifecycle.** Created as `pending` → shows in the merchant "جديد" grouped tab (`pending`/`confirmed`). `delivered`/`تم التسليم` remains an individual status; **مكتملة** remains the group tab — never conflate.
- **Events.** `OrderService::createOrder` does NOT fire `OrderCreated`; storefront offline methods fire it in `processCashOnDelivery`/`processBankTransferPayment`/`processOfflinePayment`. `ManualOrderService` fires `new OrderCreated($order)` exactly once, after creation, so merchant notifications/webhooks/emails behave like a COD storefront order. Do not fire it twice.
- **Loyalty.** Points are NEVER awarded at creation (deferred to DELIVERED via `AwardLoyaltyOnDelivery`).
- **Idempotency.** The form sends a `crypto.randomUUID()` `idempotency_key`; the controller redirects to the already-created order if that key exists for this store. No DB migration. NOTE: a UNIQUE index `(store_id, idempotency_key)` ALREADY exists (`orders_store_id_idempotency_unique`, migration `2026_08_27_000012_fix_order_idempotency_unique_and_storage_hardening`) — the DB is already hardened, so a true concurrent duplicate surfaces as an insert exception caught by `store()`'s `catch (\Exception)` → back with `errors.general`. Report this accurately (do NOT claim no unique index exists).
- **i18n convention.** Follow the existing dashboard convention: `t('English key')` with fallback keys (Arabic-primary storefront copy is not in scope). Introduce 0 new i18n/TS build errors.
- **UI.** RTL/Arabic dashboard, functional at ~390px and desktop. No horizontal overflow; stacked tabs on mobile; disabled submit while processing (double-submit guard).
- **Commits.** THIS LANE REQUIRES A SINGLE FINAL COMMIT: `feat(orders): add manual merchant order creation`. Do NOT create per-task commits. After Task 4's gates pass, stage only the owned files and make ONE commit. Never stage the pre-existing untracked repo-root artifacts (PNGs, `_audit_build_templates.php`, `audit-report.md`, CSVs).
- **Gates.** `php artisan test --filter=ManualOrderCreationTest`, focused regressions, `npm run types`, `npm run build`, `git diff --check`, `git status --short`.
- **Environment.** Windows PowerShell; `rg` is unavailable — use the grep/glob tools. Worktree note: this lane ran in the main workdir (deviation, record in report). Do NOT push or deploy.

---

### Task 1: `ManualOrderService` + service-level tests

**Files:**
- Create: `app/Services/ManualOrderService.php`
- Create: `tests/Feature/ManualOrderCreationTest.php` (this task fills the service-level test methods; Task 2 appends the HTTP-level methods to the same file)

**Interfaces:**
- Consumes: `OrderService::createOrder(array $orderData, array $cartItems): Order`; `Order::forceCreate` per-line keys (`product_variants`, `variant_combination_id`, `variant_uuid`, `inventory_mode`, `unit_price`, `total_price`, `tax_details`); `Product::effectivePriceForVariant($selection)`, `Product::resolveVariantCombination($selection)`, `Product::variant_combinations` attribute; `InventoryService::decrementForCartLine`; `OrderTransitionService::OFFLINE_PAYMENT_METHODS`; `App\Events\OrderCreated`.
- Produces: `ManualOrderService::createManualOrder(int $storeId, array $data): Order`. `$data` keys consumed: `payment_method` (string), `items` (`[{product_id:int, quantity:int, variant_id?:string, variant_uuid?:string}]`), `customer_id` (int|null), `first_name`, `last_name`, `email`, `phone`, `shipping_method_id`, `shipping_address`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country`, `notes`, `idempotency_key`. Throws `\Exception` with Arabic messages. Sets `customer_id` on the order when a store-validated customer is supplied.

- [ ] **Step 1: Write the failing service tests**

Append these test methods to `tests/Feature/ManualOrderCreationTest.php`. The file will be created in this step with the full structure below; the `createManualOrder` calls fail because `ManualOrderService` does not exist yet.

```php
<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Services\ManualOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualOrderCreationTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-orders', 'create-orders', 'view-orders', 'edit-orders'])->get();
        if ($perms->count() > 0) {
            $role->syncPermissions($perms);
            $user->assignRole($role);
        } else {
            $user->type = 'superadmin';
            $user->save();
        }
        return [$user, $store];
    }

    private function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    private function product(Store $store, Category $cat, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    private function variantProduct(Store $store, Category $cat): Product
    {
        return $this->product($store, $cat, [
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S', 'M']]],
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
                ['id' => 'Red‖M', 'uuid' => 'uuid-red-m', 'values' => ['Red', 'M'], 'label' => 'Red / M', 'price' => '110', 'stock' => '10', 'sku' => 'RED-M', 'image' => ''],
            ],
            'stock' => 999,
        ]);
    }

    private function customer(Store $store, array $over = []): Customer
    {
        return Customer::create(array_merge([
            'store_id' => $store->id,
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'password' => bcrypt('secret'),
            'is_active' => true,
        ], $over));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    public function test_manual_order_is_created_with_order_source_manual_and_pending_state(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['price' => 100, 'stock' => 10]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'phone' => '0599000000',
        ]);

        $this->assertSame('manual', $order->order_source);
        $this->assertSame('pending', $order->status);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame(200.0, (float) $order->subtotal);
        $this->assertSame(200.0, (float) $order->total_amount);
        $this->assertSame('maha@example.com', $order->customer_email);
        $this->assertSame(1, OrderItem::where('order_id', $order->id)->count());
        $this->assertSame(200.0, (float) OrderItem::firstWhere('order_id', $order->id)->total_price);
    }

    public function test_manual_order_ignores_forged_prices_and_totals(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['price' => 100, 'stock' => 10]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2, 'price' => 0.01]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'subtotal' => 0.01,
            'tax_amount' => 999,
            'shipping_amount' => 999,
            'total_amount' => 0.01,
        ]);

        $this->assertSame(200.0, (float) $order->subtotal, 'forged subtotal must be ignored');
        $this->assertSame(200.0, (float) $order->total_amount, 'forged total must be ignored');
        $this->assertSame(200.0, (float) OrderItem::firstWhere('order_id', $order->id)->product_price, 'forged unit price must be ignored');
        $this->assertSame(0.0, (float) $order->shipping_amount);
    }

    public function test_manual_order_with_variant_uses_effective_variant_price_and_decrements_variant_stock(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'variant_id' => 'Red‖M', 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);

        $item = OrderItem::firstWhere('order_id', $order->id);
        $this->assertSame(110.0, (float) $item->product_price, 'variant price must win');
        $this->assertSame(220.0, (float) $order->subtotal);
        $combos = $p->fresh()->variant_combinations;
        $this->assertSame('8', collect($combos)->firstWhere('id', 'Red‖M')['stock'], 'variant stock must decrement');
        $this->assertSame(InventoryMovement::MOVEMENT_ONLINE_SALE, InventoryMovement::where('reference_id', $order->id)->value('type'));
    }

    public function test_manual_order_requires_variant_selection_for_variant_products(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1], ['product_id' => $p->id, 'variant_id' => 'Red‖S', 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_rejects_out_of_stock_tracked_product(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 1]);

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_rejects_online_gateway_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'stripe',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_links_store_scoped_customer_and_rejects_foreign_customer(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $other = $this->category(Store::factory()->create());
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));
        $cust = $this->customer($store);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'customer_id' => $cust->id,
        ]);
        $this->assertSame($cust->id, $order->customer_id);

        $foreignCustomer = Customer::create(['store_id' => 99999, 'first_name' => 'X', 'last_name' => 'Y', 'email' => 'x@y.com', 'password' => bcrypt('p'), 'is_active' => true]);
        try {
            app(ManualOrderService::class)->createManualOrder($store->id, [
                'items' => [['product_id' => $p->id, 'quantity' => 1]],
                'payment_method' => 'cod',
                'customer_id' => $foreignCustomer->id,
            ]);
            $this->fail('foreign customer must be rejected');
        } catch (\Exception $e) {
            $this->assertStringContainsString('العميل', $e->getMessage());
        }
    }

    public function test_manual_order_computes_exclusive_tax_and_shipping_from_canonical_data(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $tax = \App\Models\Tax::create(['store_id' => $store->id, 'name' => 'VAT', 'rate' => 10, 'type' => 'percentage', 'is_active' => true]);
        $p = $this->product($store, $cat, ['price' => 100, 'is_tax_included' => false, 'tax_id' => $tax->id]);
        $ship = Shipping::create(['store_id' => $store->id, 'name' => 'Flat', 'type' => 'fixed', 'cost' => 15, 'handling_fee' => 5, 'is_active' => true]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'shipping_method_id' => $ship->id,
            'shipping_address' => 'Ramallah 1',
            'shipping_city' => 'Ramallah',
        ]);

        $this->assertSame(200.0, (float) $order->subtotal);
        $this->assertSame(20.0, (float) $order->tax_amount);
        $this->assertSame(20.0, (float) $order->shipping_amount, 'cost + handling_fee = 15 + 5');
        $this->assertSame(240.0, (float) $order->total_amount);
    }

    public function test_manual_order_keeps_bank_payment_pending_for_authoritative_confirmation(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);

        $this->assertSame('pending', $order->payment_status);
        $this->assertNull($order->paid_at);
    }

    public function test_manual_order_requires_valid_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => '',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: FAIL with "Class 'App\Services\ManualOrderService' not found" and the test methods failing on class resolution.

- [ ] **Step 3: Write the minimal implementation**

Create `app/Services/ManualOrderService.php`:

```php
<?php

namespace App\Services;

use App\Events\OrderCreated;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipping;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Manual merchant order — a real Wusool order placed on behalf of a customer
 * over phone/WhatsApp/offline by the merchant in the dashboard.
 *
 * It deliberately REUSES the canonical OrderService::createOrder (same order +
 * order-item + InventoryService ledger path as storefront and POS), so manual
 * stock decrement and online stock can never diverge. order_source = 'manual'.
 *
 * AUTHORITATIVE PRICING: every price/subtotal/tax/shipping/total is computed
 * here from canonical product/variant/tax/shipping data. Client-supplied
 * prices or totals are NEVER read (the forged-payload tests rely on this).
 */
class ManualOrderService
{
    public const ORDER_SOURCE = 'manual';

    public function createManualOrder(int $storeId, array $data): Order
    {
        $paymentMethod = (string) ($data['payment_method'] ?? '');
        if (!in_array($paymentMethod, OrderTransitionService::OFFLINE_PAYMENT_METHODS, true)) {
            throw new \Exception('طريقة الدفع غير مدعومة في الطلب اليدوي.');
        }

        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new \Exception('لا يمكن إنشاء طلب بدون أصناف.');
        }

        $customer = $this->resolveCustomer($storeId, $data);

        return DB::transaction(function () use ($storeId, $data, $items, $customer, $paymentMethod) {
            $currency = $this->storeCurrency($storeId);

            $subtotal = 0.0;
            $taxAmount = 0.0;
            $exclusiveTax = 0.0;
            $cartItems = [];
            foreach ($items as $i => $line) {
                $productId = (int) ($line['product_id'] ?? 0);
                $qty = (int) ($line['quantity'] ?? 0);
                if ($qty <= 0) {
                    throw new \Exception('الكمية يجب أن تكون أكبر من صفر للمنتج ' . ($i + 1) . '.');
                }

                $product = Product::with('tax')->where('id', $productId)
                    ->where('store_id', $storeId)
                    ->where('is_active', true)
                    ->first();
                if (!$product) {
                    throw new \Exception('منتج غير موجود في هذا المتجر.');
                }

                $variantId = $line['variant_id'] ?? $line['variant_combination_id'] ?? null;
                $variantUuid = $line['variant_uuid'] ?? null;
                $selection = null;
                if ($variantId || $variantUuid) {
                    $comboInfo = $this->resolveComboByRef($product, $variantId, $variantUuid);
                    if (!$comboInfo) {
                        throw new \Exception('خيار غير موجود للمنتج ' . $product->name . '.');
                    }
                    $selection = $comboInfo['id'] ?? $comboInfo;
                }

                $unitPrice = (float) $product->effectivePriceForVariant($selection);

                $sku = $product->sku;
                if ($selection) {
                    $resolved = $product->resolveVariantCombination($selection);
                    $sku = $resolved['sku'] ?? $product->sku;
                }

                $lineTotal = $unitPrice * $qty;

                $linePayload = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'sku' => $sku,
                    'price' => $unitPrice,
                    'quantity' => $qty,
                    'variants' => $selection,
                ];

                // Per-line tax mirrors CartCalculationService (discount = 0).
                $rate = 0.0;
                $inclusive = false;
                if ($product->tax && (float) $product->tax->rate > 0) {
                    $rate = (float) $product->tax->rate;
                    $inclusive = (bool) $product->is_tax_included;
                    $linePayload['taxName'] = $product->tax->name ?? null;
                    $linePayload['taxPercentage'] = $rate;
                    $linePayload['taxType'] = $product->tax->type ?? null;
                }
                $subtotal += $lineTotal;
                if ($inclusive) {
                    // Tax is embedded in the item price: report it, do not add it on top.
                    $taxAmount += $lineTotal - ($lineTotal / (1 + $rate / 100));
                } else {
                    $lineTax = $lineTotal * ($rate / 100);
                    $taxAmount += $lineTax;
                    $exclusiveTax += $lineTax;
                }

                $cartItems[] = $linePayload;
            }
            $subtotal = round($subtotal, 2);
            $taxAmount = round($taxAmount, 2);
            $exclusiveTax = round($exclusiveTax, 2);

            $shippingFee = $this->shippingFee($storeId, $data, $subtotal);
            $totalAmount = round($subtotal + $shippingFee + $exclusiveTax, 2);

            $address = (string) ($data['shipping_address'] ?? '');
            $city = (string) ($data['shipping_city'] ?? '');
            $state = (string) ($data['shipping_state'] ?? '');
            $country = (string) ($data['shipping_country'] ?? '');
            $postal = (string) ($data['shipping_postal_code'] ?? '');

            $orderData = [
                'store_id' => $storeId,
                'order_source' => self::ORDER_SOURCE,
                'payment_method' => $paymentMethod,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'shipping_amount' => $shippingFee,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'currency' => $currency,
                'customer_email' => $customer['email'],
                'customer_phone' => $customer['phone'],
                'customer_first_name' => $customer['first_name'],
                'customer_last_name' => $customer['last_name'],
                'shipping_address' => $address !== '' ? $address : 'كما هو',
                'shipping_city' => $city ?: '—',
                'shipping_state' => $state ?: '',
                'shipping_postal_code' => $postal,
                'shipping_country' => $country ?: '',
                'billing_address' => $address !== '' ? $address : 'كما هو',
                'billing_city' => $city ?: '—',
                'billing_state' => $state ?: '',
                'billing_postal_code' => $postal,
                'billing_country' => $country ?: '',
                'shipping_method_id' => $data['shipping_method_id'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'notes' => $data['notes'] ?? null,
                'payment_gateway' => $paymentMethod,
            ];

            $order = app(OrderService::class)->createOrder($orderData, $cartItems);

            if ($customer['id'] !== null) {
                $order->customer_id = $customer['id'];
            }
            $order->save();
            $order = $order->fresh();

            // Canonical event parity with the storefront offline methods:
            // OrderCreated fires exactly once, after creation. Listeners are
            // afterCommit + deduplicated, so no duplicate emails/notifications.
            event(new OrderCreated($order));

            return $order;
        });
    }

    /**
     * Resolve the customer (store-scoped) or guest fields.
     * @return array{id:?int,first_name:string,last_name:string,email:string,phone:string}
     */
    private function resolveCustomer(int $storeId, array $data): array
    {
        $customerId = $data['customer_id'] ?? null;
        if ($customerId) {
            $customer = Customer::where('id', $customerId)->where('store_id', $storeId)->first();
            if (!$customer) {
                throw new \Exception('العميل المحدد غير موجود في هذا المتجر.');
            }
            return [
                'id' => $customer->id,
                'first_name' => $customer->first_name ?? '',
                'last_name' => $customer->last_name ?? '',
                'email' => $customer->email ?: sprintf('manual-%d@local', $storeId),
                'phone' => $customer->phone ?? '',
            ];
        }

        $first = (string) ($data['first_name'] ?? '');
        if ($first === '') {
            throw new \Exception('اسم العميل مطلوب.');
        }
        // orders.customer_email is NOT NULL; keep a deterministic store-scoped
        // placeholder when the merchant has no email on file (multi-store safe,
        // no synthetic customer row is ever created).
        $email = (string) ($data['email'] ?? '');
        if ($email === '') {
            $email = sprintf('manual-%d@local', $storeId);
        }
        return [
            'id' => null,
            'first_name' => $first,
            'last_name' => (string) ($data['last_name'] ?? ''),
            'email' => $email,
            'phone' => (string) ($data['phone'] ?? ''),
        ];
    }

    /**
     * Shipping fee mirror of CartCalculationService (no free-shipping threshold override).
     * free_shipping → 0; percentage_based → subtotal*cost% + handling; else cost + handling.
     */
    private function shippingFee(int $storeId, array $data, float $subtotal): float
    {
        $id = $data['shipping_method_id'] ?? null;
        if (!$id) {
            return 0.0;
        }
        $method = Shipping::where('id', $id)->where('store_id', $storeId)->where('is_active', true)->first();
        if (!$method) {
            throw new \Exception('طريقة التوصيل المحددة غير موجودة في هذا المتجر.');
        }
        $cost = (float) ($method->cost ?? 0);
        $handling = (float) ($method->handling_fee ?? 0);
        $type = strtolower((string) $method->type);
        if (in_array($type, ['free_shipping', 'free'], true)) {
            return 0.0;
        }
        if (in_array($type, ['percentage_based', 'percentage'], true)) {
            return round(($subtotal * $cost / 100) + $handling, 2);
        }
        return round($cost + $handling, 2);
    }

    private function resolveComboByRef(Product $product, ?string $variantId, ?string $variantUuid): ?array
    {
        $combos = $product->variant_combinations ?? [];
        if (!is_array($combos)) {
            return null;
        }
        foreach ($combos as $c) {
            if ($variantUuid && (($c['uuid'] ?? null) === $variantUuid)) {
                return $c;
            }
        }
        foreach ($combos as $c) {
            if ($variantId && (($c['id'] ?? null) === $variantId)) {
                return $c;
            }
        }
        return null;
    }

    private function storeCurrency(int $storeId): string
    {
        $store = \App\Models\Store::find($storeId);
        if ($store && !empty($store->currency)) {
            return strtoupper($store->currency);
        }
        try {
            $settings = app(\App\Services\Currency\CurrencyService::class)->getCurrencySettings(
                Auth::guard('web')->id(),
                $storeId
            );
            $code = $settings['defaultCurrency'] ?? null;
            if ($code) {
                return strtoupper($code);
            }
        } catch (\Throwable $e) {
            Log::warning('Manual order currency lookup failed', ['store_id' => $storeId, 'error' => $e->getMessage()]);
        }
        return 'ILS';
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: PASS (all service-level methods). NOTE: at this point `routes` have no `orders.store` and no controller `store()` yet — these service tests call `ManualOrderService` directly, so they pass independently.

- [ ] **Step 5: Commit** — SKIP (single final commit at Task 4; see Global Constraints).

---

### Task 2: `orders.store` route + `OrderController::store()` + HTTP integration tests

**Files:**
- Modify: `routes/web.php` (insert one line after line 998)
- Modify: `app/Http/Controllers/OrderController.php` (add imports + `store()` method)
- Modify: `tests/Feature/ManualOrderCreationTest.php` (append HTTP-level tests)

**Interfaces:**
- Consumes: `ManualOrderService::createManualOrder(int $storeId, array $data): Order` (Task 1).
- Produces: `POST orders` route named `orders.store` (permission `create-orders`), `OrderController::store(Request $request): RedirectResponse`. Redirects to `orders.show` on success; on `\Exception` redirects back with `errors.general`; on duplicate `idempotency_key` redirects to the existing order.

- [ ] **Step 1: Write the failing HTTP tests**

Append to `tests/Feature/ManualOrderCreationTest.php`:

```php
    public function test_merchant_can_create_manual_order_via_http_and_is_redirected_to_show(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 10]);

        $response = $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-1',
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha2@example.com',
            'phone' => '0599000000',
            'shipping_address' => 'Ramallah 1',
            'shipping_city' => 'Ramallah',
        ]);

        $order = Order::firstWhere('store_id', $store->id);
        $this->assertNotNull($order);
        $this->assertSame('manual', $order->order_source);
        $this->assertSame('pending', $order->status);
        $response->assertRedirect(route('orders.show', $order->id));
    }

    public function test_duplicate_idempotency_key_returns_the_same_order_without_duplicate(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $payload = [
            'idempotency_key' => 'manual-key-same',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha3@example.com',
        ];
        $first = $this->post(route('orders.store'), $payload);
        $order = Order::firstWhere('store_id', $store->id);
        $this->assertNotNull($order);
        $first->assertRedirect(route('orders.show', $order->id));

        $second = $this->post(route('orders.store'), $payload);
        $second->assertRedirect(route('orders.show', $order->id));
        $this->assertSame(1, Order::where('store_id', $store->id)->count(), 'no duplicate order');
    }

    public function test_cross_store_product_is_rejected_and_no_order_created(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $otherUser = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $otherStore = Store::factory()->create(['user_id' => $otherUser->id]);
        $otherProduct = $this->product($otherStore, $this->category($otherStore));
        $this->actingAs($user);

        $response = $this->from(route('orders.index'))->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-xstore',
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha4@example.com',
        ]);

        $response->assertSessionHasErrors('general');
        $this->assertSame(0, Order::where('store_id', $store->id)->count());
    }

    public function test_guest_without_create_orders_permission_is_forbidden(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();
        $this->actingAs($user);

        $this->post(route('orders.store'), [
            'items' => [],
            'payment_method' => 'cod',
        ])->assertStatus(403);
    }

    public function test_online_gateway_payment_method_is_rejected_by_validation(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->from(route('orders.create'))->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-stripe',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'stripe',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha5@example.com',
        ])->assertSessionHasErrors('payment_method');

        $this->assertSame(0, Order::where('store_id', $store->id)->count());
    }

    public function test_manual_cod_order_can_be_collected_via_canonical_lifecycle_and_show_invoice(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 10]);

        $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-cod',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha6@example.com',
        ]);
        $order = Order::firstWhere('store_id', $store->id);

        $this->assertSame('pending', $order->payment_status);
        $this->post(route('orders.collect-cod', $order->id))->assertRedirect();
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->get(route('orders.invoice', $order->id))->assertOk();
    }

    public function test_manual_order_starts_in_the_new_grouped_tab(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-newtab',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha7@example.com',
        ]);
        $order = Order::firstWhere('store_id', $store->id);

        $this->assertSame('pending', $order->status, 'manual orders start pending');
        $this->assertContains(
            $order->status,
            \App\Http\Controllers\OrderController::ORDER_GROUPS['new'],
            'pending must live in the merchant new tab'
        );
    }
```

- [ ] **Step 2: Run the HTTP tests to verify they fail**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: FAIL with "Route [orders.store] not defined" / 404 for the HTTP methods.

- [ ] **Step 3: Add the route**

In `routes/web.php`, insert this line immediately after line 998 (`orders/create`), keeping the same group and middleware:

```php
            Route::post('orders', [\App\Http\Controllers\OrderController::class, 'store'])->middleware('permission:create-orders')->name('orders.store');
```

- [ ] **Step 4: Add `store()` to `OrderController`**

Add these imports at the top of `app/Http/Controllers/OrderController.php`:

```php
use App\Services\ManualOrderService;
use App\Services\OrderTransitionService;
use Illuminate\Validation\Rule;
```

Add this method (place it directly after `create()` at line 537):

```php
    /**
     * Create a manual merchant order (phone/WhatsApp/offline) for a store.
     * All money is authoritative server-side (see ManualOrderService) — the
     * client can never set prices/totals/status, and all lookups are store-scoped.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $request->validate([
            'idempotency_key' => ['nullable', 'string', 'max:255'],
            'customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')->where('store_id', $storeId)],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.variant_id' => ['nullable', 'string', 'max:255'],
            'items.*.variant_uuid' => ['nullable', 'string', 'max:255'],
            'shipping_method_id' => ['nullable', 'integer', Rule::exists('shippings', 'id')->where('store_id', $storeId)->where('is_active', true)],
            'payment_method' => ['required', Rule::in(OrderTransitionService::OFFLINE_PAYMENT_METHODS)],
            'shipping_address' => ['nullable', 'string', 'max:1000'],
            'shipping_city' => ['nullable', 'string', 'max:255'],
            'shipping_state' => ['nullable', 'string', 'max:255'],
            'shipping_postal_code' => ['nullable', 'string', 'max:50'],
            'shipping_country' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        // Idempotent re-submit: the same form instance (same key) returns the
        // already-created order instead of creating a duplicate.
        $key = $data['idempotency_key'] ?? null;
        if ($key) {
            $existing = Order::where('store_id', $storeId)->where('idempotency_key', $key)->first();
            if ($existing) {
                return redirect()->route('orders.show', $existing->id);
            }
        }

        try {
            $order = app(ManualOrderService::class)->createManualOrder($storeId, $data);
        } catch (\Exception $e) {
            return back()->withErrors(['general' => $e->getMessage()])->withInput();
        }

        return redirect()->route('orders.show', $order->id)
            ->with('success', __('Order created successfully'));
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: PASS (all service + HTTP methods).

- [ ] **Step 6: Commit** — SKIP (single final commit at Task 4).

---

### Task 3: Enrich `create()` payload + rebuild `orders/create.tsx`

**Files:**
- Modify: `app/Http/Controllers/OrderController.php` (`create()` at lines 496–537 + private `manualPaymentLabel()`)
- Modify: `resources/js/pages/orders/create.tsx` (full rewrite of the stub)

**Interfaces:**
- Consumes: `orders.store` route (Task 2); `OrderTransitionService::OFFLINE_PAYMENT_METHODS`.
- Produces: page props `{ customers, products, shippingMethods, paymentMethods, currency }` for `orders/create`. Product objects expose `variant_combinations` so the UI can preview variant unit prices (final prices still server-computed).

- [ ] **Step 1: Write the failing page-props test**

Append to `tests/Feature/ManualOrderCreationTest.php`:

```php
    public function test_create_page_provides_form_data_for_the_manual_form(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));
        $this->customer($store);
        Shipping::create(['store_id' => $store->id, 'name' => 'Flat', 'type' => 'fixed', 'cost' => 15, 'is_active' => true]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $this->inertiaVersion()])
            ->get(route('orders.create'));

        $response->assertStatus(200);
        $props = $response->inertiaPage()['props'];
        $this->assertNotEmpty($props['customers']);
        $this->assertNotEmpty($props['products']);
        $this->assertNotEmpty($props['shippingMethods']);
        $this->assertNotEmpty($props['paymentMethods']);
        $this->assertSame('ILS', $props['currency']);
        $line = collect($props['products'])->firstWhere('id', $p->id);
        $this->assertTrue($line['has_variants']);
        $this->assertNotEmpty($line['variant_combinations']);
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: FAIL — `paymentMethods`/`currency`/`variant_combinations` missing from current `create()` payload.

- [ ] **Step 3: Enrich `create()`**

Replace the blocks in `OrderController::create()` (lines 513–530) so the products include variant/tax/stock data, shipping methods include `type`/`handling_fee`, and payment methods + currency are passed:

```php
        $store = \App\Models\Store::find($storeId);

        // Products with variant data so the frontend can preview the
        // server-authoritative unit price (final math happens server-side).
        $products = Product::with('tax')->where('store_id', $storeId)
            ->where('is_active', true)
            ->get(['id', 'name', 'sku', 'price', 'sale_price', 'stock', 'is_tax_included', 'track_inventory', 'variants', 'variant_combinations'])
            ->map(function ($product) {
                $variants = collect($product->variant_combinations ?? [])->map(function ($vc) use ($product) {
                    return [
                        'id' => $vc['id'] ?? null,
                        'uuid' => $vc['uuid'] ?? null,
                        'label' => $vc['label'] ?? '',
                        'price' => (float) ($vc['price'] ?? 0),
                        'sku' => $vc['sku'] ?? $product->sku,
                        'stock' => (int) ($vc['stock'] ?? 0),
                    ];
                })->values();
                return [
                    'id' => $product->id,
                    'name' => cleanUtf8($product->name),
                    'sku' => $product->sku,
                    'price' => (float) ($product->sale_price ?? $product->price),
                    'is_tax_included' => (bool) $product->is_tax_included,
                    'stock' => (int) $product->stock,
                    'has_variants' => $variants->isNotEmpty(),
                    'variant_combinations' => $variants,
                ];
            })->values();

        // Shipping methods (full cost data for the fee preview).
        $shippingMethods = Shipping::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'type', 'cost', 'handling_fee')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => cleanUtf8($method->name),
                    'type' => $method->type,
                    'cost' => (float) $method->cost,
                    'handling_fee' => (float) ($method->handling_fee ?? 0),
                ];
            });

        $paymentMethods = collect(OrderTransitionService::OFFLINE_PAYMENT_METHODS)
            ->map(fn ($value) => ['value' => $value, 'label' => $this->manualPaymentLabel($value)])
            ->values();

        $currency = 'ILS';
        if ($store && !empty($store->currency)) {
            $currency = strtoupper($store->currency);
        } else {
            try {
                $settings = app(\App\Services\Currency\CurrencyService::class)->getCurrencySettings($user->id, $storeId);
                $code = $settings['defaultCurrency'] ?? null;
                $currency = $code ? strtoupper($code) : $currency;
            } catch (\Throwable $e) {
                // fall back to default
            }
        }

        return Inertia::render('orders/create', [
            'customers' => $customers,
            'products' => $products,
            'shippingMethods' => $shippingMethods,
            'paymentMethods' => $paymentMethods,
            'currency' => $currency,
        ]);
```

Add the private label helper (place near the end of the class):

```php
    private function manualPaymentLabel(string $method): string
    {
        return match ($method) {
            'cod', 'cash_on_delivery' => 'الدفع عند الاستلام',
            'cash' => 'كاش',
            'bank', 'bank_transfer' => 'تحويل بنكي',
            'whatsapp' => 'واتساب',
            'offline' => 'دفع يدوي',
            default => $method,
        };
    }
```

- [ ] **Step 4: Rewrite `resources/js/pages/orders/create.tsx`**

Replace the entire stub with:

```tsx
import React, { useMemo, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, useForm } from '@inertiajs/react';

interface CustomerOption { id: number; name: string; email: string }
interface VariantOption { id: string; uuid: string; label: string; price: number; sku: string; stock: number }
interface ProductOption {
  id: number; name: string; sku: string; price: number; is_tax_included: boolean;
  stock: number; has_variants: boolean; variant_combinations: VariantOption[];
}
interface ShippingOption { id: number; name: string; type: string; cost: number; handling_fee: number }
interface PaymentOption { value: string; label: string }

interface CreateOrderPageProps {
  customers: CustomerOption[];
  products: ProductOption[];
  shippingMethods: ShippingOption[];
  paymentMethods: PaymentOption[];
  currency: string;
}

interface OrderLine { product_id: string; variant_id: string; quantity: number }

export default function CreateOrder(props: CreateOrderPageProps) {
  const { t } = useTranslation();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  const { data, setData, errors, processing } = useForm({
    idempotency_key: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `manual-${Date.now()}`,
    customer_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    items: [{ product_id: '', variant_id: '', quantity: 1 }] as OrderLine[],
    shipping_method_id: '',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: '',
    payment_method: 'cod',
    notes: '',
  });

  const setItem = (index: number, patch: Partial<OrderLine>) => {
    setData('items', data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setData('items', [...data.items, { product_id: '', variant_id: '', quantity: 1 }]);
  const removeItem = (index: number) =>
    setData('items', data.items.length > 1 ? data.items.filter((_, i) => i !== index) : data.items);

  const unitPrice = (line: OrderLine): number => {
    const product = props.products.find((p) => p.id === Number(line.product_id));
    if (!product) return 0;
    if (product.has_variants && line.variant_id) {
      const combo = product.variant_combinations.find((v) => v.id === line.variant_id || v.uuid === line.variant_id);
      if (combo && combo.price) return combo.price;
    }
    return product.price;
  };

  const lineTotal = (line: OrderLine) => unitPrice(line) * line.quantity;

  const subtotal = useMemo(
    () => data.items.reduce((sum, line) => sum + (Number(line.product_id) ? lineTotal(line) : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.items, props.products]
  );

  const shippingPreview = useMemo(() => {
    const method = props.shippingMethods.find((m) => m.id === Number(data.shipping_method_id));
    if (!method) return 0;
    if (method.type === 'free_shipping' || method.type === 'free') return 0;
    if (method.type === 'percentage_based' || method.type === 'percentage') {
      return subtotal * method.cost / 100 + method.handling_fee;
    }
    return method.cost + method.handling_fee;
  }, [data.shipping_method_id, subtotal, props.shippingMethods]);

  const totalPreview = subtotal + shippingPreview;

  const submit = () => {
    const payload = {
      ...data,
      customer_id: customerMode === 'new' ? '' : data.customer_id,
      items: data.items.map((line) => ({ ...line, product_id: Number(line.product_id) })),
    };
    router.post(route('orders.store'), payload, { preserveScroll: false });
  };

  const pageActions = [
    {
      label: t('Create Order'),
      icon: processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      disabled: processing,
      onClick: () => submit(),
    },
  ];

  const serverError = Object.values(errors)[0] ?? null;

  return (
    <PageTemplate
      title={t('Create Order')}
      url="/orders/create"
      actions={pageActions}
      backUrl={route('orders.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Order Management'), href: route('orders.index') },
        { title: t('Create') },
      ]}
    >
      <div className="space-y-6">
        {serverError && (
          <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {String(serverError)}
          </div>
        )}

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <TabsTrigger value="customer">{t('Customer')}</TabsTrigger>
            <TabsTrigger value="items">{t('Items')}</TabsTrigger>
            <TabsTrigger value="shipping">{t('Shipping')}</TabsTrigger>
            <TabsTrigger value="payment">{t('Payment')}</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Customer Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={customerMode} onValueChange={(v) => setCustomerMode(v as 'existing' | 'new')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Choose existing customer or create new')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">{t('Existing Customer')}</SelectItem>
                    <SelectItem value="new">{t('+ New Customer (no CRM save)')}</SelectItem>
                  </SelectContent>
                </Select>

                {customerMode === 'existing' ? (
                  <Select
                    value={data.customer_id}
                    onValueChange={(v) => {
                      const c = props.customers.find((x) => x.id === Number(v));
                      const parts = (c?.name ?? '').split(' ');
                      setData({
                        customer_id: v,
                        first_name: parts.shift() ?? '',
                        last_name: parts.join(' '),
                        email: c?.email ?? '',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select customer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.email ? ` - ${c.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t('First Name')}</Label>
                    <Input id="first_name" value={data.first_name}
                      onChange={(e) => setData('first_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t('Last Name')}</Label>
                    <Input id="last_name" value={data.last_name}
                      onChange={(e) => setData('last_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('Email Address')}</Label>
                    <Input id="email" type="email" value={data.email}
                      onChange={(e) => setData('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('Phone Number')}</Label>
                    <Input id="phone" dir="ltr" value={data.phone}
                      onChange={(e) => setData('phone', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Order Items')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 me-2" />
                    {t('Add Item')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.items.map((item, index) => {
                  const product = props.products.find((p) => p.id === Number(item.product_id));
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{t('Item {{number}}', { number: index + 1 })}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                        <div className="sm:col-span-5 space-y-2">
                          <Label>{t('Product')}</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(v) => setItem(index, { product_id: v, variant_id: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('Select product')} />
                            </SelectTrigger>
                            <SelectContent>
                              {props.products.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name} - {p.price.toFixed(2)} {props.currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {product?.has_variants ? (
                          <div className="sm:col-span-3 space-y-2">
                            <Label>{t('Variant')}</Label>
                            <Select
                              value={item.variant_id}
                              onValueChange={(v) => setItem(index, { variant_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('Select variant')} />
                              </SelectTrigger>
                              <SelectContent>
                                {product.variant_combinations.map((v) => (
                                  <SelectItem key={`${v.id}-${v.uuid}`} value={v.uuid || v.id}>
                                    {v.label} - {v.price.toFixed(2)} {props.currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        <div className="sm:col-span-2 space-y-2">
                          <Label>{t('Quantity')}</Label>
                          <Input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={(e) => setItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label>{t('Unit Price')}</Label>
                          <Input type="text" readOnly value={`${unitPrice(item).toFixed(2)} ${props.currency}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Shipping Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_method">{t('Shipping Method')}</Label>
                  <Select
                    value={data.shipping_method_id}
                    onValueChange={(v) => setData('shipping_method_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select shipping method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.shippingMethods.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_address">{t('Shipping Address')}</Label>
                  <Textarea id="shipping_address" rows={3} value={data.shipping_address}
                    onChange={(e) => setData('shipping_address', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_city">{t('City')}</Label>
                    <Input id="shipping_city" value={data.shipping_city}
                      onChange={(e) => setData('shipping_city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_postal">{t('Postal Code')}</Label>
                    <Input id="shipping_postal" dir="ltr" value={data.shipping_postal_code}
                      onChange={(e) => setData('shipping_postal_code', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_state">{t('State')}</Label>
                    <Input id="shipping_state" value={data.shipping_state}
                      onChange={(e) => setData('shipping_state', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_country">{t('Country')}</Label>
                    <Input id="shipping_country" value={data.shipping_country}
                      onChange={(e) => setData('shipping_country', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Payment Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">{t('Payment Method')}</Label>
                  <Select
                    value={data.payment_method}
                    onValueChange={(v) => setData('payment_method', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select payment method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.paymentMethods.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>
                          {pm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('Order Notes')}</Label>
                  <Textarea id="notes" value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)} />
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>{t('Subtotal')}</span>
                    <span dir="ltr">{subtotal.toFixed(2)} {props.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Shipping')}</span>
                    <span dir="ltr">{shippingPreview.toFixed(2)} {props.currency}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                    <span>{t('Total (computed by the server)')}</span>
                    <span dir="ltr">{totalPreview.toFixed(2)} {props.currency}</span>
                  </div>
                </div>
                <Button type="button" disabled={processing || subtotal <= 0} onClick={submit}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                  {t('Create Order')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTemplate>
  );
}
```

- [ ] **Step 5: Run the page-props test and typecheck**

Run:
- `php artisan test --filter=ManualOrderCreationTest`
- `npm run types`

Expected: test PASS; `npm run types` passes. Fix any TS errors the rewrite introduces (this file must not add new type/build debt).

- [ ] **Step 6: Commit** — SKIP (single final commit at Task 4).

---

### Task 4: Gates + single final commit

**Files:** none new.

- [ ] **Step 1: Run the focused test suite**

Run: `php artisan test --filter=ManualOrderCreationTest`
Expected: PASS (all methods).

- [ ] **Step 2: Run focused regressions**

Run: `php artisan test --filter='GroupedOrderTabsTest|CheckoutOrderCreationTest|PosUnifiedInventoryPhase1Test|OrderBulkStatusActionTest|MerchantOrderPdfInvoiceTest'`
Expected: PASS. (These prove grouped-tab taxonomy, canonical checkout creation, canonical inventory ledger, bulk transitions, and PDF invoice are unbroken by the manual path.)

- [ ] **Step 3: Build gates**

Run:
- `npm run types`
- `npm run build`

Expected: PASS. Do NOT run `build:ssr` — no shared storefront runtime was changed (merchant dashboard page only).

- [ ] **Step 4: Diff hygiene**

Run:
- `git diff --check`
- `git status --short`
- `git diff --stat`
- `git diff --name-only`

Expected: no whitespace errors; only the owned files listed (`app/Services/ManualOrderService.php`, `app/Http/Controllers/OrderController.php`, `routes/web.php`, `resources/js/pages/orders/create.tsx`, `tests/Feature/ManualOrderCreationTest.php`, `docs/superpowers/plans/2026-09-10-manual-order-create.md`). Pre-existing untracked root artifacts (PNGs, `_audit_build_templates.php`, `audit-report.md`, CSVs) must remain unstaged.

- [ ] **Step 5: Single final commit**

Run:
```bash
git add app/Services/ManualOrderService.php
git add app/Http/Controllers/OrderController.php
git add routes/web.php
git add resources/js/pages/orders/create.tsx
git add tests/Feature/ManualOrderCreationTest.php
git add docs/superpowers/plans/2026-09-10-manual-order-create.md
git commit -m "feat(orders): add manual merchant order creation"
```

- [ ] **Step 6: Produce the Phase 5B-B1 report and STOP**

Write the `P5B-B1 MANUAL ORDER CREATION REPORT` block containing: BASE (397f4e40ae1b481870ec560f7fc5d28a82d74a10), BRANCH (feature/p5b-manual-order-create), FINAL SHA, WHAT CHANGED, TEST/FILE EVIDENCE (focused tests + regressions + types + build), SECURITY (server-authoritative money, store-scoped lookups, idempotency, offline-only payments), TENANT (getCurrentStoreId authority; every lookup store-scoped), WORKTREE DEVIATION (branch created in main workdir, not the prescribed isolated worktree), INTEGRATION READY (SAFE TO INTEGRATE / BLOCKERS), PUSH/DEPLOY (NOT performed). Do NOT push or deploy.