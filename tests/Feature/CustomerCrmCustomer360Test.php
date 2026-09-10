<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Customer;
use App\Models\CustomerTag;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Store;
use App\Models\User;
use App\Services\CustomerDataErasureService;
use App\Services\CustomerDirectoryService;
use App\Services\CustomerIdentityService;
use App\Services\CustomerProfileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use App\Models\Role;
use Tests\TestCase;

class CustomerCrmCustomer360Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function companyWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>100,'max_users_per_store'=>20]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        $role = Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);
        foreach (Permission::all() as $p) { try{ $user->givePermissionTo($p);}catch(\Throwable $e){} }
        return [$user->fresh(),$store,$plan];
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'customer_id'=>null,'session_id'=>'sess'.\Illuminate\Support\Str::random(6),
            'status'=>'delivered','payment_status'=>'paid','customer_email'=>'guest@example.com','customer_first_name'=>'Guest','customer_last_name'=>'Buyer','customer_phone'=>'0592000000',
            'shipping_address'=>'Ramallah','shipping_city'=>'Ramallah','shipping_state'=>'West','shipping_country'=>'PS',
            'billing_address'=>'Ramallah','billing_city'=>'Ramallah','billing_state'=>'West','billing_country'=>'PS',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'currency'=>'ILS','payment_method'=>'cod'
        ], $overrides));
    }

    private function makeRegisteredOrder(Store $store, Customer $customer, array $overrides = []): Order
    {
        return $this->makeOrder($store, array_merge([
            'customer_id'=>$customer->id,
            'customer_email'=>$customer->email,
            'customer_first_name'=>$customer->first_name,
            'customer_last_name'=>$customer->last_name,
            'customer_phone'=>$customer->phone ?: '0592000000',
        ], $overrides));
    }

    private function makeCustomer(Store $store, array $overrides = []): Customer
    {
        return Customer::create(array_merge([
            'store_id'=>$store->id, 'first_name'=>'Ammar', 'last_name'=>'Zaben',
            'email'=>'ammar'.\Illuminate\Support\Str::random(5).'@example.com', 'phone'=>'0597000001', 'is_active'=>true,
        ], $overrides));
    }

    private function makeLoyalty(Store $store, Customer $customer, float $points, string $type = 'earn', ?int $orderId = null): LoyaltyTransaction
    {
        return LoyaltyTransaction::create([
            'store_id'=>$store->id, 'customer_id'=>$customer->id, 'order_id'=>$orderId, 'type'=>$type, 'points'=>$points, 'balance_after'=>$points,
            'description'=>ucfirst($type),
        ]);
    }

    private function makeCart(Store $store, array $overrides = []): AbandonedCart
    {
        return AbandonedCart::create(array_merge([
            'store_id'=>$store->id, 'session_id'=>'cart'.\Illuminate\Support\Str::random(8), 'cart_items'=>[],
            'cart_total'=>99.00, 'status'=>'abandoned', 'last_activity_at'=>now()->subHours(5),
        ], $overrides));
    }

    private function makeReturn(Order $order, array $overrides = []): OrderReturn
    {
        return OrderReturn::create(array_merge([
            'return_number'=>'R-'.\Illuminate\Support\Str::random(8), 'store_id'=>$order->store_id, 'order_id'=>$order->id,
            'customer_id'=>$order->customer_id, 'customer_email'=>$order->customer_email,
            'status'=>'requested', 'refund_status'=>'none', 'refund_amount'=>0, 'requested_at'=>now()->subDay(),
        ], $overrides));
    }

    /* ─────────────────────────────────────────────────────────────
     * BUG 1 (RED): guest ref write must not depend on which order row
     * comes back from limit(1) — a VALID guest ref must always pass.
     * ───────────────────────────────────────────────────────────── */
    public function test_valid_guest_ref_write_succeeds_when_multiple_guest_orders_exist(): void
    {
        [$user,$store] = $this->companyWithStore();

        // Many guest orders with DIFFERENT phones. The oldest row (lowest id)
        // is NOT the target identity, so the naive limit(1) guard cannot work.
        $targetPhone = '0592000006';
        foreach (['0592000001','0592000002','0592000003','0592000004','0592000005',$targetPhone] as $i => $phone) {
            $this->makeOrder($store, ['customer_phone'=>$phone, 'customer_email'=>$phone.'@guest.test']);
        }

        $identity = app(CustomerIdentityService::class);
        $this->assertNotNull($identity->normalizePhone($targetPhone));
        $ref = $identity->refForGuestPhone((string) $identity->normalizePhone($targetPhone));
        $token = $identity->tokenForRef($ref);

        $this->actingAs($user);
        $res = $this->post(route('customers.tags.store', $token), ['name'=>'VIP']);

        $this->assertEquals(302, $res->getStatusCode());
        $this->assertDatabaseHas('customer_tags', ['store_id'=>$store->id, 'customer_ref'=>$ref, 'name'=>'VIP']);
    }

    public function test_foreign_store_guest_ref_write_is_denied(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();

        $this->makeOrder($storeA, ['customer_phone'=>'0592000000']);
        $identity = app(CustomerIdentityService::class);
        $ref = $identity->refForGuestPhone('+970592000000');
        $token = $identity->tokenForRef($ref);

        $this->actingAs($userB);
        $res = $this->post(route('customers.tags.store', $token), ['name'=>'VIP']);

        $this->assertEquals(404, $res->getStatusCode());
        $this->assertDatabaseMissing('customer_tags', ['store_id'=>$storeB->id, 'customer_ref'=>$ref, 'name'=>'VIP']);
    }

    /* ─────────────────────────────────────────────────────────────
     * BUG 2 (RED): directory VIP filter must honor customer_group='vip'
     * (canonical truth) AND keep the historical 'vip' tag working.
     * ───────────────────────────────────────────────────────────── */
    public function test_directory_vip_filter_matches_customer_group(): void
    {
        [$user,$store] = $this->companyWithStore();
        $vip = $this->makeCustomer($store, ['first_name'=>'Vip','last_name'=>'Group','customer_group'=>'vip']);
        $this->makeRegisteredOrder($store, $vip);
        $regular = $this->makeCustomer($store, ['first_name'=>'Plain','last_name'=>'Regular']);
        $this->makeRegisteredOrder($store, $regular);

        $directory = app(CustomerDirectoryService::class)->directory($store->id, ['filter'=>'vip']);

        $names = array_column($directory['customers'], 'full_name');
        $this->assertContains('Vip Group', $names);
        $this->assertNotContains('Plain Regular', $names);
    }

    public function test_directory_vip_filter_keeps_historical_vip_tag(): void
    {
        [$user,$store] = $this->companyWithStore();
        $tagged = $this->makeCustomer($store, ['first_name'=>'Old','last_name'=>'Tag']);
        $this->makeRegisteredOrder($store, $tagged);
        $ref = app(CustomerIdentityService::class)->refForCanonical($tagged->id);
        CustomerTag::create(['store_id'=>$store->id, 'customer_ref'=>$ref, 'name'=>'vip']);

        $directory = app(CustomerDirectoryService::class)->directory($store->id, ['filter'=>'vip']);
        $names = array_column($directory['customers'], 'full_name');
        $this->assertContains('Old Tag', $names);
    }

    public function test_directory_vip_filter_is_store_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $vipA = $this->makeCustomer($storeA, ['first_name'=>'StoreA','last_name'=>'Vip','customer_group'=>'vip']);
        $this->makeRegisteredOrder($storeA, $vipA);
        $vipB = $this->makeCustomer($storeB, ['first_name'=>'StoreB','last_name'=>'Vip','customer_group'=>'vip']);
        $this->makeRegisteredOrder($storeB, $vipB);

        $directory = app(CustomerDirectoryService::class)->directory($storeA->id, ['filter'=>'vip']);
        $names = array_column($directory['customers'], 'full_name');
        $this->assertContains('StoreA Vip', $names);
        $this->assertNotContains('StoreB Vip', $names);
    }

    /* ─────────────────────────────────────────────────────────────
     * PROFILE SECTION: loyalty (canonical bounded, guest empty truth)
     * ───────────────────────────────────────────────────────────── */
    public function test_profile_loyalty_for_registered_customer(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = $this->makeCustomer($store);
        $order = $this->makeRegisteredOrder($store, $customer);
        $this->makeLoyalty($store, $customer, 100, 'earn', $order->id);
        $this->makeLoyalty($store, $customer, 50, 'signup_bonus');

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForCanonical($customer->id));

        $this->assertSame(true, $profile['loyalty']['has_account']);
        $this->assertSame(150.0, $profile['loyalty']['balance']);
        $this->assertCount(2, $profile['loyalty']['transactions']);
        $txTypes = array_column($profile['loyalty']['transactions'], 'type');
        $this->assertContains('earn', $txTypes);
        $this->assertContains('signup_bonus', $txTypes);
        // bounded output omits PII/metadata-heavy fields
        $first = $profile['loyalty']['transactions'][0];
        $this->assertArrayNotHasKey('metadata', $first);
        $this->assertArrayHasKey('order_id', $first);
        $earn = collect($profile['loyalty']['transactions'])->firstWhere('type', 'earn');
        $this->assertSame($order->id, $earn['order_id']);
    }

    public function test_profile_loyalty_empty_for_guest_and_unused_account(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0592000000']);
        $identity = app(CustomerIdentityService::class);
        $ref = $identity->refForGuestPhone('+970592000000');

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, $ref);
        $this->assertFalse($profile['loyalty']['has_account']);
        $this->assertSame(0.0, $profile['loyalty']['balance']);
        $this->assertSame([], $profile['loyalty']['transactions']);

        // registered customer who never earned points: truthful empty ledger
        $customer = $this->makeCustomer($store);
        $this->makeRegisteredOrder($store, $customer);
        $profile2 = app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForCanonical($customer->id));
        $this->assertFalse($profile2['loyalty']['has_account']);
        $this->assertSame(0.0, $profile2['loyalty']['balance']);
    }

    public function test_profile_loyalty_is_store_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $customerA = $this->makeCustomer($storeA);
        $customerB = $this->makeCustomer($storeB);
        $this->makeLoyalty($storeA, $customerA, 250);
        $this->makeLoyalty($storeB, $customerB, 25);

        $profileB = app(CustomerProfileService::class)->profileForRef($storeB->id, app(CustomerIdentityService::class)->refForCanonical($customerB->id));
        $this->assertSame(25.0, $profileB['loyalty']['balance']);

        // store B can never open store A's canonical customer
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        app(CustomerProfileService::class)->profileForRef($storeB->id, app(CustomerIdentityService::class)->refForCanonical($customerA->id));
    }

    /* ─────────────────────────────────────────────────────────────
     * PROFILE SECTION: abandoned carts (canonical FK + guest phone/email,
     * o: recovered-order link) — store-scoped, bounded
     * ───────────────────────────────────────────────────────────── */
    public function test_profile_abandoned_carts_for_registered_customer(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = $this->makeCustomer($store);
        $this->makeRegisteredOrder($store, $customer);
        $this->makeCart($store, ['customer_id'=>$customer->id, 'cart_total'=>250.00, 'status'=>'reminder_sent']);

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForCanonical($customer->id));

        $this->assertSame(1, $profile['abandoned_carts']['count']);
        $this->assertCount(1, $profile['abandoned_carts']['recent']);
        $cart = $profile['abandoned_carts']['recent'][0];
        $this->assertSame('reminder_sent', $cart['status']);
        $this->assertSame(250.0, (float) $cart['value']);
        $this->assertArrayHasKey('last_activity_at', $cart);
    }

    public function test_profile_abandoned_carts_for_guest_phone_and_email(): void
    {
        [$user,$store] = $this->companyWithStore();
        $orderPhone = $this->makeOrder($store, ['customer_phone'=>'0592000123']);
        $orderEmail = $this->makeOrder($store, ['customer_phone'=>null, 'customer_email'=>'guest2@example.com', 'customer_first_name'=>'Email','customer_last_name'=>'Guest']);
        $this->makeCart($store, ['customer_phone'=>'0592000123', 'cart_total'=>40.00]);
        $this->makeCart($store, ['customer_email'=>'guest2@example.com', 'cart_total'=>55.00]);
        $this->makeCart($store, ['recovered_order_id'=>$orderPhone->id, 'status'=>'recovered', 'cart_total'=>66.00]);

        $identity = app(CustomerIdentityService::class);

        $byPhone = app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestPhone('+970592000123'));
        $this->assertSame(1, $byPhone['abandoned_carts']['count']);
        $this->assertSame(40.0, (float) $byPhone['abandoned_carts']['recent'][0]['value']);

        $byEmail = app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestEmail('guest2@example.com'));
        $this->assertSame(1, $byEmail['abandoned_carts']['count']);
        $this->assertSame(55.0, (float) $byEmail['abandoned_carts']['recent'][0]['value']);

        $byOrder = app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestOrderId($orderPhone->id));
        $this->assertSame(1, $byOrder['abandoned_carts']['count']);
        $this->assertSame(66.0, (float) $byOrder['abandoned_carts']['recent'][0]['value']);
    }

    public function test_profile_abandoned_carts_exclude_foreign_store_rows(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $this->makeOrder($storeA, ['customer_phone'=>'0592000000', 'customer_email'=>'same@example.com']);
        $this->makeOrder($storeB, ['customer_phone'=>'0592000000', 'customer_email'=>'same@example.com']);
        $this->makeCart($storeA, ['customer_phone'=>'0592000000', 'cart_total'=>100.00]);
        $this->makeCart($storeB, ['customer_phone'=>'0592000000', 'cart_total'=>999.00]);

        $profile = app(CustomerProfileService::class)->profileForRef($storeA->id, app(CustomerIdentityService::class)->refForGuestPhone('+970592000000'));
        $this->assertSame(1, $profile['abandoned_carts']['count']);
        $this->assertSame(100.0, (float) $profile['abandoned_carts']['recent'][0]['value']);
    }

    /* ─────────────────────────────────────────────────────────────
     * PROFILE SECTION: returns (canonical through store-scoped orders;
     * guests through the same resolved order set) — bounded
     * ───────────────────────────────────────────────────────────── */
    public function test_profile_returns_linked_through_orders(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = $this->makeCustomer($store);
        $order = $this->makeRegisteredOrder($store, $customer);
        $this->makeReturn($order, ['status'=>'received', 'refund_status'=>'partial', 'refund_amount'=>50]);

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForCanonical($customer->id));

        $this->assertSame(1, $profile['returns']['count']);
        $return = $profile['returns']['recent'][0];
        $this->assertSame('received', $return['status']);
        $this->assertSame(50.0, (float) $return['refund_amount']);
        $this->assertSame($order->id, $return['order_id']);
        $this->assertSame($order->order_number, $return['order_number']);
        $this->assertArrayHasKey('order_url', $return);
        $this->assertArrayHasKey('url', $return);
        // never expose PII captured at request time on the read-model
        $this->assertArrayNotHasKey('customer_email', $return);
        $this->assertArrayNotHasKey('customer_note', $return);
    }

    public function test_profile_guest_returns_linked_through_guest_orders(): void
    {
        [$user,$store] = $this->companyWithStore();
        $order = $this->makeOrder($store, ['customer_phone'=>'0592000777']);
        $this->makeReturn($order, ['status'=>'completed']);

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForGuestOrderId($order->id));
        $this->assertSame(1, $profile['returns']['count']);
        $this->assertSame('completed', $profile['returns']['recent'][0]['status']);
    }

    public function test_profile_returns_are_store_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $orderB = $this->makeOrder($storeB, ['customer_phone'=>'0592000777']);
        $this->makeReturn($orderB, ['status'=>'requested']);

        // store A has NO guest order with that phone -> profile must 404, not leak B
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        app(CustomerProfileService::class)->profileForRef($storeA->id, app(CustomerIdentityService::class)->refForGuestOrderId($orderB->id));
    }

    /* ─────────────────────────────────────────────────────────────
     * PROFILE SECTION: zero states + bounds
     * ───────────────────────────────────────────────────────────── */
    public function test_profile_zero_states_when_no_carts_or_returns(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0592000888']);

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForGuestPhone('+970592000888'));
        $this->assertSame(0, $profile['abandoned_carts']['count']);
        $this->assertSame([], $profile['abandoned_carts']['recent']);
        $this->assertSame(0, $profile['returns']['count']);
        $this->assertSame([], $profile['returns']['recent']);
    }

    public function test_profile_sections_are_bounded(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = $this->makeCustomer($store);
        $order = $this->makeRegisteredOrder($store, $customer);

        for ($i = 1; $i <= 12; $i++) {
            $this->makeLoyalty($store, $customer, 1);
            $this->makeCart($store, ['customer_id'=>$customer->id, 'last_activity_at'=>now()->subMinutes(20 - $i)]);
            $this->makeReturn($order);
        }

        $profile = app(CustomerProfileService::class)->profileForRef($store->id, app(CustomerIdentityService::class)->refForCanonical($customer->id));

        $this->assertLessThanOrEqual(10, count($profile['loyalty']['transactions']));
        $this->assertLessThanOrEqual(5, count($profile['abandoned_carts']['recent']));
        $this->assertLessThanOrEqual(5, count($profile['returns']['recent']));
        $this->assertSame(12, $profile['abandoned_carts']['count']);
        $this->assertSame(12, $profile['returns']['count']);
    }

    /* ─────────────────────────────────────────────────────────────
     * GDPR: erased identity must never reappear through the sections
     * ───────────────────────────────────────────────────────────── */
    public function test_erased_customer_identity_does_not_reappear_through_sections(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = $this->makeCustomer($store, ['email'=>'erase-me@example.com', 'phone'=>'0592000999']);
        $order = $this->makeRegisteredOrder($store, $customer);
        $this->makeLoyalty($store, $customer, 300);
        $this->makeCart($store, ['customer_id'=>$customer->id]);
        $this->makeReturn($order);
        $ref = app(CustomerIdentityService::class)->refForCanonical($customer->id);
        CustomerTag::create(['store_id'=>$store->id, 'customer_ref'=>$ref, 'name'=>'VIP']);

        app(CustomerDataErasureService::class)->erase($customer->fresh());

        $this->assertNull(Customer::find($customer->id));

        // canonical profile gone
        $identity = app(CustomerIdentityService::class);
        try {
            app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForCanonical($customer->id));
            $this->fail('canonical profile must 404 after erasure');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            $this->assertTrue(true);
        }

        // guest email ref for the erased email must not resolve anywhere
        try {
            app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestEmail('erase-me@example.com'));
            $this->fail('erased email must not resolve');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            $this->assertTrue(true);
        }

        // guest phone ref for the original phone must not re-surface the customer
        try {
            app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestPhone('+970592000999'));
            $this->fail('erased phone must not resolve');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            $this->assertTrue(true);
        }

        // carts were purged by erasure
        $this->assertDatabaseMissing('abandoned_carts', ['customer_id'=>$customer->id]);
        // the archived order is anonymized — profile by order id shows NO original PII
        $profile = app(CustomerProfileService::class)->profileForRef($store->id, $identity->refForGuestOrderId($order->id));
        $this->assertStringContainsString('Deleted', $profile['identity']['full_name']);
        $this->assertNotSame('erase-me@example.com', $profile['identity']['email']);
        // erased customer's loyalty ledger is unreachable (customer_id detached) and never surfaces here
        $this->assertFalse($profile['loyalty']['has_account']);
        $this->assertSame([], $profile['loyalty']['transactions']);
    }
}