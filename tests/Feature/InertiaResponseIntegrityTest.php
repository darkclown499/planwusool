<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression for INERTIA RESPONSE CORRUPTION
 * `Cannot read properties of undefined (reading 'toString')`.
 *
 * Root: routes/web.php began with a stray mojibake prefix
 * (E2 88 A9 E2 95 97 E2 94 90 === "∩╗┐") emitted before `<?php`.
 * Those bytes are outside PHP and leaked into every web/Inertia response,
 * breaking JSON decoding on the frontend.
 */
class InertiaResponseIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_routes_file_starts_exactly_with_php_open_tag(): void
    {
        $bytes = file_get_contents(base_path('routes/web.php'));
        $this->assertIsString($bytes);

        // A. starts exactly with `<?php`
        $this->assertStringStartsWith('<?php', $bytes);
    }

    public function test_no_bytes_exist_before_php_open_tag(): void
    {
        $raw = file_get_contents(base_path('routes/web.php'));
        $this->assertIsString($raw);

        // B. no UTF-8 BOM (EF BB BF)
        $this->assertNotSame(0xEF, ord($raw[0]));

        // C. no mojibake prefix (E2 88 A9 ...)
        $this->assertNotSame(0xE2, ord($raw[0]));

        // The file must begin at byte 0 with ASCII '<'
        $this->assertSame(0x3C, ord($raw[0]), 'File must start at byte 0 with "<" (0x3C)');
    }

    public function test_inertia_json_response_can_be_decoded_as_json(): void
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
        $resp = $this->actingAs($user)->get('/customers', ['X-Inertia' => 'true', 'X-Inertia-Version' => $version]);
        $resp->assertOk();

        // D. An Inertia JSON response can be decoded as JSON
        $content = $resp->getContent();
        $this->assertIsString($content);
        $decoded = json_decode($content, true);
        $this->assertIsArray($decoded, 'Inertia JSON response must decode as JSON');

        // E. response body begins with `{` for an X-Inertia JSON response
        $this->assertStringStartsWith('{', $content);
    }
}
