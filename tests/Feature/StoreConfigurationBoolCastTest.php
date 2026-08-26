<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression: PHP (bool) cast treats string 'false' as true.
 *
 * FeatureService stores boolean toggles as the strings 'true'/'false'.
 * The old behavior() methods used native (bool) cast which meant that
 * ANY non-empty string (including 'false') was truthy. StoreConfiguration::toBool
 * was added to fix this. This test file proves the fix works.
 */
class StoreConfigurationBoolCastTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TStore';
        $store->slug = $attrs['slug'] ?? 'tstore-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function behavior(Store $store): array
    {
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'getStoreBehavior');
        $m->setAccessible(true);
        return $m->invoke($ctrl, $store);
    }

    private function authBehavior(Store $store): array
    {
        $c = new \App\Http\Controllers\Store\AuthController();
        $m = new \ReflectionMethod($c, 'behavior');
        $m->setAccessible(true);
        return $m->invoke($c, $store);
    }

    private function editorBehavior(Store $store): array
    {
        $c = new \App\Http\Controllers\Api\TemplateEditorController();
        $m = new \ReflectionMethod($c, 'getBehavior');
        $m->setAccessible(true);
        return $m->invoke($c, $store);
    }

    // ── StoreConfiguration::toBool unit tests ──

    public function test_to_bool_string_true(): void
    {
        $this->assertTrue(StoreConfiguration::toBool('true'));
        $this->assertTrue(StoreConfiguration::toBool('TRUE'));
        $this->assertTrue(StoreConfiguration::toBool('True'));
        $this->assertTrue(StoreConfiguration::toBool('1'));
        $this->assertTrue(StoreConfiguration::toBool('yes'));
        $this->assertTrue(StoreConfiguration::toBool('on'));
    }

    public function test_to_bool_string_false(): void
    {
        $this->assertFalse(StoreConfiguration::toBool('false'));
        $this->assertFalse(StoreConfiguration::toBool('FALSE'));
        $this->assertFalse(StoreConfiguration::toBool('0'));
        $this->assertFalse(StoreConfiguration::toBool('no'));
        $this->assertFalse(StoreConfiguration::toBool('off'));
    }

    public function test_to_bool_native_bool(): void
    {
        $this->assertTrue(StoreConfiguration::toBool(true));
        $this->assertFalse(StoreConfiguration::toBool(false));
    }

    public function test_to_bool_null_uses_default(): void
    {
        $this->assertFalse(StoreConfiguration::toBool(null));
        $this->assertTrue(StoreConfiguration::toBool(null, true));
        $this->assertFalse(StoreConfiguration::toBool(null, false));
    }

    public function test_to_bool_empty_string_uses_default(): void
    {
        $this->assertFalse(StoreConfiguration::toBool(''));
        $this->assertTrue(StoreConfiguration::toBool('', true));
    }

    // ── Critical: customer_accounts_enabled 'false' must be OFF ──

    public function test_master_off_theme_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'customer_accounts_enabled', 'false');
        $b = $this->behavior($s);
        $this->assertFalse($b['customer_accounts_enabled'], 'ThemeController must interpret string false as false');
    }

    public function test_master_off_auth_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'customer_accounts_enabled', 'false');
        $b = $this->authBehavior($s);
        $this->assertFalse($b['customer_accounts_enabled'], 'AuthController must interpret string false as false');
    }

    public function test_master_off_editor_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'customer_accounts_enabled', 'false');
        $b = $this->editorBehavior($s);
        $this->assertFalse($b['customer_accounts_enabled'], 'TemplateEditorController must interpret string false as false');
    }

    // ── enable_customer_login 'false' must be OFF ──

    public function test_login_off_theme_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'enable_customer_login', 'false');
        $b = $this->behavior($s);
        $this->assertFalse($b['enable_customer_login'], 'Login must be off when string false');
    }

    public function test_login_off_auth_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'enable_customer_login', 'false');
        $b = $this->authBehavior($s);
        $this->assertFalse($b['enable_customer_login'], 'Login must be off when string false');
    }

    // ── customer_registration_enabled 'false' must be OFF ──

    public function test_registration_off_theme_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'customer_registration_enabled', 'false');
        $b = $this->behavior($s);
        $this->assertFalse($b['customer_registration_enabled'], 'Registration must be off when string false');
    }

    public function test_registration_off_auth_controller(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'customer_registration_enabled', 'false');
        $b = $this->authBehavior($s);
        $this->assertFalse($b['customer_registration_enabled'], 'Registration must be off when string false');
    }

    // ── guest_checkout 'false' must be OFF ──

    public function test_guest_checkout_off(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'guest_checkout', 'false');
        $b = $this->behavior($s);
        $this->assertFalse($b['guest_checkout'], 'Guest checkout must be off when string false');
    }

    // ── show_cart 'false' must be OFF ──

    public function test_show_cart_off_editor(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'show_cart', 'false');
        $b = $this->editorBehavior($s);
        $this->assertFalse($b['show_cart'], 'show_cart must be off when string false');
    }

    // ── show_search 'false' must be OFF ──

    public function test_show_search_off_editor(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'show_search', 'false');
        $b = $this->editorBehavior($s);
        $this->assertFalse($b['show_search'], 'show_search must be off when string false');
    }

    // ── require_login_checkout 'true' must be ON ──

    public function test_require_login_checkout_on(): void
    {
        [$u, $s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id, 'require_login_checkout', 'true');
        $b = $this->behavior($s);
        $this->assertTrue($b['require_login_checkout'], 'require_login_checkout must be on when string true');
    }

    // ── All three controllers must agree ──

    public function test_all_controllers_agree_on_all_settings(): void
    {
        [$u, $s] = $this->ownerWithStore();

        $settings = [
            'customer_accounts_enabled' => 'true',
            'enable_customer_login' => 'false',
            'customer_registration_enabled' => 'false',
            'guest_checkout' => 'false',
            'require_login_checkout' => 'true',
        ];

        foreach ($settings as $key => $val) {
            StoreConfiguration::setConfiguration($s->id, $key, $val);
        }

        $themeB = $this->behavior($s);
        $authB = $this->authBehavior($s);
        $editorB = $this->editorBehavior($s);

        // Check that each key's raw value is correctly interpreted as boolean
        // by all three controllers.
        $this->assertTrue($themeB['customer_accounts_enabled'], 'ThemeController master=true');
        $this->assertFalse($themeB['enable_customer_login'], 'ThemeController login=false');
        $this->assertFalse($themeB['customer_registration_enabled'], 'ThemeController reg=false');
        $this->assertFalse($themeB['guest_checkout'], 'ThemeController guest=false');
        $this->assertTrue($themeB['require_login_checkout'], 'ThemeController require_login=true');

        $this->assertTrue($authB['customer_accounts_enabled'], 'AuthController master=true');
        $this->assertFalse($authB['enable_customer_login'], 'AuthController login=false');
        $this->assertFalse($authB['customer_registration_enabled'], 'AuthController reg=false');
        $this->assertFalse($authB['guest_checkout'], 'AuthController guest=false');
        $this->assertTrue($authB['require_login_checkout'], 'AuthController require_login=true');

        $this->assertTrue($editorB['customer_accounts_enabled'], 'EditorController master=true');
        $this->assertFalse($editorB['enable_customer_login'], 'EditorController login=false');
        $this->assertFalse($editorB['customer_registration_enabled'], 'EditorController reg=false');
        $this->assertFalse($editorB['guest_checkout'], 'EditorController guest=false');
        $this->assertTrue($editorB['require_login_checkout'], 'EditorController require_login=true');
    }
}
