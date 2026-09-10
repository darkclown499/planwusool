<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\MerchantNotification;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DailyOperationsDashboardTest extends TestCase
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
        $s->theme = 'bazaar-market';
        $s->email = 's@'.uniqid().'.com';
        $s->save();
        $owner->forceFill(['current_store'=>$s->id])->save();
        return $s;
    }

    private function staffFor(User $company, ?Store $store = null, array $perms = []): User
    {
        $storeId = $store ? $store->id : getCurrentStoreId($company);
        $user = User::factory()->create([
            'type' => 'staff',
            'created_by' => $company->id,
            'current_store' => $storeId,
            'email_verified_at' => now(),
        ]);
        $role = Role::create(['name' => 'staff_role_'.uniqid(), 'guard_name' => 'web', 'label' => 'Staff Test', 'created_by' => $company->id]);
        if ($perms) {
            $permModels = Permission::whereIn('name', $perms)->get();
            $role->syncPermissions($permModels);
            foreach ($permModels as $pm) { try { $user->givePermissionTo($pm); } catch (\Throwable $e) {} }
        }
        $user->assignRole($role);
        $user->forceFill(['type' => 'staff'])->save();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        return $user->fresh();
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

    private function makeProduct(int $storeId, int $stock, bool $track = true, bool $backorder = false, string $mode = 'simple'): Product
    {
        return Product::unguarded(fn () => Product::create([
            'store_id' => $storeId,
            'name' => 'P-'.uniqid(),
            'price' => 50,
            'stock' => $stock,
            'track_inventory' => $track,
            'allow_backorder' => $backorder,
            'inventory_mode' => $mode,
            'is_active' => true,
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

    // ================= DAILY OPERATIONS PAYLOAD =================

    public function test_company_dashboard_has_daily_operations_payload(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $this->actingAs($company);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard')
                ->where('isSuperAdmin', false)
                ->has('dailyOperations.orders_needing_action.count')
                ->has('dailyOperations.orders_needing_action.visible')
                ->has('dailyOperations.orders_needing_action.href')
                ->has('dailyOperations.failed_payments.count')
                ->has('dailyOperations.low_stock.count')
                ->has('dailyOperations.unassigned_deliveries.count')
                ->has('dailyOperations.abandoned_carts.count'));
    }

    public function test_daily_operations_counts_are_accurate(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $sid = (int) $store->id;

        // orders_needing_action: pending, confirmed, processing, shipped each count; delivered/cancelled don't
        $this->makeOrder($sid, 'pending');
        $this->makeOrder($sid, 'confirmed');
        $this->makeOrder($sid, 'processing');
        $this->makeOrder($sid, 'shipped');
        $this->makeOrder($sid, 'delivered');
        $this->makeOrder($sid, 'cancelled');

        // failed_payments: 2 (one cancelled-terminated, one active) — payment_status=failed is the only filter
        $this->makeOrder($sid, 'pending', 'failed');
        $this->makeOrder($sid, 'cancelled', 'failed');

        // low_stock: 2 low + 1 out-of-stock simple, 1 in-stock; variant/untracked/backorder excluded
        $this->makeProduct($sid, 2, true, false, 'simple');   // low
        $this->makeProduct($sid, 5, true, false, 'simple');   // low (threshold 5)
        $this->makeProduct($sid, 0, true, false, 'simple');   // out of stock
        $this->makeProduct($sid, 50, true, false, 'simple');  // ok
        $this->makeProduct($sid, 1, false, false, 'simple');  // untracked -> ignored
        $this->makeProduct($sid, 1, true, true, 'simple');    // backorder -> ignored

        // unassigned deliveries: pending/confirmed/processing/shipped unassigned count
        // (5 total), assigned processing and delivered excluded
        $this->makeOrder($sid, 'processing', 'pending', 'assigned');
        $this->makeOrder($sid, 'delivered', 'pending', 'delivered');

        // abandoned carts: new+draft+abandoned+reminder_sent count; recovered/expired don't
        $this->makeCart($sid, 'new');
        $this->makeCart($sid, 'draft');
        $this->makeCart($sid, 'abandoned');
        $this->makeCart($sid, 'reminder_sent');
        $this->makeCart($sid, 'recovered');
        $this->makeCart($sid, 'expired');

        $this->actingAs($company);
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dailyOperations.orders_needing_action.count', 6)
                ->where('dailyOperations.failed_payments.count', 2)
                ->where('dailyOperations.low_stock.count', 3)
                ->where('dailyOperations.unassigned_deliveries.count', 5)
                ->where('dailyOperations.abandoned_carts.count', 4)
                ->where('dailyOperations.orders_needing_action.visible', true)
                ->where('dailyOperations.failed_payments.visible', true)
                ->where('dailyOperations.low_stock.visible', true)
                ->where('dailyOperations.unassigned_deliveries.visible', true)
                ->where('dailyOperations.abandoned_carts.visible', true));
    }

    public function test_daily_operations_are_tenant_scoped(): void
    {
        $company = $this->companyUser();
        $storeA = $this->storeFor($company);
        $storeB = $this->storeFor($company);

        $this->makeOrder((int) $storeA->id, 'pending');
        $this->makeOrder((int) $storeB->id, 'pending');
        $this->makeOrder((int) $storeB->id, 'processing');
        $this->makeProduct((int) $storeB->id, 1, true, false, 'simple');
        $this->makeCart((int) $storeB->id, 'abandoned');

        $company->forceFill(['current_store' => $storeA->id])->save();

        $this->actingAs($company);
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dailyOperations.orders_needing_action.count', 1)
                ->where('dailyOperations.low_stock.count', 0)
                ->where('dailyOperations.unassigned_deliveries.count', 1)
                ->where('dailyOperations.abandoned_carts.count', 0));
    }

    public function test_daily_operations_respect_permission_visibility(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        // staff with products only — order/delivery/cart items must be hidden
        $staff = $this->staffFor($company, $store, ['manage-dashboard', 'manage-products']);
        $this->makeOrder((int) $store->id, 'pending');
        $this->makeProduct((int) $store->id, 1, true, false, 'simple');

        $this->actingAs($staff);
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dailyOperations.low_stock.visible', true)
                ->where('dailyOperations.orders_needing_action.visible', false)
                ->where('dailyOperations.failed_payments.visible', false)
                ->where('dailyOperations.unassigned_deliveries.visible', false)
                ->where('dailyOperations.abandoned_carts.visible', false)
                ->where('dailyOperations.low_stock.count', 1));
    }

    public function test_dashboard_without_store_has_zeroed_daily_operations(): void
    {
        $company = $this->companyUser();

        $this->actingAs($company);
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('dailyOperations.orders_needing_action.count')
                ->where('dailyOperations.orders_needing_action.count', 0)
                ->where('dailyOperations.failed_payments.count', 0)
                ->where('dailyOperations.low_stock.count', 0)
                ->where('dailyOperations.unassigned_deliveries.count', 0)
                ->where('dailyOperations.abandoned_carts.count', 0));
    }

    // ================= PAYMENT FAILED NOTIFICATION =================

    public function test_failed_payment_transition_creates_notification(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder((int) $store->id, 'pending', 'pending');

        $order->update(['payment_status' => 'failed']);

        $this->assertDatabaseHas('merchant_notifications', [
            'store_id' => $store->id,
            'related_id' => $order->id,
            'related_type' => 'order',
            'type' => 'payment_failed',
        ]);
        $note = MerchantNotification::where('store_id', $store->id)
            ->where('related_id', $order->id)->where('type', 'payment_failed')->first();
        $this->assertNotNull($note);
        $this->assertTrue((bool) $note->is_urgent);
        $this->assertEquals('red', $note->color);
        $this->assertStringContainsString((string) $order->order_number, (string) $note->body);
    }

    public function test_repeated_failed_payment_update_does_not_duplicate(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder((int) $store->id, 'pending', 'pending');

        $order->update(['payment_status' => 'failed']);
        $order->update(['payment_status' => 'failed']);

        $this->assertEquals(1, MerchantNotification::where('store_id', $store->id)
            ->where('related_id', $order->id)->where('type', 'payment_failed')->count());
    }

    public function test_non_failed_payment_update_does_not_notify(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder((int) $store->id, 'pending', 'pending');

        $order->update(['payment_status' => 'paid']);

        $this->assertEquals(0, MerchantNotification::where('store_id', $store->id)
            ->where('related_id', $order->id)->where('type', 'payment_failed')->count());
    }

    public function test_order_created_already_failed_does_not_notify(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder((int) $store->id, 'pending', 'failed');

        $this->assertEquals(0, MerchantNotification::where('store_id', $store->id)
            ->where('related_id', $order->id)->where('type', 'payment_failed')->count());
        $this->assertNotNull($order);
    }
}