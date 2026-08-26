<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Country;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Category;
use App\Models\State;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformWideStorefrontHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(string $theme = 'fashion-atelier'): array
    {
        $plan = Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>1000,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'onboarded_at'=>now(),'plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth()]);
        $store = Store::factory()->create(['user_id'=>$user->id,'theme'=>$theme]);
        $user->current_store = $store->id; $user->save();
        return [$user,$store,$plan];
    }

    private function seedGeography(): array
    {
        $pse = Country::create(['name'=>'فلسطين','code'=>'PSE','status'=>true]);
        $jor = Country::create(['name'=>'الأردن','code'=>'JOR','status'=>true]);
        $isr = Country::create(['name'=>'إسرائيل','code'=>'ISR','status'=>true]);
        $usa = Country::create(['name'=>'United States','code'=>'USA','status'=>true]);

        $ram = State::create(['country_id'=>$pse->id,'name'=>'رام الله والبيرة','status'=>true]);
        $heb = State::create(['country_id'=>$pse->id,'name'=>'الخليل','status'=>true]);
        $amm = State::create(['country_id'=>$jor->id,'name'=>'عمان','status'=>true]);
        $tlv = State::create(['country_id'=>$isr->id,'name'=>'لواء تل أبيب','status'=>true]);
        $ca  = State::create(['country_id'=>$usa->id,'name'=>'California','status'=>true]);

        $ramCity = City::create(['state_id'=>$ram->id,'name'=>'رام الله','status'=>true]);
        $hebCity = City::create(['state_id'=>$heb->id,'name'=>'الخليل','status'=>true]);
        $ammCity = City::create(['state_id'=>$amm->id,'name'=>'عمان','status'=>true]);
        $tlvCity = City::create(['state_id'=>$tlv->id,'name'=>'تل أبيب','status'=>true]);
        $laCity  = City::create(['state_id'=>$ca->id,'name'=>'Los Angeles','status'=>true]);

        return compact('pse','jor','isr','usa','ram','heb','amm','tlv','ca','ramCity','hebCity','ammCity','tlvCity','laCity');
    }

    // === LOCATIONS ===
    public function test_countries_endpoint_returns_only_supported(): void
    {
        $this->seedGeography();
        $res = $this->get(route('api.locations.countries'));
        $res->assertOk();
        $codes = collect($res->json())->pluck('code')->all();
        $this->assertContains('PSE', $codes);
        $this->assertContains('JOR', $codes);
        $this->assertContains('ISR', $codes);
        $this->assertNotContains('USA', $codes);
    }

    public function test_states_rejected_for_unsupported_country(): void
    {
        $g = $this->seedGeography();
        $this->get(route('api.locations.states', $g['usa']->id))->assertStatus(422);
        $this->get(route('api.locations.states', $g['pse']->id))->assertOk();
    }

    public function test_cities_rejected_for_unsupported_country_state(): void
    {
        $g = $this->seedGeography();
        $this->get(route('api.locations.cities', $g['ca']->id))->assertStatus(422);
        $this->get(route('api.locations.cities', $g['ram']->id))->assertOk();
    }

    public function test_checkout_rejects_unsupported_country(): void
    {
        $g = $this->seedGeography();
        [$user,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        $prod = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'price'=>50,'stock'=>10]);
        // need cart item
        DB::table('cart_items')->insert(['store_id'=>$store->id,'session_id'=>session()->getId(),'product_id'=>$prod->id,'quantity'=>1,'price'=>50,'created_at'=>now(),'updated_at'=>now()]);
        $payload = [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'a@b.com','customer_phone'=>'+970599000000',
            'shipping_address'=>'St 1','shipping_city'=>$g['laCity']->id,'shipping_state'=>$g['ca']->id,'shipping_country'=>$g['usa']->id,
            'billing_address'=>'St 1','billing_city'=>$g['laCity']->id,'billing_state'=>$g['ca']->id,'billing_country'=>$g['usa']->id,
            'payment_method'=>'cod',
        ];
        $slug = $store->slug;
        $res = $this->postJson(route('store.order.place', $slug), $payload);
        $res->assertStatus(422);
        $this->assertStringContainsString('الدولة', $res->json('message'));
    }

    public function test_checkout_rejects_cross_country_state(): void
    {
        $g = $this->seedGeography();
        [$user,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        $prod = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'price'=>50,'stock'=>10]);
        DB::table('cart_items')->insert(['store_id'=>$store->id,'session_id'=>session()->getId(),'product_id'=>$prod->id,'quantity'=>1,'price'=>50,'created_at'=>now(),'updated_at'=>now()]);
        // PSE country + JOR state (cross)
        $payload = [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'a2@b.com','customer_phone'=>'+970599000001',
            'shipping_address'=>'St 1','shipping_city'=>$g['ammCity']->id,'shipping_state'=>$g['amm']->id,'shipping_country'=>$g['pse']->id,
            'billing_address'=>'St 1','billing_city'=>$g['ammCity']->id,'billing_state'=>$g['amm']->id,'billing_country'=>$g['pse']->id,
            'payment_method'=>'cod',
        ];
        $res = $this->postJson(route('store.order.place', $store->slug), $payload);
        $res->assertStatus(422);
    }

    public function test_checkout_rejects_cross_state_city(): void
    {
        $g = $this->seedGeography();
        [$user,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        $prod = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'price'=>50,'stock'=>10]);
        DB::table('cart_items')->insert(['store_id'=>$store->id,'session_id'=>session()->getId(),'product_id'=>$prod->id,'quantity'=>1,'price'=>50,'created_at'=>now(),'updated_at'=>now()]);
        // Correct country/state but city belongs to another state
        $payload = [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'a3@b.com','customer_phone'=>'+970599000002',
            'shipping_address'=>'St 1','shipping_city'=>$g['hebCity']->id,'shipping_state'=>$g['ram']->id,'shipping_country'=>$g['pse']->id,
            'billing_address'=>'St 1','billing_city'=>$g['hebCity']->id,'billing_state'=>$g['ram']->id,'billing_country'=>$g['pse']->id,
            'payment_method'=>'cod',
        ];
        $res = $this->postJson(route('store.order.place', $store->slug), $payload);
        $res->assertStatus(422);
    }

    // === SUCCESS ONE-TIME + FAKE GUARD ===
    public function test_order_success_url_is_one_time_and_fake_not_trusted(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/TemplateStorefrontV2.tsx'));
        $this->assertStringContainsString('wusool_order_success_consumed', $src, 'must gate on sessionStorage marker');
        $this->assertStringContainsString('replaceState', $src, 'must clean URL');
        $this->assertStringContainsString("payment_status", $src);
        // checkout context must set marker on success
        $chk = file_get_contents(resource_path('js/contexts/CheckoutContext.tsx'));
        $this->assertStringContainsString('wusool_order_success_consumed', $chk);
        $this->assertStringContainsString('showOrderSuccess', $chk);
        // OrderContext also respects marker
        $ord = file_get_contents(resource_path('js/contexts/OrderContext.tsx'));
        $this->assertStringContainsString('wusool_order_success_consumed', $ord);
    }

    // === FREE SHIPPING ===
    public function test_free_shipping_removed_from_designer(): void
    {
        foreach (['fashion-atelier','grocery-souq','bazaar-market','bakery-house'] as $slug) {
            $path = resource_path("js/templates-v2/{$slug}/index.ts");
            if (!file_exists($path)) continue;
            $src = file_get_contents($path);
            $this->assertStringNotContainsString('free_shipping_threshold', $src, "$slug must not expose free_shipping_threshold in Designer");
        }
        $hook = file_get_contents(resource_path('js/templates-v2/shared/hooks.ts'));
        $this->assertStringContainsString('free_shipping_enabled', $hook);
        $this->assertStringContainsString('return null', $hook);
    }

    // === REVIEWS IDOR ===
    public function test_reviews_cross_store_get_blocked(): void
    {
        [$userA,$storeA] = $this->makeStore();
        [$userB,$storeB] = $this->makeStore();
        $prodB = Product::factory()->create(['store_id'=>$storeB->id,'category_id'=>Category::factory()->create(['store_id'=>$storeB->id])->id,'is_active'=>true]);
        $res = $this->getJson("/api/v1/reviews/product/{$prodB->id}?store_id={$storeA->id}");
        $this->assertTrue(in_array($res->status(), [403,422,404]), 'cross-store GET must be blocked, got '.$res->status());
    }

    public function test_reviews_cross_store_post_blocked(): void
    {
        [$userA,$storeA] = $this->makeStore();
        [$userB,$storeB] = $this->makeStore();
        $prodB = Product::factory()->create(['store_id'=>$storeB->id,'category_id'=>Category::factory()->create(['store_id'=>$storeB->id])->id,'is_active'=>true]);
        $res = $this->postJson('/api/v1/reviews', ['store_id'=>$storeA->id,'product_id'=>$prodB->id,'rating'=>5]);
        $this->assertTrue(in_array($res->status(), [403,422,401]), 'cross-store POST must be blocked, got '.$res->status());
    }

    // === HERO MEDIA CONTRACT ===
    public function test_souq_hero_uses_shared_media_contract(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'));
        $this->assertStringContainsString('useResolvedHero', $src);
        $this->assertStringContainsString('hero.fit', $src);
        $this->assertStringContainsString('hero.position', $src);
        $this->assertStringContainsString('hero.heightDesktop', $src);
        $this->assertStringContainsString('177.77777778vh', $src, 'YouTube cover technique required');
    }

    // === SEARCH CONTRACT ===
    public function test_shared_search_hook_exists(): void
    {
        $this->assertFileExists(resource_path('js/templates-v2/shared/search.ts'));
        $src = file_get_contents(resource_path('js/templates-v2/shared/search.ts'));
        $this->assertStringContainsString('useStorefrontSearch', $src);
        $this->assertStringContainsString('sku', $src);
    }
}
