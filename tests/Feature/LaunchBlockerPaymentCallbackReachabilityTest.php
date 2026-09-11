<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Launch blocker P1-4 (reachability): the store-level payment callbacks must
 * actually be REACHABLE over HTTP through the real router + middleware stack.
 *
 * Root cause being fixed: routes/web.php registers store.midtrans.callback,
 * store.skrill.callback, store.coingate.callback (and the other store
 * payment routes) inside the `{storeSlug}.{store_domain}` group. The router
 * matches them, but the `web` group's DomainResolver short-circuits any
 * non-store/* subdomain path into handleStoreRequest(), which has no
 * midtrans/skrill/coingate case and aborts(404) BEFORE store.status,
 * webhook.signature, or the controller ever run.
 *
 * These tests exercise the REAL route through the REAL middleware stack
 * (DomainResolver -> VerifyDashboardOrigin -> store.status -> webhook.signature
 * -> controller) via postJson() on the {slug}.localhost host. They do NOT
 * call controller methods directly.
 *
 * Contract after the fix:
 *  - valid signed Midtrans callback reaches the controller and marks paid (200);
 *  - invalid Midtrans signature still denied (403) through the full stack;
 *  - valid Skrill IPN reaches the controller and marks paid (200 "OK");
 *  - Skrill rejected IPN still returns "OK" without marking paid;
 *  - CoinGate callback reaches the controller (400 gateway-not-configured,
 *    no outbound API call in the unconfigured path);
 *  - unknown store-subdomain paths still 404;
 *  - foreign/main-domain posts to the callback path still 404;
 *  - storefront home + dashboard routing unchanged;
 *  - unpublished (disabled) store still serves StoreDisabled 503.
 */
class LaunchBlockerPaymentCallbackReachabilityTest extends TestCase
{
    use RefreshDatabase;

    private const SERVER_KEY = 'STORE-server-key-reach';

