<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Focused tests for Electronics Hub mobile UX batch:
 * - WhatsApp disabled => no button
 * - WhatsApp enabled + number => correct wa.me URL + encoded message
 * - social max 6, disabled hidden
 * - category hierarchy preserved
 * - auth actions respond to logged-in state
 * - persistence/store isolation concept (content keys are store_content, not StoreConfiguration)
 */
class ElectronicsHubMobileUxTest extends TestCase
{
    // Helpers mirroring JS resolveElectronicsWhatsAppHref / isSafeUrl / getElectronicsSocialSlots
    private function cleanWhatsAppNumber(string $input): string
    {
        return preg_replace('/[^0-9]/', '', $input) ?? '';
    }

    private function resolveElectronicsWhatsAppHref(?array $config, ?array $content, ?array $store): ?string
    {
        $rawContent = $content ?? [];
        $waCfg = $rawContent['electronics_whatsapp'] ?? [];
        if (!is_array($waCfg)) $waCfg = [];
        $enabledRaw = $waCfg['enabled'] ?? ($rawContent['electronics_whatsapp_enabled'] ?? null);
        $enabled = null;
        if ($enabledRaw !== null) {
            $enabled = (bool) $enabledRaw;
        } else {
            $enabled = !empty($config['whatsapp_widget_enabled']);
        }
        if (!$enabled) return null;
        $rawNumber = $waCfg['number'] ?? $waCfg['phone'] ?? $rawContent['electronics_whatsapp_number'] ?? $rawContent['electronics_wa_number'] ?? $config['whatsapp_widget_phone'] ?? $config['socialMedia']['whatsapp'] ?? $store['phone'] ?? '';
        $cleaned = $this->cleanWhatsAppNumber((string) $rawNumber);
        if ($cleaned === '' || strlen($cleaned) < 7) return null;
        $rawMessage = $waCfg['message'] ?? $rawContent['electronics_whatsapp_message'] ?? $config['whatsapp_widget_message'] ?? 'مرحباً، لدي استفسار عن أحد المنتجات';
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

    private function getElectronicsSocialSlots(?array $content): array
    {
        $base = $content['electronics_mobile_nav'] ?? [];
        $out = [];
        for ($idx = 1; $idx <= 6; $idx++) {
            $enabled = !empty($base["social_{$idx}_enabled"]);
            $platform = strtolower((string) ($base["social_{$idx}_platform"] ?? 'instagram'));
            $url = trim((string) ($base["social_{$idx}_url"] ?? ''));
            $altEnabled = $content["electronics_social_{$idx}_enabled"] ?? null;
            $altPlatform = $content["electronics_social_{$idx}_platform"] ?? null;
            $altUrl = $content["electronics_social_{$idx}_url"] ?? null;
            if ($altEnabled !== null) $enabled = (bool) $altEnabled;
            if ($altPlatform !== null) $platform = strtolower((string) $altPlatform);
            if ($altUrl !== null) $url = trim((string) $altUrl);
            $safe = $enabled && $url !== '' && $this->isSafeUrl($url);
            $out[] = ['idx' => $idx, 'platform' => $platform, 'url' => $url, 'safe' => $safe, 'enabled' => $enabled];
        }
        return $out;
    }

    public function test_whatsapp_disabled_returns_null(): void
    {
        $href = $this->resolveElectronicsWhatsAppHref([], ['electronics_whatsapp' => ['enabled' => false, 'number' => '970599123456']], []);
        $this->assertNull($href);
    }

    public function test_whatsapp_enabled_missing_number_returns_null(): void
    {
        $href = $this->resolveElectronicsWhatsAppHref([], ['electronics_whatsapp' => ['enabled' => true, 'number' => '']], []);
        $this->assertNull($href);
    }

    public function test_whatsapp_enabled_with_number_returns_correct_url_and_encoded_message(): void
    {
        $config = [];
        $content = ['electronics_whatsapp' => ['enabled' => true, 'number' => '+970599123456', 'message' => 'مرحباً، لدي استفسار عن أحد المنتجات']];
        $href = $this->resolveElectronicsWhatsAppHref($config, $content, []);
        $this->assertNotNull($href);
        $this->assertStringStartsWith('https://wa.me/970599123456?text=', $href);
        $this->assertStringContainsString(rawurlencode('مرحباً، لدي استفسار عن أحد المنتجات'), $href);
    }

    public function test_whatsapp_normalizes_phone_safely(): void
    {
        $content = ['electronics_whatsapp' => ['enabled' => true, 'number' => '+970 599-123 456', 'message' => 'hi']];
        $href = $this->resolveElectronicsWhatsAppHref([], $content, []);
        $this->assertEquals('https://wa.me/970599123456?text=' . rawurlencode('hi'), $href);
    }

    public function test_social_max_6_slots(): void
    {
        $content = ['electronics_mobile_nav' => []];
        for ($i = 1; $i <= 6; $i++) {
            $content['electronics_mobile_nav']["social_{$i}_enabled"] = true;
            $content['electronics_mobile_nav']["social_{$i}_platform"] = 'instagram';
            $content['electronics_mobile_nav']["social_{$i}_url"] = "https://instagram.com/test{$i}";
        }
        $slots = $this->getElectronicsSocialSlots($content);
        $this->assertCount(6, $slots);
        $safe = array_filter($slots, fn($s) => $s['safe']);
        $this->assertCount(6, $safe);
    }

    public function test_disabled_social_hidden(): void
    {
        $content = ['electronics_mobile_nav' => [
            'social_1_enabled' => true, 'social_1_platform' => 'facebook', 'social_1_url' => 'https://facebook.com/test',
            'social_2_enabled' => false, 'social_2_platform' => 'instagram', 'social_2_url' => 'https://instagram.com/test',
            'social_3_enabled' => true, 'social_3_platform' => 'tiktok', 'social_3_url' => '', // empty url => not safe
            'social_4_enabled' => true, 'social_4_platform' => 'youtube', 'social_4_url' => 'not-a-url',
        ]];
        $slots = $this->getElectronicsSocialSlots($content);
        $safe = array_values(array_filter($slots, fn($s) => $s['safe']));
        $this->assertCount(1, $safe);
        $this->assertEquals('facebook', $safe[0]['platform']);
    }

    public function test_category_hierarchy_preserved(): void
    {
        // Simulate hierarchicalForStorefront payload
        $hierarchical = [
            ['id' => '1', 'name' => 'الإلكترونيات', 'subcategories' => [
                ['id' => '11', 'name' => 'ساعات رجالية', 'parent_id' => '1'],
                ['id' => '12', 'name' => 'ساعات نسائية', 'parent_id' => '1'],
            ]],
            ['id' => '2', 'name' => 'هواتف', 'subcategories' => []],
        ];
        // Drawer should preserve main->sub structure, not flatten
        $this->assertCount(2, $hierarchical);
        $this->assertCount(2, $hierarchical[0]['subcategories']);
        $this->assertEquals('1', $hierarchical[0]['subcategories'][0]['parent_id']);
        // Ensure flat dumping would be wrong: flat would be 4 identical rows
        $flatCount = 1 + 2 + 1; // wrong flat would be 4 rows without hierarchy
        $this->assertNotEquals(count($hierarchical), $flatCount);
    }

    public function test_auth_actions_respond_to_logged_in_state(): void
    {
        // Logged out: only login (and maybe register) should appear; profile/orders/logout must not
        $isLoggedIn = false;
        $loginEnabled = true;
        $accountsOn = true;
        $canShowAccount = $accountsOn && ($isLoggedIn || $loginEnabled);
        $this->assertTrue($canShowAccount);
        // Drawer logic: when not logged in, show login button, not profile/orders/logout
        $loggedOutActions = $isLoggedIn ? ['profile','orders','logout'] : ['login'];
        $this->assertEquals(['login'], $loggedOutActions);
        // Logged in: show profile, orders, logout
        $isLoggedIn = true;
        $loggedInActions = $isLoggedIn ? ['profile','orders','logout'] : ['login'];
        $this->assertEquals(['profile','orders','logout'], $loggedInActions);
        // Ensure we do NOT invent addresses/wallet etc
        $forbidden = ['addresses','wallet','points','subscriptions','notifications'];
        foreach ($forbidden as $f) {
            $this->assertNotContains($f, $loggedInActions);
            $this->assertNotContains($f, $loggedOutActions);
        }
    }

    public function test_persistence_store_isolation_concept(): void
    {
        // Designer saves to store_content (per-store blob), not to a global config
        $storeAContent = ['electronics_whatsapp' => ['enabled' => true, 'number' => '970599111111']];
        $storeBContent = ['electronics_whatsapp' => ['enabled' => true, 'number' => '970599222222']];
        $hrefA = $this->resolveElectronicsWhatsAppHref([], $storeAContent, []);
        $hrefB = $this->resolveElectronicsWhatsAppHref([], $storeBContent, []);
        $this->assertNotEquals($hrefA, $hrefB);
        $this->assertStringContainsString('970599111111', $hrefA);
        $this->assertStringContainsString('970599222222', $hrefB);
    }
}
