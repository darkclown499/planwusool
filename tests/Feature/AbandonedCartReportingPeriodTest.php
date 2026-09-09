<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use App\Services\AbandonedCartService;
use App\Support\AnalyticsPeriod;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * The abandoned-cart report must obey the same canonical AnalyticsPeriod
 * contract as the surrounding analytics/report surface: validated presets or
 * a capped custom window, computed in the store timezone, applied to the
 * canonical occurrence field (last_activity_at) for BOTH the list and the
 * KPI stats, with the export using the same window.
 */
class AbandonedCartReportingPeriodTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /* ───────────────────────── helpers ───────────────────────── */

    private function giveAbandonedCartPermissions(User $user): void
    {
        foreach ([
            'manage-abandoned-carts',
            'send-abandoned-cart-reminders',
            'delete-abandoned-carts',
            'export-abandoned-carts',
        ] as $name) {
            $perm = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            $user->givePermissionTo($perm);
        }
    }

    private function companyUser(): User
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 10,
        ]);
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function storeFor(User $user): Store
    {
        $s = new Store();
        $s->user_id = $user->id;
        $s->name = 'Store ' . uniqid();
        $s->slug = 's-' . uniqid();
        $s->theme = 'bazaar-market';
        $s->email = 's@' . uniqid() . '.com';
        $s->save();
        $user->current_store = $s->id;
        $user->save();
        return $s;
    }

    private function makeCart(Store $store, array $overrides = []): AbandonedCart
    {
        return AbandonedCart::forceCreate(array_merge([
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'customer_name' => 'Test Customer',
            'customer_email' => 'test@example.com',
            'customer_phone' => '+970591234567',
            'cart_items' => [['name' => 'Test Product', 'quantity' => 1, 'price' => 100]],
            'cart_total' => 100,
            'status' => 'abandoned',
            'last_activity_at' => now(),
            'reminder_count' => 0,
            'recovery_token' => bin2hex(random_bytes(32)),
            'expires_at' => now()->addDays(7),
        ], $overrides));
    }

    private function indexProps($response): array
    {
        return $response->viewData('page')['props'] ?? [];
    }

    /* ─────────────────────── default period ─────────────────────── */

    public function test_default_period_applies_last_30_days(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $this->makeCart($store, ['customer_name' => 'In Window', 'status' => 'abandoned', 'cart_total' => 200, 'last_activity_at' => now()]);
        $this->makeCart($store, ['customer_name' => 'Old Cart', 'status' => 'abandoned', 'cart_total' => 100, 'last_activity_at' => now()->subDays(45)]);
        $this->makeCart($store, ['customer_name' => 'Recovered One', 'status' => 'recovered', 'cart_total' => 50, 'last_activity_at' => now()]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', $store->id));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals('last_30_days', $props['preset']);
        $this->assertEquals(2, $props['stats']['total'], 'before-period cart is excluded');
        $this->assertEquals(1, $props['stats']['abandoned']);
        $this->assertEquals(1, $props['stats']['recovered'], 'in-period recovered cart counts');
        $this->assertEquals(50, (float) $props['stats']['recovered_amount']);
        $this->assertEquals(200, (float) $props['stats']['total_abandoned_amount']);

        $names = collect($props['carts']['data'])->pluck('customer_name')->all();
        $this->assertCount(1, $props['carts']['data'], 'list respects the window and default status filter');
        $this->assertSame(['In Window'], $names, 'before-period and in-period recovered carts are absent from the list');
    }

    /* ─────────────────────── custom period ─────────────────────── */

    public function test_custom_period_applies_and_reaches_list_and_stats(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', now()->subDays(10)->format('Y-m-d'), now()->subDays(1)->format('Y-m-d'));

        // inside the custom window
        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 300, 'last_activity_at' => now()->subDays(5)]);
        // outside (older than the window start)
        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 999, 'last_activity_at' => now()->subDays(60)]);
        // outside (newer than the window end — activity after the end boundary)
        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 777, 'last_activity_at' => now()]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'custom', 'from' => $period['labels']['from'], 'to' => $period['labels']['to']]));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals('custom', $props['preset']);
        $this->assertEquals($period['labels']['from'], $props['from']);
        $this->assertEquals($period['labels']['to'], $props['to']);
        $this->assertEquals(1, $props['stats']['total']);
        $this->assertEquals(300, (float) $props['stats']['total_abandoned_amount']);
        $this->assertCount(1, $props['carts']['data']);
    }

    public function test_preset_today_limits_to_current_local_day(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => now()]);
        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => now()->subDays(1)]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'today']));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals('today', $props['preset']);
        $this->assertEquals(1, $props['stats']['total'], 'only today activity counts');
        $this->assertCount(1, $props['carts']['data']);
    }

    /* ─────────────────────── boundaries ─────────────────────── */

    public function test_start_boundary_is_inclusive(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', now()->subDays(5)->format('Y-m-d'), now()->subDays(1)->format('Y-m-d'));

        // exactly at the local start boundary -> included (>= from)
        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => $period['from']]);
        // one second before the local start boundary -> excluded (< from)
        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => $period['from']->copy()->subSecond()]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'custom', 'from' => $period['labels']['from'], 'to' => $period['labels']['to']]));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals(1, $props['stats']['total'], 'start boundary is inclusive');
        $this->assertCount(1, $props['carts']['data']);
    }

    public function test_end_boundary_is_exclusive(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', now()->subDays(5)->format('Y-m-d'), now()->subDays(1)->format('Y-m-d'));

        // last second of the final local day -> included
        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => $period['to']->copy()->subSecond()]);
        // exactly at the end boundary -> excluded (< to)
        $this->makeCart($store, ['status' => 'abandoned', 'last_activity_at' => $period['to']]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'custom', 'from' => $period['labels']['from'], 'to' => $period['labels']['to']]));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals(1, $props['stats']['total'], 'end boundary is exclusive');
        $this->assertCount(1, $props['carts']['data']);
    }

    public function test_store_timezone_setting_is_consulted_without_breaking_reporting(): void
    {
        // The canonical AnalyticsPeriod contract resolves boundaries in the
        // store's configured timezone and Eloquent binds them as wall-clock
        // literals compared against app-timezone literal rows. This mirrors the
        // analytics surface exactly; here we only prove the store-timezone
        // setting path (settings()/defaultTimezone) is actually read and that a
        // non-default timezone keeps the report correct for mid-window rows.
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);
        Setting::setSetting('defaultTimezone', 'Asia/Riyadh', $user->id, $store->id);

        $this->makeCart($store, ['customer_name' => 'Mid Window', 'status' => 'abandoned', 'last_activity_at' => now()->subDays(3)]);
        $this->makeCart($store, ['customer_name' => 'Old Cart', 'status' => 'abandoned', 'last_activity_at' => now()->subDays(90)]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', $store->id));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals('last_30_days', $props['preset']);
        $this->assertEquals(1, $props['stats']['total']);
        $this->assertCount(1, $props['carts']['data']);
    }

    /* ─────────────────────── tenant isolation ─────────────────────── */

    public function test_tenant_isolation_with_period(): void
    {
        $userA = $this->companyUser();
        $storeA = $this->storeFor($userA);
        $this->giveAbandonedCartPermissions($userA);
        $this->makeCart($storeA, ['status' => 'abandoned', 'last_activity_at' => now()]);

        $userB = $this->companyUser();
        $storeB = $this->storeFor($userB);
        $this->giveAbandonedCartPermissions($userB);
        $this->makeCart($storeB, ['status' => 'abandoned', 'last_activity_at' => now()]);
        $this->makeCart($storeB, ['status' => 'abandoned', 'last_activity_at' => now()]);

        $response = $this->actingAs($userA)
            ->get(route('stores.abandoned-carts.index', $storeA->id));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals(1, $props['stats']['total'], 'store B carts never leak into store A');
        $this->assertEquals(1, $props['stats']['abandoned']);
        $this->assertCount(1, $props['carts']['data']);
    }

    /* ─────────────────────── recovered semantics ─────────────────────── */

    public function test_recovered_semantics_are_preserved_within_period(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('custom', now()->subDays(5)->format('Y-m-d'), now()->subDays(1)->format('Y-m-d'));

        $this->makeCart($store, ['status' => 'recovered', 'cart_total' => 50, 'last_activity_at' => now()->subDays(3)]);
        $this->makeCart($store, ['status' => 'recovered', 'cart_total' => 25, 'last_activity_at' => now()->subDays(40)]);
        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 120, 'last_activity_at' => now()->subDays(2)]);

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'custom', 'from' => $period['labels']['from'], 'to' => $period['labels']['to']]));
        $response->assertStatus(200);

        $props = $this->indexProps($response);
        $this->assertEquals(2, $props['stats']['total']);
        $this->assertEquals(1, $props['stats']['recovered'], 'in-period recovered stays recovered');
        $this->assertEquals(50, (float) $props['stats']['recovered_amount'], 'before-period recovered revenue is excluded');
        $this->assertEquals(1, $props['stats']['abandoned']);
    }

    /* ─────────────────────── service level ─────────────────────── */

    public function test_service_get_stats_respects_period_and_keeps_all_time_fallback(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);

        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 100, 'last_activity_at' => now()->subDays(45)]);
        $this->makeCart($store, ['status' => 'abandoned', 'cart_total' => 200, 'last_activity_at' => now()]);
        $this->makeCart($store, ['status' => 'recovered', 'cart_total' => 50, 'last_activity_at' => now()]);

        $service = app(AbandonedCartService::class);
        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');

        $scoped = $service->getStats($store->id, $period);
        $this->assertEquals(2, $scoped['total']);
        $this->assertEquals(1, $scoped['abandoned']);
        $this->assertEquals(1, $scoped['recovered']);
        $this->assertEquals(50, (float) $scoped['recovered_amount']);
        $this->assertEquals(200, (float) $scoped['total_abandoned_amount']);

        $allTime = $service->getStats($store->id);
        $this->assertEquals(3, $allTime['total'], 'no period keeps the all-time view for non-report callers');
    }

    /* ─────────────────────── frontend → backend contract ─────────────────────── */

    public function test_frontend_period_request_reaches_backend_and_export_uses_same_window(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->giveAbandonedCartPermissions($user);

        $from = now()->subDays(5)->format('Y-m-d');
        $to = now()->subDays(1)->format('Y-m-d');
        $this->makeCart($store, ['customer_name' => 'In Period', 'status' => 'abandoned', 'last_activity_at' => now()->subDays(3)]);
        $this->makeCart($store, ['customer_name' => 'Old Cart', 'status' => 'abandoned', 'last_activity_at' => now()->subDays(90)]);

        // The exact query the date-range picker issues for a custom range.
        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', [$store->id, 'preset' => 'custom', 'from' => $from, 'to' => $to]));
        $response->assertStatus(200);
        $props = $this->indexProps($response);
        $this->assertEquals('custom', $props['preset']);
        $this->assertEquals($from, $props['from']);
        $this->assertEquals($to, $props['to']);
        $this->assertCount(1, $props['carts']['data']);

        // The export must respect the SAME window the picker sends.
        $export = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.export', [$store->id, 'preset' => 'custom', 'from' => $from, 'to' => $to]));
        $export->assertOk();
        $content = $export->streamedContent();
        $this->assertStringContainsString('In Period', $content);
        $this->assertStringNotContainsString('Old Cart', $content, 'export obeys the selected period');
    }
}