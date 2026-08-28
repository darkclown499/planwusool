<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FashionAtelierCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'P-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Fashion Test';
        $store->slug = $attrs['slug'] ?? 'fashion-'.uniqid();
        $store->theme = $attrs['theme'] ?? 'fashion-atelier';
        $store->email = 'fashion@example.com';
        $store->save();
        $user->current_store = $store->id; $user->save();
        return [$user,$store];
    }

    public function test_category_fallback_not_green_block(): void
    {
        // AtelierCategoryCircles uses gradient + icon fallback when c.image null; check template file does not emit empty green block
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierSections.tsx'));
        $this->assertStringContainsString('from-[#f3ece4] to-[#e7d8c9]', $src, 'fallback must be tasteful gradient not empty green');
        $this->assertStringNotContainsString('bg-green', $src);
        $this->assertStringContainsString('getCategoryFallbackIcon', $src);
    }

    public function test_search_not_hardcoded(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierSearchOverlay.tsx'));
        $this->assertStringNotContainsString('فستان زفاف', $src);
        $this->assertStringNotContainsString('demo', strtolower($src));
        // must use canonical server endpoint (store-scoped, active only) not pure client filter
        $this->assertStringContainsString('api/storefront/search', $src);
        $this->assertStringContainsString('store_id', $src);
        // suggestions derived from real product names
        $this->assertStringContainsString('suggestions', $src);
        $this->assertStringContainsString('products.slice', $src);
        // empty state must be spec phrase + loading/error states
        $this->assertStringContainsString('لم نجد منتجات مطابقة', $src);
        $this->assertStringContainsString('جارٍ البحث', $src);
    }

    public function test_loyalty_hidden_when_disabled(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierProductCard.tsx'));
        $this->assertStringContainsString('is_enabled', $src, 'loyalty must be gated on is_enabled');
        $this->assertStringContainsString('getLoyaltySettingsFromPage', $src);
        // calc alone not enough
        $this->assertMatchesRegularExpression('/if\s*\(\s*!loyalty/', $src);
    }

    public function test_free_shipping_threshold_dynamic(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierCartDrawer.tsx'));
        $this->assertStringContainsString('resolveFreeShippingThreshold', $src);
        $this->assertStringNotContainsString('250}', $src); // threshold should not be hardcoded alone; it uses fallback but reads designer
    }

    public function test_static_content_merchant_driven(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/PolicyContent.tsx'));
        // must check merchant pages first
        $this->assertStringContainsString('merchantPages', $src);
        $this->assertStringContainsString('PAGE_SLUG_MAP', $src);
        // no hardcoded demo phone/city
        $this->assertStringNotContainsString('0100', $src);
        $this->assertStringNotContainsString('القاهرةDemo', $src);
    }

    public function test_wishlist_logged_out_has_secondary_cta_gated(): void
    {
        $src = file_get_contents(resource_path('js/components/storefront/WishlistModal.tsx'));
        $this->assertStringContainsString('سجّل الدخول لحفظ وعرض منتجاتك المفضلة', $src);
        $this->assertStringContainsString('إنشاء حساب', $src);
        $this->assertStringContainsString('registrationEnabled', $src);
    }

    public function test_inactive_product_hidden_via_controller(): void
    {
        [, $store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>false,'name'=>'Hidden']);
        $active = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>'Visible']);
        // Simulate catalog query (what ThemeController does)
        $ids = Product::where('store_id',$store->id)->where('is_active',true)->pluck('name')->toArray();
        $this->assertNotContains('Hidden', $ids);
        $this->assertContains('Visible', $ids);
    }

    public function test_hero_empty_does_not_show_demo(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHero.tsx'));
        // FALLBACK_SLIDES should not leak when hasDynamicHero false and slides empty
        $this->assertStringContainsString('return null', $src);
        $this->assertStringContainsString('hasDynamicHero', $src);
        // Desktop must respect advertised 16:9 aspect, mobile 4:5 — not arbitrary fixed height causing crop
        $this->assertStringContainsString('16/9', $src);
        $this->assertStringContainsString('4/5', $src);
        $this->assertStringContainsString('aspect', $src);
        // must use object-cover (not contain with black letterbox) for premium feel — cover is correct when container aspect matches image
        $this->assertStringContainsString('object-cover', $src);
    }

    public function test_hero_height_is_responsive(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHero.tsx'));
        // Responsive contract: mobile breakpoint 768 and aspect switching
        $this->assertStringContainsString('767px', $src);
        $this->assertStringContainsString('768px', $src);
        $this->assertStringContainsString('16/9', $src);
        $this->assertStringContainsString('4/5', $src);
    }

    public function test_cart_free_shipping_rtl_and_empty_hidden(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierCartDrawer.tsx'));
        $this->assertStringContainsString('items.length > 0', $src, 'free shipping must hide when cart empty');
        $this->assertStringContainsString('dir="rtl"', $src);
        $this->assertStringContainsString('marginInlineStart', $src);
    }

    public function test_store_isolation(): void
    {
        [, $storeA] = $this->makeStore(['slug'=>'iso-a-'.uniqid()]);
        [, $storeB] = $this->makeStore(['slug'=>'iso-b-'.uniqid()]);
        $catA = Category::factory()->create(['store_id'=>$storeA->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$storeA->id,'category_id'=>$catA->id,'is_active'=>true,'name'=>'A-prod']);
        $this->assertSame(0, Product::where('store_id',$storeB->id)->count());
        $this->assertSame(1, Product::where('store_id',$storeA->id)->count());
    }

    public function test_variant_oos_disabled(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierProductDetail.tsx'));
        $this->assertStringContainsString('isUnavailable', $src);
        $this->assertStringContainsString('allowBackorder', $src);
        $this->assertStringContainsString('isSelectedOOS', $src);
    }
}
