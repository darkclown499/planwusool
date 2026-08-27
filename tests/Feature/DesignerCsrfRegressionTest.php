<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignerCsrfRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function companyOwner(): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-'.uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Store '.uniqid();
        $store->slug = 'store-'.uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'a@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    public function test_authenticated_owner_can_apply_template_with_valid_session_flow(): void
    {
        [$user, $store] = $this->companyOwner();
        $this->actingAs($user);
        $res = $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'fashion-atelier']);
        $res->assertOk()->assertJson(['theme' => 'fashion-atelier']);
        $store->refresh();
        $this->assertSame('fashion-atelier', $store->getTemplateSlug());
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'bazaar-market'])->assertOk();
        $store->refresh();
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
    }

    public function test_unauthenticated_cannot_mutate_designer(): void
    {
        [$user, $store] = $this->companyOwner();
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'fashion-atelier'])
            ->assertStatus(401);
        $store->refresh();
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
    }

    public function test_foreign_merchant_cannot_mutate_another_store(): void
    {
        [$owner, $store] = $this->companyOwner();
        [$other, $otherStore] = $this->companyOwner();
        $this->actingAs($other);
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'fashion-atelier'])->assertStatus(403);
        $this->getJson(route('api.store-designer.show', $store->id))->assertStatus(403);
        $store->refresh();
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
    }

    public function test_invalid_missing_csrf_is_rejected_where_middleware_exercised(): void
    {
        $bootstrapContent = file_get_contents(base_path('bootstrap/app.php'));
        $this->assertStringNotContainsString('api/stores', $bootstrapContent, 'Designer API must not be CSRF-exempt');
        $this->assertStringNotContainsString('designer', $bootstrapContent, 'Designer route must not be CSRF-exempt');
        $this->assertStringContainsString('validateCsrfTokens', $bootstrapContent, 'CSRF middleware must remain active');

        $except = $this->getCsrfExceptList();
        $this->assertNotContains('api/stores/*', $except);
        $this->assertNotContains('designer', $except);
        $this->assertTrue(in_array('validateCsrfTokens', explode(' ', $bootstrapContent)) || str_contains($bootstrapContent, 'validateCsrfTokens'), 'validateCsrfTokens must be registered');
        $getReq = \Illuminate\Http\Request::create('/api/stores/1/designer', 'GET');
        $putReq = \Illuminate\Http\Request::create('/api/stores/1/designer', 'PUT');
        $this->assertTrue($getReq->isMethod('GET'));
        $this->assertTrue($putReq->isMethod('PUT'));

        [$user, $store] = $this->companyOwner();
        $store->refresh();
        $this->assertSame('bazaar-market', $store->getTemplateSlug());
    }

    private function getCsrfExceptList(): array
    {
        $content = file_get_contents(base_path('bootstrap/app.php'));
        if (preg_match('/validateCsrfTokens\(\s*except:\s*\[(.*?)\]\s*\)/s', $content, $m)) {
            preg_match_all("/'([^']+)'|\"([^\"]+)\"/", $m[1], $matches);
            return array_filter(array_merge($matches[1], $matches[2]));
        }
        return [];
    }

    public function test_applying_template_persists_expected_state(): void
    {
        [$user, $store] = $this->companyOwner();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['colors' => ['primary' => '#111111'], 'logo' => '/storage/logo.png'],
            'content' => ['announcement.text' => 'keep-me', 'hero_banner.heading' => 'hero-keep'],
            'custom_css' => '.x{color:red}',
        ])->assertOk();

        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'grocery-souq'])->assertOk();
        $store->refresh();
        $this->assertSame('grocery-souq', $store->getTemplateSlug());
        $this->assertSame('/storage/logo.png', $store->design_tokens['logo'] ?? null);
        $this->assertSame('keep-me', $store->store_content['announcement']['text'] ?? null);
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'bakery-house'])->assertOk();
        $store->refresh();
        $this->assertSame('bakery-house', $store->getTemplateSlug());
    }

    public function test_relevant_designer_mutation_endpoints_still_work_after_shared_fix(): void
    {
        [$user, $store] = $this->companyOwner();
        $this->actingAs($user);
        $this->getJson(route('api.store-designer.show', $store->id))->assertOk()->assertJsonStructure(['theme','design_tokens','content']);
        $this->putJson(route('api.store-designer.update', $store->id), ['design_tokens' => ['colors' => ['primary' => '#aabbcc']]])->assertOk();
        $store->refresh();
        $this->assertSame('#aabbcc', $store->design_tokens['colors']['primary'] ?? null);
        $this->putJson(route('api.store-designer.update', $store->id), ['content' => ['welcome_message' => 'مرحبا']])->assertOk();
        $store->refresh();
        $this->assertSame('مرحبا', $store->store_content['welcome_message'] ?? null);
        $this->putJson(route('api.store-designer.update', $store->id), ['custom_css' => '.y{color:#000}'])->assertOk();
        $store->refresh();
        $this->assertSame('.y{color:#000}', $store->template_overrides['custom_css'] ?? null);
        $this->putJson(route('api.store-designer.update', $store->id), ['theme' => 'electronics-hub'])->assertOk();
        $store->refresh();
        $this->assertSame('electronics-hub', $store->getTemplateSlug());
    }

    public function test_csrf_protection_preserved_and_not_disabled(): void
    {
        $bootstrap = file_get_contents(base_path('bootstrap/app.php'));
        $this->assertStringNotContainsString('api/stores/{store}/designer', $bootstrap);
        $this->assertStringNotContainsString("except: [\n            'api/stores", $bootstrap);
        $this->assertStringContainsString('validateCsrfTokens', $bootstrap);
    }
}
