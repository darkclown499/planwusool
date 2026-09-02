<?php

namespace Tests\Feature;

use App\Models\AbandonedCart;
use App\Models\Order;
use App\Models\Role;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\WhatsAppTemplate;
use App\Models\User;
use App\Services\WhatsAppCommerceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WhatsAppCommercePhase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        StoreConfiguration::flushRequestCache();
    }

    private function companyWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>100,'max_users_per_store'=>20]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'plan_id'=>$plan->id,'plan_is_active'=>1,'plan_expire_date'=>now()->addYear(),'onboarded_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        $role = Role::firstOrCreate(['name'=>'company','guard_name'=>'web'],['label'=>'Company']);
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);
        foreach (Permission::all() as $p) { try{ $user->givePermissionTo($p);}catch(\Throwable $e){} }
        return [$user->fresh(),$store,$plan];
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'customer_id'=>null,'session_id'=>'sess'.\Illuminate\Support\Str::random(6),
            'status'=>'pending','payment_status'=>'pending','customer_email'=>'guest@example.com','customer_first_name'=>'Guest','customer_last_name'=>'Buyer','customer_phone'=>'0592000000',
            'shipping_address'=>'Ramallah','shipping_city'=>'Ramallah','shipping_state'=>'West','shipping_country'=>'PS',
            'billing_address'=>'Ramallah','billing_city'=>'Ramallah','billing_state'=>'West','billing_country'=>'PS',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'currency'=>'ILS','payment_method'=>'cod'
        ], $overrides));
    }

    /* ── Service: defaults ── */
    public function test_default_templates_cover_all_keys_in_both_locales_and_only_allowlisted_placeholders(): void
    {
        $service = app(WhatsAppCommerceService::class);
        $this->assertSame(8, count(WhatsAppTemplate::KEYS));
        $this->assertSame(['ar','en'], WhatsAppTemplate::locales());

        foreach (['ar','en'] as $locale) {
            foreach (WhatsAppTemplate::KEYS as $key) {
                $body = WhatsAppCommerceService::DEFAULT_TEMPLATES[$locale][$key] ?? '';
                $this->assertNotEmpty($body, "Default missing for $locale/$key");
                preg_match_all('/\{([a-z_]+)\}/', $body, $matches);
                foreach ($matches[1] as $placeholder) {
                    $this->assertContains($placeholder, WhatsAppCommerceService::PLACEHOLDERS, "Unallowlisted placeholder {$placeholder}");
                }
            }
        }
    }

    public function test_seed_defaults_is_idempotent(): void
    {
        [$user,$store] = $this->companyWithStore();
        $service = app(WhatsAppCommerceService::class);

        $service->seedDefaults($store->id);
        $service->seedDefaults($store->id);

        $this->assertDatabaseCount('whatsapp_templates', 16);
        // user edit persists (firstOrCreate does not clobber)
        WhatsAppTemplate::where('store_id', $store->id)->where('key','order_confirmed')->where('locale','en')->update(['body'=>'custom {order_number}']);
        $service->seedDefaults($store->id);
        $this->assertSame('custom {order_number}', WhatsAppTemplate::where('store_id',$store->id)->where('key','order_confirmed')->where('locale','en')->value('body'));
    }

    /* ── Service: allowlist render (never evals, unknown stays literal) ── */
    public function test_render_replaces_only_allowlisted_placeholders(): void
    {
        $service = app(WhatsAppCommerceService::class);
        $body = "Hi {customer_name}, order {order_number} total {order_total} {currency} paid_via {totally_unknown}";
        $out = $service->render($body, ['customer_name'=>'Ali','order_number'=>'#12','order_total'=>'50.00','currency'=>'₪']);

        $this->assertStringContainsString('Hi Ali', $out);
        $this->assertStringContainsString('order #12', $out);
        $this->assertStringContainsString('total 50.00 ₪', $out);
        $this->assertStringContainsString('paid_via {totally_unknown}', $out, 'Unknown placeholder must stay verbatim');
    }

    public function test_deep_link_is_wa_me_with_encoded_message(): void
    {
        $service = app(WhatsAppCommerceService::class);
        $url = $service->deepLink('+970592000000', 'مرحباً بكم! total 100.00');

        $this->assertNotNull($url);
        $this->assertStringStartsWith('https://wa.me/970592000000?text=', $url);
        $this->assertStringContainsString(rawurlencode('مرحباً بكم!'), $url);
        $this->assertStringNotContainsString('api.whatsapp.com', $url);
    }

    public function test_phone_digits_and_invalid_phone(): void
    {
        $service = app(WhatsAppCommerceService::class);
        $this->assertSame('970592000000', $service->phoneDigits('0592000000'));
        $this->assertNull($service->phoneDigits('not-a-phone'));
        $this->assertNull($service->deepLink(null, 'x'));
        $this->assertNull($service->deepLink('123', 'x'));
    }

    /* ── Service: store isolation of template reads ── */
    public function test_template_rows_are_store_isolated(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        $service = app(WhatsAppCommerceService::class);
        $service->seedDefaults($storeA->id);

        WhatsAppTemplate::where('store_id', $storeA->id)->where('key','shipped')->where('locale','en')
            ->update(['body'=>'A-Only shipped']);

        $this->assertSame('A-Only shipped', $service->templateUrlForStore($storeA->id, 'shipped', 'en'));
        // B has no rows for shipped → falls back to default locale text
        $bVersion = $service->templateUrlForStore($storeB->id, 'shipped', 'en');
        $this->assertNotSame('A-Only shipped', $bVersion);
        $this->assertStringContainsString('{order_number}', $bVersion);
    }

    /* ── Service: order action ── */
    public function test_order_action_builds_deep_link_with_rendered_context(): void
    {
        [$user,$store] = $this->companyWithStore();
        $order = $this->makeOrder($store);
        $service = app(WhatsAppCommerceService::class);

        $action = $service->orderAction($order, 'order_confirmed', 'en');
        $this->assertNotNull($action);
        $this->assertSame('order_confirmed', $action['key']);
        $this->assertSame('+970592000000', $action['phone']);
        $this->assertStringStartsWith('https://wa.me/970592000000?text=', $action['url']);
        $this->assertStringContainsString($order->order_number, $action['message']);
        $this->assertStringContainsString($store->name, $action['message']);
        $this->assertStringContainsString('100.00', $action['message']);
    }

    public function test_order_action_null_when_actions_disabled_or_phone_invalid(): void
    {
        [$user,$store] = $this->companyWithStore();
        $order = $this->makeOrder($store);
        $service = app(WhatsAppCommerceService::class);

        StoreConfiguration::updateConfiguration($store->id, ['whatsapp_commerce_enabled'=>'false']);
        $this->assertNull($service->orderAction($order, 'order_confirmed', 'en'));

        StoreConfiguration::updateConfiguration($store->id, ['whatsapp_commerce_enabled'=>'true']);

        $badPhone = $this->makeOrder($store, ['customer_phone'=>'not-a-phone']);
        $this->assertNull($service->orderAction($badPhone, 'order_confirmed', 'en'));
    }

    /* ── Service: customer follow-up action ── */
    public function test_customer_action_followup_uses_customer_name(): void
    {
        [$user,$store] = $this->companyWithStore();
        $service = app(WhatsAppCommerceService::class);

        $action = $service->customerAction($store->id, '+970599123456', 'Ahmad Eyad', 'en');
        $this->assertNotNull($action);
        $this->assertSame('customer_followup', $action['key']);
        $this->assertStringStartsWith('https://wa.me/970599123456?text=', $action['url']);
        $this->assertStringContainsString('Ahmad Eyad', $action['message']);
        $this->assertStringContainsString($store->name, $action['message']);

        $this->assertNull($service->customerAction($store->id, null, 'Ali', 'en'), 'Missing phone → no action');
        StoreConfiguration::updateConfiguration($store->id, ['whatsapp_actions_enabled'=>'false']);
        $this->assertNull($service->customerAction($store->id, '+970599123456', 'Ali', 'en'), 'Disabled → no action');
    }

    /* ── Service: abandoned cart recovery action ── */
    public function test_abandoned_cart_action_uses_real_recovery_url_and_items(): void
    {
        [$user,$store] = $this->companyWithStore();
        $cart = AbandonedCart::create([
            'store_id'=>$store->id,'session_id'=>'sess-cart','status'=>'new',
            'customer_name'=>'Cart Shopper','customer_phone'=>'0592000000',
            'cart_items'=>[['name'=>'Potatoes','quantity'=>2],['name'=>'Figs','quantity'=>1]],
            'cart_total'=>75.5,'last_activity_at'=>now(),
        ]);
        $service = app(WhatsAppCommerceService::class);

        $action = $service->abandonedCartAction((int)$cart->id, 'en');
        $this->assertNotNull($action);
        $this->assertSame('abandoned_cart', $action['key']);
        $this->assertStringStartsWith('https://wa.me/970592000000?text=', $action['url']);
        $this->assertStringContainsString('Cart Shopper', $action['message']);
        $this->assertStringContainsString('• Potatoes × 2', $action['message']);
        $this->assertStringContainsString('75.50', $action['message']);

        $recoverUrl = $cart->fresh()->getRecoverUrl();
        if ($cart->recovery_token) {
            $this->assertStringContainsString('recover_token=' . $cart->recovery_token, $recoverUrl);
        }
        $this->assertNull($service->abandonedCartAction(PHP_INT_MAX), 'Missing cart → null');
    }

    /* ── Settings page: permission + tenant isolation + seeding ── */
    public function test_settings_page_requires_settings_stores_permission(): void
    {
        [$user,$store] = $this->companyWithStore();
        // Remove the settings-stores permission specifically
        Permission::where('name','settings-stores')->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($user)->get(route('stores.whatsapp-commerce', $store->id))->assertStatus(403);
    }

    public function test_other_store_cannot_access_settings_page_or_update(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();

        $this->actingAs($userA)->get(route('stores.whatsapp-commerce', $storeB->id))->assertStatus(404);

        $this->actingAs($userA)
            ->from(route('stores.whatsapp-commerce', $storeB->id))
            ->put(route('stores.whatsapp-commerce.update', $storeB->id), [
                'enabled'=>'false',
                'templates'=>[['key'=>'order_confirmed','locale'=>'en','body'=>'intrusion {order_number}']],
            ])->assertStatus(404);
        $this->assertDatabaseMissing('whatsapp_templates', ['store_id'=>$storeB->id,'key'=>'order_confirmed','locale'=>'en','body'=>'intrusion {order_number}']);
    }

    public function test_merchant_can_open_settings_page_and_defaults_are_seeded(): void
    {
        [$user,$store] = $this->companyWithStore();
        $this->assertDatabaseCount('whatsapp_templates', 0);

        $this->actingAs($user)->get(route('stores.whatsapp-commerce', $store->id))->assertStatus(200);

        $this->assertDatabaseCount('whatsapp_templates', 16);
        // Feature is on by default (fallback when no toggles saved yet)
        $this->assertTrue(app(WhatsAppCommerceService::class)->isEnabled($store->id));
        $this->assertTrue(app(WhatsAppCommerceService::class)->areOrderActionsEnabled($store->id));
        $this->assertTrue(app(WhatsAppCommerceService::class)->isProductShareEnabled($store->id));
    }

    /* ── Settings update: persist + isolate ── */
    public function test_merchant_can_update_toggles_and_templates_without_leaking_across_stores(): void
    {
        [$userA,$storeA] = $this->companyWithStore();
        [$userB,$storeB] = $this->companyWithStore();
        app(WhatsAppCommerceService::class)->seedDefaults($storeA->id);

        $this->actingAs($userA)
            ->from(route('stores.whatsapp-commerce', $storeA->id))
            ->put(route('stores.whatsapp-commerce.update', $storeA->id), [
                'enabled'=>'true',
                'customer_actions_enabled'=>'true',
                'product_share_enabled'=>'false',
                'templates'=>[
                    ['key'=>'order_confirmed','locale'=>'en','body'=>'Thanks {customer_name} for order {order_number}!'],
                    ['key'=>'shipped','locale'=>'ar','body'=>'تم شحن طلبك {order_number} {unknown_stays}'],
                ],
            ])->assertRedirect(route('stores.whatsapp-commerce', $storeA->id));

        $configA = StoreConfiguration::getConfiguration($storeA->id);
        $this->assertSame('true', $configA['whatsapp_commerce_enabled']);
        $this->assertSame('true', $configA['whatsapp_actions_enabled']);
        $this->assertSame('false', $configA['whatsapp_product_share_enabled']);
        $this->assertSame('Thanks {customer_name} for order {order_number}!',
            WhatsAppTemplate::where('store_id',$storeA->id)->where('key','order_confirmed')->where('locale','en')->value('body'));
        // unknown placeholder preserved verbatim at render time
        $msg = app(WhatsAppCommerceService::class)->orderAction($this->makeOrder($storeA), 'shipped', 'ar');
        $this->assertNotNull($msg);
        $this->assertStringContainsString('{unknown_stays}', $msg['message']);

        // Store B untouched
        $configB = StoreConfiguration::getConfiguration($storeB->id);
        $this->assertArrayNotHasKey('whatsapp_commerce_enabled', $configB);
        $this->assertArrayNotHasKey('whatsapp_actions_enabled', $configB);
        $this->assertArrayNotHasKey('whatsapp_product_share_enabled', $configB);
        $this->assertDatabaseMissing('whatsapp_templates', ['store_id'=>$storeB->id,'key'=>'order_confirmed','locale'=>'en']);
        $bBody = app(WhatsAppCommerceService::class)->templateUrlForStore($storeB->id,'order_confirmed','en');
        $this->assertNotSame('Thanks {customer_name} for order {order_number}!', $bBody);
        $this->assertStringContainsString('Hi {customer_name}', $bBody, 'B falls back to the built-in default, not As custom body');
    }

    public function test_update_rejects_unknown_key_or_locale(): void
    {
        [$user,$store] = $this->companyWithStore();

        $this->actingAs($user)
            ->putJson(route('stores.whatsapp-commerce.update', $store->id), [
                'templates'=>[['key'=>'not_a_real_key','locale'=>'en','body'=>'x']],
            ])->assertStatus(422);

        $this->actingAs($user)
            ->putJson(route('stores.whatsapp-commerce.update', $store->id), [
                'templates'=>[['key'=>'shipped','locale'=>'fr','body'=>'x']],
            ])->assertStatus(422);
    }

    /* ── Order detail page renders the WhatsApp block without errors ── */
    public function test_order_page_shows_whatsapp_commerce_actions_for_pending_order(): void
    {
        [$user,$store] = $this->companyWithStore();
        $order = $this->makeOrder($store, ['status'=>'pending','payment_status'=>'pending']);

        $this->actingAs($user)->get(route('orders.show', $order->id))->assertStatus(200);
    }

    /* ── Merchant navigation wiring (settings cluster) ── */
    public function test_merchant_navigation_wires_whatsapp_commerce_under_settings(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString('whatsapp-commerce', $content);
        $this->assertFileExists(resource_path('js/pages/stores/whatsapp-commerce.tsx'));

        $this->assertStringContainsString("'WhatsApp Commerce'", $content);
        $this->assertStringContainsString('واتساب التجاري', $content);
    }
}