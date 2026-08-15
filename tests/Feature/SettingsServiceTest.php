<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Setting;
use App\Models\PaymentSetting;
use App\Services\Settings\SettingsService;
use App\Services\Payment\PaymentSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected SettingsService $settingsService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->settingsService = app(SettingsService::class);
    }

    public function test_get_default_settings()
    {
        $defaults = $this->settingsService->getDefaultSettings();
        
        $this->assertArrayHasKey('defaultLanguage', $defaults);
        $this->assertEquals('ar', $defaults['defaultLanguage']);
        $this->assertArrayHasKey('themeColor', $defaults);
        $this->assertEquals('green', $defaults['themeColor']);
    }

    public function test_create_default_settings_for_user()
    {
        $user = User::factory()->create(['type' => 'superadmin']);
        
        $this->settingsService->createDefaultSettings($user->id);
        
        $settings = Setting::where('user_id', $user->id)->get();
        $this->assertGreaterThan(0, $settings->count());
    }

    public function test_get_user_settings_cached()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = \App\Models\Store::factory()->create(['user_id' => $user->id]);
        
        // Set some settings
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'custom_key',
            'value' => 'custom_value',
        ]);

        $settings = $this->settingsService->getUserSettings($user->id, $store->id);
        
        $this->assertEquals('custom_value', $settings['custom_key']);
        
        // Second call should hit cache
        $settings2 = $this->settingsService->getUserSettings($user->id, $store->id);
        $this->assertEquals($settings, $settings2);
    }

    public function test_get_setting_with_fallback()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = \App\Models\Store::factory()->create(['user_id' => $user->id]);
        
        // Set store-specific setting
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'test_key',
            'value' => 'store_value',
        ]);

        // Set global setting
        Setting::create([
            'user_id' => $user->id,
            'store_id' => null,
            'key' => 'global_key',
            'value' => 'global_value',
        ]);

        // Store-specific should take precedence
        $value = $this->settingsService->getSetting('test_key', null, $user->id, $store->id);
        $this->assertEquals('store_value', $value);

        // Global should be fallback
        $value = $this->settingsService->getSetting('global_key', null, $user->id, $store->id);
        $this->assertEquals('global_value', $value);
    }

    public function test_copy_settings_from_superadmin()
    {
        $superAdmin = User::factory()->create(['type' => 'superadmin']);
        $companyUser = User::factory()->create(['type' => 'company']);
        
        // Set some superadmin settings
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'themeColor',
            'value' => 'blue',
        ]);
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'customColor',
            'value' => '#3b82f6',
        ]);

        $this->settingsService->copySettingsFromSuperAdmin($companyUser->id);
        
        $copied = Setting::where('user_id', $companyUser->id)->get();
        $this->assertEquals(2, $copied->count());
        $this->assertEquals('blue', $copied->where('key', 'themeColor')->first()->value);
    }
}

class PaymentSettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PaymentSettingsService $paymentSettingsService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paymentSettingsService = app(\App\Services\Payment\PaymentSettingsService::class);
    }

    public function test_get_payment_settings_cached()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = \App\Models\Store::factory()->create(['user_id' => $user->id]);
        
        PaymentSetting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'is_stripe_enabled',
            'value' => '1',
        ]);

        $settings = $this->paymentSettingsService->getPaymentSettings($user->id, $store->id);
        
        $this->assertEquals('1', $settings['is_stripe_enabled']);
    }

    public function test_is_payment_method_enabled()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = \App\Models\Store::factory()->create(['user_id' => $user->id]);
        
        PaymentSetting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'is_stripe_enabled',
            'value' => '1',
        ]);

        $enabled = $this->paymentSettingsService->isPaymentMethodEnabled('stripe', $user->id, $store->id);
        $this->assertTrue($enabled);

        $enabled = $this->paymentSettingsService->isPaymentMethodEnabled('paypal', $user->id, $store->id);
        $this->assertFalse($enabled);
    }

    public function test_get_payment_method_config()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = \App\Models\Store::factory()->create(['user_id' => $user->id]);
        
        PaymentSetting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'is_stripe_enabled',
            'value' => '1',
        ]);
        PaymentSetting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'stripe_key',
            'value' => 'pk_test_123',
        ]);
        PaymentSetting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'stripe_secret',
            'value' => 'sk_test_123',
        ]);

        $config = $this->paymentSettingsService->getPaymentMethodConfig('stripe', $user->id, $store->id);
        
        $this->assertTrue($config['enabled']);
        $this->assertEquals('pk_test_123', $config['key']);
        $this->assertEquals('sk_test_123', $config['secret']);
    }
}