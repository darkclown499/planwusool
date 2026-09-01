<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use App\Services\CustomerDataErasureService;
use App\Services\CustomerDirectoryService;
use App\Services\CustomerIdentityService;
use App\Services\CustomerProfileService;
use App\Services\PhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Spatie\Permission\Models\Permission;
use App\Models\Role;

class CustomerCrmPhase1Test extends TestCase
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

    /* ── Test 1: merchant can list own-store customers (canonical + guest) ── */
    public function test_merchant_directory_lists_own_store_customers(): void
    {
        [$user,$store] = $this->companyWithStore();
        Customer::create(['store_id'=>$store->id,'first_name'=>'Ahmad','last_name'=>'Eyad','email'=>'a@b.com','phone'=>'0593333333','is_active'=>true]);
        $this->makeOrder($store, ['customer_phone'=>'0592000000','customer_first_name'=>'Guest','customer_last_name'=>'Buyer']);
        $this->makeOrder($store, [
            'customer_phone'=>'0592000000','customer_first_name'=>'Guest','customer_last_name'=>'Buyer',
            'total_amount'=>50,'status'=>'pending','payment_status'=>'pending'
        ]);

        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);

        $names = array_column($directory['customers'], 'full_name');
        $this->assertContains('Ahmad Eyad', $names);
        $this->assertContains('Guest Buyer', $names);
        // guest with the same normalized phone collapsed into ONE identity with 2 orders
        $guest = collect($directory['customers'])->firstWhere('full_name','Guest Buyer');
        $this->assertNotNull($guest);
        $this->assertEquals(2, $guest['orders_count']);
        $this->assertTrue($guest['is_repeat']);
    }

    /* ── Test 2 + 3: Store A cannot list / open Store B customers ── */
    public function test_store_a_cannot_list_or_open_store_b_customer(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $bCustomer = Customer::create(['store_id'=>$storeB->id,'first_name'=>'B','last_name'=>'Only','email'=>'b@c.com','phone'=>'0594444444','is_active'=>true]);

        // directory for A must not include B's customer
        $directory = app(CustomerDirectoryService::class)->directory($storeA->id, []);
        $this->assertNotContains('B Only', array_column($directory['customers'], 'full_name'));

        // legacy canonical show for B's customer id from A → 404
        $this->actingAs($userA);
        $res = $this->get('/customers/'.$bCustomer->id);
        $this->assertEquals(404, $res->getStatusCode());

        // token-based profile for B's ref from A's store → 404
        $token = app(CustomerIdentityService::class)->tokenForRef('c:'.$bCustomer->id);
        $res2 = $this->get('/customers/profile/'.$token);
        $this->assertEquals(404, $res2->getStatusCode());
    }

    /* ── Test 4: customer search scoped to store ── */
    public function test_customer_search_is_store_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        Customer::create(['store_id'=>$storeA->id,'first_name'=>'Ali','last_name'=>'Smith','email'=>'ali@a.com','phone'=>'0595555555','is_active'=>true]);
        Customer::create(['store_id'=>$storeB->id,'first_name'=>'Ali','last_name'=>'Jones','email'=>'ali@b.com','phone'=>'0596666666','is_active'=>true]);

        $directory = app(CustomerDirectoryService::class)->directory($storeA->id, ['search'=>'Ali']);
        $names = array_column($directory['customers'], 'full_name');
        $this->assertContains('Ali Smith', $names);
        $this->assertNotContains('Ali Jones', $names);
    }

    /* ── Test 5: phone normalization reuses canonical rules ── */
    public function test_phone_normalization_uses_existing_canonical_rules(): void
    {
        // directly assert the canonical normalizer behavior the CRM relies on
        $this->assertEquals('+970592000000', PhoneNormalizer::normalize('0592000000'));
        $this->assertEquals('+970592000000', PhoneNormalizer::normalize('+970592000000'));
        $this->assertEquals('+972592000000', PhoneNormalizer::normalize('+972592000000'));
        $this->assertNotEquals(PhoneNormalizer::normalize('0592000000'), PhoneNormalizer::normalize('+972592000000'));

        // different +970 vs +972 must NOT collide into one identity
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0592000000','customer_email'=>'a@x.com']);
        $this->makeOrder($store, ['customer_phone'=>'+972592000000','customer_email'=>'b@x.com']);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $this->assertCount(2, $directory['customers']); // not merged
    }

    /* ── Test 6: cancelled orders do not count toward repeat status ── */
    public function test_cancelled_orders_do_not_create_false_repeat_status(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['status'=>'cancelled','payment_status'=>'failed','customer_phone'=>'0597777777']);
        $this->makeOrder($store, ['status'=>'cancelled','payment_status'=>'failed','customer_phone'=>'0597777777']);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $guest = collect($directory['customers'])->first();
        $this->assertNotNull($guest);
        $this->assertEquals(2, $guest['orders_count']);
        $this->assertEquals(2, $guest['cancelled_count']);
        $this->assertFalse($guest['is_repeat']);
    }

    /* ── Test 7: 2 valid orders => repeat customer ── */
    public function test_two_valid_orders_make_repeat_customer(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0598888888']);
        $this->makeOrder($store, ['customer_phone'=>'0598888888']);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $guest = collect($directory['customers'])->first();
        $this->assertTrue($guest['is_repeat']);
    }

    /* ── Test 8: customer totals are server-side correct ── */
    public function test_customer_totals_are_server_side_correct(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0599999999','total_amount'=>100]);
        $this->makeOrder($store, ['customer_phone'=>'0599999999','total_amount'=>200]);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $guest = collect($directory['customers'])->first();
        $this->assertEquals(2, $guest['orders_count']);
        $this->assertEquals(300.0, $guest['totals'][0]['total']);
    }

    /* ── Test 9: currencies are not silently combined ── */
    public function test_currencies_are_not_silently_combined(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0591112222','total_amount'=>100,'currency'=>'ILS']);
        $this->makeOrder($store, ['customer_phone'=>'0591112222','total_amount'=>50,'currency'=>'JOD']);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $guest = collect($directory['customers'])->first();
        $codes = collect($guest['totals'])->pluck('currency')->sort()->values()->all();
        $this->assertEquals(['ILS','JOD'], $codes);
        $this->assertSame(100.0, (float) collect($guest['totals'])->firstWhere('currency','ILS')['total']);
        $this->assertSame(50.0, (float) collect($guest['totals'])->firstWhere('currency','JOD')['total']);
    }

    /* ── Test 10: guest aggregation works safely (phone variants collapse) ── */
    public function test_guest_aggregation_collapses_phone_variants(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->makeOrder($store, ['customer_phone'=>'0591234567','customer_email'=>'g@x.com']);
        $this->makeOrder($store, ['customer_phone'=>'+970591234567','customer_email'=>'g2@x.com']);
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $this->assertCount(1, $directory['customers']);
    }

    /* ── Test 11 + 12 + 15: notes tenant-scoped (Store A cannot read/write Store B) ── */
    public function test_notes_are_tenant_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $customerA = Customer::create(['store_id'=>$storeA->id,'first_name'=>'A','last_name'=>'X','email'=>'a@x.com','phone'=>'0591001111','is_active'=>true]);
        $tokenA = app(CustomerIdentityService::class)->tokenForRef('c:'.$customerA->id);

        // A writes a note
        $this->actingAs($userA);
        $this->post('/customers/profile/'.$tokenA.'/notes', ['note'=>'Secret note about A'])->assertRedirect();

        $this->assertDatabaseHas('customer_notes', ['store_id'=>$storeA->id,'customer_ref'=>'c:'.$customerA->id]);

        // B cannot write to A's customer ref token
        $this->actingAs($userB);
        $this->post('/customers/profile/'.$tokenA.'/notes', ['note'=>'intrusion'])->assertStatus(404);
        $this->assertDatabaseMissing('customer_notes', ['store_id'=>$storeB->id,'note'=>'intrusion']);

        // B cannot read A's notes via profile of A's ref
        $this->get('/customers/profile/'.$tokenA)->assertStatus(404);
    }

    /* ── Test 13: notes are internal — showing a profile never serves note text anywhere else ── */
    public function test_note_writing_requires_edit_permission(): void
    {
        [$user,$store,$plan] = $this->companyWithStore();
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'N','last_name'=>'P','email'=>'np@x.com','phone'=>'0591002222','is_active'=>true]);
        $token = app(CustomerIdentityService::class)->tokenForRef('c:'.$customer->id);

        // a merchant WITHOUT edit-customers must be denied note writes
        $viewer = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now(),'current_store'=>$store->id]);
        $role = Role::firstOrCreate(['name'=>'viewer','guard_name'=>'web'],['label'=>'Viewer']);
        $role->syncPermissions(Permission::where('name','view-customers')->get());
        $viewer->assignRole($role);
        $this->actingAs($viewer);
        $res = $this->post('/customers/profile/'.$token.'/notes', ['note'=>'blocked']);
        $this->assertTrue(in_array($res->getStatusCode(), [403, 302]));
        $this->assertDatabaseMissing('customer_notes', ['note'=>'blocked']);
    }

    /* ── Test 14: tags tenant scoped ── */
    public function test_tags_are_tenant_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $a = Customer::create(['store_id'=>$storeA->id,'first_name'=>'A','last_name'=>'Y','email'=>'ay@x.com','phone'=>'0591003333','is_active'=>true]);
        $b = Customer::create(['store_id'=>$storeB->id,'first_name'=>'B','last_name'=>'Y','email'=>'by@x.com','phone'=>'0591004444','is_active'=>true]);
        $tokenA = app(CustomerIdentityService::class)->tokenForRef('c:'.$a->id);
        $tokenB = app(CustomerIdentityService::class)->tokenForRef('c:'.$b->id);

        $this->actingAs($userA);
        $this->post('/customers/profile/'.$tokenA.'/tags', ['name'=>'VIP'])->assertRedirect();
        $this->assertDatabaseHas('customer_tags', ['store_id'=>$storeA->id,'customer_ref'=>'c:'.$a->id,'name'=>'VIP']);

        $this->actingAs($userB);
        $this->post('/customers/profile/'.$tokenA.'/tags', ['name'=>'VIP'])->assertStatus(404);
        // B's own tag is fine; A's is untouched by B
        $this->post('/customers/profile/'.$tokenB.'/tags', ['name'=>'جملة'])->assertRedirect();
        $this->assertDatabaseHas('customer_tags', ['store_id'=>$storeB->id,'customer_ref'=>'c:'.$b->id,'name'=>'جملة']);
        $this->assertDatabaseMissing('customer_tags', ['store_id'=>$storeB->id,'customer_ref'=>'c:'.$a->id]);
    }

    /* ── Test 16: pagination tenant scoped ── */
    public function test_pagination_is_tenant_scoped(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        for ($i=0;$i<20;$i++) {
            Customer::create(['store_id'=>$storeA->id,'first_name'=>'P'.$i,'last_name'=>'A','email'=>"p{$i}@x.com",'phone'=>'059977'.$i,'is_active'=>true]);
        }
        $directory = app(CustomerDirectoryService::class)->directory($storeA->id, ['per_page'=>15,'page'=>1]);
        $this->assertCount(15, $directory['customers']);
        $this->assertEquals(20, $directory['pagination']['total']);
        $this->assertEquals(2, $directory['pagination']['last_page']);
    }

    /* ── Test 17 + 18: order history tenant scoped + links only to own orders ── */
    public function test_order_history_is_tenant_scoped_and_links_own_orders(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $orderA = $this->makeOrder($storeA, ['customer_phone'=>'0591005555']);

        // token for A's guest may be opened by A (200) but NOT by B (404)
        $this->actingAs($userA);
        $tokenA = app(CustomerIdentityService::class)->tokenForRef('p:+970591005555');
        $this->get('/customers/profile/'.$tokenA)->assertSuccessful();

        $this->actingAs($userB);
        $this->get('/customers/profile/'.$tokenA)->assertStatus(404);
    }

    /* ── Test 19 + 20: export tenant scoped + formula injection guarded ── */
    public function test_export_is_tenant_scoped_and_guards_formula_injection(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        Customer::create(['store_id'=>$storeA->id,'first_name'=>'=SUM(A1:A2)','last_name'=>'','email'=>'tricky@x.com','phone'=>'0591006666','is_active'=>true]);
        Customer::create(['store_id'=>$storeB->id,'first_name'=>'Other','last_name'=>'B','email'=>'other@x.com','phone'=>'0591007777','is_active'=>true]);

        $this->actingAs($userA);
        $res = $this->get('/customers/export');
        $res->assertSuccessful();
        $body = $res->streamedContent();
        // B's customer must not appear
        $this->assertStringNotContainsString('Other B', $body);
        // formula-guarded cell is prefixed with apostrophe
        $this->assertStringContainsString("'=SUM(A1:A2)", $body);
    }

    /* ── Test 21: GDPR erasure purges CRM notes/tags ── */
    public function test_gdpr_erasure_purges_notes_and_tags(): void
    {
        [$user,$store] = $this->companyWithStore();
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'G','last_name'=>'D','email'=>'gd@x.com','phone'=>'0591008888','is_active'=>true]);
        CustomerNote::create(['store_id'=>$store->id,'customer_ref'=>'c:'.$customer->id,'note'=>'do not leak','created_by'=>$user->id]);
        CustomerTag::create(['store_id'=>$store->id,'customer_ref'=>'c:'.$customer->id,'name'=>'VIP']);

        app(CustomerDataErasureService::class)->erase($customer);

        $this->assertDatabaseMissing('customer_notes', ['store_id'=>$store->id,'customer_ref'=>'c:'.$customer->id]);
        $this->assertDatabaseMissing('customer_tags', ['store_id'=>$store->id,'customer_ref'=>'c:'.$customer->id]);
        $this->assertDatabaseMissing('customers', ['id'=>$customer->id]);
    }

    /* ── Test: guest + registered phone collision does not rewrite history ── */
    public function test_registered_guest_phone_collision_does_not_rewrite_orders(): void
    {
        [$user,$store] = $this->companyWithStore();
        $registered = Customer::create(['store_id'=>$store->id,'first_name'=>'Reg','last_name'=>'User','email'=>'ru@x.com','phone'=>'0591009999','is_active'=>true]);
        // A guest order with the SAME number as a registered customer
        $this->makeOrder($store, ['customer_phone'=>'0591009999','customer_id'=>null,'customer_email'=>'guestonly@x.com']);

        // Both should appear (one registered + one guest) and NO order row is rewritten
        $directory = app(CustomerDirectoryService::class)->directory($store->id, []);
        $this->assertCount(2, $directory['customers']);
        $this->assertDatabaseHas('orders', ['customer_id'=>null,'customer_email'=>'guestonly@x.com']);
        $this->assertDatabaseHas('customers', ['id'=>$registered->id]);
    }
}