    private function makePlan(): Plan
    {
        return Plan::factory()->create([
            'name' => 'Reach-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);
    }

    private function company(): User
    {
        $plan = $this->makePlan();
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function makeStore(User $owner): Store
    {
        $store = Store::factory()->create(['user_id' => $owner->id])->fresh();
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'true');
        return $store->fresh();
    }

    private function makeOrder(Store $store, string $paymentTransactionId, float $total = 100.0): Order
    {
        $order = new Order([
            'customer_email' => 'buyer@example.com',
            'customer_first_name' => 'Sara',
            'customer_last_name' => 'Ali',
            'shipping_address' => 'Main St 1',
            'shipping_city' => 'Amman',
            'shipping_state' => 'Amman',
            'shipping_country' => 'JO',
            'billing_address' => 'Main St 1',
            'billing_city' => 'Amman',
            'billing_state' => 'Amman',
            'billing_country' => 'JO',
            'subtotal' => $total,
            'total_amount' => $total,
            'payment_method' => 'midtrans',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_transaction_id' => $paymentTransactionId,
        ]);
        $order->store_id = $store->id;
        $order->order_number = 'ORD-' . Str::uuid();
        $order->save();

        return $order->fresh();
    }

    private function storePrivateKey(Store $store, string $key): void
    {
        PaymentSetting::updateOrCreateSetting($store->user_id, 'midtrans_secret_key', $key, $store->id);
    }

    private function storeSkrillConfig(Store $store, string $merchantId, string $secretWord): void
    {
        PaymentSetting::updateOrCreateSetting($store->user_id, 'skrill_merchant_id', $merchantId, $store->id);
        PaymentSetting::updateOrCreateSetting($store->user_id, 'skrill_secret_word', $secretWord, $store->id);
    }

    private function subdomainHost(Store $store): string
    {
        return $store->slug . '.localhost';
    }

    private function subdomainUrl(Store $store, string $path): string
    {
        return 'http://' . $this->subdomainHost($store) . $path;
    }

    private function midtransSignature(string $orderId, string $statusCode, string $grossAmount, string $key): string
    {
        return hash('sha512', $orderId . $statusCode . $grossAmount . $key);
    }

    private function skrillSignature(string $merchantId, string $transactionId, string $secretWord, string $amount, string $currency, string $status): string
    {
        $concat = $merchantId
            . $transactionId
            . strtoupper(md5($secretWord))
            . $amount
            . $currency
            . $status;
        return strtoupper(md5($concat));
    }

    // -----------------------------------------------------------------
    // 1-3. Callbacks actually reach the controller over HTTP
    // -----------------------------------------------------------------

    public function test_midtrans_callback_is_reachable_via_http_and_marks_order_paid(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_http_mid_1', 250.00);

        $res = $this->postJson($this->subdomainUrl($store, '/midtrans/callback'), [
            'order_id' => 'trx_http_mid_1',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '250',
            'signature_key' => $this->midtransSignature('trx_http_mid_1', '200', '250', self::SERVER_KEY),
        ]);

        $res->assertOk();
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_invalid_midtrans_signature_still_denied_through_full_stack(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_http_mid_bad', 250.00);

        $res = $this->postJson($this->subdomainUrl($store, '/midtrans/callback'), [
            'order_id' => 'trx_http_mid_bad',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '250',
            'signature_key' => $this->midtransSignature('trx_http_mid_bad', '200', '250', 'attacker-key'),
        ]);

        $res->assertStatus(403);
        $this->assertSame('pending', $order->fresh()->payment_status);
    }

    public function test_skrill_callback_is_reachable_via_http_and_marks_order_paid(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_http_1', 'skrill-secret-reach');
        $order = $this->makeOrder($store, 'trx_http_skr_1', 99.00);

        $res = $this->postJson($this->subdomainUrl($store, '/skrill/callback'), [
            'merchant_id' => 'mer_http_1',
            'transaction_id' => 'trx_http_skr_1',
            'mb_amount' => '99.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $this->skrillSignature('mer_http_1', 'trx_http_skr_1', 'skrill-secret-reach', '99.00', 'USD', '2'),
        ]);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_skrill_rejected_ipn_returns_ok_without_marking_paid(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_http_2', 'skrill-secret-reach');
        $order = $this->makeOrder($store, 'trx_http_skr_2', 99.00);

        // status=1 (pending) -> Skrill contract: keep payment pending.
        $res = $this->postJson($this->subdomainUrl($store, '/skrill/callback'), [
            'merchant_id' => 'mer_http_2',
            'transaction_id' => 'trx_http_skr_2',
            'mb_amount' => '99.00',
            'mb_currency' => 'USD',
            'status' => '1',
            'md5sig' => $this->skrillSignature('mer_http_2', 'trx_http_skr_2', 'skrill-secret-reach', '99.00', 'USD', '1'),
        ]);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertSame('pending', $order->fresh()->payment_status);
    }

    public function test_coingate_callback_reaches_controller_without_outbound_api_call(): void
    {
        $store = $this->makeStore($this->company());
        // No coingate payment settings -> controller answers 400 before the
        // CoinGate\Client API call, proving the request reached the controller
        // (not DomainResolver's 404).
        $this->makeOrder($store, 'cg_http_1', 77.00);

        $res = $this->postJson($this->subdomainUrl($store, '/coingate/callback'), [
            'id' => 'cg_http_1',
        ]);

        $res->assertStatus(400);
        $this->assertSame('Payment gateway not configured', $res->json('error'));
    }

    // -----------------------------------------------------------------
    // 4-9. Negative + regression scenarios stay unchanged
    // -----------------------------------------------------------------

    public function test_unknown_store_subdomain_path_still_404s(): void
    {
        $store = $this->makeStore($this->company());

        $res = $this->postJson($this->subdomainUrl($store, '/definitely/not/a/route'), [
            'foo' => 'bar',
        ]);

        $res->assertNotFound();
    }

    public function test_foreign_main_domain_post_to_callback_path_still_404s(): void
    {
        $this->makeStore($this->company());

        $res = $this->postJson('/midtrans/callback', [
            'order_id' => 'trx_main_domain',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '250',
            'signature_key' => 'x',
        ]);

        $res->assertNotFound();
    }

    public function test_storefront_home_routing_unchanged(): void
    {
        $store = $this->makeStore($this->company());

        $this->get($this->subdomainUrl($store, '/'))->assertOk();
    }

    public function test_dashboard_routing_unchanged(): void
    {
        $this->makeStore($this->company());

        $res = $this->get('/dashboard');
        $this->assertNotSame(404, $res->status());
        $this->assertNotSame(503, $res->status());
    }

    public function test_disabled_store_callback_still_serves_store_disabled(): void
    {
        $store = $this->makeStore($this->company());
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        $this->storePrivateKey($store, self::SERVER_KEY);
        $this->makeOrder($store, 'trx_http_disabled', 100.00);

        $res = $this->postJson($this->subdomainUrl($store, '/midtrans/callback'), [
            'order_id' => 'trx_http_disabled',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '100',
            'signature_key' => $this->midtransSignature('trx_http_disabled', '200', '100', self::SERVER_KEY),
        ]);

        $res->assertStatus(503);
    }

    public function test_cross_store_secret_never_accepts_other_stores_callback_over_http(): void
    {
        $storeA = $this->makeStore($this->company());
        $storeB = $this->makeStore($this->company());
        $this->storePrivateKey($storeA, 'STORE-A-key-only');
        $orderB = $this->makeOrder($storeB, 'trx_http_cross', 80.00);

        // Signed with store A's secret, delivered on store B's subdomain to
        // store B's pending order -> must be rejected.
        $res = $this->postJson($this->subdomainUrl($storeB, '/midtrans/callback'), [
            'order_id' => 'trx_http_cross',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '80',
            'signature_key' => $this->midtransSignature('trx_http_cross', '200', '80', 'STORE-A-key-only'),
        ]);

        $this->assertTrue(
            $res->status() === 503 || $res->status() === 403,
            vsprintf('Cross-store secret must be rejected over HTTP (503/403), got %d: %s', [
                $res->status(),
                $res->getContent(),
            ])
        );
        $this->assertSame('pending', $orderB->fresh()->payment_status);
    }
}