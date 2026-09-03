<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Social Commerce Phase 1 — tracking foundations.
 *
 * Covers the merchant Marketing page (Meta/TikTok/GA4), strict ID validation,
 * tenant isolation, storefront config propagation (currency_code + pixel IDs)
 * and the session-scoped orders API fields used by the purchase event.
 *
 * PLAN GATING is deferred: there is no canonical marketing entitlement in the
 * plans/features architecture, so tracking is intentionally not coupled to the
 * template-editor tier — tracking IDs persist for every plan.
 */
class SocialCommerceTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        \App\Models\StoreConfiguration::flushRequestCache();
    }

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Professional-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'template_editor_level' => $attrs['template_editor_level'] ?? 'full',
        ]);

        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'plan_is_active' => true,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $this->grantSettingsPermission($user);

        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Test Store';
        $store->slug = $attrs['slug'] ?? 'track-' . uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function grantSettingsPermission(User $user): void
    {
        try {
            $perm = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'settings-stores', 'guard_name' => 'web']);
            $user->givePermissionTo($perm);
        } catch (\Throwable $e) {
            $user->type = 'superadmin';
            $user->save();
        }
    }

    private function assertStorefrontConfig($store, array $expected): array
    {
        $controller = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($controller, 'getStoreConfig');
        $ref->setAccessible(true);
        $config = $ref->invoke($controller, ['id' => $store->id, 'name' => $store->name]);
        foreach ($expected as $key => $value) {
            $this->assertSame($value, $config['config'][$key], "config.{$key} mismatch");
        }
        return $config['config'];
    }

    public function test_marketing_page_renders_with_props(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        // Canonical Marketing Tracking Hub
        $res = $this->get(route('stores.tracking', $store->id));
        $res->assertOk();

        $page = $res->inertiaPage();
        $this->assertSame('marketing/tracking', $page['component']);
        $this->assertArrayHasKey('store', $page['props']);
        $this->assertSame($store->id, $page['props']['store']['id']);
        $this->assertArrayHasKey('settings', $page['props']);
        // Plan gating is deferred (no canonical marketing entitlement): the page
        // must NOT couple tracking UI to the template-editor tier.
        $this->assertArrayNotHasKey('planAllowsAdvancedFeatures', $page['props']);

        // Legacy route must hand off to canonical via redirect
        $this->get(route('stores.marketing', $store->id))->assertRedirect(route('stores.tracking', $store->id));
    }

    public function test_marketing_page_shotgunned_other_tenant_store_404s(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        [$otherUser, $otherStore] = $this->ownerWithStore(['slug' => 'other-' . uniqid()]);

        $this->actingAs($otherUser);
        // The other user owns a store with the same permission, but must NOT be
        // able to reach the owner's store settings.
        $res = $this->get(route('stores.tracking', $store->id));
        $res->assertNotFound();
    }

    public function test_marketing_page_requires_settings_permission(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $user->revokePermissionTo('settings-stores');
        $this->actingAs($user);

        $this->get(route('stores.tracking', $store->id))->assertForbidden();
    }

    public function test_update_persists_valid_tracking_ids_and_exposes_them_to_storefront(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $this->put(route('stores.settings.update', $store->id), [
            'settings' => [
                'meta_pixel_id' => '123456789012345',
                'tiktok_pixel_id' => 'CVR1234ABCDEFG12',
                'google_analytics_id' => 'G-ABCDE12345',
            ],
        ])->assertSessionHasNoErrors();

        StoreConfiguration::flushRequestCache();
        $config = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('123456789012345', $config['meta_pixel_id']);
        $this->assertSame('CVR1234ABCDEFG12', $config['tiktok_pixel_id']);
        $this->assertSame('G-ABCDE12345', $config['google_analytics_id']);

        // Storefront config must expose them back to the tracking layer.
        $this->assertStorefrontConfig($store, [
            'meta_pixel_id' => '123456789012345',
            'tiktok_pixel_id' => 'CVR1234ABCDEFG12',
            'google_analytics_id' => 'G-ABCDE12345',
        ]);
    }

    public function test_update_clears_empty_tracking_ids(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        StoreConfiguration::updateConfiguration($store->id, ['meta_pixel_id' => '123456789012345', 'tiktok_pixel_id' => 'CVR1234ABCDEFG12', 'google_analytics_id' => 'G-ABCDE12345']);
        StoreConfiguration::flushRequestCache();

        $this->put(route('stores.settings.update', $store->id), [
            'settings' => [
                'meta_pixel_id' => '',
                'tiktok_pixel_id' => '',
                'google_analytics_id' => '',
            ],
        ])->assertSessionHasNoErrors();

        StoreConfiguration::flushRequestCache();
        $config = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('', $config['meta_pixel_id']);
        $this->assertSame('', $config['tiktok_pixel_id']);
        $this->assertSame('', $config['google_analytics_id']);
    }

    public function test_tiktok_id_is_normalized_to_uppercase(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['tiktok_pixel_id' => '  cvr1234abcdefg12  '],
        ])->assertSessionHasNoErrors();

        StoreConfiguration::flushRequestCache();
        $this->assertSame('CVR1234ABCDEFG12', StoreConfiguration::getConfiguration($store->id)['tiktok_pixel_id']);
    }

    public function test_script_payload_and_garbage_ids_are_rejected(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $this->put(route('stores.settings.update', $store->id), [
            'settings' => [
                'meta_pixel_id' => '<script>alert(1)</script>',
                'tiktok_pixel_id' => 'not-a-pixel-id!',
                'google_analytics_id' => 'javascript:alert(1)',
            ],
        ])->assertSessionHasErrors(['settings.meta_pixel_id', 'settings.tiktok_pixel_id', 'settings.google_analytics_id']);

        // Invalid values must never reach store_configurations.
        StoreConfiguration::flushRequestCache();
        $config = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('', $config['meta_pixel_id']);
        $this->assertSame('', $config['tiktok_pixel_id']);
        $this->assertSame('', $config['google_analytics_id']);
    }

    public function test_tracking_ids_persist_for_all_plans_no_marketing_entitlement_gate(): void
    {
        // Starter-tier (no advanced settings) must STILL be able to save tracking
        // IDs: there is no canonical marketing entitlement, so tracking must not
        // be coupled to the template-editor tier.
        [$user, $store] = $this->ownerWithStore(['template_editor_level' => 'none']);
        $this->actingAs($user);

        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['meta_pixel_id' => '123456789012345', 'tiktok_pixel_id' => 'CVR1234ABCDEFG12'],
        ])->assertSessionHasNoErrors();

        StoreConfiguration::flushRequestCache();
        $config = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('123456789012345', $config['meta_pixel_id']);
        $this->assertSame('CVR1234ABCDEFG12', $config['tiktok_pixel_id']);
    }

    public function test_tenant_isolation_update_rejected(): void
    {
        [$owner, $store] = $this->ownerWithStore();
        [$otherUser, $otherStore] = $this->ownerWithStore(['slug' => 'iso-' . uniqid()]);

        $this->actingAs($otherUser);
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['meta_pixel_id' => '123456789012345'],
        ])->assertNotFound();

        StoreConfiguration::flushRequestCache();
        $this->assertSame('', StoreConfiguration::getConfiguration($store->id)['meta_pixel_id']);
    }

    public function test_storefront_config_includes_currency_code(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        // Default platform currency is ILS.
        $this->assertStorefrontConfig($store, ['currency_code' => 'ILS']);

        // Store-configured default_currency overrides it.
        StoreConfiguration::updateConfiguration($store->id, ['default_currency' => 'USD']);
        StoreConfiguration::flushRequestCache();
        $this->assertStorefrontConfig($store, ['currency_code' => 'USD']);
    }

    public function test_marketing_page_does_not_gate_on_plan_tier(): void
    {
        // Even a Starter-tier merchant sees a fully usable marketing page; there
        // is no marketing entitlement to gate on yet (PLAN GATING DEFERRED).
        [$user, $store] = $this->ownerWithStore(['template_editor_level' => 'none']);
        $this->actingAs($user);

        $res = $this->get(route('stores.tracking', $store->id));
        $res->assertOk();
        $props = $res->inertiaPage()['props'];
        $this->assertArrayNotHasKey('planAllowsAdvancedFeatures', $props);
    }

    public function test_unconfigured_store_exposes_empty_pixel_ids(): void
    {
        // An unconfigured store must expose empty pixel IDs to the storefront, so
        // the tracking layer receives empty values and no provider script loads.
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);

        $config = $this->assertStorefrontConfig($store, [
            'meta_pixel_id' => '',
            'tiktok_pixel_id' => '',
            'google_analytics_id' => '',
        ]);
        $this->assertSame('', $config['google_analytics_id']);
    }

    public function test_orders_api_show_returns_currency_code_and_item_ids(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $customer = \App\Models\Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'tracking@example.com',
            'password' => bcrypt('password'),
            'phone' => '05xxxxxxxx',
            'is_active' => true,
        ]);

        $order = new Order();
        $order->order_number = 'TRK-' . strtoupper(uniqid());
        $order->store_id = $store->id;
        $order->customer_id = $customer->id;
        $order->status = 'pending';
        $order->payment_status = 'pending';
        $order->customer_first_name = 'Test';
        $order->customer_last_name = 'User';
        $order->customer_email = 'tracking@example.com';
        $order->customer_phone = '+970599000000';
        $order->shipping_address = 'Ramallah, Main Street';
        $order->shipping_city = 1;
        $order->shipping_state = 1;
        $order->shipping_country = 1;
        $order->billing_address = 'Ramallah, Main Street';
        $order->billing_city = 1;
        $order->billing_state = 1;
        $order->billing_country = 1;
        $order->subtotal = 50;
        $order->tax_amount = 0;
        $order->shipping_amount = 0;
        $order->discount_amount = 0;
        $order->total_amount = 50;
        $order->currency = 'USD';
        $order->payment_method = 'cod';
        $order->save();

        $product = \App\Models\Product::factory()->create(['name' => 'Tracking Product', 'store_id' => $store->id]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => 'Tracking Product',
            'quantity' => 2,
            'product_price' => 25,
            'unit_price' => 25,
            'total_price' => 50,
        ]);

        $this->actingAs($customer, 'customer');
        $res = $this->getJson(route('api.orders.show', $order->order_number) . '?store_slug=' . $store->slug);
        $res->assertOk()
            ->assertJsonPath('order.currency_code', 'USD')
            ->assertJsonPath('order.total', 50)
            ->assertJsonPath('order.items.0.id', $product->id)
            ->assertJsonPath('order.items.0.name', 'Tracking Product')
            ->assertJsonPath('order.items.0.quantity', 2);
    }

    public function test_orders_api_show_is_session_scoped(): void
    {
        [$user, $store] = $this->ownerWithStore();

        $order = new Order();
        $order->order_number = 'TRK-' . strtoupper(uniqid());
        $order->store_id = $store->id;
        // Belongs to a different session — must not be retrievable.
        $order->session_id = 'attacker-session';
        $order->status = 'pending';
        $order->payment_status = 'pending';
        $order->customer_first_name = 'Other';
        $order->customer_last_name = 'Session';
        $order->customer_email = 'other@example.com';
        $order->customer_phone = '+970599111111';
        $order->shipping_address = 'Nablus, Main Street';
        $order->shipping_city = 1;
        $order->shipping_state = 1;
        $order->shipping_country = 1;
        $order->billing_address = 'Nablus, Main Street';
        $order->billing_city = 1;
        $order->billing_state = 1;
        $order->billing_country = 1;
        $order->subtotal = 99;
        $order->tax_amount = 0;
        $order->shipping_amount = 0;
        $order->discount_amount = 0;
        $order->total_amount = 99;
        $order->currency = 'USD';
        $order->payment_method = 'cod';
        $order->save();

        $this->getJson(route('api.orders.show', $order->order_number) . '?store_slug=' . $store->slug)
            ->assertStatus(404);
    }
}