<?php

namespace Tests\Support\Qa;

use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Durable, deterministic, environment-guarded QA fixture builder for Wusool.
 *
 * Purpose: a developer or agent should be able to create a local/testing
 * authenticated Wusool merchant fixture quickly and reproducibly, without
 * touching production authentication behavior. The merchant is created with a
 * verified account (standard model state), an owned store, the canonical
 * `company` role, the requested plan/permissions and optional product/order/
 * shipping/payment state, then logs in through the NORMAL password flow.
 *
 * Usage:
 *
 *     $fixture = (new QaFixtureBuilder([...options]))->create();
 *     $fixture->user();   // \App\Models\User (fresh, realistic company merchant)
 *     $fixture->store();  // \App\Models\Store owned by that merchant
 *     $fixture->plan();   // \App\Models\Plan assigned to that merchant
 *
 * Reset (deletes ONLY rows owned by the QA tooling, keyed on the
 * @qa.example.test email domain — never other tenants' data):
 *
 *     (new QaFixtureBuilder())->reset();
 *
 * Options:
 *   - email         Merchant email; must end with @qa.example.test (enforced).
 *   - password      Password for the /login form (never persisted in plaintext,
 *                   never echoed by the command).
 *   - name          Display name.
 *   - role          Spatie role name granted to the merchant (default company).
 *   - plan          'qa' (dedicated deterministic plan, default) or a canonical
 *                   PlanSeeder name such as Starter / Growth / Professional.
 *   - theme         Store theme from the six-template catalog (default template).
 *   - storeSlug     Deterministic store slug (default qa-store).
 *   - permissions   Extra Spatie permission names to grant beyond the role.
 *   - states        Optional composable states: products, orders, shipping,
 *                   payment.
 *   - productCount  Number of products to create when products state is used.
 *   - orderCount    Number of orders to create when orders state is used.
 *
 * SAFETY: refuses to run outside the local/testing environments, refuses any
 * non-sqlite connection, refuses a production-like database name, and never
 * weakens email verification, OTP, authentication middleware, or login flow.
 */
class QaFixtureBuilder
{
    /** Email domain owned by this QA tooling. Reset only ever touches this. */
    public const EMAIL_DOMAIN = 'qa.example.test';

    /** Signatures accepted for the dedicated deterministic QA plan. */
    public const QA_PLAN_ALIASES = ['qa', 'QA Test Unlimited'];

    public const QA_PLAN_NAME = 'QA Test Unlimited';

    /** State names supported by the `states` option (composable). */
    public const STATE_PRODUCTS = 'products';
    public const STATE_ORDERS = 'orders';
    public const STATE_SHIPPING = 'shipping';
    public const STATE_PAYMENT = 'payment';

    protected array $options;

    protected User $user;

    protected Store $store;

    protected Plan $plan;

    public function __construct(array $options = [])
    {
        $this->options = array_merge([
            'email' => env('QA_MERCHANT_EMAIL', 'merchant@'.self::EMAIL_DOMAIN),
            'password' => env('QA_MERCHANT_PASSWORD', 'password'),
            'name' => 'QA Merchant',
            'role' => 'company',
            'plan' => 'qa',
            'theme' => Store::DEFAULT_TEMPLATE,
            'storeSlug' => 'qa-store',
            'permissions' => [],
            'states' => [],
            'productCount' => 0,
            'orderCount' => 0,
        ], $options);
    }

    public function create(): static
    {
        $this->assertSafeEnvironment();
        $this->assertQaIdentity();

        $this->plan = $this->ensurePlan();
        $this->user = $this->ensureMerchant();
        $this->store = $this->ensureStore();
        $this->ensureOptionalStates();

        return $this;
    }

    /**
     * Remove every row owned by this QA tooling. Only QA merchants (email in
     * the @qa.example.test domain), their stores and store-scoped records, and
     * the QA plan (when no non-QA user references it) are deleted. No other
     * tenant's data is touched. Idempotent when there is nothing to clean.
     *
     * @return array<string, int>
     */
    public function reset(): array
    {
        $this->assertSafeEnvironment();

        $deleted = [
            'users' => 0,
            'stores' => 0,
            'products' => 0,
            'categories' => 0,
            'orders' => 0,
            'shipping_methods' => 0,
            'payment_settings' => 0,
            'plans' => 0,
        ];

        $qaUserIds = User::where('email', 'like', '%@'.self::EMAIL_DOMAIN)
            ->pluck('id')
            ->all();

        if ($qaUserIds !== []) {
            $qaStoreIds = Store::whereIn('user_id', $qaUserIds)->pluck('id')->all();

            if ($qaStoreIds !== []) {
                $deleted['payment_settings'] = PaymentSetting::whereIn('store_id', $qaStoreIds)
                    ->orWhereIn('user_id', $qaUserIds)
                    ->delete();
                $deleted['shipping_methods'] = Shipping::whereIn('store_id', $qaStoreIds)->delete();
                $deleted['orders'] = Order::whereIn('store_id', $qaStoreIds)->delete();
                $deleted['products'] = Product::whereIn('store_id', $qaStoreIds)->delete();
                $deleted['categories'] = Category::whereIn('store_id', $qaStoreIds)->delete();
            }

            $deleted['stores'] = Store::whereIn('user_id', $qaUserIds)->delete();

            // Spatie role/permission pivots are polymorphic, so clean them
            // explicitly instead of leaving stale rows behind.
            DB::table('model_has_roles')
                ->where('model_type', User::class)
                ->whereIn('model_id', $qaUserIds)
                ->delete();
            DB::table('model_has_permissions')
                ->where('model_type', User::class)
                ->whereIn('model_id', $qaUserIds)
                ->delete();

            $deleted['users'] = User::whereIn('id', $qaUserIds)->delete();
        }

        $this->deleteUnusedQaPlan($deleted);

        return $deleted;
    }

    public function user(): User
    {
        return $this->user;
    }

    public function store(): Store
    {
        return $this->store;
    }

    public function plan(): Plan
    {
        return $this->plan;
    }

    /**
     * Any executable QA bootstrap must refuse unsafe environments: only local
     * and testing may create/reset fixture state. Production must be untouched.
     */
    protected function assertSafeEnvironment(): void
    {
        $environment = app()->environment();

        if (! in_array($environment, ['local', 'testing'], true)) {
            throw new RuntimeException(
                sprintf(
                    'QaFixtureBuilder refuses to run in environment [%s]. Only local and testing are allowed; production must never be modified by QA tooling.',
                    $environment
                )
            );
        }

        $connection = (string) config('database.default');

        if ($connection !== 'sqlite') {
            throw new RuntimeException(
                sprintf('QaFixtureBuilder requires the sqlite connection, got [%s].', $connection)
            );
        }

        $database = (string) config('database.connections.sqlite.database');

        foreach (['sql_wusool_ps', 'wusool'] as $productionMarker) {
            if (str_contains($database, $productionMarker)) {
                throw new RuntimeException(
                    sprintf('QaFixtureBuilder refuses a production-like database [%s].', $database)
                );
            }
        }
    }

    /**
     * Reset semantics only make sense while every QA merchant lives inside the
     * dedicated email domain; otherwise reset() could never prove it removed
     * only QA-owned state.
     */
    protected function assertQaIdentity(): void
    {
        if (! str_ends_with((string) $this->options['email'], '@'.self::EMAIL_DOMAIN)) {
            throw new RuntimeException(
                sprintf(
                    'QaFixtureBuilder requires the merchant email to end with @%s (got [%s]) so reset() can only ever remove QA-owned rows.',
                    self::EMAIL_DOMAIN,
                    $this->options['email']
                )
            );
        }
    }

    protected function ensurePlan(): Plan
    {
        $requested = (string) ($this->options['plan'] ?? 'qa');

        if (in_array($requested, self::QA_PLAN_ALIASES, true)) {
            return Plan::updateOrCreate(
                ['name' => self::QA_PLAN_NAME],
                [
                    'price' => 0,
                    'yearly_price' => 0,
                    'duration' => 'yearly',
                    'domain_type' => 'subdomain',
                    'description' => 'Dedicated deterministic QA plan created by the QA fixture builder.',
                    'max_stores' => 10,
                    'max_users_per_store' => 10,
                    'max_products_per_store' => 1000,
                    'max_warehouses' => 5,
                    'themes' => ['all'],
                    'enable_custdomain' => 'on',
                    'enable_custsubdomain' => 'on',
                    'enable_branding' => 'on',
                    'pwa_business' => 'on',
                    'enable_chatgpt' => 'on',
                    'enable_shipping_method' => 'on',
                    'enable_mobile_app' => 'on',
                    'enable_sms' => 'on',
                    'enable_theme_editor' => 'on',
                    'template_editor_level' => 'full',
                    'storage_limit' => 50,
                    'is_trial' => null,
                    'trial_day' => 0,
                    // Keep the QA fixture plan off public pricing, merchant upgrade
                    // lists, and admin "active plans" counts: it is reserved for
                    // deterministic local/testing QA state, never a purchasable plan.
                    'is_plan_enable' => 'off',
                    'is_default' => false,
                    'is_recommended' => false,
                    'module' => null,
                ]
            );
        }

        (new PlanSeeder())->run();

        return Plan::where('name', $requested)->firstOr(function () use ($requested) {
            throw new RuntimeException(
                sprintf(
                    'QaFixtureBuilder: unsupported plan [%s]. Use "qa" or a PlanSeeder name such as Starter, Growth, or Professional.',
                    $requested
                )
            );
        });
    }

    protected function ensureMerchant(): User
    {
        // Roles/permissions only exist once seeded; run the canonical seeders
        // (idempotent) so permission-gated surfaces behave like production.
        (new PermissionSeeder())->run();
        (new RoleSeeder())->run();

        $user = User::where('email', (string) $this->options['email'])->first();

        if (! $user) {
            $user = new User();
            $user->email = (string) $this->options['email'];
        }

        $user->forceFill([
            'name' => (string) $this->options['name'],
            'password' => Hash::make((string) $this->options['password']),
            'type' => 'company',
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
            'plan_id' => $this->plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            'is_enable_login' => 1,
            'status' => 'active',
            'onboarded_at' => now(),
        ])->save();

        // Hydrate DB-level defaults so every middleware sees the same realistic
        // merchant object a live request would load.
        $user->refresh();

        $user->assignRole(Role::firstOrCreate(['name' => (string) $this->options['role'], 'guard_name' => 'web']));

        foreach ((array) $this->options['permissions'] ?? [] as $permissionName) {
            $user->givePermissionTo(
                Permission::firstOrCreate(['name' => (string) $permissionName, 'guard_name' => 'web'])
            );
        }

        return $user;
    }

    protected function ensureStore(): Store
    {
        $slug = (string) $this->options['storeSlug'];
        $store = Store::where('slug', $slug)->first();

        if ($store && (int) $store->user_id !== (int) $this->user->id) {
            throw new RuntimeException(
                sprintf(
                    'QA fixture store slug [%s] belongs to merchant [%s]; refusing to touch another tenant\'s store. Choose a different --store-slug.',
                    $slug,
                    $store->user_id
                )
            );
        }

        $storeData = [
            'name' => $this->options['name'].' Store',
            'description' => 'Deterministic QA store created by the QA fixture builder.',
            'theme' => (string) $this->options['theme'],
            'user_id' => $this->user->id,
            'email' => (string) $this->options['email'],
        ];

        if (! $store) {
            $store = Store::forceCreate(array_merge(['slug' => $slug], $storeData));
        } else {
            $store->forceFill($storeData)->save();
            $store->refresh();
        }

        $this->user->forceFill(['current_store' => $store->id])->save();
        $this->user->refresh();

        return $store;
    }

    protected function ensureOptionalStates(): void
    {
        $states = $this->normalizedStates();
        $productCount = max(0, (int) ($this->options['productCount'] ?? 0));
        $orderCount = max(0, (int) ($this->options['orderCount'] ?? 0));

        if (in_array(self::STATE_PRODUCTS, $states, true) || $productCount > 0) {
            $this->ensureCategoriesAndProducts($productCount > 0 ? $productCount : 3);
        }

        if (in_array(self::STATE_ORDERS, $states, true) || $orderCount > 0) {
            $this->ensureOrders($orderCount > 0 ? $orderCount : 2);
        }

        if (in_array(self::STATE_SHIPPING, $states, true)) {
            $this->ensureShippingMethod();
        }

        if (in_array(self::STATE_PAYMENT, $states, true)) {
            $this->ensurePaymentConfiguration();
        }
    }

    protected function ensureCategoriesAndProducts(int $count): void
    {
        $category = Category::firstOrCreate(
            ['slug' => 'qa-products-'.$this->store->id, 'store_id' => $this->store->id],
            [
                'name' => 'QA Products',
                'description' => 'QA test products',
                'store_id' => $this->store->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        for ($i = 1; $i <= $count; $i++) {
            Product::firstOrCreate(
                ['store_id' => $this->store->id, 'name' => 'QA Product '.$i],
                [
                    'sku' => 'QA-P-'.$this->store->id.'-'.$i,
                    'description' => 'QA test product',
                    'price' => 100 + $i,
                    'stock' => 50 + $i,
                    'category_id' => $category->id,
                    'store_id' => $this->store->id,
                    'is_active' => true,
                    'cover_image' => '/images/store/spices.jpg',
                    'images' => '/images/store/spices.jpg',
                    'variants' => null,
                ]
            );
        }
    }

    protected function ensureOrders(int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            Order::forceCreate([
                'order_number' => 'QA-'.date('Ymd').'-'.$this->store->id.'-'.$i,
                'store_id' => $this->store->id,
                'session_id' => 'qa-session-'.$this->store->id.'-'.$i,
                'status' => 'pending',
                'payment_status' => 'pending',
                'customer_email' => 'qa-customer-'.$i.'@'.self::EMAIL_DOMAIN,
                'customer_first_name' => 'QA',
                'customer_last_name' => 'Customer '.$i,
                'customer_phone' => '05990000'.sprintf('%02d', $i),
                'shipping_address' => 'QA Street',
                'shipping_city' => 'Ramallah',
                'shipping_state' => 'West Bank',
                'shipping_country' => 'PS',
                'billing_address' => 'QA Street',
                'billing_city' => 'Ramallah',
                'billing_state' => 'West Bank',
                'billing_country' => 'PS',
                'subtotal' => 100 + $i,
                'total_amount' => 110 + $i,
                'payment_method' => 'cod',
                'shipping_amount' => 10,
            ]);
        }
    }

    protected function ensureShippingMethod(): void
    {
        Shipping::firstOrCreate(
            ['store_id' => $this->store->id, 'name' => 'QA Flat Rate'],
            [
                'type' => 'flat_rate',
                'cost' => 5.5,
                'is_active' => true,
                'store_id' => $this->store->id,
                'delivery_time' => '1-3',
                'sort_order' => 1,
            ]
        );
    }

    protected function ensurePaymentConfiguration(): void
    {
        PaymentSetting::updateOrCreateSetting($this->user->id, 'is_cod_enabled', '1', $this->store->id);
    }

    protected function normalizedStates(): array
    {
        $states = $this->options['states'] ?? [];

        if (is_string($states)) {
            $states = array_map('trim', explode(',', $states));
        }

        return array_values(array_filter((array) $states));
    }

    protected function deleteUnusedQaPlan(array &$deleted): void
    {
        $plan = Plan::where('name', self::QA_PLAN_NAME)->first();

        if (! $plan) {
            return;
        }

        $usedByNonQaUser = User::where('plan_id', $plan->id)
            ->where('email', 'not like', '%@'.self::EMAIL_DOMAIN)
            ->exists();

        if (! $usedByNonQaUser) {
            $deleted['plans'] = (int) $plan->delete();
        }
    }
}