<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Marketing Tracking Hub — MOVE TRACKING FROM STORE SETTINGS INTO MARKETING
 *
 * Verifies:
 *  - Marketing is canonical home for tracking (stores.tracking)
 *  - Legacy stores.marketing hands off (redirect) to canonical
 *  - Persistence reuses store_configurations (no duplicate fields)
 *  - Store isolation, storefront propagation, no fake statuses/IDs
 *  - Navigation & permissions preserved
 */
class MarketingTrackingHubTest extends TestCase
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
        $store->name = $attrs['name'] ?? 'Test Store ' . uniqid();
        $store->slug = $attrs['slug'] ?? 'mth-' . uniqid();
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

    private function assertStorefrontConfig($store, array $expected): void
    {
        $controller = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($controller, 'getStoreConfig');
        $ref->setAccessible(true);
        $config = $ref->invoke($controller, ['id' => $store->id, 'name' => $store->name]);
        foreach ($expected as $key => $value) {
            $this->assertSame($value, $config['config'][$key], "config.{$key} mismatch");
        }
    }

    // A. authorized merchant can open Marketing Tracking page (canonical)
    public function test_authorized_merchant_can_open_marketing_tracking_page(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $res = $this->get(route('stores.tracking', $store->id));
        $res->assertOk();
        $page = $res->inertiaPage();
        $this->assertSame('marketing/tracking', $page['component']);
        $this->assertArrayHasKey('store', $page['props']);
        $this->assertArrayHasKey('settings', $page['props']);
    }

    // B. tracking page displays Meta/TikTok/GA controls (settings keys present)
    public function test_tracking_page_exposes_tracking_keys(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $res = $this->get(route('stores.tracking', $store->id));
        $page = $res->inertiaPage();
        $settings = $page['props']['settings'];
        $this->assertArrayHasKey('meta_pixel_id', $settings);
        $this->assertArrayHasKey('tiktok_pixel_id', $settings);
        $this->assertArrayHasKey('google_analytics_id', $settings);
    }

    // C, D, E. existing saved IDs appear on new page
    public function test_existing_saved_ids_appear_on_new_tracking_page(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::updateConfiguration($store->id, [
            'meta_pixel_id' => '123456789012345',
            'tiktok_pixel_id' => 'CVR1234ABCDEFG12',
            'google_analytics_id' => 'G-ABCDE12345',
        ]);
        StoreConfiguration::flushRequestCache();
        $this->actingAs($user);
        $res = $this->get(route('stores.tracking', $store->id));
        $settings = $res->inertiaPage()['props']['settings'];
        $this->assertSame('123456789012345', $settings['meta_pixel_id']);
        $this->assertSame('CVR1234ABCDEFG12', $settings['tiktok_pixel_id']);
        $this->assertSame('G-ABCDE12345', $settings['google_analytics_id']);
    }

    // F, G, H. merchant can update from new Marketing location (via shared update route)
    public function test_merchant_can_update_meta_from_new_marketing_location(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['meta_pixel_id' => '987654321098765'],
        ])->assertSessionHasNoErrors();
        StoreConfiguration::flushRequestCache();
        $this->assertSame('987654321098765', StoreConfiguration::getConfiguration($store->id)['meta_pixel_id']);
    }

    public function test_merchant_can_update_tiktok_from_new_location(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['tiktok_pixel_id' => 'ABCDEF1234567890'],
        ])->assertSessionHasNoErrors();
        StoreConfiguration::flushRequestCache();
        $this->assertSame('ABCDEF1234567890', StoreConfiguration::getConfiguration($store->id)['tiktok_pixel_id']);
    }

    public function test_merchant_can_update_ga_from_new_location(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['google_analytics_id' => 'G-NEWTRACK01'],
        ])->assertSessionHasNoErrors();
        StoreConfiguration::flushRequestCache();
        $this->assertSame('G-NEWTRACK01', StoreConfiguration::getConfiguration($store->id)['google_analytics_id']);
    }

    // I. new page writes to SAME canonical storage
    public function test_new_page_writes_to_same_canonical_storage(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        // Update via shared endpoint (used by both legacy and new UI)
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => [
                'meta_pixel_id' => '111111111111111',
                'tiktok_pixel_id' => 'AAAAAAAAAAAAAAAA',
                'google_analytics_id' => 'G-AAAA111111',
            ],
        ])->assertSessionHasNoErrors();
        StoreConfiguration::flushRequestCache();
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('111111111111111', $cfg['meta_pixel_id']);
        $this->assertSame('AAAAAAAAAAAAAAAA', $cfg['tiktok_pixel_id']);
        $this->assertSame('G-AAAA111111', $cfg['google_analytics_id']);

        // Verify new tracking page reflects it
        $res = $this->get(route('stores.tracking', $store->id));
        $settings = $res->inertiaPage()['props']['settings'];
        $this->assertSame('111111111111111', $settings['meta_pixel_id']);
        // And storefront reads same value
        $this->assertStorefrontConfig($store, ['meta_pixel_id' => '111111111111111']);
    }

    // J. no duplicate tracking record/field is created
    public function test_no_duplicate_tracking_field_created(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['meta_pixel_id' => '222222222222222'],
        ])->assertSessionHasNoErrors();
        // Only one row for meta_pixel_id should exist for this store
        $count = StoreConfiguration::where('store_id', $store->id)->where('key', 'meta_pixel_id')->count();
        $this->assertSame(1, $count);
        // Check no alternative column exists (e.g., marketing_meta_pixel_id)
        $keys = StoreConfiguration::where('store_id', $store->id)->pluck('key')->toArray();
        $this->assertNotContains('marketing_meta_pixel_id', $keys);
        $this->assertNotContains('tracking_meta_pixel_id', $keys);
    }

    // K. Store A cannot view Store B tracking config
    public function test_store_a_cannot_view_store_b_tracking_config(): void
    {
        [$owner, $storeA] = $this->ownerWithStore();
        [$otherUser, $storeB] = $this->ownerWithStore(['slug' => 'other-' . uniqid()]);
        StoreConfiguration::updateConfiguration($storeB->id, ['meta_pixel_id' => '333333333333333']);
        StoreConfiguration::flushRequestCache();

        $this->actingAs($owner);
        $this->get(route('stores.tracking', $storeB->id))->assertNotFound();
    }

    // L. Store A cannot update Store B config
    public function test_store_a_cannot_update_store_b_config(): void
    {
        [$owner, $storeA] = $this->ownerWithStore();
        [$otherUser, $storeB] = $this->ownerWithStore(['slug' => 'iso-' . uniqid()]);
        $this->actingAs($owner);
        $this->put(route('stores.settings.update', $storeB->id), [
            'settings' => ['meta_pixel_id' => '444444444444444'],
        ])->assertNotFound();
        StoreConfiguration::flushRequestCache();
        $this->assertSame('', StoreConfiguration::getConfiguration($storeB->id)['meta_pixel_id']);
    }

    // M. empty IDs remain inactive in storefront (empty strings)
    public function test_empty_ids_remain_inactive_in_storefront(): void
    {
        [$user, $store] = $this->ownerWithStore();
        // Ensure empty
        StoreConfiguration::updateConfiguration($store->id, ['meta_pixel_id' => '', 'tiktok_pixel_id' => '', 'google_analytics_id' => '']);
        StoreConfiguration::flushRequestCache();
        $this->assertStorefrontConfig($store, [
            'meta_pixel_id' => '',
            'tiktok_pixel_id' => '',
            'google_analytics_id' => '',
        ]);
    }

    // N. configured ID continues to flow into existing storefront tracking
    public function test_configured_id_flows_into_storefront(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::updateConfiguration($store->id, [
            'meta_pixel_id' => '555555555555555',
            'tiktok_pixel_id' => 'BBBBBBBBBBBBBBBB',
            'google_analytics_id' => 'G-FLOWTEST01',
        ]);
        StoreConfiguration::flushRequestCache();
        $this->assertStorefrontConfig($store, [
            'meta_pixel_id' => '555555555555555',
            'tiktok_pixel_id' => 'BBBBBBBBBBBBBBBB',
            'google_analytics_id' => 'G-FLOWTEST01',
        ]);
    }

    // O. navigation contains the new Marketing Tracking entry
    public function test_navigation_contains_marketing_tracking_entry(): void
    {
        $navPath = resource_path('js/config/merchant-navigation.ts');
        $content = file_get_contents($navPath);
        $this->assertStringContainsString('Tracking & Ads', $content, 'Missing Tracking & Ads label');
        $this->assertStringContainsString('/stores/${sid}/tracking', $content, 'Missing tracking route in marketing nav');
        $this->assertStringContainsString('التتبع والإعلانات', $content, 'Missing Arabic label');
    }

    // P. legacy Store Settings tracking location hands off correctly (redirect)
    public function test_legacy_marketing_route_redirects_to_tracking(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $res = $this->get(route('stores.marketing', $store->id));
        $res->assertRedirect(route('stores.tracking', $store->id));
    }

    // Q. legacy save/update behavior remains backward compatible
    public function test_legacy_save_update_still_works(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        // Old forms used stores.settings.update — must still persist
        $this->put(route('stores.settings.update', $store->id), [
            'settings' => ['meta_pixel_id' => '666666666666666'],
        ])->assertSessionHasNoErrors();
        StoreConfiguration::flushRequestCache();
        $this->assertSame('666666666666666', StoreConfiguration::getConfiguration($store->id)['meta_pixel_id']);
        // Verify new page also sees it
        $res = $this->get(route('stores.tracking', $store->id));
        $this->assertSame('666666666666666', $res->inertiaPage()['props']['settings']['meta_pixel_id']);
    }

    // R. no fake "connected" status is emitted (truthful: presence means configured, not verified active)
    public function test_no_fake_connected_status_emitted(): void
    {
        [$user, $store] = $this->ownerWithStore();
        \App\Models\StoreConfiguration::flushRequestCache();
        // Empty config should not claim connected
        $this->actingAs($user);
        $res = $this->get(route('stores.tracking', $store->id));
        $settings = $res->inertiaPage()['props']['settings'];
        $this->assertSame('', $settings['meta_pixel_id']);
        $this->assertSame('', $settings['tiktok_pixel_id']);
        $this->assertSame('', $settings['google_analytics_id']);
        // The page UI must derive configured state from value presence, not a fake flag.
        // Ensure no extra boolean like is_connected is sent (would be misleading).
        $this->assertArrayNotHasKey('is_connected', $settings);
        $this->assertArrayNotHasKey('connected', $settings);
    }

    // S. no fake Meta/TikTok/GA ID fallback
    public function test_no_fake_tracking_id_fallback(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::flushRequestCache();
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertSame('', $cfg['meta_pixel_id']);
        $this->assertSame('', $cfg['tiktok_pixel_id']);
        $this->assertSame('', $cfg['google_analytics_id']);
        // Storefront must also expose empty, not demo IDs
        $this->assertStorefrontConfig($store, [
            'meta_pixel_id' => '',
            'tiktok_pixel_id' => '',
            'google_analytics_id' => '',
        ]);
        foreach (['meta_pixel_id', 'tiktok_pixel_id', 'google_analytics_id'] as $key) {
            $this->assertNotEquals('123456', $cfg[$key]);
            $this->assertStringNotContainsString('demo', strtolower((string) $cfg[$key]));
        }
    }

    // T. merchant permissions/gates remain unchanged (settings-stores required)
    public function test_permissions_remain_unchanged(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $user->revokePermissionTo('settings-stores');
        $this->actingAs($user);
        $this->get(route('stores.tracking', $store->id))->assertForbidden();
        // Legacy also forbidden (redirect would be blocked before redirect)
        $this->get(route('stores.marketing', $store->id))->assertForbidden();
    }

    public function test_tracking_page_does_not_expose_fake_connected_flag(): void
    {
        [$user, $store] = $this->ownerWithStore();
        StoreConfiguration::updateConfiguration($store->id, ['meta_pixel_id' => '777777777777777']);
        StoreConfiguration::flushRequestCache();
        $this->actingAs($user);
        $res = $this->get(route('stores.tracking', $store->id));
        $props = $res->inertiaPage()['props'];
        // Must not claim GDPR/privacy compliance falsely
        $pageContent = json_encode($props);
        $this->assertStringNotContainsString('GDPR', $pageContent);
        $this->assertStringNotContainsString('consent compliant', strtolower($pageContent));
    }
}
