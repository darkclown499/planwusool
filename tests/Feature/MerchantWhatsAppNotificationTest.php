<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Services\MerchantWhatsAppNotifier;
use App\Services\PhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MerchantWhatsAppNotificationTest extends TestCase
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

    private function createProduct(Store $store): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-' . uniqid()]);
        return Product::create(['name' => 'Prod', 'price' => 50, 'store_id' => $store->id, 'category_id' => $cat->id, 'is_active' => true, 'stock' => 10, 'sku' => 'SKU-' . uniqid()]);
    }

    private function setWhatsAppSettings(int $userId, ?int $storeId, bool $enabled, string $number): void
    {
        \App\Models\PaymentSetting::updateOrCreateSetting($userId, 'is_whatsapp_enabled', $enabled ? '1' : '0', $storeId);
        \App\Models\PaymentSetting::updateOrCreateSetting($userId, 'whatsapp_number', $number, $storeId);
    }

    public function test_merchant_can_save_whatsapp_number(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $response = $this->put(route('stores.notifications.whatsapp.update', $store->id), [
            'is_whatsapp_enabled' => true,
            'whatsapp_number' => '0591234567',
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('payment_settings', ['user_id' => $user->id, 'store_id' => $store->id, 'key' => 'whatsapp_number']);
    }

    public function test_invalid_phone_rejected(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->actingAs($user);
        $response = $this->put(route('stores.notifications.whatsapp.update', $store->id), [
            'is_whatsapp_enabled' => true,
            'whatsapp_number' => '123',
        ]);
        $response->assertSessionHasErrors('whatsapp_number');
    }

    public function test_normalized_phone_stored_correctly(): void
    {
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('0591234567'));
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('+970591234567'));
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('970591234567'));
        $this->assertEquals('+972591234567', PhoneNormalizer::normalize('+972591234567'));
        $this->assertEquals('+972591234567', PhoneNormalizer::normalize('972591234567'));
        $this->assertEquals('+970591234567', PhoneNormalizer::normalize('+970 59 123 4567'));
        $this->assertNull(PhoneNormalizer::normalize('123'));
    }

    public function test_order_created_triggers_merchant_notification(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test']]], 200)]);

        $product = $this->createProduct($store);
        CartItem::create(['store_id' => $store->id, 'customer_id' => null, 'session_id' => 'sess1', 'product_id' => $product->id, 'quantity' => 1, 'price' => 50]);
        $order = \App\Models\Order::forceCreate([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess1',
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

        $notifier = app(MerchantWhatsAppNotifier::class);
        $result = $notifier->notify($order);
        $this->assertTrue($result['sent']);
        Http::assertSent(fn ($req) => str_contains($req->url(), 'graph.facebook.com'));
    }

    public function test_cod_order_triggers_merchant_notification(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '0591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test2']]], 200)]);

        $product = $this->createProduct($store);
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
        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertTrue($result['sent']);
    }

    public function test_notification_uses_correct_store_number(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->setWhatsAppSettings($userA->id, $storeA->id, true, '+970591111111');
        $this->setWhatsAppSettings($userB->id, $storeB->id, true, '+970592222222');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);

        $productA = $this->createProduct($storeA);
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

        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);
        app(MerchantWhatsAppNotifier::class)->notify($orderA);
        Http::assertSent(function ($req) {
            $body = $req->data();
            return ($body['to'] ?? '') === '970591111111';
        });
    }

    public function test_store_a_order_never_sends_to_store_b(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->setWhatsAppSettings($userA->id, $storeA->id, true, '+970591111111');
        $this->setWhatsAppSettings($userB->id, $storeB->id, true, '+970592222222');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);

        $productA = $this->createProduct($storeA);
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

        app(MerchantWhatsAppNotifier::class)->notify($orderA);
        Http::assertSent(function ($req) {
            return ($req->data()['to'] ?? '') === '970591111111';
        });
        Http::assertNotSent(function ($req) {
            return ($req->data()['to'] ?? '') === '970592222222';
        });
    }

    public function test_notifications_disabled_nothing_sent(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, false, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake();

        $product = $this->createProduct($store);
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

        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('not_enabled', $result['reason']);
        Http::assertNothingSent();
    }

    public function test_no_phone_nothing_sent(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake();

        $product = $this->createProduct($store);
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

        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('no_number', $result['reason']);
    }

    public function test_provider_missing_order_still_succeeds(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => '', 'services.whatsapp.cloud_token' => null, 'services.whatsapp.phone_number_id' => null]);
        Http::fake();

        $product = $this->createProduct($store);
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

        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertEquals('no_provider', $result['reason']);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_provider_failure_order_still_succeeds(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => 'failed'], 500)]);

        $product = $this->createProduct($store);
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

        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertFalse($result['sent']);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_successful_provider_call_returns_message_id(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.HBgM...']]], 200)]);

        $product = $this->createProduct($store);
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

        $result = app(MerchantWhatsAppNotifier::class)->notify($order);
        $this->assertTrue($result['sent']);
        $this->assertNotNull($result['message_id'] ?? $result['provider']);
    }

    public function test_duplicate_order_created_does_not_duplicate_notification(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid']]], 200)]);

        $product = $this->createProduct($store);
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

        $notifier = app(MerchantWhatsAppNotifier::class);
        $first = $notifier->notify($order);
        $second = $notifier->notify($order);
        $this->assertTrue($first['sent']);
        $this->assertFalse($second['sent']);
        $this->assertEquals('duplicate', $second['reason']);
        Http::assertSentCount(1);
    }

    public function test_test_message_sends_only_to_saved_number(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'test', 'services.whatsapp.phone_number_id' => '123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test']]], 200)]);

        $this->actingAs($user);
        $response = $this->postJson(route('stores.notifications.whatsapp.test', $store->id));
        $response->assertStatus(200)->assertJson(['success' => true]);

        Http::assertSent(function ($req) {
            return ($req->data()['to'] ?? '') === '970591234567';
        });

        // Try to send to arbitrary number via payload should be ignored
        $response2 = $this->postJson(route('stores.notifications.whatsapp.test', $store->id), ['phone' => '+970599999999']);
        $response2->assertStatus(200);
        Http::assertSent(function ($req) {
            // Still should be the saved number, not the arbitrary one
            return ($req->data()['to'] ?? '') === '970591234567';
        });
    }

    public function test_unauthorized_merchant_cannot_trigger_test_for_another_store(): void
    {
        [$userA, $storeA] = $this->ownerWithStore(['slug' => 'store-a-' . uniqid()]);
        [$userB, $storeB] = $this->ownerWithStore(['slug' => 'store-b-' . uniqid()]);
        $this->setWhatsAppSettings($userA->id, $storeA->id, true, '+970591111111');
        $this->setWhatsAppSettings($userB->id, $storeB->id, true, '+970592222222');

        $this->actingAs($userA);
        $response = $this->postJson(route('stores.notifications.whatsapp.test', $storeB->id));
        $response->assertStatus(403);
    }

    public function test_secrets_never_returned_in_api_response(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->setWhatsAppSettings($user->id, $store->id, true, '+970591234567');
        config(['services.whatsapp.provider' => 'meta', 'services.whatsapp.cloud_token' => 'secret123', 'services.whatsapp.phone_number_id' => '999']);

        $this->actingAs($user);
        $response = $this->getJson(route('stores.notifications.whatsapp.status', $store->id));
        $response->assertStatus(200);
        $content = json_encode($response->json());
        $this->assertStringNotContainsString('secret123', $content);
        $this->assertStringNotContainsString('test', $content);
        $this->assertStringNotContainsString('WHATSAPP', $content);
    }
}
