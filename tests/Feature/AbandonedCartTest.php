<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AbandonedCartTest extends TestCase
{
    use RefreshDatabase;

    private function giveAbandonedCartPermissions(User $user): void
    {
        foreach ([
            'manage-abandoned-carts',
            'send-abandoned-cart-reminders',
            'delete-abandoned-carts',
            'export-abandoned-carts',
        ] as $name) {
            $perm = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            $user->givePermissionTo($perm);
        }
    }

    private function companyUser(): User
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 10,
        ]);
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function storeFor(User $user): Store
    {
        $s = new Store();
        $s->user_id = $user->id;
        $s->name = 'Store ' . uniqid();
        $s->slug = 's-' . uniqid();
        $s->theme = 'bazaar-market';
        $s->email = 's@' . uniqid() . '.com';
        $s->save();
        $user->current_store = $s->id;
        $user->save();
        return $s;
    }

    private function makeCart(Store $store, array $overrides = []): AbandonedCart
    {
        return AbandonedCart::forceCreate(array_merge([
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'customer_name' => 'Test Customer',
            'customer_email' => 'test@example.com',
            'customer_phone' => '+970591234567',
            'cart_items' => [['name' => 'Test Product', 'quantity' => 1, 'price' => 100]],
            'cart_total' => 100,
            'status' => 'abandoned',
            'last_activity_at' => now(),
            'reminder_count' => 0,
            'recovery_token' => bin2hex(random_bytes(32)),
            'expires_at' => now()->addDays(7),
        ], $overrides));
    }

    public function test_merchant_can_access_own_abandoned_carts_index(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', $store->id));

        $response->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_access_abandoned_carts(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $response = $this->get(route('stores.abandoned-carts.index', $store->id));

        $response->assertStatus(302);
    }

    public function test_cross_store_reminder_is_blocked(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->giveAbandonedCartPermissions($userA);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $cartB = $this->makeCart($storeB);

        $response = $this->actingAs($userA)
            ->post(route('stores.abandoned-carts.send-reminder', [$storeA->id, $cartB->id]));

        $response->assertStatus(403);
    }

    public function test_cross_store_delete_is_blocked(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->giveAbandonedCartPermissions($userA);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $cartB = $this->makeCart($storeB);

        $response = $this->actingAs($userA)
            ->delete(route('stores.abandoned-carts.destroy', [$storeA->id, $cartB->id]));

        $response->assertStatus(403);
    }

    public function test_cross_store_mark_recovered_is_blocked(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->giveAbandonedCartPermissions($userA);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $cartB = $this->makeCart($storeB);

        $response = $this->actingAs($userA)
            ->post(route('stores.abandoned-carts.mark-recovered', [$storeA->id, $cartB->id]));

        $response->assertStatus(403);
    }

    public function test_send_reminder_with_valid_contact_does_not_500(): void
    {
        Mail::fake();

        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, [
            'customer_email' => 'test@example.com',
            'customer_phone' => '+970591234567',
        ]);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $response->assertSessionHas('success');
    }

    public function test_send_reminder_without_contact_returns_safe_error(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, [
            'customer_email' => null,
            'customer_phone' => null,
        ]);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $response->assertSessionHasErrors('error');
    }

    public function test_send_reminder_for_guest_cart_does_not_500(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, [
            'customer_id' => null,
            'customer_name' => null,
            'customer_email' => null,
            'customer_phone' => null,
        ]);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $response->assertSessionHasErrors('error');
    }

    public function test_send_reminder_for_missing_cart_returns_404(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, 99999]));

        $response->assertStatus(404);
    }

    public function test_mark_recovered_works_for_own_cart(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, ['status' => 'abandoned']);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.mark-recovered', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $response->assertSessionHas('success');

        $cart->refresh();
        $this->assertEquals('recovered', $cart->status);
        $this->assertNotNull($cart->recovered_at);
    }

    public function test_duplicate_mark_recovered_is_safe(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, ['status' => 'recovered', 'recovered_at' => now()]);

        $response = $this->actingAs($user)
            ->post(route('stores.abandoned-carts.mark-recovered', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $cart->refresh();
        $this->assertEquals('recovered', $cart->status);
    }

    public function test_delete_own_cart_works(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store);

        $response = $this->actingAs($user)
            ->delete(route('stores.abandoned-carts.destroy', [$store->id, $cart->id]));

        $response->assertStatus(302);
        $this->assertDatabaseMissing('abandoned_carts', ['id' => $cart->id]);
    }

    public function test_delete_already_deleted_cart_returns_404(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store);
        $cartId = $cart->id;
        $cart->delete();

        $response = $this->actingAs($user)
            ->delete(route('stores.abandoned-carts.destroy', [$store->id, $cartId]));

        $response->assertStatus(404);
    }

    public function test_export_store_scoped_works(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $this->makeCart($store);
        $this->makeCart($store, ['status' => 'recovered']);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.export', $store->id));

        $response->assertStatus(200);
    }

    public function test_export_with_zero_rows_works(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.export', $store->id));

        $response->assertStatus(200);
    }

    public function test_export_cross_store_is_blocked(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->giveAbandonedCartPermissions($userA);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $this->makeCart($storeB);

        $response = $this->actingAs($userA)
            ->get(route('stores.abandoned-carts.export', $storeB->id));

        $response->assertStatus(403);
    }

    public function test_search_with_arabic_text_does_not_500(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'search' => 'عربي']));

        $response->assertStatus(200);
    }

    public function test_search_with_empty_query_does_not_500(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'search' => '']));

        $response->assertStatus(200);
    }

    public function test_search_with_special_characters_does_not_500(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'search' => '%_\'\\']));

        $response->assertStatus(200);
    }

    public function test_status_filter_does_not_500(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'status' => 'reminder_sent']));

        $response->assertStatus(200);
    }

    public function test_stats_are_store_scoped(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->makeCart($storeA, ['status' => 'abandoned']);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $this->makeCart($storeB, ['status' => 'abandoned']);
        $this->makeCart($storeB, ['status' => 'abandoned']);
        $this->makeCart($storeB, ['status' => 'recovered']);

        $service = app(\App\Services\AbandonedCartService::class);
        $statsA = $service->getStats($storeA->id);
        $statsB = $service->getStats($storeB->id);

        $this->assertEquals(1, $statsA['abandoned']);
        $this->assertEquals(2, $statsB['abandoned']);
        $this->assertEquals(1, $statsB['recovered']);
    }

    public function test_guest_cart_with_no_contact_does_not_crash_on_any_action(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, [
            'customer_id' => null,
            'customer_name' => null,
            'customer_email' => null,
            'customer_phone' => null,
        ]);

        $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, $cart->id]))
            ->assertStatus(302)
            ->assertSessionHasErrors('error');

        $this->actingAs($user)
            ->post(route('stores.abandoned-carts.mark-recovered', [$store->id, $cart->id]))
            ->assertStatus(302)
            ->assertSessionHas('success');

        $this->actingAs($user)
            ->delete(route('stores.abandoned-carts.destroy', [$store->id, $cart->id]))
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_cart_with_deleted_customer_id_does_not_crash(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $cart = $this->makeCart($store, [
            'customer_id' => null,
            'customer_email' => null,
            'customer_phone' => null,
        ]);

        $this->actingAs($user)
            ->post(route('stores.abandoned-carts.send-reminder', [$store->id, $cart->id]))
            ->assertStatus(302);
    }

    public function test_service_send_reminder_returns_array_when_no_contact(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $cart = $this->makeCart($store, [
            'customer_email' => null,
            'customer_phone' => null,
        ]);

        $service = app(\App\Services\AbandonedCartService::class);
        $result = $service->sendReminder($cart);

        $this->assertIsArray($result);
        $this->assertFalse($result['success']);
        $this->assertNotEmpty($result['message']);
    }

    public function test_service_get_stats_includes_draft_and_abandoned(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $this->makeCart($store, ['status' => 'draft']);
        $this->makeCart($store, ['status' => 'abandoned']);
        $this->makeCart($store, ['status' => 'new']);

        $service = app(\App\Services\AbandonedCartService::class);
        $stats = $service->getStats($store->id);

        $this->assertEquals(1, $stats['draft']);
        $this->assertEquals(1, $stats['abandoned']);
        $this->assertEquals(1, $stats['new']);
        $this->assertEquals(3, $stats['pending']);
    }
}
