<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\StoreWhatsappIntegration;
use App\Services\PhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MerchantWhatsAppNotificationTestPerStore extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Test Store';
        $store->slug = $attrs['slug'] ?? 'test-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createIntegration(Store $store, array $overrides = []): StoreWhatsappIntegration
    {
        return StoreWhatsappIntegration::create(array_merge([
            'store_id' => $store->id,
            'provider' => 'meta',
            'access_token' => 'test_token_' . uniqid(),
            'phone_number_id' => '123456789',
            'waba_id' => '987654321',
            'business_phone' => '+970599000000',
            'notification_phone' => '+970591234567',
            'is_enabled' => true,
            'connection_status' => 'connected',
            'last_verified_at' => now(),
        ], $overrides));
    }

    public function test_merchant_can_save_own_integration(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $response = $this->put(route('stores.notifications.whatsapp.update', $store->id), [
            'access_token' => 'EAAGtest123',
            'phone_number_id' => '111222333',
            'waba_id' => '444555666',
            'business_phone' => '0599000000',
            'notification_phone' => '0591234567',
            'is_enabled' => true,
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('store_whatsapp_integrations', ['store_id' => $store->id, 'phone_number_id' => '111222333']);
        $integration = StoreWhatsappIntegration::where('store_id', $store->id)->first();
        $this->assertNotEquals('EAAGtest123', $integration->getAttributes()['access_token']); // should be encrypted
        $this->assertEquals('EAAGtest123', $integration->access_token); // decrypted
    }

    public function test_token_encrypted_at_rest(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $integration = $this->createIntegration($store, ['access_token' => 'secret123']);
        $raw = $integration->getAttributes()['access_token'];
        $this->assertNotEquals('secret123', $raw);
        $this->assertEquals('secret123', $integration->access_token);
    }

    public function test_token_never_returned_to_frontend(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['access_token' => 'secret123']);
        $this->actingAs($user);
        $response = $this->get(route('stores.notifications.whatsapp', $store->id));
        $response->assertStatus(200);
        $content = $response->getContent();
        $this->assertStringNotContainsString('secret123', $content);
    }

    public function test_store_a_cannot_read_store_b_integration(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->createIntegration($storeB, ['access_token' => 'secretB', 'phone_number_id' => '999']);
        $this->actingAs($userA);
        $response = $this->get(route('stores.notifications.whatsapp', $storeB->id));
        $response->assertStatus(403);
    }

    public function test_store_a_cannot_update_store_b_integration(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->actingAs($userA);
        $response = $this->put(route('stores.notifications.whatsapp.update', $storeB->id), [
            'access_token' => 'hacked',
            'phone_number_id' => '123',
            'is_enabled' => true,
            'notification_phone' => '0591234567',
        ]);
        $response->assertStatus(403);
    }

    public function test_invalid_token_connection_failed(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $integration = $this->createIntegration($store, ['access_token' => 'invalid', 'phone_number_id' => '123', 'connection_status' => 'disconnected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Invalid token']], 400)]);
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->verifyConnection($integration);
        $this->assertFalse($result['connected']);
        $this->assertEquals('error', $integration->fresh()->connection_status);
    }

    public function test_valid_meta_response_connected(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $integration = $this->createIntegration($store, ['access_token' => 'valid', 'phone_number_id' => '123', 'connection_status' => 'disconnected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['display_phone_number' => '+970599000000', 'verified_name' => 'Test'], 200)]);
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->verifyConnection($integration);
        $this->assertTrue($result['connected']);
        $this->assertEquals('connected', $integration->fresh()->connection_status);
    }

    public function test_test_message_uses_correct_store_credentials(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['access_token' => 'tokenA', 'phone_number_id' => '111', 'notification_phone' => '+970591111111', 'is_enabled' => true, 'connection_status' => 'connected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test']]], 200)]);
        $this->actingAs($user);
        $response = $this->postJson(route('stores.notifications.whatsapp.test', $store->id));
        $response->assertStatus(200)->assertJson(['success' => true]);
        Http::assertSent(fn ($req) => ($req->data()['to'] ?? '') === '970591111111' && str_contains($req->url(), '111'));
    }

    public function test_order_created_uses_correct_store_credentials(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->createIntegration($storeA, ['access_token' => 'tokenA', 'phone_number_id' => '111', 'notification_phone' => '+970591111111', 'is_enabled' => true, 'connection_status' => 'connected']);
        $this->createIntegration($storeB, ['access_token' => 'tokenB', 'phone_number_id' => '222', 'notification_phone' => '+970592222222', 'is_enabled' => true, 'connection_status' => 'connected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);

        $orderA = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $storeA->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'a@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);

        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($orderA);
        Http::assertSent(fn ($req) => ($req->data()['to'] ?? '') === '970591111111');
        Http::assertNotSent(fn ($req) => ($req->data()['to'] ?? '') === '970592222222');
    }

    public function test_disabled_integration_no_whatsapp(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['is_enabled' => false, 'connection_status' => 'connected']);
        Http::fake();
        $order = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'c@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        Http::assertNothingSent();
    }

    public function test_disconnected_integration_no_whatsapp(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['is_enabled' => true, 'connection_status' => 'disconnected']);
        Http::fake();
        $order = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'c@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
    }

    public function test_meta_failure_order_still_created(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['access_token' => 'token', 'phone_number_id' => '123', 'is_enabled' => true, 'connection_status' => 'connected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => 'failed'], 500)]);
        $order = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'c@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);
        $result = app(\App\Services\MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_duplicate_order_created_one_whatsapp_only(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['access_token' => 'token', 'phone_number_id' => '123', 'is_enabled' => true, 'connection_status' => 'connected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);
        $order = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'c@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);
        $notifier = app(\App\Services\MerchantWhatsAppNotifier::class);
        $first = $notifier->notify($order);
        $second = $notifier->notify($order);
        $this->assertTrue($first['sent']);
        $this->assertFalse($second['sent']);
        $this->assertEquals('duplicate', $second['reason']);
        Http::assertSentCount(1);
    }

    public function test_no_credentials_leaked_to_logs_api(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['access_token' => 'supersecret123', 'phone_number_id' => '123', 'is_enabled' => true, 'connection_status' => 'connected']);
        $this->actingAs($user);
        $response = $this->getJson(route('stores.notifications.whatsapp.status', $store->id));
        $response->assertStatus(200);
        $content = json_encode($response->json());
        $this->assertStringNotContainsString('supersecret123', $content);
    }

    public function test_phone_normalization_works(): void
    {
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('0591234567'));
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('+970591234567'));
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('970591234567'));
        $this->assertEquals('+972591234567', PhoneNormalizer::normalize('+972591234567'));
    }

    public function test_disconnect_works(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->createIntegration($store, ['is_enabled' => true, 'connection_status' => 'connected', 'access_token' => 'token']);
        $this->actingAs($user);
        $response = $this->post(route('stores.notifications.whatsapp.disconnect', $store->id));
        $response->assertStatus(302);
        $this->assertDatabaseHas('store_whatsapp_integrations', ['store_id' => $store->id, 'is_enabled' => false]);
        $integration = StoreWhatsappIntegration::where('store_id', $store->id)->first();
        $this->assertNull($integration->access_token);
        $this->assertEquals('disconnected', $integration->connection_status);
    }

    public function test_store_a_b_simultaneous_isolated(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->createIntegration($storeA, ['access_token' => 'tokenA', 'phone_number_id' => '111', 'notification_phone' => '+970591111111', 'is_enabled' => true, 'connection_status' => 'connected']);
        $this->createIntegration($storeB, ['access_token' => 'tokenB', 'phone_number_id' => '222', 'notification_phone' => '+970592222222', 'is_enabled' => true, 'connection_status' => 'connected']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);

        $orderA = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $storeA->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'a@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);
        $orderB = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $storeB->id,
            'session_id' => 's1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'b@example.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '0590000000',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 50,
            'total_amount' => 50,
            'payment_method' => 'cod',
        ]);

        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($orderA);
        app(\App\Services\MerchantWhatsAppNotifier::class)->notify($orderB);

        Http::assertSent(function ($req) {
            $to = $req->data()['to'] ?? '';
            return $to === '970591111111' || $to === '970592222222';
        });
        $this->assertEquals(2, Http::assertSentCount(2) ? 2 : 2); // just ensure 2 sent
    }
}
