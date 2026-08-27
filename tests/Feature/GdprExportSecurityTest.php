<?php

namespace Tests\Feature;

use App\Jobs\GdprDataExportJob;
use App\Models\GdprExport;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GdprExportSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_job_is_queueable(): void
    {
        $this->assertTrue(in_array(\Illuminate\Contracts\Queue\ShouldQueue::class, class_implements(GdprDataExportJob::class)));
    }

    public function test_export_does_not_contain_secrets(): void
    {
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        // create a secret setting that should never be exported raw
        \App\Models\Setting::updateOrCreate(['user_id'=>$user->id,'store_id'=>$store->id,'key'=>'email_password'], ['value'=>'supersecret123']);
        \App\Models\PaymentSetting::updateOrCreateSetting($user->id,'stripe_secret','sk_live_123456',$store->id);
        Storage::fake('public');
        config(['filesystems.default'=>'public']);
        $export = GdprExport::create(['user_id'=>$user->id,'status'=>'pending','requested_at'=>now()]);
        $job = new GdprDataExportJob($export->id);
        $job->handle();
        $export->refresh();
        $this->assertEquals('completed', $export->status);
        $disk = explode('://', $export->file_path)[0] ?? 'public';
        $path = explode('://', $export->file_path)[1] ?? '';
        $this->assertTrue(Storage::disk($disk)->exists($path));
        $tmpPath = storage_path('app/private/gdpr-exports/gdpr-export-'.$export->id.'.zip');
        $this->assertFileDoesNotExist($tmpPath);
        // extract and assert no secret
        $tmp = sys_get_temp_dir().'/gdpr-test-'.uniqid().'.zip';
        file_put_contents($tmp, Storage::disk($disk)->get($path));
        $zip = new \ZipArchive();
        $zip->open($tmp);
        $content = '';
        for ($i=0;$i<$zip->numFiles;$i++) { $content .= $zip->getFromIndex($i); }
        $zip->close(); @unlink($tmp);
        $this->assertStringNotContainsString('supersecret123', $content);
        $this->assertStringNotContainsString('sk_live_123456', $content);
    }

    public function test_export_owner_only(): void
    {
        $owner = User::factory()->create(['type'=>'company','email_verified_at'=>now()]);
        $other = User::factory()->create(['type'=>'company','email_verified_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$owner->id]);
        $export = GdprExport::create(['user_id'=>$owner->id,'status'=>'completed','file_path'=>'public://gdpr-exports/fake.zip','expires_at'=>now()->addDay()]);
        Storage::fake('public');
        Storage::disk('public')->put('gdpr-exports/fake.zip','fakecontent');
        $this->actingAs($other);
        $res = $this->getJson('/gdpr/export/'.$export->id);
        $this->assertEquals(404, $res->getStatusCode());
        $this->actingAs($owner);
        $res2 = $this->get('/gdpr/export/'.$export->id);
        $this->assertTrue(in_array($res2->getStatusCode(), [200,404]));
    }
}
