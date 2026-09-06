<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\Support\Qa\QaFixtureBuilder;
use Tests\TestCase;

class DurableQaFixtureTest extends TestCase
{
    use RefreshDatabase;

    private const QA_EMAIL = 'merchant@qa.example.test';

    private const QA_PASSWORD = 'password';

    private function fixture(array $options = []): QaFixtureBuilder
    {
        return (new QaFixtureBuilder(array_merge([
            'email' => self::QA_EMAIL,
            'password' => self::QA_PASSWORD,
            'productCount' => 0,
            'orderCount' => 0,
        ], $options)))->create();
    }

    private function nonQaTenant(): array
    {
        $plan = Plan::factory()->create(['max_products_per_store' => 100]);
        $user = User::factory()->create();
        $store = Store::forceCreate([
            'slug' => 'normal-'.substr(uniqid(), -8),
            'name' => 'Normal Store',
            'theme' => 'bazaar-market',
            'email' => 'normal@example.com',
            'user_id' => $user->id,
        ]);
        $category = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Normal Product',
            'price' => 20,
            'stock' => 7,
            'store_id' => $store->id,
            'category_id' => $category->id,
            'images' => '/s/a.jpg',
            'cover_image' => '/s/a.jpg',
            'is_active' => true,
        ]);

        return [$user, $store, $category];
    }

    public function test_creates_verified_merchant(): void
    {
        $fixture = $this->fixture();
        $user = $fixture->user();

        $this->assertInstanceOf(User::class, $user);
        $this->assertSame('company', $user->type);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(1, (int) $user->is_enable_login);
        $this->assertSame('active', $user->status);
        $this->assertNotNull($user->onboarded_at);
        $this->assertSame((int) $fixture->store()->id, (int) $user->current_store);
        $this->assertDatabaseHas('users', ['email' => self::QA_EMAIL]);
    }

    public function test_creates_owned_store(): void
    {
        $fixture = $this->fixture();
        $store = $fixture->store();

        $this->assertInstanceOf(Store::class, $store);
        $this->assertSame((int) $fixture->user()->id, (int) $store->user_id);
        $this->assertSame('qa-store', $store->slug);
        $this->assertSame($store->id, (int) $fixture->user()->current_store);
        $this->assertContains($store->theme, Store::ALL_TEMPLATES);
    }

    public function test_assigns_expected_role(): void
    {
        $fixture = $this->fixture();

        $this->assertTrue($fixture->user()->hasRole('company'));
        $this->assertTrue($fixture->user()->hasAnyRole(['company']));
    }

    public function test_assigns_requested_permissions(): void
    {
        $fixture = $this->fixture(['permissions' => ['export-orders', 'view-pos']]);

        $this->assertTrue($fixture->user()->hasPermissionTo('export-orders'));
        $this->assertTrue($fixture->user()->hasPermissionTo('view-pos'));

        // Only the requested permissions are granted directly beyond the role.
        $direct = $fixture->user()->getDirectPermissions()->pluck('name')->sort()->values()->all();
        $this->assertSame(['export-orders', 'view-pos'], $direct);
    }

    public function test_assigns_requested_plan(): void
    {
        $fixture = $this->fixture(['plan' => 'Growth']);

        $this->assertSame('Growth', $fixture->plan()->name);
        $this->assertSame('Growth', $fixture->user()->plan->name);
        $this->assertSame(1, (int) $fixture->user()->plan_is_active);
        $this->assertTrue($fixture->user()->plan_expire_date->isFuture());
    }

    public function test_qa_plan_respects_plan_source_of_truth(): void
    {
        $fixture = $this->fixture();

        $this->assertSame(QaFixtureBuilder::QA_PLAN_NAME, $fixture->plan()->name);
        $this->assertGreaterThanOrEqual(3, (int) $fixture->plan()->max_products_per_store);
    }

    public function test_qa_plan_is_invisible_on_public_pricing_and_upgrade_surfaces(): void
    {
        $fixture = $this->fixture();

        // Never a purchasable/selectable plan.
        $this->assertFalse(Plan::where('is_plan_enable', 'on')->where('name', QaFixtureBuilder::QA_PLAN_NAME)->exists());
        $this->assertSame('off', Plan::find($fixture->plan()->id)->is_plan_enable);

        // Never the implicit default plan for new registrations.
        $this->assertDatabaseMissing('plans', [
            'name' => QaFixtureBuilder::QA_PLAN_NAME,
            'is_default' => true,
        ]);

        // The public landing page must not advertise the QA plan.
        $response = $this->get('/');
        $response->assertOk();
        $response->assertDontSee(QaFixtureBuilder::QA_PLAN_NAME);
    }

    public function test_optional_products_and_orders_state_works(): void
    {
        $fixture = $this->fixture(['productCount' => 3, 'orderCount' => 2]);

        $this->assertSame(3, Product::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(1, Category::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(2, Order::where('store_id', $fixture->store()->id)->count());
    }

    public function test_optional_shipping_and_payment_state_works(): void
    {
        $fixture = $this->fixture(['states' => ['shipping', 'payment']]);

        $shipping = Shipping::where('store_id', $fixture->store()->id)
            ->where('is_active', true)
            ->first();
        $this->assertNotNull($shipping);

        $setting = PaymentSetting::where('store_id', $fixture->store()->id)
            ->where('key', 'is_cod_enabled')
            ->first();
        $this->assertNotNull($setting);
        $this->assertTrue((bool) $setting->value);

        $settings = PaymentSetting::getUserSettings($fixture->user()->id, $fixture->store()->id);
        $this->assertTrue((bool) ($settings['is_cod_enabled'] ?? false));
    }

    public function test_tenant_scoped_creation(): void
    {
        [$otherUser, $otherStore, $otherCategory] = $this->nonQaTenant();
        $before = Product::where('store_id', $otherStore->id)->count();
        $otherUserId = (int) $otherUser->id;

        $fixture = $this->fixture(['productCount' => 2, 'orderCount' => 1]);

        $this->assertNotSame((int) $fixture->store()->id, (int) $otherStore->id);
        $this->assertSame($before, Product::where('store_id', $otherStore->id)->count());
        $this->assertSame($otherUserId, (int) $otherStore->fresh()->user_id);
        $this->assertSame(0, Product::where('store_id', $fixture->store()->id)
            ->where('category_id', $otherCategory->id)
            ->count());
    }

    public function test_reset_removes_only_qa_owned_state(): void
    {
        [$otherUser, $otherStore] = $this->nonQaTenant();

        $fixture = $this->fixture([
            'productCount' => 2,
            'orderCount' => 1,
            'states' => ['shipping', 'payment'],
        ]);

        $deleted = (new QaFixtureBuilder(['password' => self::QA_PASSWORD]))->reset();

        // QA-owned state is gone.
        $this->assertDatabaseMissing('users', ['email' => self::QA_EMAIL]);
        $this->assertDatabaseMissing('stores', ['slug' => 'qa-store']);
        $this->assertSame(0, Product::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(0, Order::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(0, Shipping::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(0, PaymentSetting::where('store_id', $fixture->store()->id)->count());
        $this->assertSame(0, DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $fixture->user()->id)
            ->count());
        $this->assertDatabaseMissing('plans', ['name' => QaFixtureBuilder::QA_PLAN_NAME]);
        $this->assertSame(1, (int) $deleted['users']);

        // Non-QA data is untouched.
        $this->assertDatabaseHas('users', ['id' => $otherUser->id]);
        $this->assertDatabaseHas('stores', ['slug' => $otherStore->slug]);
        $this->assertSame(1, Product::where('store_id', $otherStore->id)->count());
    }

    public function test_reset_is_idempotent_when_nothing_exists(): void
    {
        $deleted = (new QaFixtureBuilder(['password' => self::QA_PASSWORD]))->reset();

        $this->assertSame(0, array_sum($deleted));

        $deletedAgain = (new QaFixtureBuilder(['password' => self::QA_PASSWORD]))->reset();

        $this->assertSame(0, array_sum($deletedAgain));
    }

    public function test_no_secrets_persisted(): void
    {
        $fixture = $this->fixture();

        $rawPassword = DB::table('users')->where('email', self::QA_EMAIL)->value('password');

        $this->assertNotSame(self::QA_PASSWORD, $rawPassword);
        $this->assertStringNotContainsString(self::QA_PASSWORD, (string) $rawPassword);
        $this->assertTrue(Hash::check(self::QA_PASSWORD, (string) $rawPassword));
        $this->assertStringStartsWith('$2', (string) $rawPassword);
    }

    public function test_unsafe_environment_invocation_rejected(): void
    {
        $previous = app()->environment();

        try {
            app()->detectEnvironment(fn () => 'production');
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('refuses to run in environment');
            (new QaFixtureBuilder(['email' => self::QA_EMAIL]))->create();
        } finally {
            app()->detectEnvironment(fn () => $previous);
        }
    }

    public function test_non_sqlite_connection_rejected(): void
    {
        config(['database.default' => 'mysql']);

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('requires the sqlite connection');
            (new QaFixtureBuilder(['email' => self::QA_EMAIL]))->create();
        } finally {
            config(['database.default' => 'sqlite']);
        }
    }

    public function test_qs_identity_outside_domain_rejected(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('to end with @qa.example.test');

        (new QaFixtureBuilder([
            'email' => 'some.real.store@gmail.com',
            'password' => self::QA_PASSWORD,
        ]))->create();
    }

    public function test_production_auth_behavior_unchanged(): void
    {
        // A guest cannot reach the merchant area.
        $this->get('/dashboard')->assertRedirect(route('login'));

        // Wrong password must not authenticate anyone.
        $this->fixture();
        $this->post('/login', ['email' => self::QA_EMAIL, 'password' => 'wrong-password'])->assertStatus(302);
        $this->assertGuest();

        // The QA merchant authenticates through the normal password flow.
        $this->post('/login', ['email' => self::QA_EMAIL, 'password' => self::QA_PASSWORD]);
        $this->assertAuthenticated();
    }

    public function test_merchant_can_reach_authenticated_surfaces(): void
    {
        $fixture = $this->fixture([
            'productCount' => 3,
            'orderCount' => 2,
            'states' => ['shipping', 'payment'],
        ]);

        $this->actingAs($fixture->user());

        $this->get('/dashboard')->assertOk();
        $this->get('/orders')->assertOk();
        $this->get('/products')->assertOk();
        $this->get('/pos')->assertOk();

        // Logout returns to guest state.
        $this->post('/logout');
        $this->assertGuest();
    }

    public function test_create_is_idempotent(): void
    {
        $first = $this->fixture(['productCount' => 2]);
        $userOne = (int) $first->user()->id;
        $storeOne = (int) $first->store()->id;

        $second = $this->fixture(['productCount' => 2]);

        $this->assertSame($userOne, (int) $second->user()->id);
        $this->assertSame($storeOne, (int) $second->store()->id);
        $this->assertSame(1, User::where('email', self::QA_EMAIL)->count());
        $this->assertSame(2, Product::where('store_id', $storeOne)->count());
    }
}