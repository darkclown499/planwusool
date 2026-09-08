<?php

namespace Tests\Feature;

use App\Http\Controllers\ThemeController;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P4A-03 — STOREFRONT ANNOUNCEMENT SHIPPING TRUTH.
 *
 * The storefront must never ship a hardcoded free-shipping promise
 * ("شحن مجاني للطلبات فوق 250 ₪"). The Atelier announcement bar is now
 * truthful end-to-end:
 *   CASE A — merchant-configured announcement text/items win.
 *   CASE B — with NO merchant content, a REAL free-shipping threshold
 *            (canonical StoreConfiguration business setting honored by the
 *            shipping calculation) is shown exactly, in the store currency.
 *   CASE C — neither exists (or free shipping disabled) → the bar hides.
 */
class AnnouncementShippingTruthTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'P-'.uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Announcement Test';
        $store->slug = $attrs['slug'] ?? 'announce-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'fashion-atelier';
        $store->email = 'announce@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function atelierAnnouncementSource(): string
    {
        return file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AnnouncementBar.tsx'));
    }

    private function behavior(Store $store): array
    {
        $c = new ThemeController();
        $m = new \ReflectionMethod($c, 'getStoreBehavior');
        $m->setAccessible(true);
        return $m->invoke($c, $store);
    }

    // === THE LIE IS GONE FROM SOURCE ===

    public function test_atelier_announcement_has_no_hardcoded_shipping_claim(): void
    {
        $src = $this->atelierAnnouncementSource();
        $this->assertStringNotContainsString('شحن مجاني للطلبات فوق 250', $src, 'the exact hardcoded claim must be gone');
        $this->assertStringNotContainsString('250 ₪', $src, 'no hardcoded 250 threshold with currency');
        $this->assertStringNotContainsString('₪', $src, 'no hardcoded currency symbol — threshold amount must be formatted in the store currency');
    }

    public function test_atelier_announcement_has_no_invented_default_messages(): void
    {
        $src = $this->atelierAnnouncementSource();
        $this->assertStringNotContainsString('DEFAULT_MESSAGES', $src, 'no built-in marketing fallback list');
        $this->assertStringNotContainsString('عروض الصيف', $src, 'no hardcoded summer-sale claim');
        $this->assertStringNotContainsString('تشكيلات جديدة', $src, 'no hardcoded new-arrivals claim');
    }

    // === THE TRUTH IS WIRED TO CANONICAL SOURCES ===

    public function test_atelier_announcement_uses_canonical_threshold_and_currency(): void
    {
        $src = $this->atelierAnnouncementSource();
        $this->assertStringContainsString('resolveFreeShippingThreshold', $src, 'real threshold must come from the canonical storefront resolver');
        $this->assertStringContainsString('usePriceFormatter', $src, 'currency must come from the canonical storefront formatter');
        $this->assertStringContainsString('formatPrice(threshold)', $src, 'the truthful threshold message must be formatted in the store currency');
        $this->assertStringContainsString('return null', $src, 'no merchant content + no real threshold must hide the bar (CASE C)');
    }

    // === CASE A SURVIVES: MERCHANT CONTENT STILL WINS ===

    public function test_atelier_announcement_merchant_content_priority_preserved(): void
    {
        $src = $this->atelierAnnouncementSource();
        // Merchant single text still wins first (designer announcement.text).
        $this->assertStringContainsString('storeAnnouncement.text', $src);
        // Merchant multi-item content still wins next (announcement.items).
        $this->assertStringContainsString('storeAnnouncement.items', $src);
        // Merchant visibility toggle still gates the whole bar.
        $this->assertStringContainsString('storeAnnouncement.enabled', $src);
        $this->assertStringContainsString('effectiveVisible === false', $src);
    }

    public function test_merchant_announcement_text_persists_in_merged_content(): void
    {
        [, $store] = $this->makeStore();
        $store->store_content = ['announcement' => ['text' => 'عرض حصري لعملائنا الكرام']];
        $store->save();

        $merged = $store->getMergedStoreContent();
        $this->assertSame('عرض حصري لعملائنا الكرام', $merged['announcement']['text'] ?? null,
            'merchant announcement text must survive the merge (CASE A)');
        $this->assertTrue($merged['announcement']['enabled'] ?? false,
            'structural default keeps announcement visible until merchant hides it');
    }

    public function test_fresh_store_announcement_is_empty_by_default(): void
    {
        [, $store] = $this->makeStore();
        $merged = $store->getMergedStoreContent();
        $this->assertSame('', $merged['announcement']['text'] ?? null,
            'fresh store must have NO message — nothing for the bar to invent (CASE C guard)');
    }

    // === CASE B + TENANT ISOLATION: BEHAVIOR IS THE CANONICAL TRUTH ===

    public function test_real_threshold_is_canonical_and_store_isolated(): void
    {
        [, $storeA] = $this->makeStore(['slug' => 'fs-a-'.uniqid()]);
        [, $storeB] = $this->makeStore(['slug' => 'fs-b-'.uniqid()]);

        // Store A enables the canonical free-shipping business setting.
        StoreConfiguration::setConfiguration($storeA->id, 'free_shipping_enabled', 'true');
        StoreConfiguration::setConfiguration($storeA->id, 'free_shipping_threshold', '500');

        $bA = $this->behavior($storeA);
        $bB = $this->behavior($storeB);

        $this->assertTrue($bA['free_shipping_enabled'], 'store A must expose its enabled threshold');
        $this->assertSame(500.0, $bA['free_shipping_threshold'], 'store A must expose its exact threshold');

        // Tenant isolation: store B (default OFF, no threshold) must be untouched.
        $this->assertFalse($bB['free_shipping_enabled'], 'store B must not inherit free shipping from store A');
        $this->assertNull($bB['free_shipping_threshold'], 'store B must not inherit threshold from store A');
    }

    public function test_disabled_free_shipping_reports_no_threshold(): void
    {
        [, $store] = $this->makeStore();
        StoreConfiguration::setConfiguration($store->id, 'free_shipping_enabled', 'false');

        $b = $this->behavior($store);
        $this->assertFalse($b['free_shipping_enabled']);
        $this->assertNull($b['free_shipping_threshold']);
    }
}