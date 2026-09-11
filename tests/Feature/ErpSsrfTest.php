<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreErpConfig;
use App\Models\User;
use App\Services\ErpSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErpSsrfTest extends TestCase
{
    use RefreshDatabase;

    public function test_blocked_urls(): void
    {
        $this->assertTrue(ErpSyncService::isBlockedUrl('http://localhost/api'));
        $this->assertTrue(ErpSyncService::isBlockedUrl('http://127.0.0.1/test'));
        $this->assertTrue(ErpSyncService::isBlockedUrl('http://169.254.169.254/latest/meta-data/'));
        $this->assertTrue(ErpSyncService::isBlockedUrl('http://192.168.1.1/admin'));
        $this->assertTrue(ErpSyncService::isBlockedUrl('ftp://example.com/file'));
        $this->assertFalse(ErpSyncService::isBlockedUrl('https://api.example.com/v1/products'));
        $this->assertFalse(ErpSyncService::isBlockedUrl('https://erp.example.com/api'));
    }

    public function test_erp_endpoint_validation_blocks_private(): void
    {
        // Endpoint validation runs after the accounting entitlement gate, so the
        // store must be entitled to reach the SSRF url rule (PlanEntitlementEnforcementTest
        // separately covers the 403 path for unentitled stores).
        $plan = Plan::factory()->create([
            'enable_accounting_integration' => 'on',
            'is_trial' => null,
            'trial_day' => 0,
            'is_plan_enable' => 'on',
        ]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now()]);
        $user->forceFill([
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ])->save();
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();
        $this->actingAs($user);
        $res = $this->postJson("/api/stores/{$store->id}/erp", [
            'provider' => 'custom', 'api_endpoint' => 'http://127.0.0.1/evil', 'api_key' => 'k', 'auto_sync_interval' => 'daily'
        ]);
        $this->assertEquals(422, $res->status());
    }
}
