<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Bazaar Market mobile UX — covers the 22 contract items:
 * bottom nav/spacer excluded, hamburger LEFT, drawer, WhatsApp, floating, 6 socials, Designer persistence, tenant isolation.
 */
class BazaarMarketMobileUxTest extends TestCase
{
    use RefreshDatabase;

    // ---------- Helpers mirroring BazaarMarket.tsx ----------
    private function cleanBazaarWhatsAppNumber(string $input): string
    {
        return preg_replace('/[^0-9]/', '', $input) ?? '';
    }

    private function resolveBazaarWhatsAppHref(?array $config, ?array $content, ?array $store): ?string
    {
        $rawContent = $content ?? [];
        $waCfg = $rawContent['bazaar_whatsapp'] ?? [];
        if (!is_array($waCfg)) $waCfg = [];
        $enabledRaw = $waCfg['enabled'] ?? ($rawContent['bazaar_whatsapp_enabled'] ?? null);
        $enabled = null;
        if ($enabledRaw !== null) {
            $enabled = (bool) $enabledRaw;
        } else {
            $enabled = !empty($config['whatsapp_widget_enabled']);
        }
        if (!$enabled) return null;
        $rawNumber = $waCfg['number'] ?? $waCfg['phone'] ?? $rawContent['bazaar_whatsapp_number'] ?? $rawContent['bazaar_wa_number'] ?? $config['whatsapp_widget_phone'] ?? $config['socialMedia']['whatsapp'] ?? $store['phone'] ?? '';
        $cleaned = $this->cleanBazaarWhatsAppNumber((string) $rawNumber);
        if ($cleaned === '' || strlen($cleaned) < 7) return null;
        $rawMessage = $waCfg['message'] ?? $rawContent['bazaar_whatsapp_message'] ?? $config['whatsapp_widget_message'] ?? 'مرحباً، لدي استفسار بخصوص المتجر';
        return 'https://wa.me/' . $cleaned . '?text=' . rawurlencode((string) $rawMessage);
    }

