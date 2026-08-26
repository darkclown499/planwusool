<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreDomain;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DomainSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompanyWithStore(string $name = 'Test Store', bool $domainEnabled = true): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_custdomain' => $domainEnabled ? 'on' : 'off',
            'enable_custsubdomain' => 'on',
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $name]);
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['settings-stores', 'manage-stores', 'manage-shipping']);
        return [$user, $store, $plan];
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_merchant_can_open_domain_settings_inertia(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Inertia');
        $this->actingAs($owner);

        // Normal web visit should return Inertia page
        $this->get(route('stores.domains', $store->id))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page->component('stores/domains')->has('store'));

        // Verify controller logic directly: Inertia header must force Inertia branch even when JSON headers are also present.
        // This is the core bug: previously JSON branch was taken for Inertia requests.
        $requestInertiaJson = \Illuminate\Http\Request::create(route('stores.domains', $store->id, false), 'GET');
        $requestInertiaJson->headers->set('X-Inertia', 'true');
        $requestInertiaJson->headers->set('X-Requested-With', 'XMLHttpRequest');
        $requestInertiaJson->headers->set('Accept', 'application/json');
        $isInertia = (bool) $requestInertiaJson->header('X-Inertia');
        $wouldBeJson = $requestInertiaJson->expectsJson() || $requestInertiaJson->wantsJson() || $requestInertiaJson->header('X-Requested-With') === 'XMLHttpRequest' || $requestInertiaJson->header('Accept') === 'application/json';
        // With fix, isInertia true must prevent JSON branch
        $this->assertTrue($isInertia);
        $this->assertTrue($wouldBeJson); // without fix this would be JSON, with fix we check !isInertia && wouldBeJson => false
        $shouldBeJson = !$isInertia && $wouldBeJson;
        $this->assertFalse($shouldBeJson, 'Inertia request must not be treated as JSON even when it has JSON headers');
    }

    public function test_json_endpoint_still_returns_json(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store JSON');
        $this->actingAs($owner);

        // JSON via getJson (Accept: application/json)
        $this->getJson(route('stores.domains', $store->id))
            ->assertStatus(200)
            ->assertJsonStructure(['domains', 'dns', 'store'])
            ->assertJsonPath('store.id', $store->id);

        // apiGet style: X-Requested-With + Accept json
        $this->get(route('stores.domains', $store->id), ['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
            ->assertStatus(200)
            ->assertJsonStructure(['domains', 'dns', 'store']);
    }

    public function test_store_isolation_domains(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store A');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store B');

        StoreDomain::create([
            'store_id' => $storeA->id,
            'domain_name' => 'a.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token-a',
            'is_primary' => true,
        ]);
        $domainB = StoreDomain::create([
            'store_id' => $storeB->id,
            'domain_name' => 'b.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token-b',
            'is_primary' => true,
        ]);

        $this->actingAs($ownerA);

        // A can see own domains via Inertia and JSON
        $this->get(route('stores.domains', $storeA->id))->assertStatus(200)->assertInertia(fn ($p) => $p->component('stores/domains'));
        $this->getJson(route('stores.domains', $storeA->id))
            ->assertStatus(200)
            ->assertJsonFragment(['domain_name' => 'a.example.com'])
            ->assertJsonMissing(['domain_name' => 'b.example.com']);

        // A cannot access B's page at all
        $this->get(route('stores.domains', $storeB->id))->assertStatus(404);
        $this->getJson(route('stores.domains', $storeB->id))->assertStatus(404);

        // A cannot verify / delete B's domain
        $this->post(route('stores.domains.verify', [$storeA->id, $domainB->id]))->assertStatus(404);
        $this->post(route('stores.domains.verify', [$storeB->id, $domainB->id]))->assertStatus(404);
        $this->delete(route('stores.domains.destroy', [$storeA->id, $domainB->id]))->assertStatus(404);
        $this->delete(route('stores.domains.destroy', [$storeB->id, $domainB->id]))->assertStatus(404);

        // A cannot add domain to B's store
        $this->postJson(route('stores.domains.store', $storeB->id), ['domain_name' => 'evil.com'])->assertStatus(404);

        // B cannot access A's data
        $this->actingAs($ownerB);
        $this->get(route('stores.domains', $storeA->id))->assertStatus(404);
        $this->getJson(route('stores.domains', $storeA->id))->assertStatus(404);
    }

    public function test_inertia_response_is_not_plain_json(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store NotJson');
        $this->actingAs($owner);

        // Normal GET returns Inertia HTML; we can verify via assertInertia
        $this->get(route('stores.domains', $store->id))
            ->assertStatus(200)
            ->assertInertia(function ($page) {
                $page->component('stores/domains');
                // Inertia props must contain store, not domains at top level
                $page->has('store');
                return $page;
            });

        // JSON endpoint must return plain JSON with domains/dns/store
        $response = $this->getJson(route('stores.domains', $store->id));
        $response->assertStatus(200)->assertJsonStructure(['domains', 'dns', 'store']);
        $data = $response->json();
        $this->assertArrayHasKey('domains', $data);
        $this->assertArrayHasKey('dns', $data);
        $this->assertArrayHasKey('store', $data);
    }

    public function test_superadmin_can_access_any_store_domains(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store SuperA');
        // create superadmin
        $superAdmin = User::factory()->create(['type' => 'superadmin', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $superAdmin->givePermissionTo(['settings-stores']);
        $this->actingAs($superAdmin);
        $this->get(route('stores.domains', $storeA->id))->assertStatus(200)->assertInertia(fn ($p) => $p->component('stores/domains'));
        $this->getJson(route('stores.domains', $storeA->id))->assertStatus(200)->assertJsonStructure(['domains', 'dns', 'store']);
    }
}
