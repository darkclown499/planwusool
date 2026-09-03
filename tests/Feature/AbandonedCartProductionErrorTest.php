<?php

namespace Tests\Feature;

use App\Mail\AbandonedCartReminderMail;
use App\Models\AbandonedCart;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * WUSOOL TASK 7 — ABANDONED CART PRODUCTION ERROR
 * Reproduces the number_format crash observed in production logs and certifies the hotfix.
 *
 * Root cause: AbandonedCartController::export() and AbandonedCartReminderMail::content()
 * called number_format($cart->cart_total, 2) without verifying the value is a valid
 * numeric type. On PHP 8.5 with Weak Types, passing:
 *  - "" (empty string) => TypeError: must be int|float, string given
 *  - "1,200" (comma-formatted legacy string) => TypeError
 *  - null => Deprecated (promoted to error in production logging)
 *  - array/object malformed legacy => TypeError
 * caused the entire merchant page/export/mail to 500.
 *
 * Cart total is stored as DECIMAL(10,2) but Eloquent's 'decimal:2' cast returns a
 * string like "120.50". Valid decimal strings are numeric and coerce safely, but
 * legacy/malformed rows or direct raw inserts can expose non-numeric shapes.
 *
 * Fix: is_numeric guard + (float) cast only for valid numeric shapes; preserve raw
 * evidence for malformed instead of fabricating 0.
 */
class AbandonedCartProductionErrorTest extends TestCase
{
    use RefreshDatabase;

    private function givePerms(User $user): void
    {
        foreach (['manage-abandoned-carts','view-abandoned-carts','send-abandoned-cart-reminders','delete-abandoned-carts','export-abandoned-carts'] as $name) {
            $perm = Permission::firstOrCreate(['name'=>$name,'guard_name'=>'web']);
            $user->givePermissionTo($perm);
        }
    }

