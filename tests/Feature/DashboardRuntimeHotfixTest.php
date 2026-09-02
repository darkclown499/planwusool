<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression for GLOBAL RUNTIME JAVASCRIPT EXCEPTION
 * `Cannot read properties of undefined (reading 'toString')` at Bn/pageUrl/setPage.
 *
 * Root: Inertia page `url` was empty due to brittle urlResolver behind HTTPS proxy.
 */
class DashboardRuntimeHotfixTest extends TestCase
{
    use RefreshDatabase;

    public function test_url_resolver_never_returns_empty(): void
    {
        $middleware = new HandleInertiaRequests();
        $resolver = $middleware->urlResolver();
        $this->assertNotNull($resolver);

        // Root
        $req = Request::create('https://wusool.ps/', 'GET');
        $this->assertSame('/', $resolver($req));

        // Normal merchant path
        $req = Request::create('https://wusool.ps/customers', 'GET');
        $this->assertSame('/customers', $resolver($req));

        // Query string preserved
        $req = Request::create('https://wusool.ps/customers?search=abc&page=2', 'GET');
        $url = $resolver($req);
        $this->assertStringStartsWith('/customers', $url);
        $this->assertStringContainsString('search=abc', $url);
        $this->assertStringContainsString('page=2', $url);
        $this->assertSame('/customers?search=abc', $resolver(Request::create('https://wusool.ps/customers?search=abc', 'GET')));

        // Query string must not be lost
        $req = Request::create('https://wusool.ps/delivery?bucket=assigned', 'GET');
        $this->assertSame('/delivery?bucket=assigned', $resolver($req));

        // HTTPS APP_URL with origin appearing HTTP (Cloudflare Flexible)
        $req = Request::create('http://wusool.ps/customers', 'GET', [], [], [], ['HTTP_X_FORWARDED_PROTO' => 'https', 'HTTP_HOST' => 'wusool.ps']);
        $url = $resolver($req);
        $this->assertIsString($url);
        $this->assertNotSame('', $url);
        $this->assertStringStartsWith('/', $url);

        // Custom domain safety
        $req = Request::create('https://mystore.example.com/products', 'GET', [], [], [], ['HTTP_HOST' => 'mystore.example.com']);
        $this->assertSame('/products', $resolver($req));

        // Subdomain
        $req = Request::create('https://ahmad.wusool.ps/orders', 'GET', [], [], [], ['HTTP_HOST' => 'ahmad.wusool.ps']);
        $this->assertSame('/orders', $resolver($req));
    }

    public function test_inertia_page_url_is_present_for_merchant_pages(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\CurrencySeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $plan = \App\Models\Plan::factory()->create(['max_stores'=>3,'max_products_per_store'=>100,'max_users_per_store'=>10]);
        $user = \App\Models\User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now()]);
        $store = \App\Models\Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $user->assignRole($role);

        $version = @md5_file(public_path('build/manifest.json')) ?: \Inertia\Inertia::getVersion();
        foreach (['/customers', '/delivery', '/analytics', '/customers?search=abc'] as $path) {
            $resp = $this->actingAs($user)->get($path, ['X-Inertia' => 'true', 'X-Inertia-Version' => $version]);
            $resp->assertOk();
            $json = $resp->json();
            $this->assertIsArray($json, "Failed for $path");
            $this->assertArrayHasKey('url', $json, "url missing for $path");
            $this->assertIsString($json['url'], "url not string for $path");
            $this->assertNotSame('', $json['url'], "url empty for $path");
            $this->assertStringStartsWith('/', $json['url'], "url must start with / for $path");
        }

        // Query string must be preserved verbatim
        $resp = $this->actingAs($user)->get('/customers?search=abc', ['X-Inertia' => 'true', 'X-Inertia-Version' => $version]);
        $this->assertSame('/customers?search=abc', $resp->json('url'));
    }
}
