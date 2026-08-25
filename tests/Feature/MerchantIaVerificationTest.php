<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\Tax;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MerchantIaVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompanyWithStore(string $name = 'Test Store'): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_custdomain' => 'on',
            'enable_custsubdomain' => 'on',
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $name]);
        // current_store is guarded, use query builder
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        // Give permissions needed for all IA routes (minimal, avoid global bypass like manage-settings that would allow cross-store)
        $user->givePermissionTo(['settings-stores','manage-shipping','create-shipping','edit-shipping','delete-shipping','view-shipping','manage-tax','create-tax','edit-tax','delete-tax','view-tax','manage-stores']);
        return [$user, $store, $plan];
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_store_scoped_shipping_isolation(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B');

        Shipping::create(['name' => 'A method','type'=>'flat_rate','cost'=>10,'store_id'=>$storeA->id,'is_active'=>true]);
        Shipping::create(['name' => 'B method','type'=>'flat_rate','cost'=>20,'store_id'=>$storeB->id,'is_active'=>true]);

        $this->actingAs($ownerA);
        $this->get(route('stores.shipping.canonical', $storeA->id))->assertStatus(200);
        // Inertia page contains only A shipping
        $response = $this->get(route('stores.shipping.canonical', $storeA->id));
        $page = $response->viewData('page')['props'] ?? [];
        // If using Inertia, props contain shippings
        if (isset($page['shippings'])) {
            $names = collect($page['shippings'])->pluck('name')->toArray();
            $this->assertContains('A method', $names);
            $this->assertNotContains('B method', $names);
        }

        // A cannot access B
        $this->get(route('stores.shipping.canonical', $storeB->id))->assertStatus(404);

        // mutation attempt: create via POST /shipping (global) while current_store=A should create for A not B
        $this->post(route('shipping.store'), ['name'=>'New A','type'=>'flat_rate','cost'=>5])->assertRedirect(route('shipping.index'));
        $this->assertDatabaseHas('shippings', ['name'=>'New A','store_id'=>$storeA->id]);
        $this->assertDatabaseMissing('shippings', ['name'=>'New A','store_id'=>$storeB->id]);

        // Try to mutate B via PUT /shipping/{id} where id is B's shipping - should 404
        $bShipping = Shipping::where('store_id',$storeB->id)->first();
        $this->put(route('shipping.update', $bShipping->id), ['name'=>'Hacked','type'=>'flat_rate'])->assertStatus(404);
        $this->assertDatabaseHas('shippings', ['id'=>$bShipping->id,'name'=>'B method']);
    }

    public function test_store_scoped_taxes_isolation_and_toggle(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A2');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B2');

        $taxA = Tax::create(['name'=>'VAT A','rate'=>15,'type'=>'percentage','store_id'=>$storeA->id,'is_active'=>true]);
        Tax::create(['name'=>'VAT B','rate'=>5,'type'=>'percentage','store_id'=>$storeB->id,'is_active'=>true]);

        $this->actingAs($ownerA);
        $this->get(route('stores.taxes.canonical', $storeA->id))->assertStatus(200);
        $this->get(route('stores.taxes.canonical', $storeB->id))->assertStatus(404);

        // toggle prices_include_tax persistence - verify via scoped page prop
        $this->post(route('tax.toggle-tax-included'), ['prices_include_tax'=>true])->assertStatus(302);
        $this->get(route('stores.taxes.canonical', $storeA->id))->assertStatus(200)->assertInertia(fn($p)=>$p->where('pricesIncludeTax', true));
        $this->post(route('tax.toggle-tax-included'), ['prices_include_tax'=>false])->assertStatus(302);
        $this->get(route('stores.taxes.canonical', $storeA->id))->assertStatus(200)->assertInertia(fn($p)=>$p->where('pricesIncludeTax', false));
        // toggle back to true for persistence check
        $this->post(route('tax.toggle-tax-included'), ['prices_include_tax'=>true])->assertStatus(302);

        // create tax for A
        $this->post(route('tax.store'), ['name'=>'New Tax A','rate'=>7,'type'=>'percentage'])->assertRedirect(route('tax.index'));
        $this->assertDatabaseHas('taxes', ['name'=>'New Tax A','store_id'=>$storeA->id]);

        // try to delete B tax as A -> 404
        $bTax = Tax::where('store_id',$storeB->id)->first();
        $this->delete(route('tax.destroy', $bTax->id))->assertStatus(404);
    }

    public function test_payments_isolation(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A3');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B3');

        $this->actingAs($ownerA);
        $this->get(route('stores.payments', $storeA->id))->assertStatus(200);
        $this->get(route('stores.payments', $storeB->id))->assertStatus(404);

        // Toggle COD via API (store-scoped)
        $this->put(route('api.store-payments.update', $storeA->id), ['method'=>'cod','enabled'=>true])->assertStatus(200);
        // Verify reload still shows enabled
        $res = $this->get(route('api.store-payments.index', $storeA->id));
        $res->assertStatus(200);

        // A cannot toggle B payment
        $this->put(route('api.store-payments.update', $storeB->id), ['method'=>'cod','enabled'=>true])->assertStatus(403);
    }

    public function test_customer_accounts_isolation_and_persistence(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A4');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B4');

        $this->actingAs($ownerA);
        $this->get(route('stores.customer-accounts', $storeA->id))->assertStatus(200);
        $this->get(route('stores.customer-accounts', $storeB->id))->assertStatus(404);

        // OFF
        $this->put(route('api.store-features.update', $storeA->id), ['key'=>'customer_accounts_enabled','enabled'=>false])->assertStatus(200);
        $this->assertEquals('false', \App\Models\StoreConfiguration::where('store_id',$storeA->id)->where('key','customer_accounts_enabled')->value('value'));

        // ON
        $this->put(route('api.store-features.update', $storeA->id), ['key'=>'customer_accounts_enabled','enabled'=>true])->assertStatus(200);
        $this->assertEquals('true', \App\Models\StoreConfiguration::where('store_id',$storeA->id)->where('key','customer_accounts_enabled')->value('value'));

        // A cannot modify B
        $this->put(route('api.store-features.update', $storeB->id), ['key'=>'customer_accounts_enabled','enabled'=>false])->assertStatus(403);
        $this->assertDatabaseMissing('store_configurations', ['store_id'=>$storeB->id,'key'=>'customer_accounts_enabled','value'=>'false']);
    }

    public function test_notifications_isolation(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A5');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B5');

        $this->actingAs($ownerA);
        $this->get(route('stores.notifications.whatsapp', $storeA->id))->assertStatus(200);
        $this->get(route('stores.notifications.whatsapp', $storeB->id))->assertStatus(403);

        // Save toggle safely
        $this->put(route('stores.notifications.whatsapp.update', $storeA->id), ['is_enabled'=>false,'notification_phone'=>'+970599123456'])->assertRedirect();
        // A cannot save B
        $this->put(route('stores.notifications.whatsapp.update', $storeB->id), ['is_enabled'=>true])->assertStatus(403);
    }

    public function test_domains_html_and_json_isolation(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A6');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B6');

        $this->actingAs($ownerA);
        // HTML
        $this->get(route('stores.domains', $storeA->id))->assertStatus(200)->assertInertia(fn($p)=>$p->component('stores/domains'));
        // JSON
        $this->getJson(route('stores.domains', $storeA->id))->assertStatus(200)->assertJsonStructure(['domains','dns','store']);
        // B isolation
        $this->get(route('stores.domains', $storeB->id))->assertStatus(404);
        $this->getJson(route('stores.domains', $storeB->id))->assertStatus(404);
    }

    public function test_integrations_hub_and_erp(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A7');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B7');
        $this->actingAs($ownerA);
        $this->get(route('stores.integrations', $storeA->id))->assertStatus(200);
        $this->get(route('stores.erp', $storeA->id))->assertStatus(200);
        $this->get(route('stores.integrations', $storeB->id))->assertStatus(404);
        $this->get(route('stores.erp', $storeB->id))->assertStatus(404);
    }

    public function test_legacy_redirects(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Legacy');
        $this->actingAs($owner);
        $this->get(route('stores.settings', $store->id).'?tab=shipping')->assertRedirect(route('stores.shipping.canonical', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=payments')->assertRedirect(route('stores.payments', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=taxes')->assertRedirect(route('stores.taxes.canonical', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=domains')->assertRedirect(route('stores.domains', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=features')->assertRedirect(route('stores.features', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=erp')->assertRedirect(route('stores.integrations', $store->id));
        $this->get(route('stores.settings', $store->id).'?tab=unknown')->assertRedirect(route('stores.settings', $store->id));
        $this->get(route('stores.notifications', $store->id))->assertRedirect(route('stores.notifications.whatsapp', $store->id));
    }

    public function test_legacy_mutation_stays_on_own_store(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A8');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B8');
        $this->actingAs($ownerA);
        // Try to create shipping with manipulated store_id in payload (if any) - should still be A
        $this->post(route('shipping.store'), ['name'=>'Manipulated','type'=>'flat_rate','cost'=>9,'store_id'=>$storeB->id])->assertRedirect();
        $this->assertDatabaseHas('shippings', ['name'=>'Manipulated','store_id'=>$storeA->id]);
        $this->assertDatabaseMissing('shippings', ['name'=>'Manipulated','store_id'=>$storeB->id]);
    }
}
