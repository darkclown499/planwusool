<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Launch blocker P0-1: abandoned-cart draft capture must bind to the
 * AUTHORITATIVE store resolved server-side (DomainResolver / session store
 * context / authenticated customer), never to a client-supplied `store_id`.
 *
 * The `/api/cart/draft`, `/api/cart/track` and `/api/cart/sync-abandoned`
 * routes are reachable on the main app domain where DomainResolver never
 * resolves a store; there the request body is fully attacker-controlled, so
 * trusting `store_id` lets any caller write/update AbandonedCart rows for any
 * store (cross-tenant write). The endpoint must instead fail closed (422)
 * when no server-side store authority exists.
 */
class LaunchBlockerCartTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(): Store
    {
        return Store::factory()->create();
    }

    private function draftPayload(int $storeId, array $over = []): array
    {
        return array_merge([
            'store_id' => $storeId,
            'items' => [
                ['name' => 'Test Product', 'quantity' => 1, 'price' => 10, 'product_id' => 0],
            ],
            'customer_email' => 'shopper@example.com',
            'customer_phone' => '+1000000000',
        ], $over);
    }

    public function test_forged_store_id_is_ignored_and_authoritative_store_wins(): void
    {
        $authoritative = $this->makeStore(); // the store the request must bind to
        $victim = $this->makeStore();        // the store the attacker tries to write into

        // Simulate a visitor who browsed the authoritative store: DomainResolver
        // persists the resolved store into the session store context.
        $this->withSession(['store_context.store_id' => (int) $authoritative->id]);

        $response = $this->postJson('/api/cart/draft', $this->draftPayload((int) $victim->id));

        $response->assertOk();
        $response->assertJson(['success' => true, 'tracked' => true]);

        // The trusted store wins: the victim store must have ZERO carts,
        // and exactly one cart exists under the authoritative store.
        $this->assertSame(0, AbandonedCart::where('store_id', $victim->id)->count());
        $this->assertSame(1, AbandonedCart::where('store_id', $authoritative->id)->count());
    }

    public function test_draft_fails_closed_without_server_side_store_authority(): void
    {
        $store = $this->makeStore();

        // No session store context, no resolved delivery domain, no customer.
        $response = $this->postJson('/api/cart/draft', $this->draftPayload((int) $store->id));

        $response->assertStatus(422);
        $this->assertSame(0, AbandonedCart::count());
    }

    public function test_track_sync_abandoned_endpoints_also_fail_closed_without_authority(): void
    {
        $store = $this->makeStore();

        $this->postJson('/api/cart/track', $this->draftPayload((int) $store->id))->assertStatus(422);
        $this->postJson('/api/cart/sync-abandoned', $this->draftPayload((int) $store->id))->assertStatus(422);

        $this->assertSame(0, AbandonedCart::count());
    }

    public function test_legitimate_draft_with_matching_authority_creates_cart(): void
    {
        $store = $this->makeStore();
        $this->withSession(['store_context.store_id' => (int) $store->id]);

        $response = $this->postJson('/api/cart/draft', $this->draftPayload((int) $store->id));

        $response->assertOk();
        $response->assertJson(['success' => true, 'tracked' => true]);
        $this->assertSame(1, AbandonedCart::where('store_id', $store->id)->count());
    }

    public function test_contact_update_with_empty_cart_stays_on_authoritative_store(): void
    {
        $authoritative = $this->makeStore();
        $victim = $this->makeStore();
        $this->withSession(['store_context.store_id' => (int) $authoritative->id]);

        // Contact-only update payload: empty items but a forged store_id
        // pointing at the victim store.
        $response = $this->postJson('/api/cart/draft', $this->draftPayload(
            (int) $victim->id,
            ['items' => [], 'customer_email' => 'shopper@example.com']
        ));

        $response->assertOk();
        $this->assertSame(0, AbandonedCart::where('store_id', $victim->id)->count());

        // The draft must have been recorded under the authoritative store only,
        // holding the contact information supplied.
        $cart = AbandonedCart::where('store_id', $authoritative->id)->first();
        $this->assertNotNull($cart);
        $this->assertSame('shopper@example.com', $cart->customer_email);
    }
}