    private function companyUser(): User
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all'],'max_stores'=>10,'max_products_per_store'=>100,'max_users_per_store'=>10]);
        return User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addYear(),'plan_is_active'=>1,'onboarded_at'=>now(),'email_verified_at'=>now()]);
    }

    private function storeFor(User $user): Store
    {
        $s = new Store(); $s->user_id=$user->id; $s->name='Store '.uniqid(); $s->slug='s-'.uniqid(); $s->theme='bazaar-market'; $s->email='s@'.uniqid().'.com'; $s->save();
        $user->current_store=$s->id; $user->save(); return $s;
    }

    private function makeCart(Store $store, array $overrides=[]): AbandonedCart
    {
        return AbandonedCart::forceCreate(array_merge([
            'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),'customer_name'=>'Test','customer_email'=>'t@example.com','customer_phone'=>'+970591234567','cart_items'=>[['name'=>'Prod','quantity'=>1,'price'=>100]],'cart_total'=>100,'status'=>'abandoned','last_activity_at'=>now(),'reminder_count'=>0,'recovery_token'=>bin2hex(random_bytes(32)),'expires_at'=>now()->addDays(7),
        ], $overrides));
    }

    // A. authorized merchant can open abandoned-cart page
    public function test_a_merchant_can_open_abandoned_cart_page(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $this->makeCart($store);
        $this->actingAs($user)->get(route('stores.abandoned-carts.index', $store->id))->assertStatus(200);
    }

    // B. exact production-shaped number_format edge case no longer crashes (empty string)
    public function test_b_export_does_not_crash_with_empty_string_cart_total(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        // Simulate legacy row with empty string total (would throw TypeError with raw number_format)
        $cart = $this->makeCart($store);
        \Illuminate\Support\Facades\DB::table('abandoned_carts')->where('id',$cart->id)->update(['cart_total'=> '']);
        $cart->refresh();
        // Before fix: number_format('',2) => TypeError. After fix: should 200, not 500.
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp->assertStatus(200);
        // Also verify mail does not throw
        $mail = new AbandonedCartReminderMail($cart);
        $content = $mail->content();
        $this->assertNotEmpty($content->with['cartTotal']);
    }

    public function test_b_export_does_not_crash_with_comma_formatted_legacy_total(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store);
        \Illuminate\Support\Facades\DB::table('abandoned_carts')->where('id',$cart->id)->update(['cart_total'=> '1,200.00']);
        $cart->refresh();
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp->assertStatus(200);
        $mail = new AbandonedCartReminderMail($cart);
        $this->assertEquals('1,200.00', $mail->content()->with['cartTotal']); // preserved raw, not fabricated 1.00
    }

    public function test_b_mail_does_not_crash_with_null_total(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user);
        $cart = $this->makeCart($store);
        // SQLite NOT NULL constraint prevents DB null; test via in-memory raw attribute (simulates legacy MySQL null row)
        $cart->setRawAttributes(array_merge($cart->getAttributes(), ['cart_total'=> null]), true);
        $mail = new AbandonedCartReminderMail($cart);
        $with = $mail->content()->with;
        $this->assertEquals('0.00', $with['cartTotal']);
        // Blade rendering should also not throw
        $rendered = view('emails.abandoned-cart-reminder', $with)->render();
        $this->assertStringContainsString('0.00', $rendered);
    }

    // C. valid decimal amount renders correctly
    public function test_c_valid_decimal_renders(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['cart_total'=>'120.50']);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp->assertStatus(200);
        // CSV should contain 120.50
        $stream = $resp->streamedContent();
        $this->assertStringContainsString('120.50', $stream);
        $mail = new AbandonedCartReminderMail($cart);
        $this->assertEquals('120.50', $mail->content()->with['cartTotal']);
    }

    // D. integer amount renders correctly
    public function test_d_integer_renders(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['cart_total'=>100]);
        $mail = new AbandonedCartReminderMail($cart);
        $this->assertEquals('100.00', $mail->content()->with['cartTotal']);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp->assertStatus(200);
        $this->assertStringContainsString('100.00', $resp->streamedContent());
    }

    // E. nullable/optional values are safe where schema permits (missing contact, name, items)
    public function test_e_nullable_optional_values_safe(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['customer_name'=>null,'customer_email'=>null,'customer_phone'=>null,'cart_items'=>null,'cart_total'=>0]);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.index', $store->id));
        $resp->assertStatus(200);
        $resp2 = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp2->assertStatus(200);
    }

    // F. Store A cannot see Store B abandoned carts (listing isolation)
    public function test_f_store_a_cannot_see_store_b_carts(): void
    {
        $userA=$this->companyUser(); $storeA=$this->storeFor($userA); $this->givePerms($userA);
        $userB=$this->companyUser(); $storeB=$this->storeFor($userB);
        $cartB = $this->makeCart($storeB, ['customer_email'=>'b@example.com']);
        $resp = $this->actingAs($userA)->get(route('stores.abandoned-carts.index', $storeA->id));
        $resp->assertStatus(200);
        // Ensure B's email not leaked in props
        $this->assertStringNotContainsString('b@example.com', $resp->getContent());
    }

    // G. Store A cannot mutate/recover Store B cart
    public function test_g_store_a_cannot_mutate_store_b_cart(): void
    {
        $userA=$this->companyUser(); $storeA=$this->storeFor($userA); $this->givePerms($userA);
        $userB=$this->companyUser(); $storeB=$this->storeFor($userB);
        $cartB = $this->makeCart($storeB);
        $this->actingAs($userA)->post(route('stores.abandoned-carts.send-reminder', [$storeA->id,$cartB->id]))->assertStatus(403);
        $this->actingAs($userA)->post(route('stores.abandoned-carts.mark-recovered', [$storeA->id,$cartB->id]))->assertStatus(403);
        $this->actingAs($userA)->delete(route('stores.abandoned-carts.destroy', [$storeA->id,$cartB->id]))->assertStatus(403);
    }

    // H. empty history renders safely
    public function test_h_empty_history_renders(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.index', $store->id));
        $resp->assertStatus(200);
        $resp2 = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp2->assertStatus(200);
    }

    // I. deleted/missing product relation does not crash if architecture allows it (snapshot)
    public function test_i_snapshot_with_deleted_product_renders(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        // cart_items stores snapshot; product deletion should not affect rendering
        $cart = $this->makeCart($store, ['cart_items'=>[['name'=>'Deleted Product','quantity'=>2,'price'=>50,'product_id'=>99999]],'cart_total'=>100]);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.index', $store->id));
        $resp->assertStatus(200);
        $resp2 = $this->actingAs($user)->get(route('stores.abandoned-carts.export', $store->id));
        $resp2->assertStatus(200);
    }

    // J. recovered cart status renders correctly
    public function test_j_recovered_status_renders(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['status'=>'recovered','recovered_at'=>now()]);
        $resp = $this->actingAs($user)->get(route('stores.abandoned-carts.index', [$store->id,'status'=>'recovered']));
        $resp->assertStatus(200);
    }

    // K. GET merchant page does not mutate cart/order/inventory
    public function test_k_get_does_not_mutate(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['status'=>'abandoned','reminder_count'=>0]);
        $this->actingAs($user)->get(route('stores.abandoned-carts.index', $store->id))->assertStatus(200);
        $cart->refresh();
        $this->assertEquals('abandoned', $cart->status);
        $this->assertEquals(0, $cart->reminder_count);
        $this->assertNull($cart->recovered_at);
    }

    // L. abandoned cart does not count as collected revenue (analytics)
    public function test_l_abandoned_not_counted_as_revenue(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user);
        $this->makeCart($store, ['status'=>'abandoned','cart_total'=>500]);
        $this->makeCart($store, ['status'=>'recovered','cart_total'=>200]);
        $service = app(\App\Services\AbandonedCartService::class);
        $stats = $service->getStats($store->id);
        // Only recovered_amount should be 200, total_abandoned_amount should be 500, not summed as sales
        $this->assertEquals(200, (float)$stats['recovered_amount']);
        $this->assertEquals(500, (float)$stats['total_abandoned_amount']);
        // Verify no order was created — abandoned carts are not orders
        $this->assertDatabaseMissing('orders', ['store_id'=>$store->id]);
    }

    // M. existing recovery action remains idempotent where supported
    public function test_m_recovery_idempotent(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['status'=>'recovered','recovered_at'=>now()]);
        $resp = $this->actingAs($user)->post(route('stores.abandoned-carts.mark-recovered', [$store->id,$cart->id]));
        $resp->assertStatus(302);
        $cart->refresh();
        $this->assertEquals('recovered', $cart->status);
    }

    // N. WhatsApp recovery remains deep-link/manual only
    public function test_n_whatsapp_is_deeplink_only(): void
    {
        $user=$this->companyUser(); $store=$this->storeFor($user); $this->givePerms($user);
        $cart = $this->makeCart($store, ['customer_phone'=>'+970591234567']);
        $svc = app(\App\Services\WhatsAppCommerceService::class);
        $action = $svc->abandonedCartAction($cart->id);
        // Should return deep-link array, not auto-send
        $this->assertNotNull($action);
        $this->assertStringStartsWith('https://wa.me/', $action['url']);
        $this->assertArrayHasKey('message', $action);
        // No automatic message was sent — whatsapp_status still null/queued
        $cart->refresh();
        $this->assertNotEquals('sent', $cart->whatsapp_status);
    }

    // Direct proof: raw number_format with empty string throws TypeError on PHP 8.5
    public function test_proof_raw_number_format_throws_for_empty_string(): void
    {
        $this->expectException(\TypeError::class);
        number_format('', 2);
    }

    public function test_proof_raw_number_format_throws_for_comma_string(): void
    {
        $this->expectException(\TypeError::class);
        number_format('1,200', 2);
    }
}
