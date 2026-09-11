<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreDomain;
use App\Models\StoreErpConfig;
use App\Models\User;
use App\Services\StoreHealthService;
use App\Services\StoreMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StoreHealthServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function makePlan(array $over = []): Plan
    {
        return Plan::factory()->create(array_merge([
            'name' => 'Pro-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
            'enable_custdomain' => 'on',
            'enable_custsubdomain' => 'on',
            'enable_shipping_method' => 'on',
            'enable_accounting_integration' => 'on',
        ], $over));
    }

    private function companyUser(?Plan $plan = null): User
    {
        $plan = $plan ?? $this->makePlan();
        $u = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $role = Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label'=>'Company','created_by'=>null]);
        $perms = Permission::whereIn('name', ['manage-products','manage-orders','view-orders','manage-pos','manage-abandoned-carts','manage-dashboard'])->get();
        $role->syncPermissions($perms);
        $u->assignRole($role);
        foreach ($perms as $p) { try { $u->givePermissionTo($p); } catch (\Throwable $e) {} }
        return $u->fresh();
    }

    private function storeFor(User $owner, ?string $slug = null): Store
    {
        $s = new Store();
        $s->user_id = $owner->id;
        $s->name = 'Store '.uniqid();
        $s->slug = $slug ?? 's-'.uniqid();
        $s->theme = 'fashion-atelier';
        $s->email = 's@'.uniqid().'.com';
        $s->save();
        $owner->forceFill(['current_store'=>$s->id])->save();
        return $s->fresh();
    }

    private function makeOrder(int $storeId, string $status, string $paymentStatus = 'pending', string $deliveryStatus = 'unassigned'): Order
    {
        return Order::unguarded(fn () => Order::create([
            'store_id' => $storeId,
            'order_number' => 'ORD-'.uniqid(),
            'status' => $status,
            'payment_status' => $paymentStatus,
            'delivery_status' => $deliveryStatus,
            'subtotal' => 100,
            'discount_amount' => 0,
            'shipping_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 100,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'Customer',
            'customer_email' => 'c@'.uniqid().'.com',
            'shipping_address' => 'Test St 1',
            'shipping_city' => 'Ramallah',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'PS',
            'billing_address' => 'Test St 1',
            'billing_city' => 'Ramallah',
            'billing_state' => 'West Bank',
            'billing_country' => 'PS',
            'payment_method' => 'cod',
            'currency' => 'SAR',
        ]));
    }

    private function makeProduct(int $storeId, int $stock, bool $track = true, bool $backorder = false, string $mode = 'simple', bool $active = true, string $image = ''): Product
    {
        return Product::unguarded(fn () => Product::create([
            'store_id' => $storeId,
            'name' => 'P-'.uniqid(),
            'price' => 50,
            'stock' => $stock,
            'track_inventory' => $track,
            'allow_backorder' => $backorder,
            'inventory_mode' => $mode,
            'is_active' => $active,
            'cover_image' => $image,
        ]));
    }

    private function makeCart(int $storeId, string $status): AbandonedCart
    {
        return AbandonedCart::create([
            'store_id' => $storeId,
            'session_id' => 'sess-'.uniqid(),
            'status' => $status,
            'cart_total' => 50,
            'last_activity_at' => now(),
        ]);
    }

    private function enablePayment(int $ownerId, int $storeId, string $method, string $value = '1'): void
    {
        \App\Models\PaymentSetting::updateOrCreateSetting($ownerId, "is_{$method}_enabled", $value, $storeId);
    }

    private function connectEmail(Store $store): void
    {
        $uid = $store->user_id;
        $sid = (int) $store->id;
        updateSetting('email_host', 'mail.test.com', $uid, $sid);
        updateSetting('email_port', '587', $uid, $sid);
        updateSetting('email_username', 'u', $uid, $sid);
        updateSetting('email_password', 'p', $uid, $sid);
        updateSetting('email_from_address', 'from@test.com', $uid, $sid);
        updateSetting('email_from_name', 'Store', $uid, $sid);
        updateSetting('email_status', StoreMailService::STATUS_CONNECTED, $uid, $sid);
    }

    private function addShipping(int $storeId, bool $active = true): Shipping
    {
        return Shipping::create([
            'store_id' => $storeId,
            'name' => 'Express-'.uniqid(),
            'type' => 'flat',
            'cost' => 10,
            'is_active' => $active,
        ]);
    }

    private function evaluate(Store $store, User $user): array
    {
        return app(StoreHealthService::class)->evaluate($store, $user);
    }

    // ================= SIGNAL CHECKS =================

    public function test_healthy_store_scores_100(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->enablePayment($company->id, (int) $store->id, 'cod');
        $this->addShipping((int) $store->id);
        $this->connectEmail($store);

        $result = $this->evaluate($store, $company);

        $this->assertSame(100, $result['score']);
        $this->assertSame(StoreHealthService::STATUS_HEALTHY, $result['status']);
        $this->assertSame(0, $result['counts']['critical']);
        $this->assertSame(0, $result['counts']['warning']);
        $this->assertSame(0, $result['counts']['info']);
        $this->assertSame([], $result['issues']);
    }

    public function test_unpublished_store_is_critical(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->enablePayment($company->id, (int) $store->id, 'cod');
        $this->addShipping((int) $store->id);
        $this->connectEmail($store);
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'store_unpublished');

        $this->assertNotNull($issue);
        $this->assertSame('critical', $issue['severity']);
        $this->assertSame(75, $result['score']);
    }

    public function test_no_payment_method_is_critical(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->addShipping((int) $store->id);
        $this->connectEmail($store);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'no_payment_method');

        $this->assertNotNull($issue);
        $this->assertSame('critical', $issue['severity']);
    }

    public function test_enabled_connected_method_without_credentials_is_not_usable(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->addShipping((int) $store->id);
        $this->connectEmail($store);
        // Stripe enabled but NO credentials saved -> incomplete, not usable.
        $this->enablePayment($company->id, (int) $store->id, 'stripe');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'no_payment_method');

        $this->assertNotNull($issue, 'Enabled gateway without credentials must count as unusable.');
    }

    public function test_manual_payment_method_is_usable(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->addShipping((int) $store->id);
        $this->connectEmail($store);
        $this->enablePayment($company->id, (int) $store->id, 'cod');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'no_payment_method');

        $this->assertNull($issue);
    }

    public function test_no_delivery_method_is_warning_when_entitled(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->enablePayment($company->id, (int) $store->id, 'cod');
        $this->connectEmail($store);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'no_delivery_method');

        $this->assertNotNull($issue);
        $this->assertSame('warning', $issue['severity']);
    }

    public function test_no_delivery_signal_when_not_entitled(): void
    {
        $plan = $this->makePlan(['enable_shipping_method' => '']);
        $company = $this->companyUser($plan);
        $store = $this->storeFor($company);
        $this->enablePayment($company->id, (int) $store->id, 'cod');
        $this->connectEmail($store);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'no_delivery_method');

        $this->assertNull($issue);
    }

    public function test_failed_payments_count(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeOrder($sid, 'pending', 'failed');
        $this->makeOrder($sid, 'cancelled', 'failed');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'failed_payments');

        $this->assertNotNull($issue);
        $this->assertSame('warning', $issue['severity']);
        $this->assertSame(2, $issue['count']);
    }

    public function test_low_and_out_of_stock_split(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeProduct($sid, 2);    // low
        $this->makeProduct($sid, 5);    // low (threshold 5)
        $this->makeProduct($sid, 0);    // out of stock
        $this->makeProduct($sid, 50);   // ok
        $this->makeProduct($sid, 1, false, false, 'simple'); // untracked
        $this->makeProduct($sid, 1, true, true, 'simple');   // backorder

        $result = $this->evaluate($store, $company);
        $low = collect($result['issues'])->firstWhere('key', 'low_stock');
        $out = collect($result['issues'])->firstWhere('key', 'out_of_stock');

        $this->assertSame(2, $low['count']);
        $this->assertSame('warning', $low['severity']);
        $this->assertSame(1, $out['count']);
        $this->assertSame('warning', $out['severity']);
    }

    public function test_variant_stock_counts(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;

        // All combos at 0 -> out of stock
        Product::unguarded(fn () => Product::create([
            'store_id' => $sid, 'name' => 'V-out', 'price' => 50,
            'stock' => 0, 'track_inventory' => true, 'allow_backorder' => false,
            'inventory_mode' => 'variant', 'is_active' => true,
            'variant_combinations' => [
                ['label' => 'S', 'values' => ['S'], 'uuid' => 'a', 'stock' => 0],
                ['label' => 'M', 'values' => ['M'], 'uuid' => 'b', 'stock' => 0],
            ],
        ]));
        // One combo low, others stocked -> low stock
        Product::unguarded(fn () => Product::create([
            'store_id' => $sid, 'name' => 'V-low', 'price' => 50,
            'stock' => 0, 'track_inventory' => true, 'allow_backorder' => false,
            'inventory_mode' => 'variant', 'is_active' => true,
            'variant_combinations' => [
                ['label' => 'S', 'values' => ['S'], 'uuid' => 'c', 'stock' => 2],
                ['label' => 'M', 'values' => ['M'], 'uuid' => 'd', 'stock' => 20],
            ],
        ]));
        // One combo at 0, other stocked -> neither fully out nor (0,threshold]
        Product::unguarded(fn () => Product::create([
            'store_id' => $sid, 'name' => 'V-mix', 'price' => 50,
            'stock' => 0, 'track_inventory' => true, 'allow_backorder' => false,
            'inventory_mode' => 'variant', 'is_active' => true,
            'variant_combinations' => [
                ['label' => 'S', 'values' => ['S'], 'uuid' => 'e', 'stock' => 0],
                ['label' => 'M', 'values' => ['M'], 'uuid' => 'f', 'stock' => 9],
            ],
        ]));

        $result = $this->evaluate($store, $company);
        $low = collect($result['issues'])->firstWhere('key', 'low_stock');
        $out = collect($result['issues'])->firstWhere('key', 'out_of_stock');

        $this->assertSame(1, $out['count']);
        $this->assertSame(1, $low['count']);
    }

    public function test_products_without_images_count(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeProduct($sid, 10, true, false, 'simple', true, '');
        $this->makeProduct($sid, 10, true, false, 'simple', true, 'img.jpg');
        $this->makeProduct($sid, 10, true, false, 'simple', false, '');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'products_without_images');

        $this->assertNotNull($issue);
        $this->assertSame('info', $issue['severity']);
        $this->assertSame(1, $issue['count']);
    }

    public function test_abandoned_carts_count(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeCart($sid, 'new');
        $this->makeCart($sid, 'draft');
        $this->makeCart($sid, 'recovered');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'abandoned_carts');

        $this->assertNotNull($issue);
        $this->assertSame('info', $issue['severity']);
        $this->assertSame(2, $issue['count']);
    }

    public function test_unassigned_deliveries_count(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeOrder($sid, 'pending');
        $this->makeOrder($sid, 'processing', 'pending', 'assigned');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'unassigned_deliveries');

        $this->assertNotNull($issue);
        $this->assertSame('warning', $issue['severity']);
        $this->assertSame(1, $issue['count']);
    }

    public function test_orders_needing_action_count(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;
        $this->makeOrder($sid, 'pending');
        $this->makeOrder($sid, 'shipped');
        $this->makeOrder($sid, 'delivered');

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'orders_needing_action');

        $this->assertNotNull($issue);
        $this->assertSame('info', $issue['severity']);
        $this->assertSame(2, $issue['count']);
    }

    public function test_email_not_configured_is_info(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'email_not_ready');

        $this->assertNotNull($issue);
        $this->assertSame('info', $issue['severity']);
    }

    public function test_email_connected_suppresses_signal(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->connectEmail($store);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'email_not_ready');

        $this->assertNull($issue);
    }

    public function test_domain_issue_warning_when_unverified(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'shop-'.uniqid().'.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'is_primary' => true,
        ]);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'domain_issue');

        $this->assertNotNull($issue);
        $this->assertSame('warning', $issue['severity']);
    }

    public function test_domain_signal_hidden_when_not_entitled(): void
    {
        $plan = $this->makePlan(['enable_custdomain' => '', 'enable_custsubdomain' => '']);
        $company = $this->companyUser($plan);
        $store = $this->storeFor($company);
        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'shop-'.uniqid().'.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
        ]);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'domain_issue');

        $this->assertNull($issue);
    }

    public function test_integration_failed_warning_when_entitled_and_configured(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        StoreErpConfig::create([
            'store_id' => $store->id,
            'provider' => 'odoo',
            'name' => 'Odoo-'.uniqid(),
            'api_endpoint' => 'https://x.example.com',
            'is_active' => true,
            'last_sync_status' => 'failed',
        ]);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'integration_failed');

        $this->assertNotNull($issue);
        $this->assertSame('warning', $issue['severity']);
    }

    public function test_integration_signal_hidden_when_not_entitled(): void
    {
        $plan = $this->makePlan(['enable_accounting_integration' => '']);
        $company = $this->companyUser($plan);
        $store = $this->storeFor($company);
        StoreErpConfig::create([
            'store_id' => $store->id,
            'provider' => 'odoo',
            'name' => 'Odoo-'.uniqid(),
            'api_endpoint' => 'https://x.example.com',
            'is_active' => true,
            'last_sync_status' => 'failed',
        ]);

        $result = $this->evaluate($store, $company);
        $issue = collect($result['issues'])->firstWhere('key', 'integration_failed');

        $this->assertNull($issue);
    }

    public function test_config_issues_hidden_for_staff_without_settings_permission(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        // staff with only product management
        $staff = User::factory()->create([
            'type' => 'staff',
            'created_by' => $company->id,
            'current_store' => $store->id,
            'email_verified_at' => now(),
        ]);
        $role = Role::create(['name' => 'staff_'.uniqid(), 'guard_name' => 'web', 'label' => 'Staff', 'created_by' => $company->id]);
        $perm = Permission::where('name', 'manage-products')->first();
        $role->syncPermissions([$perm]);
        $staff->assignRole($role);
        try { $staff->givePermissionTo($perm); } catch (\Throwable $e) {}
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->makeProduct((int) $store->id, 2);
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');

        $result = $this->evaluate($store, $staff->fresh());
        $keys = collect($result['issues'])->pluck('key')->all();

        $this->assertNotContains('store_unpublished', $keys);
        $this->assertNotContains('no_payment_method', $keys);
        $this->assertNotContains('no_delivery_method', $keys);
        $this->assertNotContains('email_not_ready', $keys);
        $this->assertContains('low_stock', $keys);
    }

    public function test_health_is_tenant_scoped(): void
    {
        $company = $this->companyUser();
        $storeA = $this->storeFor($company);
        $storeB = $this->storeFor($company);
        $company->forceFill(['current_store' => $storeA->id])->save();

        // Both stores share the owner — configure payment/delivery/email per
        // store so the only difference is Store B's messy derived data.
        foreach ([$storeA, $storeB] as $s) {
            $this->enablePayment($company->id, (int) $s->id, 'cod');
            $this->addShipping((int) $s->id);
            $this->connectEmail($s);
        }

        // Store B is the messy one.
        $bId = (int) $storeB->id;
        $this->makeProduct($bId, 2);
        $this->makeOrder($bId, 'pending');
        $this->makeCart($bId, 'abandoned');

        $resultA = $this->evaluate($storeA->fresh(), $company);
        $resultB = $this->evaluate($storeB->fresh(), $company);

        $this->assertSame([], $resultA['issues']);
        $this->assertNotSame([], $resultB['issues']);
        $this->assertSame(100, $resultA['score']);
    }

    public function test_score_dedups_leading_to_one_issue_per_condition(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        // messy store: no payments, no delivery, unpublished, no email -> 1 critical + 2 warnings + 1 info
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');

        $result = $this->evaluate($store, $company);
        $keys = collect($result['issues'])->pluck('key')->all();

        // Exactly one issue per condition — no fabricated duplicates.
        $this->assertSame($keys, array_unique($keys));
        $this->assertCount(1, collect($result['issues'])->where('key', 'store_unpublished'));
        $this->assertCount(1, collect($result['issues'])->where('key', 'no_payment_method'));
        $this->assertCount(1, collect($result['issues'])->where('key', 'no_delivery_method'));
    }

    public function test_score_clamps_and_never_goes_below_zero(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;

        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false'); // critical
        $this->makeProduct($sid, 2); // low stock warning
        $this->makeProduct($sid, 0); // out of stock warning
        $this->makeOrder($sid, 'pending', 'failed', 'unassigned'); // failed payment + unassigned + needing action
        $this->makeCart($sid, 'abandoned'); // info

        $result = $this->evaluate($store, $company);

        $this->assertGreaterThanOrEqual(0, $result['score']);
        $this->assertLessThanOrEqual(100, $result['score']);
        $this->assertContains($result['status'], [
            StoreHealthService::STATUS_HEALTHY,
            StoreHealthService::STATUS_GOOD,
            StoreHealthService::STATUS_NEEDS_ATTENTION,
            StoreHealthService::STATUS_CRITICAL,
        ]);
    }
}