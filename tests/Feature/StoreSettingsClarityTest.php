<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreDomain;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P2E-03 — Store / Settings clarity.
 *
 * Guard-rails for the clarity work: store link truth (Store::getStoreUrl
 * server-side), publish/store-status clarity, built-in store link vs custom
 * domain distinction, removal of the legacy fake theme picker / domain
 * inputs, and canonical route reuse. No new business rules.
 */
class StoreSettingsClarityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        StoreConfiguration::flushRequestCache();
        \Illuminate\Support\Facades\Cache::flush();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function merchantWithStore(array $storeAttrs = [], array $planAttrs = []): array
    {
        $plan = Plan::factory()->create(array_merge([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
        ], $planAttrs));
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => true,
        ]);
        $store = Store::factory()->create(array_merge([
            'user_id' => $user->id,
            'name' => 'Clarity Store',
        ], $storeAttrs));
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['settings-stores', 'edit-stores']);
        return [$user, $store];
    }

    public function test_settings_landing_exposes_canonical_sections_and_store_url(): void
    {
        [$user, $store] = $this->merchantWithStore(['slug' => 'clarity-landing']);
        $this->actingAs($user);

        $response = $this->get(route('stores.settings', $store->id));
        $response->assertStatus(200);
        $response->assertInertia(function ($page) use ($store) {
            $page->component('stores/settings')
                ->has('store')
                ->has('settings')
                // Canonical settings sections derive from existing config truth
                ->where('settings.store_status', true)
                // Server-computed canonical store link (Store::getStoreUrl)
                ->has('storeUrl')
                // Publish readiness stays a single server-side truth
                ->has('publishReadiness.isReady')
                ->has('publishReadiness.missing');
        });
        $this->assertIsString($response->viewData('page')['props']['storeUrl'] ?? null);
    }

    public function test_settings_distinguishes_store_link_from_custom_domain(): void
    {
        $source = file_get_contents(resource_path('js/pages/stores/settings.tsx'));
        // General tab exposes the customer-facing store link with the canonical label
        $this->assertStringContainsString('رابط المتجر', $source, 'store-link box must use canonical رابط المتجر wording');
        // The custom-domain route is the canonical target for a دومين مخصص
        $this->assertStringContainsString("route('stores.domains', store.id)", $source, 'settings must link to the canonical domains page');
        $this->assertStringContainsString('دومين مخصص', $source, 'custom domain must be named as دومين مخصص');
    }

    public function test_settings_status_card_publishes_clear_state(): void
    {
        $source = file_get_contents(resource_path('js/pages/stores/settings.tsx'));
        $this->assertStringContainsString('متاح للعملاء', $source, 'published state must be transparent to merchants');
        $this->assertStringContainsString('مخفي عن العملاء', $source, 'unpublished state must be transparent to merchants');
        $this->assertStringContainsString('store_status', $source, 'status toggle remains bound to store_status');
    }

    public function test_settings_uses_server_publish_readiness_single_source(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $this->get(route('stores.settings', $store->id))
            ->assertInertia(fn ($p) => $p
                ->where('publishReadiness.isReady', false)
                ->where('publishReadiness.missing', ['المنتجات', 'الشحن والتوصيل', 'طرق الدفع']));

        // The frontend guard consumes the server prop — it does not recompute readiness.
        $source = file_get_contents(resource_path('js/pages/stores/settings.tsx'));
        $this->assertStringContainsString('publishReadiness', $source, 'settings guard must consume the server publishReadiness prop');
        $controller = file_get_contents(app_path('Http/Controllers/StoreSettingsController.php'));
        $this->assertStringContainsString("'publishReadiness' => \$publishReadiness", $controller, 'server must keep supplying publishReadiness');
        $this->assertStringNotContainsString("function buildReadiness", $controller, 'no second readiness engine in settings controller');
    }

    public function test_legacy_fake_theme_picker_removed_from_edit_page(): void
    {
        $source = file_get_contents(resource_path('js/pages/stores/edit.tsx'));
        // The legacy core-* picker (fake: all normalize to 3 of the 6 templates) is gone.
        $this->assertStringNotContainsString('Store Theme', $source, 'legacy Store Theme card must be removed');
        $this->assertStringNotContainsString('Core Minimal', $source, 'legacy core-minimal option must be removed');
        $this->assertStringNotContainsString('core-sidebar', $source, 'legacy core-* options must be removed');
        $this->assertStringNotContainsString('core-dark', $source, 'legacy core-* options must be removed');
        // Canonical template destination is the designer page.
        $this->assertStringContainsString("route('stores.designer', store.id)", $source, 'edit page must link to the canonical designer');
        $this->assertStringContainsString('معلومات المتجر', $source, 'store basics page must use canonical معلومات المتجر');
    }

    public function test_legacy_domain_inputs_removed_from_edit_page(): void
    {
        $source = file_get_contents(resource_path('js/pages/stores/edit.tsx'));
        $this->assertStringNotContainsString('Domain Configuration', $source, 'legacy domain config card must be removed');
        $this->assertStringNotContainsString('Enable Custom Domain', $source, 'legacy custom domain toggle must be removed');
        $this->assertStringNotContainsString('Enable Custom Subdomain', $source, 'legacy custom subdomain toggle must be removed');
        $this->assertStringNotContainsString('Your Server IP Is:', $source, 'legacy serverIp DNS box must be removed');
        // Canonical domain destination is the domains page (DNS/SSL/verification).
        $this->assertStringContainsString("route('stores.domains', store.id)", $source, 'edit page must link to the canonical domains page');
        $this->assertStringContainsString('دومين مخصص', $source, 'custom domain must be named as دومين مخصص');
    }

    public function test_save_actions_connected_to_canonical_routes(): void
    {
        $edit = file_get_contents(resource_path('js/pages/stores/edit.tsx'));
        $this->assertStringContainsString("route('stores.update', store.id)", $edit, 'store basics still persist via stores.update');
        $settings = file_get_contents(resource_path('js/pages/stores/settings.tsx'));
        $this->assertStringContainsString("route('stores.settings.update', store.id)", $settings, 'settings still persist via stores.settings.update');
    }

    public function test_store_basics_persist_via_canonical_route_and_stay_tenant_safe(): void
    {
        [$userA, $storeA] = $this->merchantWithStore(['slug' => 'clarity-basics-a', 'name' => 'Old Name A']);
        [$userB, $storeB] = $this->merchantWithStore(['slug' => 'clarity-basics-b', 'name' => 'Old Name B']);

        $this->actingAs($userA);
        $response = $this->put(route('stores.update', $storeA->id), [
            'name' => 'New Name A',
            'description' => 'Updated description',
            'email' => 'a@example.com',
            'theme' => $storeA->getTemplateSlug(),
            'enable_custom_domain' => false,
            'enable_custom_subdomain' => false,
            'custom_domain' => null,
            'custom_subdomain' => null,
            'enable_pwa' => false,
        ]);
        $response->assertRedirect();
        $this->assertSame('New Name A', $storeA->fresh()->name);
        $this->assertSame('a@example.com', $storeA->fresh()->email);

        // Cross-store write is impossible (tenant isolation).
        $this->actingAs($userA);
        $this->put(route('stores.update', $storeB->id), [
            'name' => 'Hacked Name',
            'email' => 'hacked@example.com',
            'theme' => $storeB->getTemplateSlug(),
            'enable_custom_domain' => false,
            'enable_custom_subdomain' => false,
            'enable_pwa' => false,
        ])->assertStatus(404);
        $this->assertSame('Old Name B', $storeB->fresh()->name);
    }

    public function test_settings_and_edit_render_for_merchant(): void
    {
        // enable_custdomain: the domains page renders only when the plan gates pass
        [$user, $store] = $this->merchantWithStore([], ['enable_custdomain' => 'on']);
        $this->actingAs($user);
        $this->get(route('stores.domains', $store->id))->assertStatus(200)->assertInertia(fn ($p) => $p->component('stores/domains'));
        $this->get(route('stores.edit', $store->id))->assertStatus(200)->assertInertia(fn ($p) => $p->component('stores/edit'));
    }

    public function test_settings_cross_store_access_blocked(): void
    {
        [$userA, $storeA] = $this->merchantWithStore(['slug' => 'clarity-isolation-a']);
        [, $storeB] = $this->merchantWithStore(['slug' => 'clarity-isolation-b']);
        $this->actingAs($userA);
        $this->get(route('stores.settings', $storeB->id))->assertStatus(404);
        $this->get(route('stores.edit', $storeB->id))->assertStatus(404);
    }

    public function test_settings_store_url_prefers_server_canonical_truth(): void
    {
        [$user, $store] = $this->merchantWithStore(['slug' => 'clarity-canon']);
        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'clarity.example.com',
            'is_verified' => true,
            'ssl_status' => 'active',
            'verification_token' => 'wa-clarity',
            'is_primary' => true,
            'verified_at' => now(),
        ]);

        $this->actingAs($user);
        $this->get(route('stores.settings', $store->id))
            ->assertInertia(fn ($p) => $p->where('storeUrl', $store->fresh()->getStoreUrl()));

        // Frontend must prefer the server storeUrl over client-side reconstruction.
        $source = file_get_contents(resource_path('js/pages/stores/settings.tsx'));
        $this->assertStringContainsString('if (storeUrl) return storeUrl;', $source, 'settings store link must prefer the server canonical URL');
    }

    public function test_no_new_business_rule_constants_or_table_shapes(): void
    {
        // No new tables/columns: still just store_configurations {key,value} + canonical stores.
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('store_configurations'));
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('store_configurations');
        $this->assertContains('key', $columns);
        $this->assertContains('value', $columns);

        // Merchant settings still flow through the canonical routes — no new endpoints.
        $web = file_get_contents(base_path('routes/web.php'));
        $this->assertStringContainsString("->name('stores.settings.update')", $web);
        $this->assertStringContainsString("->name('stores.settings.autosave')", $web);
        $this->assertStringContainsString("->name('stores.domains')", $web);
    }
}