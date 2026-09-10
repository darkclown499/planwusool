<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use App\Services\OrderInvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MerchantOrderPdfInvoiceTest extends TestCase
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
        $role = Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company', 'created_by' => null]);
        $perms = Permission::whereIn('name', ['manage-orders', 'view-orders', 'edit-orders'])->get();
        $role->syncPermissions($perms);
        $u->assignRole($role);
        foreach ($perms as $p) {
            try { $u->givePermissionTo($p); } catch (\Throwable $e) {}
        }

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
        $owner->forceFill(['current_store' => $s->id])->save();

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
        $roleName = 'staff_role_'.uniqid();
        $role = Role::create(['name' => $roleName, 'guard_name' => 'web', 'label' => 'Staff Test', 'created_by' => $company->id]);
        if ($perms) {
            $permModels = Permission::whereIn('name', $perms)->get();
            $role->syncPermissions($permModels);
            foreach ($permModels as $pm) {
                try { $user->givePermissionTo($pm); } catch (\Throwable $e) {}
            }
        }
        $user->assignRole($role);
        $user->forceFill(['type' => $roleName])->save();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->fresh();
    }

    private function makeOrder(Store $store, array $over = [], array $items = []): Order
    {
        $order = Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-'.uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_first_name' => 'Ahmed',
            'customer_last_name' => 'Ali',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '0599123456',
            'shipping_address' => 'Nablus St 12',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'PS',
            'shipping_postal_code' => '1000',
            'billing_address' => 'Nablus St 12',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'PS',
            'subtotal' => 100,
            'shipping_amount' => 10,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 110,
            'payment_method' => 'cod',
        ], $over));

        foreach ($items as $itemOver) {
            $product = isset($itemOver['product_id']) ? $itemOver['product_id'] : Product::factory()->create([
                'store_id' => $store->id,
                'name' => $itemOver['product_name'] ?? 'Official Shirt',
                'price' => $itemOver['unit_price'] ?? 50,
            ])->id;
            OrderItem::forceCreate(array_merge([
                'order_id' => $order->id,
                'product_id' => $product,
                'product_name' => 'Official Shirt',
                'product_price' => 50,
                'unit_price' => 50,
                'total_price' => 100,
                'quantity' => 2,
                'product_variants' => null,
                'tax_details' => null,
            ], $itemOver));
        }

        return $order;
    }

    public function test_merchant_owner_can_download_order_invoice_pdf(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder($store, [], [
            ['product_name' => 'Official Shirt', 'unit_price' => 50, 'quantity' => 2],
        ]);

        $this->actingAs($company);

        $res = $this->get(route('orders.invoice', $order->id));

        $res->assertStatus(200);
        $this->assertStringContainsString('application/pdf', (string) $res->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename=invoice-'.$order->order_number.'.pdf', (string) $res->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', (string) $res->getContent());
    }

    public function test_cross_store_order_invoice_is_denied(): void
    {
        $companyA = $this->companyUser();
        $storeA = $this->storeFor($companyA);
        $orderA = $this->makeOrder($storeA);

        $companyB = $this->companyUser();
        $this->storeFor($companyB);

        $this->actingAs($companyB);

        $res = $this->get(route('orders.invoice', $orderA->id));

        $this->assertSame(404, $res->status(), 'Cross-store invoice must be 404, got '.$res->status());
    }

    public function test_unauthenticated_cannot_download_invoice(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder($store);

        $res = $this->get(route('orders.invoice', $order->id));

        $this->assertTrue(in_array($res->status(), [302, 401]), 'Guest invoice should redirect/401, got '.$res->status());
    }

    public function test_staff_without_view_orders_permission_cannot_download_invoice(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder($store);
        $staff = $this->staffFor($company, $store, []);

        $this->actingAs($staff);

        $res = $this->get(route('orders.invoice', $order->id));

        $this->assertTrue(in_array($res->status(), [403, 302]), 'Staff without view-orders must be blocked, got '.$res->status());
    }

    public function test_invoice_renders_representative_arabic_order_data(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder($store, ['customer_email' => 'saad@example.com', 'shipping_city' => 1], [
            ['product_name' => 'Official Shirt', 'unit_price' => 50, 'quantity' => 2],
        ]);

        $data = app(OrderInvoiceService::class)->buildInvoiceData($order, $store);
        $html = view('pdf.invoice', $data)->render();

        $this->assertStringContainsString($order->order_number, $html);
        $this->assertStringContainsString('فاتورة الطلب', $html);
        $this->assertStringContainsString('dir="rtl"', $html);
        $this->assertStringContainsString('saad@example.com', $html);
        $this->assertStringContainsString($order->customer_phone, $html);
        $this->assertStringContainsString('Official Shirt', $html);
        $this->assertStringContainsString($store->name, $html);
        $this->assertSame('ar', $data['locale']);
    }

    public function test_customer_storefront_pdf_flow_still_renders_through_service(): void
    {
        $company = $this->companyUser();
        $store = $this->storeFor($company);
        $order = $this->makeOrder($store, ['session_id' => session()->getId()], [
            ['product_name' => 'Official Shirt', 'unit_price' => 50, 'quantity' => 2],
        ]);

        $res = (new \App\Http\Controllers\ThemeController())->downloadOrderPdf($store->slug, $order->order_number);

        $this->assertSame(200, $res->getStatusCode());
        $this->assertStringStartsWith('%PDF-', (string) $res->getContent());
        $this->assertStringContainsString('application/pdf', (string) $res->headers->get('Content-Type'));
    }
}