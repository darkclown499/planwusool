<?php

namespace Tests\Feature;

use App\Jobs\CreateCourierShipment;
use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreCourierIntegration;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class CourierWebhookAuthTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name'=>'Pro-'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'Test Store';
        $store->slug = $attrs['slug'] ?? 'test-'.uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user,$store];
    }

    private function createShipping(Store $store, StoreCourierIntegration $integration = null): Shipping
    {
        return Shipping::create([
            'store_id'=>$store->id,
            'name'=>'Courier Shipping',
            'type'=>'flat_rate',
            'cost'=>20,
            'is_active'=>true,
            'courier_integration_id'=>$integration?->id,
            'fulfillment_type'=> $integration ? 'courier' : 'manual',
        ]);
    }

    private function createOrder(Store $store, Shipping $shipping = null): Order
    {
        return Order::forceCreate([
            'order_number'=> Order::generateOrderNumber(),
            'store_id'=>$store->id,
            'session_id'=>'s1',
            'status'=>'pending',
            'payment_status'=>'pending',
            'customer_email'=>'c@example.com',
            'customer_first_name'=>'A',
            'customer_last_name'=>'B',
            'customer_phone'=>'0590000000',
            'shipping_address'=>'Addr',
            'shipping_city'=>'Nablus',
            'shipping_state'=>'WB',
            'shipping_country'=>'PS',
            'billing_address'=>'Addr',
            'billing_city'=>'Nablus',
            'billing_state'=>'WB',
            'billing_country'=>'PS',
            'subtotal'=>50,
            'total_amount'=>70,
            'payment_method'=>'cod',
            'shipping_method_id'=>$shipping?->id,
            'shipping_amount'=>20,
        ]);
    }

    /**
     * Store + connected mock integration (optionally with webhook secret) + shipped order.
     */
    private function scopedFixture(?string $secret = 'mysecret', bool $active = true, string $status = 'connected'): array
    {
        [$user,$store] = $this->ownerWithStore();
        $integ = StoreCourierIntegration::create([
            'store_id'=>$store->id,
            'provider'=>'mock',
            'credentials'=>['api_key'=>'valid_mock_key'],
            'status'=>$status,
            'settings'=> $secret === null ? [] : ['webhook_secret'=>$secret],
            'is_active'=>$active,
        ]);
        $shipping = $this->createShipping($store,$integ);
        $order = $this->createOrder($store,$shipping);
        (new CreateCourierShipment($order->id))->handle();
        $shipment = OrderShipment::where('order_id',$order->id)->first();
        $this->assertNotNull($shipment);
        return [$store,$integ,$order,$shipment];
    }

    private function webhookBody(OrderShipment $shipment, string $status = 'delivered'): array
    {
        return ['tracking_number'=>$shipment->tracking_number,'status'=>$status];
    }

    private function sign(string $payload, string $secret): string
    {
        return hash_hmac('sha256', $payload, $secret);
    }

    public function test_valid_authenticated_webhook_accepted(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $payload = json_encode($this->webhookBody($shipment));
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'mysecret')]);
        $res->assertStatus(200);
        $this->assertEquals('delivered', $shipment->fresh()->status);
    }

    public function test_invalid_signature_denied(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $payload = json_encode($this->webhookBody($shipment));
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>'not-the-signature']);
        $res->assertStatus(401);
        $this->assertEquals('created', $shipment->fresh()->status);
    }

    public function test_missing_signature_denied(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $res = $this->postJson('/webhook/courier/mock', $this->webhookBody($shipment));
        $res->assertStatus(401);
        $this->assertEquals('created', $shipment->fresh()->status);
    }

    public function test_missing_secret_denied(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture(null);
        // Even a "correctly shaped" signature must not be trusted when no secret is configured.
        $payload = json_encode($this->webhookBody($shipment));
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'whatever')]);
        $res->assertStatus(401);
        $this->assertEquals('created', $shipment->fresh()->status);

        // And with no signature at all.
        $res2 = $this->postJson('/webhook/courier/mock', $this->webhookBody($shipment));
        $res2->assertStatus(401);
        $this->assertEquals('created', $shipment->fresh()->status);
    }

    public function test_empty_secret_does_not_trust_all(): void
    {
        foreach (['', '   '] as $empty) {
            [$store,$integ,$order,$shipment] = $this->scopedFixture($empty);
            $payload = json_encode($this->webhookBody($shipment));
            $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'anything')]);
            $res->assertStatus(401);
            $this->assertEquals('created', $shipment->fresh()->status);
        }
    }

    public function test_store_a_webhook_cannot_mutate_store_b(): void
    {
        [$storeA,$integA,$orderA,$shipA] = $this->scopedFixture('secret-a');
        // Store B has its own secret; attacker only knows Store A's.
        [$storeB,$integB,$orderB,$shipB] = $this->scopedFixture('secret-b');

        $payload = json_encode($this->webhookBody($shipB));
        // Signed with Store A's secret — must NOT be accepted for Store B's shipment.
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'secret-a')]);
        $res->assertStatus(401);
        $this->assertEquals('created', $shipB->fresh()->status);

        // Store B with NO webhook secret at all must also stay protected.
        [$storeC,$integC,$orderC,$shipC] = $this->scopedFixture(null);
        $payload = json_encode($this->webhookBody($shipC));
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'secret-a')]);
        $res->assertStatus(401);
        $this->assertEquals('created', $shipC->fresh()->status);
    }

    public function test_invalid_webhook_causes_zero_state_mutation(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $before = $shipment->fresh()->only(['status','provider_status','tracking_number','external_id','courier_integration_id','delivered_at']);
        $orderBefore = $order->fresh()->only(['status','payment_status','tracking_number']);

        $payload = json_encode($this->webhookBody($shipment));
        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>'bogus']);
        $res->assertStatus(401);

        $this->assertEquals($before, $shipment->fresh()->only(['status','provider_status','tracking_number','external_id','courier_integration_id','delivered_at']));
        $this->assertEquals($orderBefore, $order->fresh()->only(['status','payment_status','tracking_number']));
        $this->assertDatabaseHas('order_shipments', ['id'=>$shipment->id, 'status'=>'created']);
        $this->assertDatabaseMissing('delivery_assignments', ['store_id'=>$store->id]);
    }

    public function test_repeated_valid_webhook_is_idempotent(): void
    {
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $payload = json_encode($this->webhookBody($shipment));

        try {
            Carbon::setTestNow('2026-01-01 10:00:00');
            $r1 = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'mysecret')]);
            $r1->assertStatus(200);
            $first = $shipment->fresh();
            $this->assertEquals('delivered', $first->status);
            $firstDeliveredAt = $first->delivered_at;
            $this->assertNotNull($firstDeliveredAt);

            Carbon::setTestNow('2026-01-01 11:00:00');
            $r2 = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'mysecret')]);
            $r2->assertStatus(200);
            $second = $shipment->fresh();
            $this->assertEquals('delivered', $second->status);
            $this->assertEquals($firstDeliveredAt, $second->delivered_at);
        } finally {
            Carbon::setTestNow();
        }

        $this->assertEquals(1, OrderShipment::where('order_id',$order->id)->count());
    }

    public function test_unknown_provider_and_integration_fail_closed(): void
    {
        // Unknown provider slug.
        $this->postJson('/webhook/courier/not-a-provider', ['tracking_number'=>'T1','status'=>'delivered'])
            ->assertStatus(404);

        // No shipment matches the tracking number.
        $this->postJson('/webhook/courier/mock', ['tracking_number'=>'TRK99999999','status'=>'delivered'])
            ->assertStatus(404);

        // Integration was removed -> fail closed.
        [$store,$integ,$order,$shipment] = $this->scopedFixture('mysecret');
        $integ->delete();
        $payload = json_encode($this->webhookBody($shipment));
        $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>$this->sign($payload,'mysecret')])
            ->assertStatus(404);
    }

    public function test_secret_not_exposed_in_response_or_logging(): void
    {
        $logged = [];
        Log::listen(function (\Illuminate\Log\Events\MessageLogged $event) use (&$logged) {
            $logged[] = $event->message . ' ' . json_encode($event->context);
        });

        [$store,$integ,$order,$shipment] = $this->scopedFixture('super-sensitive-secret');
        $payload = json_encode($this->webhookBody($shipment));

        $res = $this->postJson('/webhook/courier/mock', json_decode($payload,true), ['X-Courier-Signature'=>'attacker-signature-value']);
        $res->assertStatus(401);
        $res->assertStatus(401);
        $body = $res->getContent();
        $this->assertStringNotContainsString('super-sensitive-secret', $body);
        $this->assertStringNotContainsString('attacker-signature-value', $body);

        // Missing-signature denial path too.
        $res2 = $this->postJson('/webhook/courier/mock', $this->webhookBody($shipment));
        $res2->assertStatus(401);
        $this->assertStringNotContainsString('super-sensitive-secret', $res2->getContent());

        // No log line may expose the secret or a signature value.
        foreach ($logged as $line) {
            $this->assertStringNotContainsString('super-sensitive-secret', $line);
            $this->assertStringNotContainsString('attacker-signature-value', $line);
        }
    }
}