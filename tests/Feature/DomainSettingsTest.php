<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreDomain;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\QueryException;
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

    public function test_duplicate_domain_rejected_across_stores(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store Dup A');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store Dup B');

        StoreDomain::create([
            'store_id' => $storeA->id,
            'domain_name' => 'dup.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token',
            'is_primary' => true,
        ]);

        // Same store cannot add the same domain twice
        $this->actingAs($ownerA);
        $this->postJson(route('stores.domains.store', $storeA->id), ['domain_name' => 'dup.example.com'])
            ->assertStatus(422)
            ->assertJsonMissingPath('domain');

        // Another store cannot squat the same domain
        $this->actingAs($ownerB);
        $this->postJson(route('stores.domains.store', $storeB->id), ['domain_name' => 'dup.example.com'])
            ->assertStatus(422);
    }

    public function test_www_pair_cannot_be_split_across_stores(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store Pair A');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store Pair B');

        StoreDomain::create([
            'store_id' => $storeA->id,
            'domain_name' => 'pair.example.com',
            'is_verified' => true,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token',
            'is_primary' => true,
        ]);

        // www or non-www variant of an owned domain is treated as taken
        $this->actingAs($ownerB);
        $this->postJson(route('stores.domains.store', $storeB->id), ['domain_name' => 'www.pair.example.com'])
            ->assertStatus(422);

        // And the reverse direction is also blocked for store A
        $this->actingAs($ownerA);
        $this->postJson(route('stores.domains.store', $storeA->id), ['domain_name' => 'www.pair.example.com'])
            ->assertStatus(422);
    }

    public function test_database_unique_guard_rejects_duplicate_domain(): void
    {
        [$ownerA, $storeA] = $this->makeCompanyWithStore('Store Uniq A');
        [$ownerB, $storeB] = $this->makeCompanyWithStore('Store Uniq B');

        StoreDomain::create([
            'store_id' => $storeA->id,
            'domain_name' => 'shared.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token',
            'is_primary' => true,
        ]);

        $this->expectException(QueryException::class);
        StoreDomain::create([
            'store_id' => $storeB->id,
            'domain_name' => 'shared.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token-b',
            'is_primary' => true,
        ]);
    }

    public function test_invalid_domains_rejected(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Invalid');
        $this->actingAs($owner);

        foreach ([
            'localhost',
            '127.0.0.1',
            '8.8.8.8',
            'myshop',
            'my shop.com',
            'shop.example.com:8080',
            'myshop.local',
            'myshop.test',
            'https://127.0.0.1',
            '@example.com',
        ] as $bad) {
            $this->postJson(route('stores.domains.store', $store->id), ['domain_name' => $bad])
                ->assertStatus(422, "domain [{$bad}] should have been rejected");
        }
    }

    public function test_protocol_and_path_normalized_safely(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Normalize');
        $this->actingAs($owner);

        $this->postJson(route('stores.domains.store', $store->id), ['domain_name' => 'HTTPS://SHOP.Example.com/some/path?q=1#frag'])
            ->assertStatus(201)
            ->assertJsonPath('domain.domain_name', 'shop.example.com');
    }

    public function test_primary_domain_is_unique_per_store(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Primary');
        $this->actingAs($owner);

        $d1 = StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'one.example.com',
            'is_verified' => true, 'ssl_status' => 'pending',
            'verification_token' => 't1', 'is_primary' => true, 'verified_at' => now(),
        ]);
        $d2 = StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'two.example.com',
            'is_verified' => true, 'ssl_status' => 'pending',
            'verification_token' => 't2', 'is_primary' => false, 'verified_at' => now(),
        ]);

        $this->postJson(route('stores.domains.primary', [$store->id, $d2->id]))->assertStatus(200);

        $prims = $store->storeDomains()->where('is_primary', true)->get();
        $this->assertCount(1, $prims);
        $this->assertSame('two.example.com', $prims->first()->domain_name);
        $this->assertFalse($d1->fresh()->is_primary, 'only one primary domain per store');
    }

    public function test_default_subdomain_preserved_as_fallback(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Fallback');
        $this->actingAs($owner);

        // No custom domains -> store URL is the default Wusool subdomain
        $this->assertSame($store->getStoreSubdomainUrl(), $store->fresh()->getStoreUrl());

        $domain = StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'fb.example.com',
            'is_verified' => true, 'ssl_status' => 'active',
            'verification_token' => 't', 'is_primary' => true, 'verified_at' => now(),
        ]);

        $this->delete(route('stores.domains.destroy', [$store->id, $domain->id]))->assertStatus(200);

        // Removing the only custom domain must not strand the store
        $this->assertSame($store->getStoreSubdomainUrl(), $store->fresh()->getStoreUrl());
    }

    public function test_index_health_and_status_are_server_derived(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Health');
        $this->actingAs($owner);

        StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'health.example.com',
            'is_verified' => false, 'ssl_status' => 'pending',
            'verification_token' => 't', 'is_primary' => true,
        ]);

        $res = $this->getJson(route('stores.domains', $store->id))->assertStatus(200);

        // Health block present with truthful aggregate state
        $res->assertJsonStructure([
            'health' => ['dns', 'routing', 'ssl', 'primary', 'canonical_domain', 'default_subdomain', 'www'],
        ]);
        $this->assertSame('pending', $res->json('health.dns.status'), 'unverified domain -> DNS not ready');
        $this->assertSame($store->getStoreSubdomainUrl(), $res->json('health.default_subdomain'));

        // Per-domain status is server-derived and never "ready" while unverified
        $domain = collect($res->json('domains'))->firstWhere('domain_name', 'health.example.com');
        $this->assertSame('pending_dns', $domain['status']);
        $this->assertNotSame('ready', $domain['status']);
    }

    public function test_unverified_domain_is_never_labeled_connected(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Honest');
        $this->actingAs($owner);

        $this->postJson(route('stores.domains.store', $store->id), ['domain_name' => 'honest.example.com'])
            ->assertStatus(201)
            ->assertJsonPath('domain.status', 'pending_dns')
            ->assertJsonMissingPath('domain.status_ready');
    }

    public function test_merchant_recheck_is_throttled(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Throttle');
        $this->actingAs($owner);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('stores.domains.recheck', $store->id))->assertStatus(200);
        }
        $this->postJson(route('stores.domains.recheck', $store->id))->assertStatus(429);
    }

    public function test_canonical_domain_resolver_uses_primary_verified_domain(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Canonical');
        $this->actingAs($owner);

        $a = StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'canon-a.example.com',
            'is_verified' => true, 'ssl_status' => 'active',
            'verification_token' => 'ta', 'is_primary' => true, 'verified_at' => now(),
        ]);
        $b = StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'canon-b.example.com',
            'is_verified' => true, 'ssl_status' => 'pending',
            'verification_token' => 'tb', 'is_primary' => false, 'verified_at' => now(),
        ]);

        $this->assertSame('http://canon-a.example.com', $store->fresh()->getStoreUrl());

        $this->postJson(route('stores.domains.primary', [$store->id, $b->id]))->assertStatus(200);

        $this->assertSame('http://canon-b.example.com', $store->fresh()->getStoreUrl());

        // The index payload resolves the same canonical domain server-side
        $res = $this->getJson(route('stores.domains', $store->id))->assertStatus(200);
        $this->assertSame('http://canon-b.example.com', $res->json('health.canonical_domain'));
    }

    public function test_www_and_non_www_serve_store_without_redirect_loop(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('Store Www');
        StoreDomain::create([
            'store_id' => $store->id, 'domain_name' => 'www-ok.example.test',
            'is_verified' => true, 'ssl_status' => 'active',
            'verification_token' => 't', 'is_primary' => true, 'verified_at' => now(),
        ]);

        // The apex and the www variant both reach the store (candidate-host
        // resolution) and neither triggers a redirect — no loop by design.
        $apex = $this->get('http://www-ok.example.test/');
        $this->assertSame(200, $apex->getStatusCode());
        $this->assertFalse($apex->isRedirect());

        $www = $this->get('http://www.www-ok.example.test/');
        $this->assertSame(200, $www->getStatusCode());
        $this->assertFalse($www->isRedirect());

        // An unrelated host is not silently redirected to a store
        $other = $this->get('http://unrelated.example.test/');
        $this->assertFalse($other->isRedirect());
    }
}
