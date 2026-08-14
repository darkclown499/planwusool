<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        Currency::create([
            'name' => 'US Dollar',
            'code' => 'usd',
            'symbol' => '$',
        ]);
    }

    private function newUser(): User
    {
        return User::factory()->create(['type' => 'company']);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Owner',
            'store_name' => 'Test Store',
            'store_subdomain' => 'test-store-1',
            'language' => 'ar',
            'currency' => 'usd',
            'theme' => 'basic',
            'store_email' => 'owner@example.com',
            'store_description' => 'A test store',
            'welcome_message' => 'Welcome',
            'whatsapp_enabled' => false,
            'whatsapp_phone' => '',
            'address' => 'Gaza',
            'city' => 'Gaza',
            'country' => 'PS',
            'logo' => '',
            'timezone' => 'Asia/Gaza',
            'publish_store' => true,
            'import_demo_products' => false,
        ], $overrides);
    }

    public function test_progress_autosaves_step_and_whitelisted_data()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $response = $this->postJson(route('onboarding.progress'), [
            'step' => 3,
            'data' => [
                'storeName' => 'My Store',
                'theme' => 'arabic-gadgets',
                'shouldNotBeSaved' => 'nope',
            ],
        ]);

        $response->assertOk()->assertJson(['saved' => true]);

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $config = StoreConfiguration::getConfiguration($store->id);

        $this->assertSame('3', $config['onboarding_step']);

        $progress = json_decode($config['onboarding_progress'], true);
        $this->assertIsArray($progress);
        $this->assertSame('My Store', $progress['storeName']);
        $this->assertSame('arabic-gadgets', $progress['theme']);
        $this->assertArrayNotHasKey('shouldNotBeSaved', $progress);
    }

    public function test_progress_returns_saved_false_when_already_onboarded()
    {
        $user = $this->newUser();
        $user->onboarded_at = now();
        $user->save();

        $this->actingAs($user);

        $this->postJson(route('onboarding.progress'), ['step' => 1])
            ->assertOk()
            ->assertJson(['saved' => false]);
    }

    public function test_onboarding_persists_the_chosen_theme()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), $this->validPayload(['theme' => 'arabic-gadgets']))
            ->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('arabic-gadgets', $store->theme);
        $this->assertNotNull($user->fresh()->onboarded_at);
    }

    public function test_onboarding_falls_back_to_basic_for_an_invalid_theme()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), $this->validPayload(['theme' => 'hacker-theme']))
            ->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('basic', $store->theme);
    }

    public function test_demo_import_creates_english_catalog_when_english_is_selected()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), $this->validPayload([
            'language' => 'en',
            'import_demo_products' => true,
        ]))->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();

        $this->assertSame('en', StoreConfiguration::getConfiguration($store->id)['language']);
        $this->assertTrue(
            Category::where('store_id', $store->id)->pluck('name')->contains('Electronics')
        );
        $this->assertGreaterThan(0, Product::where('store_id', $store->id)->count());
    }

    public function test_demo_import_creates_arabic_catalog_when_arabic_is_selected()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), $this->validPayload([
            'language' => 'ar',
            'import_demo_products' => true,
        ]))->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();

        $this->assertSame('ar', StoreConfiguration::getConfiguration($store->id)['language']);
        $this->assertTrue(
            Category::where('store_id', $store->id)->pluck('name')->contains('إلكترونيات')
        );
        $this->assertGreaterThan(0, Product::where('store_id', $store->id)->count());
    }

    public function test_demo_import_is_skipped_when_not_requested()
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->post(route('onboarding.store'), $this->validPayload())
            ->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $this->assertSame(0, Category::where('store_id', $store->id)->count());
        $this->assertSame(0, Product::where('store_id', $store->id)->count());
    }
}
