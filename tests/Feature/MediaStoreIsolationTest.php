<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaStoreIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function companyWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>100,'max_users_per_store'=>20]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        try {
            $this->seed(\Database\Seeders\PermissionSeeder::class);
            $this->seed(\Database\Seeders\RoleSeeder::class);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
            $perms = \Spatie\Permission\Models\Permission::whereNotIn('name',['manage-any-media'])->get();
            $role = \App\Models\Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
            $role->syncPermissions($perms);
            if (!$user->hasRole('company')) $user->assignRole($role);
            foreach ($perms as $p) { try{ $user->givePermissionTo($p);}catch(\Throwable $e){} }
        } catch (\Throwable $e) {}
        return [$user->fresh(),$store];
    }

    public function test_store_a_cannot_list_store_b_media(): void
    {
        if (!Schema::hasColumn('media','store_id')) $this->markTestSkipped('store_id column not migrated');
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        Storage::fake('public');
        // create media for A
        $this->actingAs($userA);
        $fileA = UploadedFile::fake()->image('a.jpg', 100, 100);
        $this->postJson('/api/media/batch', ['files'=>[$fileA]])->assertStatus(200);
        $mediaA = Media::where('store_id',$storeA->id)->first();
        $this->assertNotNull($mediaA);
        // B lists
        $this->actingAs($userB);
        $res = $this->getJson('/api/media');
        $res->assertStatus(200);
        $ids = collect($res->json())->pluck('id')->all();
        $this->assertNotContains($mediaA->id, $ids);
    }

    public function test_store_a_cannot_download_store_b_media(): void
    {
        if (!Schema::hasColumn('media','store_id')) $this->markTestSkipped('store_id');
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        Storage::fake('public');
        $this->actingAs($userA);
        $file = UploadedFile::fake()->image('b.jpg', 100, 100);
        $this->postJson('/api/media/batch', ['files'=>[$file]])->assertStatus(200);
        $media = Media::where('store_id',$storeA->id)->first();
        $this->actingAs($userB);
        $res = $this->get('/api/media/'.$media->id.'/download');
        $this->assertEquals(404, $res->getStatusCode());
    }

    public function test_store_a_cannot_delete_store_b_media(): void
    {
        if (!Schema::hasColumn('media','store_id')) $this->markTestSkipped('store_id');
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        Storage::fake('public');
        $this->actingAs($userA);
        $file = UploadedFile::fake()->image('c.jpg', 100, 100);
        $this->postJson('/api/media/batch', ['files'=>[$file]])->assertStatus(200);
        $media = Media::where('store_id',$storeA->id)->first();
        $this->actingAs($userB);
        $res = $this->deleteJson('/api/media/'.$media->id);
        $this->assertEquals(404, $res->status());
        $this->assertDatabaseHas('media',['id'=>$media->id]);
    }
}
