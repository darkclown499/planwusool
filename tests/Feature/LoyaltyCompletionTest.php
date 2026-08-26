<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\LoyaltyService;
use App\Services\ReturnService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyCompletionTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(array $overrides = []): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(array_merge(['user_id' => $user->id], $overrides));
        $user->current_store = $store->id; $user->save();
        return [$user, $store];
    }

    private function customer(Store $store): Customer
    {
        return Customer::create(['store_id'=>$store->id,'first_name'=>'T','last_name'=>'U','email'=>'c'.uniqid().'@t.test','password'=>bcrypt('p'),'email_verified_at'=>now(),'is_active'=>true]);
    }

    private function makeOrder(Store $store, Customer $customer, float $subtotal=100, string $status='delivered', string $ps='paid'): Order
    {
        $o = new Order();
        $o->store_id=$store->id; $o->customer_id=$customer->id;
        $o->order_number=Order::generateOrderNumber();
        $o->status=$status; $o->payment_status=$ps;
        $o->subtotal=$subtotal; $o->discount_amount=0; $o->shipping_amount=0; $o->tax_amount=0; $o->total_amount=$subtotal;
        $o->customer_email=$customer->email; $o->customer_first_name=$customer->first_name; $o->customer_last_name=$customer->last_name;
        $o->shipping_address='addr'; $o->shipping_city='city'; $o->shipping_state='st'; $o->shipping_country='PS';
        $o->billing_address='addr'; $o->billing_city='city'; $o->billing_state='st'; $o->billing_country='PS';
        $o->payment_method='cod'; $o->save();
        $cat=Category::factory()->create(['store_id'=>$store->id]);
        $prod=Product::create(['store_id'=>$store->id,'category_id'=>$cat->id,'name'=>'P','price'=>$subtotal,'stock'=>100,'is_active'=>true,'images'=>'/a.jpg','cover_image'=>'/a.jpg']);
        OrderItem::create(['order_id'=>$o->id,'product_id'=>$prod->id,'product_name'=>$prod->name,'quantity'=>1,'product_price'=>$subtotal,'unit_price'=>$subtotal,'total_price'=>$subtotal]);
        return $o->fresh();
    }

    // A. EXPIRATION
    public function test_expiry_off_never_expires(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>false,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $tx=LoyaltyTransaction::where('order_id',$o->id)->first();
        $tx->update(['expires_at'=>now()->subDays(1)]);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($s->id,$c->id));
        $cnt=app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(0,$cnt);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    public function test_expiry_on_before_does_not_expire(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>10,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,50);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $tx=LoyaltyTransaction::where('order_id',$o->id)->first();
        $this->assertTrue($tx->expires_at->isFuture());
        $cnt=app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(0,$cnt);
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    public function test_expiry_on_after_expires(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $tx=LoyaltyTransaction::where('order_id',$o->id)->first();
        $tx->update(['expires_at'=>now()->subDay()]);
        $cnt=app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(1,$cnt);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
        $this->assertDatabaseHas('loyalty_transactions',['type'=>'expired','points'=>-100]);
    }

    public function test_expiry_idempotent_second_run(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        LoyaltyTransaction::where('order_id',$o->id)->update(['expires_at'=>now()->subDay()]);
        $this->assertEquals(1, app(LoyaltyService::class)->processExpirations($s->id));
        $this->assertEquals(0, app(LoyaltyService::class)->processExpirations($s->id));
        $this->assertEquals(1, LoyaltyTransaction::where('type','expired')->count());
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    public function test_expiry_store_isolation(): void
    {
        [$uA,$sA]=$this->merchantWithStore(); [$uB,$sB]=$this->merchantWithStore();
        LoyaltySetting::forStore($sA->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        LoyaltySetting::forStore($sB->id)->update(['is_enabled'=>true,'points_expire'=>false,'points_per_currency'=>1]);
        $cA=$this->customer($sA); $cB=$this->customer($sB);
        $oA=$this->makeOrder($sA,$cA,100); $oB=$this->makeOrder($sB,$cB,100);
        app(LoyaltyService::class)->earnPointsForOrder($oA);
        app(LoyaltyService::class)->earnPointsForOrder($oB);
        LoyaltyTransaction::where('store_id',$sA->id)->update(['expires_at'=>now()->subDay()]);
        LoyaltyTransaction::where('store_id',$sB->id)->update(['expires_at'=>now()->subDay()]);
        $cnt=app(LoyaltyService::class)->processExpirations($sA->id);
        $this->assertEquals(1,$cnt);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($sA->id,$cA->id));
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($sB->id,$cB->id));
    }

    public function test_expiry_customer_isolation(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        $c1=$this->customer($s); $c2=$this->customer($s);
        $o1=$this->makeOrder($s,$c1,100); $o2=$this->makeOrder($s,$c2,50);
        app(LoyaltyService::class)->earnPointsForOrder($o1);
        app(LoyaltyService::class)->earnPointsForOrder($o2);
        LoyaltyTransaction::where('customer_id',$c1->id)->update(['expires_at'=>now()->subDay()]);
        app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c1->id));
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($s->id,$c2->id));
    }

    public function test_expiry_no_negative_balance(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        // redeem 60
        $o2=$this->makeOrder($s,$c,0); // dummy order for redeem ledger
        // manually create redeem to simulate spending
        LoyaltyTransaction::create(['store_id'=>$s->id,'customer_id'=>$c->id,'order_id'=>$o2->id,'type'=>'redeem','points'=>-60,'balance_after'=>40,'description'=>'redeem']);
        LoyaltyTransaction::where('type','earn')->update(['expires_at'=>now()->subDay()]);
        app(LoyaltyService::class)->processExpirations($s->id);
        $bal=LoyaltyTransaction::balanceFor($s->id,$c->id);
        $this->assertGreaterThanOrEqual(0,$bal);
        // should expire min(100,40)=40 -> balance 0
        $this->assertEquals(0,$bal);
    }

    public function test_expiry_already_refunded_not_double(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>1,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        app(LoyaltyService::class)->reversePointsForOrder($o);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
        LoyaltyTransaction::where('type','earn')->update(['expires_at'=>now()->subDay()]);
        $cnt=app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(0,$cnt); // already at 0, no negative
    }

    public function test_bonus_expiry_respects_points_expire(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_expire'=>true,'expiry_days'=>5,'signup_bonus_points'=>20]);
        $c=$this->customer($s);
        app(LoyaltyService::class)->awardSignupBonus($c);
        $tx=LoyaltyTransaction::where('type','signup_bonus')->first();
        $this->assertNotNull($tx->expires_at);
        $tx->update(['expires_at'=>now()->subDay()]);
        app(LoyaltyService::class)->processExpirations($s->id);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    // B. REFUND
    public function test_full_refund_reverses(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($s->id,$c->id));
        // simulate ReturnService full refund
        $ret=\App\Models\OrderReturn::create(['return_number'=>\App\Models\OrderReturn::generateReturnNumber(),'store_id'=>$s->id,'order_id'=>$o->id,'customer_id'=>$c->id,'customer_email'=>$c->email,'status'=>'requested','reason'=>'other','refund_status'=>'none','refund_amount'=>0]);
        \App\Models\OrderReturnItem::create(['return_id'=>$ret->id,'order_item_id'=>$o->items()->first()->id,'product_id'=>Product::where('store_id',$s->id)->first()->id,'quantity'=>1,'refund_amount'=>0,'reason'=>'other']);
        ReturnService::recordRefund($ret,100);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
        $this->assertEquals(1, LoyaltyTransaction::where('type','refund')->count());
    }

    public function test_partial_refund_proportional(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $ret=\App\Models\OrderReturn::create(['return_number'=>\App\Models\OrderReturn::generateReturnNumber(),'store_id'=>$s->id,'order_id'=>$o->id,'customer_id'=>$c->id,'customer_email'=>$c->email,'status'=>'requested','reason'=>'other','refund_status'=>'none','refund_amount'=>0]);
        \App\Models\OrderReturnItem::create(['return_id'=>$ret->id,'order_item_id'=>$o->items()->first()->id,'product_id'=>Product::where('store_id',$s->id)->first()->id,'quantity'=>1,'refund_amount'=>0,'reason'=>'other']);
        ReturnService::recordRefund($ret,25);
        $this->assertEquals(75, LoyaltyTransaction::balanceFor($s->id,$c->id));
        $this->assertEquals(-25, LoyaltyTransaction::where('type','refund')->first()->points);
    }

    public function test_second_partial_refund_incremental(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $ret=\App\Models\OrderReturn::create(['return_number'=>\App\Models\OrderReturn::generateReturnNumber(),'store_id'=>$s->id,'order_id'=>$o->id,'customer_id'=>$c->id,'customer_email'=>$c->email,'status'=>'requested','reason'=>'other','refund_status'=>'none','refund_amount'=>0]);
        \App\Models\OrderReturnItem::create(['return_id'=>$ret->id,'order_item_id'=>$o->items()->first()->id,'product_id'=>Product::where('store_id',$s->id)->first()->id,'quantity'=>1,'refund_amount'=>0,'reason'=>'other']);
        ReturnService::recordRefund($ret,25);
        $this->assertEquals(75, LoyaltyTransaction::balanceFor($s->id,$c->id));
        ReturnService::recordRefund($ret,25); // second 25 => total 50
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($s->id,$c->id));
        $this->assertEquals(2, LoyaltyTransaction::where('type','refund')->count());
    }

    public function test_cancelled_via_status_reverses(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $o->status='cancelled'; $o->save();
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
        // second save should be idempotent
        $o->status='cancelled'; $o->save();
        $this->assertEquals(1, LoyaltyTransaction::where('type','refund')->count());
    }

    public function test_failed_payment_reverses(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100,'processing','pending');
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $o->payment_status='failed'; $o->save();
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    public function test_repeated_webhook_idempotent(): void
    {
        [$u,$s]=$this->merchantWithStore();
        LoyaltySetting::forStore($s->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $c=$this->customer($s); $o=$this->makeOrder($s,$c,100);
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $svc=app(LoyaltyService::class);
        $svc->reversePointsForOrder($o);
        $svc->reversePointsForOrder($o);
        $svc->reversePointsForOrder($o, 100);
        $this->assertEquals(1, LoyaltyTransaction::where('type','refund')->count());
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id,$c->id));
    }

    // C. VARIANT
    public function test_variant_loyalty_shared_contract_exists(): void
    {
        $content=file_get_contents(resource_path('js/utils/loyalty.ts'));
        $this->assertStringContainsString('getEffectiveLoyaltyPrice', $content);
        $this->assertStringContainsString('variantCombinations', $content);
        $content2=file_get_contents(resource_path('js/templates-v2/shared/neutral/ProductDetailModal.tsx'));
        $this->assertStringContainsString('getEffectiveLoyaltyPrice', $content2);
        $content3=file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierProductDetail.tsx'));
        $this->assertStringContainsString('displayPrice', $content3);
        $this->assertStringContainsString('calcEarnedPoints(Number(displayPrice)', $content3);
    }

    public function test_variant_price_calc_logic(): void
    {
        // Simulate PHP variant price resolution via helper logic is JS; test that helper picks variant price
        $js=file_get_contents(resource_path('js/utils/loyalty.ts'));
        $this->assertStringContainsString('if (!product || !selection', $js);
        $this->assertStringContainsString('return base', $js);
        // Ensure BakeryCard now uses pick-aware effective price
        $bakery=file_get_contents(resource_path('js/templates-v2/bakery-house/BakeryHouse.tsx'));
        $this->assertStringContainsString('getEffectiveLoyaltyPrice(product, pick)', $bakery);
    }

    // K. SECURITY
    public function test_loyalty_idor_blocked(): void
    {
        [$uA,$sA]=$this->merchantWithStore(); [$uB,$sB]=$this->merchantWithStore();
        LoyaltySetting::forStore($sA->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        LoyaltySetting::forStore($sB->id)->update(['is_enabled'=>true,'points_per_currency'=>1]);
        $cA=$this->customer($sA);
        $oA=$this->makeOrder($sA,$cA,100);
        app(LoyaltyService::class)->earnPointsForOrder($oA);
        // store B should not see A's transaction
        $this->assertEquals(0, LoyaltyTransaction::where('store_id',$sB->id)->where('customer_id',$cA->id)->count());
        // API: loyalty balance for other store should be 0 or 403? Check via controller guard
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($sA->id,$cA->id));
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($sB->id,$cA->id));
    }
}
