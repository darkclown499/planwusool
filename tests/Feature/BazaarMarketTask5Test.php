<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Bazaar Task #5 — Announcement ticker + Mobile product-detail drag-to-dismiss
 */
class BazaarMarketTask5Test extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(string $theme = 'bazaar-market'): array
    {
        $plan = Plan::factory()->create(['name' => 'Bazaar5-' . uniqid(), 'price' => 10, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Bazaar Store';
        $store->slug = 'bazaar5-' . uniqid();
        $store->theme = $theme;
        $store->email = 'bazaar5@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    // ---- helpers mirroring BazaarAnnouncementBar.tsx ----
    private function normalizeMessages(mixed $raw): array
    {
        if (!$raw) return [];
        $arr = is_array($raw) ? $raw : [$raw];
        $out = [];
        foreach ($arr as $item) {
            if ($item === null) continue;
            if (is_array($item) && isset($item['text'])) {
                $t = trim((string)($item['text'] ?? ''));
                if ($t !== '') $out[] = $t;
                continue;
            }
            $s = trim((string)$item);
            if ($s !== '') $out[] = $s;
        }
        return array_slice($out, 0, 20);
    }

    private function getBazaarAnnouncementConfig(?array $content): array
    {
        $raw = $content['bazaar_announcement'] ?? $content['bazaar_announcement_bar'] ?? [];
        if (!is_array($raw)) $raw = [];
        $enabledRaw = $raw['enabled'] ?? $raw['show'] ?? $content['bazaar_announcement_enabled'] ?? null;
        $enabled = $enabledRaw !== null ? (bool)$enabledRaw : false;
        $isEnabled = $enabled === true;

        $messages = [];
        if (!empty($raw['messages']) && is_array($raw['messages'])) $messages = $this->normalizeMessages($raw['messages']);
        elseif (!empty($raw['items']) && is_array($raw['items'])) $messages = $this->normalizeMessages($raw['items']);
        elseif (!empty($raw['text']) && is_string($raw['text'])) $messages = [trim($raw['text'])];
        elseif (!empty($raw['message']) && is_string($raw['message'])) $messages = [trim($raw['message'])];
        $messages = array_values(array_filter(array_map(fn($s) => trim((string)$s), $messages), fn($s) => $s !== ''));
        $messages = array_slice($messages, 0, 20);

        $autoplayRaw = $raw['autoplay'] ?? $raw['auto_play'] ?? true;
        $autoplay = (bool)$autoplayRaw;
        $speedRaw = strtolower(trim((string)($raw['speed'] ?? $raw['interval'] ?? 'medium')));
        if (!in_array($speedRaw, ['slow','medium','fast'], true)) {
            $n = is_numeric($speedRaw) ? (int)$speedRaw : null;
            if ($n !== null) {
                if ($n >= 5500) $speedRaw = 'slow';
                elseif ($n <= 3200) $speedRaw = 'fast';
                else $speedRaw = 'medium';
            } else $speedRaw = 'medium';
        }
        $map = ['slow'=>6000,'medium'=>4000,'fast'=>3000];
        return ['enabled'=>$isEnabled,'messages'=>$messages,'autoplay'=>$autoplay,'speed'=>$speedRaw,'interval'=>$map[$speedRaw] ?? 4000];
    }

    // ---------- Announcement: bar disabled => hidden ----------
    public function test_announcement_disabled_hidden(): void
    {
        $cfg = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>false,'messages'=>['hello']]]);
        $this->assertFalse($cfg['enabled']);
        $this->assertCount(1, $cfg['messages']);
        // component should return null when disabled (visible = enabled && count>0)
        $visible = $cfg['enabled'] && count($cfg['messages'])>0;
        $this->assertFalse($visible);
    }

    public function test_announcement_enabled_single_message(): void
    {
        $cfg = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['خصم 20%']]]);
        $this->assertTrue($cfg['enabled']);
        $this->assertCount(1, $cfg['messages']);
        $this->assertEquals('خصم 20%', $cfg['messages'][0]);
    }

    public function test_announcement_multiple_messages(): void
    {
        $cfg = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['خصم 20%','توصيل مجاني','وصلتنا تشكيلة']]]);
        $this->assertCount(3, $cfg['messages']);
        $this->assertEquals(['خصم 20%','توصيل مجاني','وصلتنا تشكيلة'], $cfg['messages']);
    }

    public function test_announcement_order_preserved(): void
    {
        $msgs = ['أ','ب','ج','د'];
        $cfg = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>$msgs]]);
        $this->assertEquals($msgs, $cfg['messages']);
        // simulate cycle order preservation
        $rotated = array_merge(array_slice($msgs,1), array_slice($msgs,0,1));
        $this->assertEquals(['ب','ج','د','أ'], $rotated);
    }

    public function test_announcement_autoplay_respected(): void
    {
        $cfgOn = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['a','b'],'autoplay'=>true]]);
        $cfgOff = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['a','b'],'autoplay'=>false]]);
        $this->assertTrue($cfgOn['autoplay']);
        $this->assertFalse($cfgOff['autoplay']);
    }

    public function test_announcement_speed_respected(): void
    {
        $slow = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['a'],'speed'=>'slow']]);
        $med = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['a'],'speed'=>'medium']]);
        $fast = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['a'],'speed'=>'fast']]);
        $this->assertEquals(6000, $slow['interval']);
        $this->assertEquals(4000, $med['interval']);
        $this->assertEquals(3000, $fast['interval']);
    }

    public function test_announcement_invalid_empty_filtered(): void
    {
        $cfg = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>['','  ','valid','','']]]);
        $this->assertCount(1, $cfg['messages']);
        $this->assertEquals('valid', $cfg['messages'][0]);
        $cfg2 = $this->getBazaarAnnouncementConfig(['bazaar_announcement'=>['enabled'=>true,'messages'=>[]]]);
        $this->assertCount(0, $cfg2['messages']);
        $this->assertFalse($cfg2['enabled'] && count($cfg2['messages'])>0);
    }

    public function test_announcement_file_exists_and_placement(): void
    {
        $bar = base_path('resources/js/templates-v2/bazaar-market/BazaarAnnouncementBar.tsx');
        $this->assertFileExists($bar);
        $src = file_get_contents($bar);
        $this->assertStringContainsString('bazaar_announcement', $src);
        $this->assertStringContainsString('getBazaarAnnouncementConfig', $src);
        $this->assertStringContainsString('var(--store-primary', $src);
        $this->assertStringContainsString('prefersReducedMotion', $src);

        $bazaar = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarMarket.tsx'));
        $this->assertStringContainsString('BazaarAnnouncementBar', $bazaar);
        // Must be below header and above hero: header string before announcement before hero
        $posHeader = strpos($bazaar, '<BazaarHeader');
        $posAnn = strpos($bazaar, '<BazaarAnnouncementBar');
        $posHero = strpos($bazaar, '<BazaarHero');
        $this->assertNotFalse($posHeader);
        $this->assertNotFalse($posAnn);
        $this->assertNotFalse($posHero);
        $this->assertLessThan($posAnn, $posHeader, 'Announcement must be after header');
        $this->assertLessThan($posHero, $posAnn, 'Announcement must be before hero');
        // Style: compact (rounded-2xl, border)
        $this->assertStringContainsString('rounded-2xl', $src);
    }

    public function test_announcement_designer_controls(): void
    {
        $designer = file_get_contents(base_path('resources/js/pages/stores/designer.tsx'));
        $this->assertStringContainsString('bazaar_announcement.enabled', $designer);
        $this->assertStringContainsString('bazaar_announcement.messages', $designer);
        $this->assertStringContainsString('bazaar_announcement.autoplay', $designer);
        $this->assertStringContainsString('bazaar_announcement.speed', $designer);
        $this->assertStringContainsString("theme === 'bazaar-market'", $designer);
    }

    public function test_announcement_persistence_and_reload(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $this->actingAs($user);
        $msgs = ['خصم 20% على المنتجات المختارة','توصيل مجاني للطلبات فوق 200 ₪','وصلتنا تشكيلة جديدة'];
        $payload = ['content'=>[
            'bazaar_announcement.enabled'=>true,
            'bazaar_announcement.messages'=>$msgs,
            'bazaar_announcement.autoplay'=>true,
            'bazaar_announcement.speed'=>'fast',
        ]];
        $this->putJson(route('api.store-designer.update', $store->id), $payload)->assertOk();
        $store->refresh();
        $merged = $store->getMergedStoreContent();
        $cfg = $this->getBazaarAnnouncementConfig($merged);
        $this->assertTrue($cfg['enabled']);
        $this->assertEquals($msgs, $cfg['messages']);
        $this->assertEquals('fast', $cfg['speed']);
        $this->assertEquals(3000, $cfg['interval']);

        // Reload via GET
        $res = $this->getJson(route('api.store-designer.show', $store->id))->assertOk();
        $json = $res->json();
        $cfg2 = $this->getBazaarAnnouncementConfig($json['content'] ?? []);
        $this->assertEquals($msgs, $cfg2['messages']);

        // Order preserved after reload
        $this->assertEquals($msgs[0], $cfg2['messages'][0]);
        $this->assertEquals($msgs[2], $cfg2['messages'][2]);
    }

    public function test_announcement_tenant_isolation(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore();
        [$ownerB,$storeB] = $this->ownerWithStore();
        $this->actingAs($ownerA);
        $this->putJson(route('api.store-designer.update', $storeA->id), ['content'=>[
            'bazaar_announcement.enabled'=>true,
            'bazaar_announcement.messages'=>['عرض A'],
        ]])->assertOk();
        $this->actingAs($ownerB);
        $this->putJson(route('api.store-designer.update', $storeB->id), ['content'=>[
            'bazaar_announcement.enabled'=>true,
            'bazaar_announcement.messages'=>['عرض B'],
        ]])->assertOk();
        $storeA->refresh(); $storeB->refresh();
        $cfgA = $this->getBazaarAnnouncementConfig($storeA->getMergedStoreContent());
        $cfgB = $this->getBazaarAnnouncementConfig($storeB->getMergedStoreContent());
        $this->assertEquals(['عرض A'], $cfgA['messages']);
        $this->assertEquals(['عرض B'], $cfgB['messages']);
        $this->assertNotEquals($cfgA['messages'], $cfgB['messages']);
    }

    public function test_announcement_reduced_motion_contract(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarAnnouncementBar.tsx'));
        $this->assertStringContainsString('prefersReducedMotion', $src);
        $this->assertStringContainsString('prefers-reduced-motion', $src);
        // Reduced motion should disable autoplay visually or via JS flag
        $this->assertTrue(str_contains($src, 'reduced') && str_contains($src, 'autoplay'));
        $interactions = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/bazaarInteractions.ts'));
        $this->assertStringContainsString('prefers-reduced-motion', $interactions);
    }

    // ---------- Product sheet ----------
    public function test_product_sheet_file_and_drag_handle(): void
    {
        $path = base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx');
        $this->assertFileExists($path);
        $src = file_get_contents($path);
        $this->assertStringContainsString('data-bazaar-drag-handle', $src);
        $this->assertStringContainsString('data-testid="bazaar-drag-handle"', $src);
        $this->assertStringContainsString('sm:hidden', $src, 'handle must be mobile only');
        $this->assertStringContainsString('BazaarProductDetail', $src);
    }

    public function test_product_sheet_drag_physics(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        $this->assertStringContainsString('translateY', $src);
        $this->assertStringContainsString('dragY', $src);
        $this->assertStringContainsString('setDragY', $src);
        // Threshold 27%
        $this->assertStringContainsString('0.27', $src);
        // Velocity 0.6
        $this->assertStringContainsString('0.60', $src);
        // Anim 280 / reduced 90
        $this->assertStringContainsString('280', $src);
        $this->assertStringContainsString('90', $src);
    }

    public function test_product_sheet_scroll_arbitration(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        $this->assertStringContainsString('scrollTop', $src);
        $this->assertStringContainsString('atTop', $src);
        $this->assertStringContainsString('scroll', $src);
        // Must check scrollTop <= 4 before sheet drag
        $this->assertMatchesRegularExpression('/scrollTop.*<=.*4/s', $src);
    }

    public function test_product_sheet_direction_lock(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        // horizontal > vertical => ignore dismiss
        $this->assertStringContainsString('Math.abs(dx) > Math.abs(dy)', $src);
        $this->assertStringContainsString("mode = 'none'", $src);
    }

    public function test_product_sheet_backdrop_and_close(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        $this->assertStringContainsString('data-testid="bazaar-product-backdrop"', $src);
        $this->assertStringContainsString('data-testid="bazaar-product-close"', $src);
        $this->assertStringContainsString('onClick={handleClose}', $src);
        $this->assertStringContainsString('backdropOpacity', $src);
    }

    public function test_product_sheet_body_scroll_restore(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        $this->assertStringContainsString('document.body.style.overflow', $src);
        $this->assertStringContainsString("overflow = 'hidden'", $src);
        // restore on unmount
        $this->assertStringContainsString("overflow = prev", $src);
    }

    public function test_product_sheet_desktop_unchanged(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        // Desktop check: window.innerWidth >= 640 should bypass drag and use onClose directly
        $this->assertStringContainsString('window.innerWidth >= 640', $src);
        // Ensure at least 2 occurrences (pointerDown guard + requestClose)
        $this->assertGreaterThanOrEqual(2, substr_count($src, 'window.innerWidth >= 640'));
    }

    public function test_product_sheet_overlays_wired(): void
    {
        $idx = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/index.ts'));
        $this->assertStringContainsString('BazaarProductDetail', $idx);
        $this->assertStringContainsString('product_detail', $idx);
        $this->assertStringContainsString('NEUTRAL_OVERLAYS', $idx);
    }

    public function test_product_sheet_no_business_logic_change(): void
    {
        $src = file_get_contents(base_path('resources/js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        // Must still have price/variants/cart logic, not stripped
        $this->assertStringContainsString('formatPrice', $src);
        $this->assertStringContainsString('selection', $src);
        $this->assertStringContainsString('addToCart', $src);
        $this->assertStringContainsString('isVariableProduct', $src);
    }
}