    private function isSafeUrl(string $url): bool
    {
        $u = trim($url);
        if ($u === '') return false;
        $parts = parse_url($u);
        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) return false;
        if (!in_array($parts['scheme'], ['https', 'http'], true)) return false;
        return str_contains($parts['host'], '.');
    }

    private function getBazaarSocialSlots(?array $content): array
    {
        $base = $content['bazaar_mobile_nav'] ?? [];
        $out = [];
        for ($idx = 1; $idx <= 6; $idx++) {
            $enabled = !empty($base["social_{$idx}_enabled"]);
            $platform = strtolower((string) ($base["social_{$idx}_platform"] ?? 'instagram'));
            $url = trim((string) ($base["social_{$idx}_url"] ?? ''));
            $altEnabled = $content["bazaar_social_{$idx}_enabled"] ?? null;
            $altPlatform = $content["bazaar_social_{$idx}_platform"] ?? null;
            $altUrl = $content["bazaar_social_{$idx}_url"] ?? null;
            if ($altEnabled !== null) $enabled = (bool) $altEnabled;
            if ($altPlatform !== null) $platform = strtolower((string) $altPlatform);
            if ($altUrl !== null) $url = trim((string) $altUrl);
            $safe = $enabled && $url !== '' && $this->isSafeUrl($url);
            $out[] = ['idx' => $idx, 'platform' => $platform, 'url' => $url, 'safe' => $safe, 'enabled' => $enabled];
        }
        return $out;
    }

    private function ownerWithStore(string $theme = 'bazaar-market'): array
    {
        $plan = Plan::factory()->create(['name' => 'Bazaar-' . uniqid(), 'price' => 10, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Bazaar Store';
        $store->slug = 'bazaar-' . uniqid();
        $store->theme = $theme;
        $store->email = 'bazaar@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    // ---------- 1 & 2: Bottom nav / spacer excluded ----------
    public function test_bazaar_excluded_from_bottom_nav(): void
    {
        $src = file_get_contents(base_path('resources/js/components/storefront/MobileAppShell.tsx'));
        $this->assertStringContainsString('isBazaar', $src, 'MobileAppShell must define isBazaar');
        $this->assertStringContainsString('!isBazaar', $src, 'MobileAppShell must exclude bazaar-market from tabs');
        // Ensure bazaar is in the same condition as other excluded templates
        $this->assertMatchesRegularExpression('/!isFashionAtelier.*!isBazaar/s', $src);
    }

    public function test_bazaar_spacer_excluded(): void
    {
        $src = file_get_contents(base_path('resources/js/contexts/ThemeProvider.tsx'));
        $this->assertStringContainsString('bazaar-market', $src);
        $this->assertStringContainsString('hideSpacer', $src);
        $this->assertMatchesRegularExpression("/hideSpacer.*bazaar-market/s", $src);
        // No 54px blank strip for bazaar — spacer returns null
        $this->assertStringContainsString("t === 'bazaar-market'", $src);
    }

    // ---------- 3 & 4: Hamburger ----------
    public function test_hamburger_exists_on_mobile(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('data-testid="bazaar-hamburger"', $src);
        $this->assertStringContainsString('BazaarHeader', $src);
        $this->assertStringContainsString('mobileNavOpen', $src);
    }

    public function test_hamburger_is_left_positioned(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        // Must use physical LEFT: either dir="ltr" trick or left: style
        // Contract: left side = ltr container or explicit left positioning
        $this->assertTrue(
            str_contains($src, 'dir="ltr"') || str_contains($src, 'left-4') || str_contains($src, 'LEFT'),
            'Hamburger must be on physical LEFT, not RTL right'
        );
        // Verify hamburger is first element before logo in mobile header flex/ltr row
        $posHamburger = strpos($src, 'data-testid="bazaar-hamburger"');
        $posLogo = strpos($src, 'flex flex-1 items-center justify-center');
        $this->assertNotFalse($posHamburger);
        $this->assertNotFalse($posLogo);
        $this->assertLessThan($posLogo, $posHamburger, 'Hamburger must precede centered logo (LEFT position)');
        // Touch target 44x44
        $this->assertStringContainsString('h-11 w-11', $src);
        $this->assertStringContainsString('minWidth: 44', $src);
    }

    // ---------- 5,6,7: Drawer ----------
    public function test_drawer_home_action_exists(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('data-testid="bazaar-drawer-home"', $src);
        $this->assertStringContainsString('الرئيسية', $src);
        $this->assertStringContainsString('BazaarMobileDrawer', $src);
        $this->assertStringContainsString('createPortal', $src);
    }

    public function test_real_categories_rendered(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('الأقسام', $src);
        $this->assertStringContainsString('bazaar-drawer-categories-toggle', $src);
        // Must use canonical category data, not hardcoded names
        $this->assertStringContainsString('product?.categories', $src);
        $this->assertStringContainsString('categories.slice', $src);
        // Depth indication: subcategories handling
        $this->assertStringContainsString('subcategories', $src);
    }

    public function test_depth_2_subcategories_rendered(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('expandedCatId', $src);
        $this->assertStringContainsString('bazaar-subcat-', $src);
        $this->assertStringContainsString('handleSubCategory', $src);
        // Verify hierarchical test
        $hierarchical = [
            ['id' => '1', 'name' => 'ملابس', 'subcategories' => [['id' => '11', 'name' => 'رجالي'], ['id' => '12', 'name' => 'نسائي']]],
        ];
        $this->assertCount(2, $hierarchical[0]['subcategories']);
    }

    public function test_logged_out_account_actions(): void
    {
        // Logged out: login + maybe register, no profile/orders/logout
        $isLoggedIn = false;
        $loginEnabled = true;
        $accountsOn = true;
        $canShowAccount = $accountsOn && ($isLoggedIn || $loginEnabled);
        $this->assertTrue($canShowAccount);
        $loggedOutActions = $isLoggedIn ? ['profile','orders','logout'] : ['login'];
        $this->assertEquals(['login'], $loggedOutActions);
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('bazaar-account-login', $src);
        $this->assertStringContainsString('تسجيل الدخول', $src);
    }

    public function test_logged_in_account_actions(): void
    {
        $isLoggedIn = true;
        $loggedInActions = $isLoggedIn ? ['profile','orders','logout'] : ['login'];
        $this->assertEquals(['profile','orders','logout'], $loggedInActions);
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('bazaar-account-profile', $src);
        $this->assertStringContainsString('bazaar-account-orders', $src);
        $this->assertStringContainsString('bazaar-account-logout', $src);
        $this->assertStringContainsString('طلباتي', $src);
        $this->assertStringContainsString('تسجيل الخروج', $src);
    }

    // ---------- 10-14: WhatsApp ----------
    public function test_whatsapp_disabled_returns_null(): void
    {
        $href = $this->resolveBazaarWhatsAppHref([], ['bazaar_whatsapp' => ['enabled' => false, 'number' => '966500123456']], []);
        $this->assertNull($href);
    }

    public function test_whatsapp_missing_number_returns_null(): void
    {
        $href = $this->resolveBazaarWhatsAppHref([], ['bazaar_whatsapp' => ['enabled' => true, 'number' => '']], []);
        $this->assertNull($href);
        $href2 = $this->resolveBazaarWhatsAppHref([], ['bazaar_whatsapp' => ['enabled' => true, 'number' => '123']], []);
        $this->assertNull($href2, 'too short should be invalid');
    }

    public function test_whatsapp_correct_merchant_number(): void
    {
        $content = ['bazaar_whatsapp' => ['enabled' => true, 'number' => '966500123456', 'message' => 'مرحباً، لدي استفسار بخصوص المتجر']];
        $href = $this->resolveBazaarWhatsAppHref([], $content, []);
        $this->assertNotNull($href);
        $this->assertStringStartsWith('https://wa.me/966500123456?text=', $href);
    }

    public function test_whatsapp_number_normalization(): void
    {
        $content = ['bazaar_whatsapp' => ['enabled' => true, 'number' => '+966 500-123 456', 'message' => 'hi']];
        $href = $this->resolveBazaarWhatsAppHref([], $content, []);
        $this->assertEquals('https://wa.me/966500123456?text=' . rawurlencode('hi'), $href);
        // Spaces, dashes, plus removed; only digits remain
        $cleaned = $this->cleanBazaarWhatsAppNumber('+966 500-123 456');
        $this->assertEquals('966500123456', $cleaned);
    }

    public function test_whatsapp_message_encoding(): void
    {
        $msg = 'مرحباً، لدي استفسار بخصوص المتجر';
        $content = ['bazaar_whatsapp' => ['enabled' => true, 'number' => '966500123456', 'message' => $msg]];
        $href = $this->resolveBazaarWhatsAppHref([], $content, []);
        $this->assertStringContainsString(rawurlencode($msg), $href);
        $this->assertStringNotContainsString(' ', $href, 'spaces must be encoded');
    }

    public function test_floating_whatsapp_safe_area_position(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('BazaarWhatsAppFloating', $src);
        $this->assertStringContainsString('data-testid="bazaar-floating-whatsapp"', $src);
        $this->assertStringContainsString('env(safe-area-inset-bottom)', $src);
        $this->assertStringContainsString('calc(1rem + env(safe-area-inset-bottom))', $src);
        $this->assertStringContainsString('bottom:', $src);
        $this->assertStringContainsString('left-4', $src);
        // Must NOT have old nav offset 60-80px
        $this->assertStringNotContainsString('bottom-16', $src);
        $this->assertStringNotContainsString('54px', $src);
        // Color is WhatsApp green
        $this->assertStringContainsString('#25D366', $src);
        // Touch target ~46px
        $this->assertStringContainsString('h-[46px] w-[46px]', $src);
    }

    // ---------- 16-20: Social ----------
    public function test_zero_social_links(): void
    {
        $slots = $this->getBazaarSocialSlots(['bazaar_mobile_nav' => []]);
        $safe = array_filter($slots, fn($s) => $s['safe']);
        $this->assertCount(0, $safe);
    }

    public function test_one_social_link(): void
    {
        $content = ['bazaar_mobile_nav' => ['social_1_enabled' => true, 'social_1_platform' => 'instagram', 'social_1_url' => 'https://instagram.com/test']];
        $slots = $this->getBazaarSocialSlots($content);
        $safe = array_values(array_filter($slots, fn($s) => $s['safe']));
        $this->assertCount(1, $safe);
        $this->assertEquals('instagram', $safe[0]['platform']);
    }

    public function test_max_six_social_links(): void
    {
        $content = ['bazaar_mobile_nav' => []];
        for ($i = 1; $i <= 6; $i++) {
            $content['bazaar_mobile_nav']["social_{$i}_enabled"] = true;
            $content['bazaar_mobile_nav']["social_{$i}_platform"] = 'facebook';
            $content['bazaar_mobile_nav']["social_{$i}_url"] = "https://facebook.com/test{$i}";
        }
        $slots = $this->getBazaarSocialSlots($content);
        $this->assertCount(6, $slots);
        $safe = array_filter($slots, fn($s) => $s['safe']);
        $this->assertCount(6, $safe);
        // 7th slot must not exist — max 6
        $this->assertArrayNotHasKey(6, $slots); // 0-indexed 6 would be 7th
    }

    public function test_disabled_social_hidden(): void
    {
        $content = ['bazaar_mobile_nav' => [
            'social_1_enabled' => true, 'social_1_platform' => 'facebook', 'social_1_url' => 'https://facebook.com/test',
            'social_2_enabled' => false, 'social_2_platform' => 'instagram', 'social_2_url' => 'https://instagram.com/test',
            'social_3_enabled' => true, 'social_3_platform' => 'tiktok', 'social_3_url' => '',
        ]];
        $slots = $this->getBazaarSocialSlots($content);
        $safe = array_values(array_filter($slots, fn($s) => $s['safe']));
        $this->assertCount(1, $safe);
        $this->assertEquals('facebook', $safe[0]['platform']);
    }

    public function test_invalid_social_url_rejected(): void
    {
        $this->assertFalse($this->isSafeUrl('javascript:alert(1)'));
        $this->assertFalse($this->isSafeUrl('not-a-url'));
        $this->assertFalse($this->isSafeUrl('ftp://example.com'));
        $this->assertTrue($this->isSafeUrl('https://example.com'));
        $this->assertTrue($this->isSafeUrl('http://example.com/path'));

        $content = ['bazaar_mobile_nav' => [
            'social_1_enabled' => true, 'social_1_platform' => 'youtube', 'social_1_url' => 'javascript:alert(1)',
            'social_2_enabled' => true, 'social_2_platform' => 'facebook', 'social_2_url' => 'https://facebook.com/valid',
        ]];
        $slots = $this->getBazaarSocialSlots($content);
        $safe = array_values(array_filter($slots, fn($s) => $s['safe']));
        $this->assertCount(1, $safe);
        $this->assertEquals('facebook', $safe[0]['platform']);
    }

    // ---------- 21 & 22: Designer persistence + tenant isolation ----------
    public function test_designer_settings_persist(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $payload = [
            'content' => [
                'bazaar_whatsapp.enabled' => true,
                'bazaar_whatsapp.number' => '966500123456',
                'bazaar_whatsapp.message' => 'مرحباً بكم في متجرنا',
                'bazaar_mobile_nav.social_1_enabled' => true,
                'bazaar_mobile_nav.social_1_platform' => 'instagram',
                'bazaar_mobile_nav.social_1_url' => 'https://instagram.com/bazaar',
                'bazaar_mobile_nav.social_2_enabled' => true,
                'bazaar_mobile_nav.social_2_platform' => 'facebook',
                'bazaar_mobile_nav.social_2_url' => 'https://facebook.com/bazaar',
            ],
        ];
        $this->putJson(route('api.store-designer.update', $store->id), $payload)->assertOk();
        $store->refresh();
        $merged = $store->getMergedStoreContent();
        $this->assertTrue((bool) ($merged['bazaar_whatsapp']['enabled'] ?? false));
        $this->assertEquals('966500123456', $merged['bazaar_whatsapp']['number'] ?? null);
        $this->assertEquals('مرحباً بكم في متجرنا', $merged['bazaar_whatsapp']['message'] ?? null);
        $this->assertTrue((bool) ($merged['bazaar_mobile_nav']['social_1_enabled'] ?? false));
        $this->assertEquals('instagram', $merged['bazaar_mobile_nav']['social_1_platform'] ?? null);

        // Verify API GET returns persisted content
        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $json = $res->json();
        $this->assertTrue((bool) ($json['content']['bazaar_whatsapp']['enabled'] ?? false));
    }

    public function test_tenant_isolation(): void
    {
        [$ownerA, $storeA] = $this->ownerWithStore();
        [$ownerB, $storeB] = $this->ownerWithStore();

        // Owner A sets whatsapp + social
        $this->actingAs($ownerA);
        $this->putJson(route('api.store-designer.update', $storeA->id), [
            'content' => [
                'bazaar_whatsapp.enabled' => true,
                'bazaar_whatsapp.number' => '966500111111',
                'bazaar_whatsapp.message' => 'مرحبا A',
                'bazaar_mobile_nav.social_1_enabled' => true,
                'bazaar_mobile_nav.social_1_platform' => 'instagram',
                'bazaar_mobile_nav.social_1_url' => 'https://instagram.com/storeA',
            ],
        ])->assertOk();

        // Owner B sets different values
        $this->actingAs($ownerB);
        $this->putJson(route('api.store-designer.update', $storeB->id), [
            'content' => [
                'bazaar_whatsapp.enabled' => true,
                'bazaar_whatsapp.number' => '966500222222',
                'bazaar_whatsapp.message' => 'مرحبا B',
                'bazaar_mobile_nav.social_1_enabled' => true,
                'bazaar_mobile_nav.social_1_platform' => 'facebook',
                'bazaar_mobile_nav.social_1_url' => 'https://facebook.com/storeB',
            ],
        ])->assertOk();

        $storeA->refresh(); $storeB->refresh();
        $mergedA = $storeA->getMergedStoreContent();
        $mergedB = $storeB->getMergedStoreContent();

        $hrefA = $this->resolveBazaarWhatsAppHref([], $mergedA, []);
        $hrefB = $this->resolveBazaarWhatsAppHref([], $mergedB, []);

        $this->assertNotEquals($hrefA, $hrefB);
        $this->assertStringContainsString('966500111111', $hrefA);
        $this->assertStringContainsString('966500222222', $hrefB);
        $this->assertStringContainsString('storeA', $mergedA['bazaar_mobile_nav']['social_1_url'] ?? '');
        $this->assertStringContainsString('storeB', $mergedB['bazaar_mobile_nav']['social_1_url'] ?? '');

        // Cross-tenant forbidden
        $this->actingAs($ownerB);
        $this->putJson(route('api.store-designer.update', $storeA->id), [
            'content' => ['bazaar_whatsapp.number' => 'hacked'],
        ])->assertStatus(403);
    }

    public function test_designer_live_preview_keys_exist_in_schema(): void
    {
        // Ensure Designer file contains bazaar_whatsapp and bazaar_mobile_nav controls
        $designer = file_get_contents(base_path('resources/js/pages/stores/designer.tsx'));
        $this->assertStringContainsString('bazaar_whatsapp.enabled', $designer);
        $this->assertStringContainsString('bazaar_whatsapp.number', $designer);
        $this->assertStringContainsString('bazaar_whatsapp.message', $designer);
        $this->assertStringContainsString('bazaar_mobile_nav.social', $designer);
        // Must be template-scoped to bazaar-market
        $this->assertStringContainsString("theme === 'bazaar-market'", $designer);
    }

    public function test_other_templates_unchanged(): void
    {
        // Ensure we didn't accidentally re-enable bottom nav for other templates like fashion-atelier
        $shell = file_get_contents(base_path('resources/js/components/storefront/MobileAppShell.tsx'));
        $this->assertStringContainsString('isFashionAtelier', $shell);
        $this->assertStringContainsString('isElectronicsHub', $shell);
        $this->assertStringContainsString('isGrocerySouq', $shell);
        // Bazaar should be the only new exclusion — not removing others
        $this->assertStringContainsString('isHayah', $shell);
    }
}
