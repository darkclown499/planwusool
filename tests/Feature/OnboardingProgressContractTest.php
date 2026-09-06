<?php

namespace Tests\Feature;

use App\Models\Currency;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OnboardingProgressContractTest extends TestCase
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

    private function progressData(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Owner',
            'storeName' => 'Test Store',
            'storeSubdomain' => 'test-store',
            'storeEmail' => 'owner@example.com',
            'storeDescription' => 'A test store',
            'welcomeMessage' => 'Welcome',
            'whatsappEnabled' => false,
            'whatsappPhone' => '+970599123456',
            'address' => 'Gaza',
            'city' => 'Gaza',
            'country' => 'PS',
            'logo' => '',
            'timezone' => 'Asia/Gaza',
            'language' => 'ar',
            'currency' => 'usd',
            'theme' => 'basic',
            'publishStore' => true,
        ], $overrides);
    }

    public function test_progress_route_is_registered_as_post_not_get(): void
    {
        $route = Route::getRoutes()->getByName('onboarding.progress');

        $this->assertNotNull($route, 'The onboarding.progress route must be registered.');
        $this->assertContains('POST', $route->methods(), 'The progress route must be registered as POST.');
        $this->assertNotContains('GET', $route->methods(), 'The progress route must not be registered as GET.');
    }

    public function test_valid_progress_post_returns_saved_true_and_persists(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $response = $this->postJson(route('onboarding.progress'), [
            'step' => 2,
            'data' => $this->progressData(),
        ]);

        $response->assertOk()->assertExactJson(['saved' => true]);

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('2', StoreConfiguration::getConfiguration($store->id)['onboarding_step']);
    }

    public function test_progress_persists_only_whitelisted_fields(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $response = $this->postJson(route('onboarding.progress'), [
            'step' => 3,
            'data' => $this->progressData([
                'storeName' => 'My Store',
                'scriptInjection' => 'alert(1)',
                'storeId' => 999999,
            ]),
        ]);

        $response->assertOk()->assertExactJson(['saved' => true]);

        $store = Store::where('user_id', $user->id)->firstOrFail();
        $raw = StoreConfiguration::getConfiguration($store->id)['onboarding_progress'];
        $progress = json_decode($raw, true);

        $this->assertIsArray($progress);
        $this->assertSame('My Store', $progress['storeName']);
        $this->assertArrayHasKey('storeSubdomain', $progress);
        $this->assertArrayHasKey('publishStore', $progress);
        $this->assertArrayNotHasKey('scriptInjection', $progress);
        $this->assertArrayNotHasKey('storeId', $progress);
    }

    public function test_onboarding_page_restores_persisted_progress_for_refresh(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->postJson(route('onboarding.progress'), [
            'step' => 3,
            'data' => $this->progressData([
                'storeName' => 'My Store',
                'language' => 'en',
            ]),
        ])->assertOk();

        $response = $this->get(route('onboarding'));

        $response->assertOk();
        $page = $response->viewData('page');

        $this->assertSame(3, $page['props']['initialStep']);
        $this->assertSame('My Store', $page['props']['defaults']['storeName']);
        $this->assertSame('en', $page['props']['defaults']['language']);
    }

    public function test_progress_rejects_invalid_payloads(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        foreach ([
            ['step' => 0, 'data' => []],
            ['step' => 21, 'data' => []],
            ['step' => 'not-a-step', 'data' => []],
            ['step' => -3, 'data' => []],
            ['step' => 2, 'data' => 'not-an-array'],
        ] as $payload) {
            $this->postJson(route('onboarding.progress'), $payload)->assertStatus(422);
        }

        $store = Store::where('user_id', $user->id)->first();
        $this->assertNull($store, 'No store should be created by rejected progress payloads.');
    }

    public function test_progress_requires_authentication(): void
    {
        $this->postJson(route('onboarding.progress'), [
            'step' => 2,
            'data' => $this->progressData(),
        ])->assertStatus(401);
    }

    public function test_store_progress_is_isolated_between_merchants(): void
    {
        $userA = $this->newUser();
        $this->actingAs($userA);

        $userB = $this->newUser();
        $storeB = Store::factory()->create(['user_id' => $userB->id]);
        $userB->current_store = $storeB->id;
        $userB->save();

        $this->postJson(route('onboarding.progress'), [
            'step' => 4,
            'store_id' => $storeB->id,
            'store' => $storeB->id,
            'data' => $this->progressData(['storeName' => 'Only Store A']),
        ])->assertOk();

        $storeA = Store::where('user_id', $userA->id)->firstOrFail();
        $this->assertSame('4', StoreConfiguration::getConfiguration($storeA->id)['onboarding_step']);

        StoreConfiguration::flushRequestCache();

        $this->assertNull(StoreConfiguration::getConfiguration($storeB->id)['onboarding_step'] ?? null);
        $this->assertFalse(
            StoreConfiguration::where('store_id', $storeB->id)
                ->whereIn('key', ['onboarding_step', 'onboarding_progress'])
                ->exists()
        );
    }

    public function test_repeated_progress_posts_are_idempotent_and_last_write_wins(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $this->postJson(route('onboarding.progress'), [
            'step' => 2,
            'data' => $this->progressData(['storeName' => 'First Save']),
        ])->assertOk();

        $this->postJson(route('onboarding.progress'), [
            'step' => 2,
            'data' => $this->progressData(['storeName' => 'Second Save', 'currency' => 'ils']),
        ])->assertOk();

        $store = Store::where('user_id', $user->id)->firstOrFail();

        $this->assertSame(
            2,
            StoreConfiguration::where('store_id', $store->id)
                ->whereIn('key', ['onboarding_step', 'onboarding_progress'])
                ->count()
        );

        $raw = StoreConfiguration::where('store_id', $store->id)
            ->where('key', 'onboarding_progress')
            ->value('value');

        $progress = json_decode($raw, true);
        $this->assertIsArray($progress);
        $this->assertSame('Second Save', $progress['storeName']);
        $this->assertSame('ils', $progress['currency']);
    }

    public function test_client_source_uses_canonical_post_not_get(): void
    {
        $source = file_get_contents(base_path('resources/js/pages/onboarding.tsx'));

        $this->assertStringContainsString('.post(route(\'onboarding.progress\')', $source);
        $this->assertStringNotContainsString('.get(route(\'onboarding.progress\')', $source);
        $this->assertStringNotContainsString('router.get(route(\'onboarding.progress\')', $source);
        $this->assertStringNotContainsString('axios.get(route(\'onboarding.progress\')', $source);
    }

    public function test_get_request_to_progress_route_is_method_not_allowed(): void
    {
        $user = $this->newUser();
        $this->actingAs($user);

        $response = $this->getJson('/onboarding/progress');

        $this->assertContains($response->status(), [404, 405]);
        $this->assertNotSame(200, $response->status());
    }
}