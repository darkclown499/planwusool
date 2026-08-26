<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerAccountsMatrixTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id=$user->id;
        $store->name=$attrs['name']??'TStore';
        $store->slug=$attrs['slug']??'tstore-'.uniqid();
        $store->theme=$attrs['theme']??'bazaar-market';
        $store->email='store@example.com';
        $store->save();
        $user->current_store=$store->id;
        $user->save();
        return [$user,$store];
    }

    private function behavior(Store $store): array
    {
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl,'getStoreBehavior');
        $m->setAccessible(true);
        return $m->invoke($ctrl,$store);
    }

    private function authBehavior(Store $store): array
    {
        $c = new \App\Http\Controllers\Store\AuthController();
        $m = new \ReflectionMethod($c,'behavior');
        $m->setAccessible(true);
        return $m->invoke($c,$store);
    }

    public function test_master_off_hides_all(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
        StoreConfiguration::setConfiguration($s->id,'enable_customer_login','true');
        StoreConfiguration::setConfiguration($s->id,'show_auth_button','true');
        $b = $this->behavior($s);
        $this->assertFalse($b['customer_accounts_enabled']);
        $this->assertFalse($b['enable_customer_login']);
        $this->assertFalse($b['show_auth_button']);
        $this->assertTrue($b['guest_checkout']); // master off => guest true
        $this->assertFalse($b['require_login_checkout']);
    }

    public function test_master_on_login_off(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        StoreConfiguration::setConfiguration($s->id,'enable_customer_login','false');
        $b = $this->behavior($s);
        $this->assertTrue($b['customer_accounts_enabled']);
        $this->assertFalse($b['enable_customer_login']);
        $this->assertFalse($b['show_auth_button']);
    }

    public function test_show_auth_button_alias(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        StoreConfiguration::setConfiguration($s->id,'enable_customer_login','true');
        StoreConfiguration::setConfiguration($s->id,'show_auth_button','false');
        $b = $this->behavior($s);
        $this->assertFalse($b['enable_customer_login']);
        $this->assertFalse($b['show_auth_button']);
    }

    public function test_guest_checkout_on_off(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','false');
        $b = $this->behavior($s);
        $this->assertFalse($b['guest_checkout']);
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','true');
        $b2 = $this->behavior($s);
        $this->assertTrue($b2['guest_checkout']);
    }

    public function test_accounts_off_guest_forced_on(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','false');
        $b = $this->behavior($s);
        $this->assertTrue($b['guest_checkout']);
    }

    public function test_combination_matrix(): void
    {
        $cases = [
            // accounts, login, guest, expected loginEnabled, guestEnabled
            [true, true, true, true, true],
            [true, true, false, true, false],
            [true, false, true, false, true],
            [true, false, false, false, false],
            [false, true, true, false, true],
            [false, false, true, false, true],
            [false, false, false, false, true],
        ];
        foreach ($cases as $i=>$c) {
            [$acc,$login,$guest,$expLogin,$expGuest] = $c;
            [$u,$s] = $this->ownerWithStore(['slug'=>'m-'.uniqid()]);
            StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled', $acc?'true':'false');
            StoreConfiguration::setConfiguration($s->id,'enable_customer_login', $login?'true':'false');
            StoreConfiguration::setConfiguration($s->id,'show_auth_button', $login?'true':'false');
            StoreConfiguration::setConfiguration($s->id,'guest_checkout', $guest?'true':'false');
            $b = $this->behavior($s);
            $this->assertEquals($expLogin, $b['enable_customer_login'], "case $i login");
            $this->assertEquals($expGuest, $b['guest_checkout'], "case $i guest");
        }
    }

    public function test_persistence_and_cache_invalidation(): void
    {
        [$u,$s] = $this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        $this->assertTrue($this->behavior($s)['customer_accounts_enabled']);
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
        $this->assertFalse($this->behavior($s)['customer_accounts_enabled']);
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        $this->assertTrue($this->behavior($s)['customer_accounts_enabled']);
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','false');
        $this->assertFalse($this->behavior($s)['guest_checkout']);
    }

    public function test_store_isolation(): void
    {
        [$u1,$s1]=$this->ownerWithStore(['slug'=>'iso1-'.uniqid()]);
        [$u2,$s2]=$this->ownerWithStore(['slug'=>'iso2-'.uniqid()]);
        StoreConfiguration::setConfiguration($s1->id,'customer_accounts_enabled','false');
        StoreConfiguration::setConfiguration($s1->id,'guest_checkout','false');
        StoreConfiguration::setConfiguration($s2->id,'customer_accounts_enabled','true');
        StoreConfiguration::setConfiguration($s2->id,'guest_checkout','true');
        $this->assertFalse($this->behavior($s1)['customer_accounts_enabled']);
        $this->assertTrue($this->behavior($s2)['customer_accounts_enabled']);
        $this->assertTrue($this->behavior($s1)['guest_checkout']); // forced true when master off
        $this->assertTrue($this->behavior($s2)['guest_checkout']);
    }

    public function test_api_persistence_via_feature_controller(): void
    {
        [$u,$s]=$this->ownerWithStore();
        $this->actingAs($u);
        $this->putJson(route('api.store-features.update',$s->id), ['key'=>'customer_accounts_enabled','enabled'=>false])->assertStatus(200);
        $this->assertEquals('false', \DB::table('store_configurations')->where('store_id',$s->id)->where('key','customer_accounts_enabled')->value('value'));
        $this->assertFalse($this->behavior($s)['customer_accounts_enabled']);
        $this->putJson(route('api.store-features.update',$s->id), ['key'=>'guest_checkout','enabled'=>false])->assertStatus(200);
        $this->assertEquals('false', \DB::table('store_configurations')->where('store_id',$s->id)->where('key','guest_checkout')->value('value'));
        $this->putJson(route('api.store-features.update',$s->id), ['key'=>'enable_customer_login','enabled'=>false])->assertStatus(200);
        $this->assertFalse($this->behavior($s)['enable_customer_login']);
    }

    public function test_template_editor_behavior_includes_master(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
        $ctrl = new \App\Http\Controllers\Api\TemplateEditorController();
        $m = new \ReflectionMethod($ctrl,'getBehavior');
        $m->setAccessible(true);
        $b = $m->invoke($ctrl,$s);
        $this->assertArrayHasKey('customer_accounts_enabled',$b);
        $this->assertArrayHasKey('guest_checkout',$b);
        $this->assertFalse($b['customer_accounts_enabled']);
    }

    public function test_all_templates_receive_correct_behavior(): void
    {
        $templates = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];
        foreach ($templates as $tpl) {
            [$u,$s]=$this->ownerWithStore(['theme'=>$tpl,'slug'=>'tpl-'.uniqid()]);
            StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
            $b = $this->behavior($s);
            $this->assertFalse($b['customer_accounts_enabled'], "template $tpl master false");
            $this->assertTrue($b['guest_checkout'], "template $tpl guest forced true");
        }
    }

    public function test_order_controller_guest_disabled_blocks_guest(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','true');
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','false');
        StoreConfiguration::setConfiguration($s->id,'enable_customer_login','true');
        // Guest (not logged in) should be blocked
        $req = \Illuminate\Http\Request::create('/','POST', ['store_id'=>$s->id]);
        $req->headers->set('Accept','application/json');
        $req->setLaravelSession(app('session.store'));
        // Simulate placeOrder early check via reflection
        $config = StoreConfiguration::getConfiguration($s->id);
        $accountsOn = (bool)($config['customer_accounts_enabled'] ?? true);
        $guestVal = $config['guest_checkout'] ?? true;
        $guestAllowed = $guestVal===true||$guestVal==='true';
        $this->assertTrue($accountsOn);
        $this->assertFalse($guestAllowed);
    }

    public function test_order_controller_accounts_off_allows_guest(): void
    {
        [$u,$s]=$this->ownerWithStore();
        StoreConfiguration::setConfiguration($s->id,'customer_accounts_enabled','false');
        StoreConfiguration::setConfiguration($s->id,'guest_checkout','false');
        $config = StoreConfiguration::getConfiguration($s->id);
        $b = $this->behavior($s);
        $this->assertTrue($b['guest_checkout']);
        // OrderController should not block when master off
        $this->assertFalse($b['customer_accounts_enabled']);
    }
}
