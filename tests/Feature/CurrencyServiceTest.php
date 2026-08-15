<?php

namespace Tests\Feature;

use App\Models\Currency;
use App\Models\Setting;
use App\Models\User;
use App\Models\Store;
use App\Services\Currency\CurrencyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrencyServiceTest extends TestCase
{
    use RefreshDatabase;

    protected CurrencyService $currencyService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->currencyService = app(CurrencyService::class);
    }

    public function test_get_default_settings()
    {
        $settings = $this->currencyService->getDefaultSettings();
        
        $this->assertEquals('ILS', $settings['defaultCurrency']);
        $this->assertEquals('2', $settings['decimalFormat']);
        $this->assertEquals('.', $settings['decimalSeparator']);
        $this->assertEquals(',', $settings['thousandsSeparator']);
        $this->assertEquals('after', $settings['currencySymbolPosition']);
    }

    public function test_format_store_currency()
    {
        $user = User::factory()->create(['type' => 'company']);
        $store = Store::factory()->create(['user_id' => $user->id]);
        
        // Create currency
        $currency = Currency::factory()->create([
            'code' => 'USD',
            'symbol' => '$',
            'name' => 'US Dollar',
        ]);
        
        // Set store currency settings
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'defaultCurrency',
            'value' => 'USD',
        ]);
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'decimalFormat',
            'value' => '2',
        ]);
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'decimalSeparator',
            'value' => '.',
        ]);
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'thousandsSeparator',
            'value' => ',',
        ]);
        Setting::create([
            'user_id' => $user->id,
            'store_id' => $store->id,
            'key' => 'currencySymbolPosition',
            'value' => 'before',
        ]);

        $formatted = $this->currencyService->formatStoreCurrency(1234.56, $user->id, $store->id);
        
        $this->assertEquals('$1,234.56', $formatted);
    }

    public function test_format_currency_with_secondary_currency()
    {
        $storeSettings = [
            'defaultCurrency' => 'ILS',
            'decimalFormat' => '2',
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'currencySymbolPosition' => 'after',
            'currencySymbolSpace' => true,
            'secondaryCurrency' => 'USD',
            'exchangeRate' => 3.5,
        ];

        $currencies = [
            ['code' => 'ILS', 'symbol' => '₪', 'name' => 'Israeli Shekel'],
            ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar'],
        ];

        $formatted = $this->currencyService->formatCurrency(100, $storeSettings, $currencies);
        
        $this->assertStringContainsString('₪', $formatted);
        $this->assertStringContainsString('≈', $formatted);
        $this->assertStringContainsString('$', $formatted);
    }

    public function test_format_currency_amount_uses_superadmin_settings()
    {
        $superAdmin = User::factory()->create(['type' => 'superadmin']);
        
        // Set superadmin currency settings
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'defaultCurrency',
            'value' => 'EUR',
        ]);
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'decimalFormat',
            'value' => '2',
        ]);
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'decimalSeparator',
            'value' => ',',
        ]);
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'thousandsSeparator',
            'value' => '.',
        ]);
        Setting::create([
            'user_id' => $superAdmin->id,
            'key' => 'currencySymbolPosition',
            'value' => 'after',
        ]);

        $currency = Currency::factory()->create([
            'code' => 'EUR',
            'symbol' => '€',
            'name' => 'Euro',
        ]);

        $formatted = $this->currencyService->formatCurrencyAmount(99.99);
        
        $this->assertEquals('99,99 €', $formatted);
    }

    public function test_get_all_currencies()
    {
        Currency::factory()->count(5)->create();
        
        $currencies = $this->currencyService->getAllCurrencies();
        
        $this->assertCount(5, $currencies);
        $this->assertArrayHasKey('code', $currencies[0]);
        $this->assertArrayHasKey('symbol', $currencies[0]);
        $this->assertArrayHasKey('name', $currencies[0]);
    }
}