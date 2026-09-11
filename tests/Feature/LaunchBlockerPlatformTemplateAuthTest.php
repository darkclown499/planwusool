<?php

namespace Tests\Feature;

use App\Models\EmailTemplate;
use App\Models\Notification;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Launch blocker P0-2 / P0-3: platform email & notification template routes
 * must be restricted to the canonical platform-administration roles
 * (EnsurePlatformAdmin: type === 'superadmin' || type === 'admin').
 *
 * Ordinary merchants and merchant staff must never read or mutate the
 * platform-wide transactional templates that affect all stores.
 */
class LaunchBlockerPlatformTemplateAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function makePlan(array $over = []): Plan
    {
        return Plan::factory()->create(array_merge([
            'name' => 'Pro-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ], $over));
    }

    private function merchant(): User
    {
        $plan = $this->makePlan();
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function staffFor(User $company): User
    {
        $user = User::factory()->create([
            'type' => 'staff',
            'created_by' => $company->id,
            'current_store' => getCurrentStoreId($company) ?: Store::factory()->create(['user_id' => $company->id])->id,
            'email_verified_at' => now(),
        ]);
        return $user->fresh();
    }

    private function platformAdmin(string $type = 'superadmin'): User
    {
        $plan = $this->makePlan();
        return User::factory()->create([
            'type' => $type,
            'plan_id' => $plan->id,
            'email_verified_at' => now(),
        ]);
    }

    private function makeEmailTemplate(): EmailTemplate
    {
        return EmailTemplate::create([
            'name' => 'Order Created '.uniqid(),
            'from' => 'no-reply@'.uniqid().'.test',
            'user_id' => 1,
        ]);
    }

    private function makeNotification(): Notification
    {
        return Notification::create([
            'type' => 'sms',
            'action' => 'order_'.Str::slug(uniqid()),
            'status' => 'on',
        ]);
    }

    // ================= GUEST =================

    public function test_guest_is_redirected_to_login_for_email_templates(): void
    {
        $template = $this->makeEmailTemplate();
        $this->get(route('email-templates.show', $template->id))->assertStatus(302);
    }

    // ================= MERCHANT DENIED =================

    public function test_merchant_cannot_view_email_template(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->merchant())
            ->get(route('email-templates.show', $template->id))
            ->assertForbidden();
    }

    public function test_merchant_cannot_update_email_template_settings(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->merchant())
            ->put(route('email-templates.update-settings', $template->id), ['from' => 'evil@example.com'])
            ->assertForbidden();
    }

    public function test_merchant_cannot_update_email_template_content(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->merchant())
            ->put(route('email-templates.update-content', $template->id), [
                'lang' => 'ar',
                'subject' => 'HACKED',
                'content' => '<p>phishing</p>',
            ])
            ->assertForbidden();
    }

    public function test_merchant_cannot_preview_email_template(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->merchant())
            ->get(route('email-templates.preview', $template->id))
            ->assertForbidden();
    }

    public function test_merchant_cannot_get_email_template_variables(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->merchant())
            ->get(route('email-templates.variables', $template->id))
            ->assertForbidden();
    }

    public function test_merchant_cannot_view_email_template_index(): void
    {
        $this->actingAs($this->merchant())
            ->get(route('email-templates.index'))
            ->assertForbidden();
    }

    public function test_merchant_cannot_view_notification_template(): void
    {
        $notification = $this->makeNotification();
        $this->actingAs($this->merchant())
            ->get(route('notification-templates.show', $notification->id))
            ->assertForbidden();
    }

    public function test_merchant_cannot_update_notification_template(): void
    {
        $notification = $this->makeNotification();
        $this->actingAs($this->merchant())
            ->put(route('notification-templates.update', $notification->id), [
                'status' => 'on',
                'templates' => [['lang' => 'ar', 'content' => 'SMS PHISHING LINK']],
            ])
            ->assertForbidden();
    }

    public function test_merchant_cannot_view_notification_template_index(): void
    {
        $this->actingAs($this->merchant())
            ->get(route('notification-templates.index'))
            ->assertForbidden();
    }

    // ================= STAFF DENIED =================

    public function test_merchant_staff_cannot_view_email_template(): void
    {
        $merchant = $this->merchant();
        $staff = $this->staffFor($merchant);
        $template = $this->makeEmailTemplate();
        $this->actingAs($staff)
            ->get(route('email-templates.show', $template->id))
            ->assertForbidden();
    }

    public function test_merchant_staff_cannot_update_notification_template(): void
    {
        $merchant = $this->merchant();
        $staff = $this->staffFor($merchant);
        $notification = $this->makeNotification();
        $this->actingAs($staff)
            ->put(route('notification-templates.update', $notification->id), [
                'status' => 'on',
                'templates' => [['lang' => 'ar', 'content' => 'X']],
            ])
            ->assertForbidden();
    }

    // ================= PLATFORM ADMIN ALLOWED =================

    public function test_superadmin_can_view_email_template(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->platformAdmin('superadmin'))
            ->get(route('email-templates.show', $template->id))
            ->assertOk();
    }

    public function test_superadmin_can_update_email_template_settings(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->platformAdmin('superadmin'))
            ->put(route('email-templates.update-settings', $template->id), ['from' => 'fixed@example.com'])
            ->assertStatus(302);
    }

    public function test_superadmin_can_update_email_template_content(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->platformAdmin('superadmin'))
            ->put(route('email-templates.update-content', $template->id), [
                'lang' => 'ar',
                'subject' => 'New Subject',
                'content' => '<p>ok</p>',
            ])
            ->assertStatus(302);
    }

    public function test_superadmin_can_view_notification_template(): void
    {
        $notification = $this->makeNotification();
        $this->actingAs($this->platformAdmin('superadmin'))
            ->get(route('notification-templates.show', $notification->id))
            ->assertOk();
    }

    public function test_superadmin_can_update_notification_template(): void
    {
        $notification = $this->makeNotification();
        $this->actingAs($this->platformAdmin('superadmin'))
            ->put(route('notification-templates.update', $notification->id), [
                'status' => 'on',
                'templates' => [['lang' => 'ar', 'content' => 'OK']],
            ])
            ->assertStatus(302);
    }

    public function test_admin_type_can_view_email_template(): void
    {
        $template = $this->makeEmailTemplate();
        $this->actingAs($this->platformAdmin('admin'))
            ->get(route('email-templates.show', $template->id))
            ->assertOk();
    }
}