<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * F4 (VerifyDashboardOrigin origin pinning) + F5 (authoritative store scope).
 *
 * Cross-subdomain CSRF: the session cookie is shared across
 * {store}.{domain} storefronts, so a malicious store frontend can read the
 * victim's XSRF token and replay state-changing POSTs to the main app host.
 * Origin pinning plus authoritative-store enforcement close that vector.
 */
class CrossSubdomainStoreAuthorityTest extends TestCase
{
    use RefreshDatabase;

    private function companyUser(): User
    {
        $plan = \App\Models\Plan::factory()->create(['storage_limit' => 5]);
        $user = User::forceCreate([
            'name' => 'Merchant',
            'email' => 'merchant'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'is_enable_login' => 1,
        ]);
        try { $user->assignRole('company'); } catch (\Throwable $e) {}
        return $user;
    }

    private function storeFor(User $user, string $slug = null): Store
    {
        $slug = $slug ?? 'scope'.uniqid();
        $store = Store::forceCreate([
            'name' => 'S '.$slug,
            'slug' => $slug,
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->forceFill(['current_store' => $store->id])->save();
        \App\Models\StoreConfiguration::setConfiguration($store->id, 'store_status', 'true');
        return $store;
    }

    private function storeSubdomain(Store $store): string
    {
        return 'http://'.$store->slug.'.localhost';
    }

    private function mainUrl(string $path): string
    {
        return rtrim(config('app.url'), '/').$path;
    }

    private function productFor(Store $store): \App\Models\Product
    {
        return \App\Models\Product::forceCreate([
            'name' => 'Product for '.$store->slug,
            'price' => 100,
            'stock' => 10,
            'is_active' => true,
            'store_id' => $store->id,
        ]);
    }

    // ---- F4: Origin pinning (VerifyDashboardOrigin) ----

    public function test_cross_origin_state_changing_post_to_main_host_is_rejected(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);

        // Malicious store subdomain replays a state-changing POST towards the
        // main app host with the victim's shared session cookie.
        $res = $this->postJson('/order/place', ['store_id' => $storeA->id], [
            'Origin' => $this->storeSubdomain($storeA),
        ]);

        $res->assertStatus(403);
        $this->assertEquals('Request origin denied.', $res->json('message'));
    }

    public function test_same_origin_state_changing_post_is_not_rejected(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);

        // APP_URL host in tests is 127.0.0.1 -> matching Origin passes pinning.
        $res = $this->postJson('/order/place', ['store_id' => $storeA->id], [
            'Origin' => 'http://127.0.0.1:8000',
        ]);

        $this->assertNotSame(403, $res->status());
    }

    public function test_non_browser_post_without_origin_is_not_rejected(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);

        // Non-browser clients omit Origin -> pinning skipped; the request then
        // fails routing on the main host (404) because /order/place only exists
        // on the store subdomain - and never on origin.
        $res = $this->postJson('/order/place', ['store_id' => $storeA->id]);

        $this->assertNotSame(403, $res->status());
        $this->assertSame(404, $res->status());
    }

    public function test_cross_origin_get_is_not_rejected(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);

        $res = $this->getJson('/api/cart', ['Origin' => 'http://localhost']);

        $this->assertNotSame(403, $res->status());
    }

    public function test_cross_origin_post_to_exempt_webhook_path_is_not_rejected(): void
    {
        // Gateway server-to-server POSTs are exempt from origin pinning
        // (mirrors the CSRF-except list). Reaches the handler, which fails on
        // an unknown order (404) — NOT on origin.
        $res = $this->postJson('/payments/midtrans/callback', ['order_id' => 'unknown-cb'], [
            'Origin' => 'http://localhost',
        ]);

        $this->assertNotSame(403, $res->status());
        $this->assertSame(404, $res->status());
    }

    // ---- F5: Authoritative store scope ----

    public function test_domain_resolver_session_authority_blocks_foreign_cart_on_main_domain(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $storeB = $this->storeFor($userA);
        $productB = $this->productFor($storeB);

        // Legitimately browse store A: DomainResolver stores the authoritative
        // store on the session (persists across requests via the session cookie).
        $this->get($this->storeSubdomain($storeA).'/')->assertOk();

        // A main-domain cart POST targeting store B must now be rejected.
        $res = $this->postJson($this->mainUrl('/api/cart/add'), [
            'store_id' => $storeB->id,
            'product_id' => $productB->id,
            'quantity' => 1,
        ]);
        $res->assertStatus(403);
    }

    public function test_domain_resolver_session_authority_allows_matching_cart_on_main_domain(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $productA = $this->productFor($storeA);

        $this->get($this->storeSubdomain($storeA).'/')->assertOk();

        // Matching store_id passes the scope guard and is added to the session cart.
        $res = $this->postJson($this->mainUrl('/api/cart/add'), [
            'store_id' => $storeA->id,
            'product_id' => $productA->id,
            'quantity' => 1,
        ]);
        $this->assertNotSame(403, $res->status());
        $this->assertSame(200, $res->status());
    }

    public function test_domain_resolver_session_authority_blocks_foreign_wishlist_on_main_domain(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $storeB = $this->storeFor($userA);
        $productB = $this->productFor($storeB);

        $this->get($this->storeSubdomain($storeA).'/')->assertOk();

        $res = $this->postJson($this->mainUrl('/api/wishlist/toggle'), [
            'store_id' => $storeB->id,
            'product_id' => $productB->id,
        ]);
        $res->assertStatus(403);
    }

    public function test_place_order_on_subdomain_rejects_foreign_store_id(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $storeB = $this->storeFor($userA);

        // On store A's subdomain, a payload claiming store B must be rejected.
        $res = $this->postJson($this->storeSubdomain($storeA).'/order/place', [
            'store_id' => $storeB->id,
            'payment_method' => 'cod',
        ]);
        $res->assertStatus(403);
        $this->assertEquals('Store not authorized.', $res->json('message'));
    }

    public function test_place_order_on_subdomain_allows_matching_store_id(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);

        // Correct store_id passes the scope guard and reaches validation (422)
        // because the order payload is incomplete.
        $res = $this->postJson($this->storeSubdomain($storeA).'/order/place', [
            'store_id' => $storeA->id,
            'payment_method' => 'cod',
        ]);
        $this->assertNotSame(403, $res->status());
        $this->assertSame(422, $res->status());
    }
}