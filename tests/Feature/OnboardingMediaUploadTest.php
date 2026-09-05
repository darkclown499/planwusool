<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

/**
 * Regression coverage for the P0 media upload failure.
 *
 * Root cause: the `onboarded` (EnsureOnboarding) middleware redirected
 * not-yet-onboarded company users on ALL non-onboarding routes, including
 * the JSON/API media routes (api.media.index / api.media.batch). A fresh
 * signup user mid-onboarding who tries to upload their store logo / open the
 * Media Library therefore received a 302 HTML redirect to /onboarding, which
 * the frontend `.json()` parsing turned into the "Error uploading files"
 * toast.
 *
 * Fix: EnsureOnboarding now lets JSON/API requests through for not-yet-
 * onboarded users (their own auth + permission middleware still apply) and
 * only redirects full-page navigations.
 */
class OnboardingMediaUploadTest extends TestCase
{
    use RefreshDatabase;

    private function seedRolesAndPermissions(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $perms = \Spatie\Permission\Models\Permission::whereNotIn('name', ['manage-any-media'])->get();
        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions($perms);
    }

    /**
     * Build a company user that has NOT completed onboarding yet but has an
     * active plan and the `company` role + media permissions, mirroring a real
     * signup user who has just activated their account and entered the wizard.
     */
    private function nonOnboardedCompanyUser(): User
    {
        $this->seedRolesAndPermissions();

        $plan = Plan::factory()->create([
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);

        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            // NOT onboarded yet - this is the whole point.
            'onboarded_at' => null,
        ]);

        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();

        $role = \App\Models\Role::where('name', 'company')->first();
        if (!$user->hasRole($role)) {
            $user->assignRole($role);
        }

        return $user->fresh();
    }

    private function privilegedCompanyUser(): User
    {
        $this->seedRolesAndPermissions();

        $plan = Plan::factory()->create([
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);

        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            'onboarded_at' => now(),
        ]);

        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();

        $role = \App\Models\Role::where('name', 'company')->first();
        if (!$user->hasRole($role)) {
            $user->assignRole($role);
        }

        return $user->fresh();
    }

    public function test_non_onboarded_company_user_can_upload_media_via_json(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        $file = UploadedFile::fake()->image('logo.png', 200, 200);

        // Regression: before the fix this returned a 302 HTML redirect to the
        // onboarding page (which the JS turned into the upload-error toast).
        $this->postJson('/api/media/batch', ['files' => [$file]])
            ->assertStatus(200);

        $this->assertSame(1, Media::where('store_id', $user->current_store)->count());
    }

    public function test_non_onboarded_company_user_can_list_media_via_json(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        $file = UploadedFile::fake()->image('lib.png', 100, 100);
        $this->postJson('/api/media/batch', ['files' => [$file]])->assertStatus(200);

        $res = $this->getJson('/api/media');
        $res->assertStatus(200);
    }

    public function test_non_onboarded_full_page_navigation_still_redirects_to_onboard(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        // A normal browser page-load (non-JSON) on a protected route must still
        // be sent back to the wizard - showing the middleware guard is intact
        // and we only opened the door for JSON/API requests.
        $this->get('/dashboard')->assertRedirect(route('onboarding'));
    }

    public function test_invalid_file_type_is_rejected(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        $bad = UploadedFile::fake()->create('evil.exe', 50);

        $this->postJson('/api/media/batch', ['files' => [$bad]])
            ->assertStatus(422);

        $this->assertSame(0, Media::count());
    }

    public function test_oversized_file_is_rejected(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        // Backend caps each file at a hard 50 MB safety ceiling in the batch
        // validator. Use a file above that bound so it is rejected regardless
        // of any tenant-specific setting.
        $huge = UploadedFile::fake()->image('huge.jpg', 2000, 2000)->size(60000);

        $this->postJson('/api/media/batch', ['files' => [$huge]])
            ->assertStatus(422);

        $this->assertSame(0, Media::count());
    }

    public function test_upload_size_boundaries_at_50mb_ceiling(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        // Just below the 50 MB ceiling -> accepted
        $this->postJson('/api/media/batch', ['files' => [UploadedFile::fake()->image('below.jpg', 2000, 2000)->size(51199)]])
            ->assertStatus(200);

        // Exactly at the 50 MB ceiling (51200 KB) -> accepted (`max:51200` is inclusive)
        $this->postJson('/api/media/batch', ['files' => [UploadedFile::fake()->image('at.jpg', 2000, 2000)->size(51200)]])
            ->assertStatus(200);

        // Just above the 50 MB ceiling -> rejected
        $this->postJson('/api/media/batch', ['files' => [UploadedFile::fake()->image('above.jpg', 2000, 2000)->size(51201)]])
            ->assertStatus(422);
    }

    public function test_unauthenticated_media_upload_is_rejected(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('anon.png', 100, 100);

        // No actingAs -> guest. The media route sits in the auth group, so a
        // guest calling the JSON API should get a 401, not a 200/302.
        $this->postJson('/api/media/batch', ['files' => [$file]])
            ->assertStatus(401);

        $this->assertSame(0, Media::count());
    }

    public function test_media_persists_row_and_file_in_storage(): void
    {
        Storage::fake('public');
        $user = $this->nonOnboardedCompanyUser();

        $this->actingAs($user);

        $file = UploadedFile::fake()->image('persist.png', 150, 150);
        $this->postJson('/api/media/batch', ['files' => [$file]])->assertStatus(200);

        $media = Media::where('store_id', $user->current_store)->first();
        $this->assertNotNull($media);

        // File actually exists on the public disk under the media collection.
        $relative = $media->getPathRelativeToRoot();
        $this->assertNotEmpty($relative);
        Storage::disk('public')->assertExists($relative);
    }

    public function test_no_csrf_exemption_for_media_upload_route(): void
    {
        Storage::fake('public');

        // Effective CSRF-excluded paths = the project subclass `$except`
        // (app/Http/Middleware/VerifyCsrfToken.php) merged with the paths
        // registered at bootstrap via Middleware::validateCsrfTokens()
        // (bootstrap/app.php). Assert the media upload route is NOT excluded.
        $middleware = $this->app->make(\App\Http\Middleware\VerifyCsrfToken::class);

        $instanceRef = new \ReflectionProperty(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class, 'except');
        $instanceRef->setAccessible(true);
        $bootRef = new \ReflectionProperty(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class, 'neverVerify');
        $bootRef->setAccessible(true);

        $exceptions = array_merge(
            $instanceRef->getValue($middleware),
            $bootRef->getValue()
        );

        foreach ($exceptions as $pattern) {
            $this->assertFalse(
                fnmatch($pattern, 'api/media/batch'),
                "Media upload route must not be CSRF-exempt (found: {$pattern})"
            );
        }
    }

    public function test_onboarded_user_can_still_upload_media(): void
    {
        Storage::fake('public');
        $user = $this->privilegedCompanyUser();

        $this->actingAs($user);

        $file = UploadedFile::fake()->image('ok.png', 120, 120);
        $this->postJson('/api/media/batch', ['files' => [$file]])->assertStatus(200);

        $this->assertSame(1, Media::where('store_id', $user->current_store)->count());
    }
}
