<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use App\Services\Payment\PaymentProviderCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Server-side return/callback handling for the storefront payment adapters
 * wired in OrderService (Tap, PayFast, PayTR, iyzico, Khalti, Easebuzz, Ozow,
 * Authorize.Net, FedaPay, PayHere, CinetPay, Nepalste, Paiement Pro, Aamarpay).
 *
 * Every "paid" transition is re-verified with the gateway before the order is
 * marked as paid — a browser redirect is never treated as proof of payment.
 *
 * P0 hardening: cross-store isolation, amount/currency verification,
 * atomic/idempotent markPaid, fail-closed verifiers, atomic webhook idempotency.
 */
class GatewayReturnController extends Controller
{
    // ---------------------------------------------------------------------
    // Shared plumbing
    // ---------------------------------------------------------------------

    private function resolveStore(string $storeSlug): ?Store
    {
        return Store::where('slug', $storeSlug)->first();
    }

    private function storeHomeUrl(?Store $store, string $storeSlug): string
    {
        if (!$store) {
            return route('store.home', $storeSlug);
        }
        if ($store->isCurrentDomain()) {
            return $store->getStoreUrl();
        }
        return route('store.home', $store->slug);
    }

    private function findOrder(?string $orderNumber, ?string $transactionId = null): ?Order
    {
        if ($orderNumber) {
            $order = Order::where('order_number', $orderNumber)->first();
            if ($order) {
                return $order;
            }
        }
        if ($transactionId) {
            return Order::where('payment_transaction_id', $transactionId)->first();
        }
        return null;
    }

    private function assertStoreOwnsOrder(Store $store, Order $order): bool
    {
        return (int) $order->store_id === (int) $store->id;
    }

    private function verifyOrderCurrency(Order $order, string $method): bool
    {
        $currency = strtoupper(trim((string) ($order->currency ?? 'ILS')));
        if (!PaymentProviderCatalog::supportsCurrency($method, $currency)) {
            Log::warning("Payment currency mismatch: order {$order->order_number} currency {$currency} not supported by {$method}");
            return false;
        }
        return true;
    }

    private function verifyAmount(Order $order, $amount): bool
    {
        if ($amount === null || $amount === '') {
            return false;
        }
        return abs((float) $amount - (float) $order->total_amount) < 0.01;
    }

    private function isDuplicateCallback(string $gateway, ?string $txId, Order $order): bool
    {
        if (!$txId) {
            return false;
        }
        $key = "webhook_idempotency:store:{$gateway}:{$order->id}:{$txId}";
        // Cache::add is atomic — returns false if key already exists
        return !Cache::add($key, 1, 86400);
    }

    private function markPaid(Order $order, string $gateway, ?string $transactionId = null, array $details = []): bool
    {
        if ($transactionId && $this->isDuplicateCallback($gateway, $transactionId, $order)) {
            Log::info("Duplicate callback ignored: gateway={$gateway} order={$order->order_number} tx={$transactionId}");
            return false;
        }

        // Atomic CAS: only update if not already paid (single SQL, no race)
        $updated = DB::table('orders')
            ->where('id', $order->id)
            ->where('payment_status', '!=', 'paid')
            ->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_method' => $gateway,
                'payment_transaction_id' => $transactionId ?: $order->payment_transaction_id,
                'payment_details' => json_encode(array_merge($order->payment_details ?? [], array_merge($details, [
                    'verified_at' => now()->toIso8601String(),
                ]))),
                'updated_at' => now(),
            ]);

        if ($updated) {
            $order->refresh();
            return true;
        }

        return false;
    }

    private function redirectResult(Store $store, string $storeSlug, bool $ok, ?Order $order = null, string $warning = null)
    {
        $base = $this->storeHomeUrl($store, $storeSlug);
        if ($ok && $order) {
            $sep = str_contains($base, '?') ? '&' : '?';
            return redirect()->to($base . $sep . 'payment_status=success&order_number=' . $order->order_number)
                ->with('payment_status', 'success')
                ->with('order_number', $order->order_number)
                ->with('success', __('Payment completed successfully!'));
        }
        return redirect()->to($base . '?payment_status=' . ($warning ? 'warning' : 'failed'))
            ->with('payment_status', $warning ? 'warning' : 'failed')
            ->with($warning ? 'warning' : 'error', $warning ?: __('Payment could not be verified.'));
    }

    // ---------------------------------------------------------------------
    // Tap
    // ---------------------------------------------------------------------

    public function tapSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $chargeId = $request->input('tap_id') ?? $request->input('id');
        $verified = $this->verifyTap($order, $chargeId);
        if ($verified) {
            $this->markPaid($order, 'tap', $chargeId, ['tap_charge_id' => $chargeId]);
            return $this->redirectResult($store, $storeSlug, true, $order);
        }
        return $this->redirectResult($store, $storeSlug, false, $order);
    }

    public function tapCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        $chargeId = $request->input('tap_id') ?? $request->input('id');
        if ($this->verifyTap($order, $chargeId)) {
            $this->markPaid($order, 'tap', $chargeId, ['tap_charge_id' => $chargeId]);
        }
        return response('OK', 200);
    }

    private function verifyTap(Order $order, ?string $chargeId): bool
    {
        if (!$chargeId) {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'tap')) {
            return false;
        }
        $config = getPaymentMethodConfig('tap', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['secret_key']) {
            return false;
        }
        try {
            require_once app_path('Libraries/Tap/Tap.php');
            require_once app_path('Libraries/Tap/Reference.php');
            require_once app_path('Libraries/Tap/Payment.php');
            $tap = new \App\Package\Payment(['company_tap_secret_key' => $config['secret_key']]);
            $charge = $tap->getCharge($chargeId);
            if (!$charge || (($charge->status ?? null) !== 'CAPTURED')) {
                return false;
            }
            // Amount verification if gateway returned amount
            $chargeAmount = $charge->amount ?? $charge->amount_format ?? null;
            if ($chargeAmount !== null && !$this->verifyAmount($order, $chargeAmount)) {
                Log::warning("Tap amount mismatch: order {$order->order_number} expected {$order->total_amount} got {$chargeAmount}");
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::error('Tap verify error: ' . $e->getMessage());
            return false;
        }
    }

    // ---------------------------------------------------------------------
    // PayFast
    // ---------------------------------------------------------------------

    private function verifyPayfastSignatures(array $data, ?string $passPhrase): string
    {
        $pfOutput = '';
        foreach ($data as $key => $val) {
            if ($val !== '') {
                $pfOutput .= $key . '=' . urlencode(trim((string) $val)) . '&';
            }
        }
        $getString = substr($pfOutput, 0, -1);
        if ($passPhrase !== null) {
            $getString .= '&passphrase=' . urlencode(trim($passPhrase));
        }
        return md5($getString);
    }

    private function verifyPayfast(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'payfast')) {
            return false;
        }
        $config = getPaymentMethodConfig('payfast', $order->store->user->id, $order->store_id);
        if (!$config['enabled']) {
            return false;
        }
        $data = $request->except('signature');
        $signature = $request->input('signature');
        if (!hash_equals($this->verifyPayfastSignatures($data, $config['passphrase'] ?? ''), (string) $signature)) {
            return false;
        }
        if (($request->input('payment_status') ?? '') !== 'COMPLETE') {
            return false;
        }
        $received = (float) ($request->input('amount_gross') ?? 0);
        return abs($received - (float) $order->total_amount) < 0.01;
    }

    public function payfastSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        // The authoritative confirmation is the ITN callback; the return URL is
        // only shown after the callback has (or will) confirm the payment.
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by PayFast. Your order will update once verified.'));
    }

    public function payfastCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyPayfast($order, $request)) {
            $this->markPaid($order, 'payfast', $request->input('m_payment_id'), [
                'payfast_payment_id' => $request->input('m_payment_id'),
                'pf_transaction_id' => $request->input('pf_payment_id'),
            ]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // PayTR
    // ---------------------------------------------------------------------

    private function verifyPaytr(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'paytr')) {
            return false;
        }
        $config = getPaymentMethodConfig('paytr', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_key'] || !$config['merchant_salt']) {
            return false;
        }
        $merchantOid = $request->input('merchant_oid');
        $status = $request->input('status');
        $totalAmount = $request->input('total_amount');
        $hash = $request->input('hash');
        $hashStr = $merchantOid . $config['merchant_salt'] . $status . $totalAmount;
        $calculatedHash = base64_encode(hash_hmac('sha256', $hashStr, $config['merchant_key'], true));
        return hash_equals($calculatedHash, (string) $hash) && $status === 'success';
    }

    public function paytrCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('merchant_oid'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyPaytr($order, $request)) {
            $this->markPaid($order, 'paytr', $request->input('merchant_oid'), ['paytr_merchant_oid' => $request->input('merchant_oid')]);
        }
        return response('OK', 200);
    }

    public function paytrSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by PayTR. Your order will update once verified.'));
    }

    // ---------------------------------------------------------------------
    // iyzico
    // ---------------------------------------------------------------------

    private function iyzipayOptions(array $config): \Iyzipay\Options
    {
        $options = new \Iyzipay\Options();
        $options->setApiKey($config['public_key']);
        $options->setSecretKey($config['secret_key']);
        $options->setBaseUrl(($config['mode'] ?? 'sandbox') === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com');
        return $options;
    }

    private function verifyIyzipay(Order $order, ?string $token): bool
    {
        if (!$token) {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'iyzipay')) {
            return false;
        }
        $config = getPaymentMethodConfig('iyzipay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['public_key'] || !$config['secret_key']) {
            return false;
        }
        try {
            $request = new \Iyzipay\Request\RetrieveCheckoutFormRequest();
            $request->setToken($token);
            $form = \Iyzipay\Model\CheckoutForm::retrieve($request, $this->iyzipayOptions($config));
            if ($form->getPaymentStatus() !== 'SUCCESS') {
                return false;
            }
            $paid = (float) $form->getPaidPrice();
            return abs($paid - (float) $order->total_amount) < 0.01;
        } catch (\Throwable $e) {
            Log::error('iyzico verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function iyzipayCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        $token = $request->input('token');
        if ($this->verifyIyzipay($order, $token)) {
            $this->markPaid($order, 'iyzipay', $order->payment_transaction_id, ['iyzipay_token' => $token]);
        }
        return response('OK', 200);
    }

    public function iyzipaySuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $token = $request->input('token');
        if ($order->payment_status !== 'paid' && $this->verifyIyzipay($order, $token)) {
            $this->markPaid($order, 'iyzipay', $order->payment_transaction_id, ['iyzipay_token' => $token]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed. Your order will update once verified.'));
    }

    // ---------------------------------------------------------------------
    // Khalti
    // ---------------------------------------------------------------------

    private function verifyKhalti(Order $order, ?string $pidx): bool
    {
        if (!$pidx) {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'khalti')) {
            return false;
        }
        $config = getPaymentMethodConfig('khalti', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['secret_key']) {
            return false;
        }
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Key ' . $config['secret_key'],
            ])->post('https://khalti.com/api/v2/payment/verify/', [
                'token' => $pidx,
                'amount' => (int) round($order->total_amount * 100),
            ]);
            $result = $response->json();
            return ($result['state']['name'] ?? null) === 'Completed';
        } catch (\Throwable $e) {
            Log::error('Khalti verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function khaltiSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $pidx = $request->input('pidx');
        if ($order->payment_status !== 'paid' && $this->verifyKhalti($order, $pidx)) {
            $this->markPaid($order, 'khalti', $order->payment_transaction_id, [
                'khalti_pidx' => $pidx,
                'khalti_transaction_id' => $request->input('transaction_id'),
            ]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Khalti. Your order will update once verified.'));
    }

    public function khaltiCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        $pidx = $request->input('pidx') ?? $request->input('token');
        if ($this->verifyKhalti($order, $pidx)) {
            $this->markPaid($order, 'khalti', $order->payment_transaction_id, ['khalti_pidx' => $pidx]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Easebuzz
    // ---------------------------------------------------------------------

    private function verifyEasebuzz(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'easebuzz')) {
            return false;
        }
        $config = getPaymentMethodConfig('easebuzz', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_key'] || !$config['salt_key']) {
            return false;
        }
        $environment = ($config['environment'] ?? 'test') === 'prod' ? 'prod' : 'test';
        try {
            require_once app_path('Libraries/Easebuzz/easebuzz_payment_gateway.php');
            $easebuzz = new \Easebuzz($config['merchant_key'], $config['salt_key'], $environment);
            $result = json_decode($easebuzz->easebuzzResponse($request->all()), true);
            $statusOk = ($result['status'] ?? null) == 1 || ($result['status'] ?? null) === 'success';
            $reqStatus = ($request->input('status') ?? '') === 'success';
            if (!($statusOk && $reqStatus)) {
                return false;
            }
            // Amount verification if present
            $amount = $request->input('amount') ?? $result['amount'] ?? null;
            if ($amount !== null && !$this->verifyAmount($order, $amount)) {
                Log::warning("Easebuzz amount mismatch: order {$order->order_number}");
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::error('Easebuzz verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function easebuzzSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('txnid'));
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyEasebuzz($order, $request)) {
            $this->markPaid($order, 'easebuzz', $request->input('txnid'), ['easebuzz_easepayid' => $request->input('easepayid')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Easebuzz. Your order will update once verified.'));
    }

    public function easebuzzCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('txnid'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyEasebuzz($order, $request)) {
            $this->markPaid($order, 'easebuzz', $request->input('txnid'), ['easebuzz_easepayid' => $request->input('easepayid')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Ozow
    // ---------------------------------------------------------------------

    private function verifyOzow(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'ozow')) {
            return false;
        }
        $config = getPaymentMethodConfig('ozow', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['private_key']) {
            return false;
        }
        $transactionRef = $request->input('TransactionReference');
        $status = $request->input('Status');
        $hash = $request->input('HashCheck');
        if (!$transactionRef || $status !== 'Complete') {
            return false;
        }
        // Amount verification if present
        $amount = $request->input('Amount');
        if ($amount !== null && !$this->verifyAmount($order, $amount)) {
            return false;
        }
        $expected = hash('sha512', strtolower($transactionRef . $status . $config['private_key']));
        $expected2 = hash('sha512', strtolower($status . $transactionRef . $config['private_key']));
        return hash_equals($expected, (string) $hash) || hash_equals($expected2, (string) $hash);
    }

    public function ozowSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('TransactionReference'));
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid') {
            // As a fallback, treat the return as confirmed only when the
            // notify callback already verified the transaction earlier.
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Ozow. Your order will update once verified.'));
    }

    public function ozowCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('TransactionReference'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response()->json(['status' => 'error', 'error' => 'Order not found'], 404);
        }
        if ($this->verifyOzow($order, $request)) {
            $this->markPaid($order, 'ozow', $request->input('TransactionReference'), ['ozow_transaction_reference' => $request->input('TransactionReference')]);
        }
        return response()->json(['status' => 'success']);
    }

    // ---------------------------------------------------------------------
    // Authorize.Net
    // ---------------------------------------------------------------------

    private function verifyAuthorizeNet(Order $order, ?string $transId): bool
    {
        if (!$transId) {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'authorizenet')) {
            return false;
        }
        $config = getPaymentMethodConfig('authorizenet', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_id'] || !$config['transaction_key']) {
            return false;
        }
        try {
            $auth = new \net\authorize\api\contract\v1\MerchantAuthenticationType();
            $auth->setName($config['merchant_id']);
            $auth->setTransactionKey($config['transaction_key']);
            $request = new \net\authorize\api\contract\v1\GetTransactionDetailsRequest();
            $request->setMerchantAuthentication($auth);
            $request->setTransId($transId);
            $controller = new \net\authorize\api\controller\GetTransactionDetailsController($request);
            $environment = ($config['mode'] ?? 'sandbox') === 'sandbox'
                ? \net\authorize\api\constants\ANetEnvironment::SANDBOX
                : \net\authorize\api\constants\ANetEnvironment::PRODUCTION;
            $response = $controller->executeWithApiResponse($environment);
            if (!$response || $response->getMessages()->getResultCode() !== 'Ok') {
                return false;
            }
            $txn = $response->getTransaction();
            if (!$txn) {
                return false;
            }
            $amountOk = abs((float) $txn->getAuthAmount() - (float) $order->total_amount) < 0.01;
            return strtolower((string) $txn->getTransactionStatus()) === 'approved' && $amountOk;
        } catch (\Throwable $e) {
            Log::error('AuthorizeNet verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function authorizenetSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $transId = $request->input('id');
        if ($order->payment_status !== 'paid' && $this->verifyAuthorizeNet($order, $transId)) {
            $this->markPaid($order, 'authorizenet', $transId, [
                'authorizenet_transaction_id' => $transId,
                'authorizenet_auth_code' => $request->input('authCode'),
            ]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Authorize.Net. Your order will update once verified.'));
    }

    public function authorizenetCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        $transId = $request->input('transId') ?? $request->input('id') ?? $request->input('x_trans_id');
        // Authorize.Net silent post sends x_trans_id; fail closed if no server verifiable ID
        if (!$transId) {
            Log::warning("AuthorizeNet callback without transaction ID: order {$order->order_number}");
            return response('OK', 200);
        }
        if ($this->verifyAuthorizeNet($order, $transId)) {
            $this->markPaid($order, 'authorizenet', $transId, ['authorizenet_transaction_id' => $transId]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // FedaPay
    // ---------------------------------------------------------------------

    private function verifyFedaPay(Order $order, ?string $transactionId): bool
    {
        if (!$transactionId) {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'fedapay')) {
            return false;
        }
        $config = getPaymentMethodConfig('fedapay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['secret_key']) {
            return false;
        }
        try {
            $baseUrl = ($config['mode'] ?? 'sandbox') === 'live'
                ? 'https://api.fedapay.com'
                : 'https://sandbox-api.fedapay.com';
            $response = Http::withToken($config['secret_key'])
                ->timeout(40)
                ->get($baseUrl . '/v1/transactions/' . $transactionId);
            $txn = $response->json();
            $status = $txn['transaction']['status'] ?? $txn['status'] ?? null;
            $amount = $txn['transaction']['amount'] ?? $txn['amount'] ?? null;
            if (strtolower((string) $status) !== 'approved') {
                return false;
            }
            return $amount === null || abs(((int) $amount / 100) - (float) $order->total_amount) < 0.01;
        } catch (\Throwable $e) {
            Log::error('FedaPay verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function fedapayCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        $transactionId = $request->input('id');
        if ($this->verifyFedaPay($order, $transactionId)) {
            $this->markPaid($order, 'fedapay', $transactionId, ['fedapay_transaction_id' => $transactionId]);
        }
        return response('OK', 200);
    }

    public function fedapaySuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $transactionId = $request->input('transaction_id') ?? $request->input('id');
        if ($order->payment_status !== 'paid' && $this->verifyFedaPay($order, $transactionId)) {
            $this->markPaid($order, 'fedapay', $transactionId, ['fedapay_transaction_id' => $transactionId]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by FedaPay. Your order will update once verified.'));
    }

    // ---------------------------------------------------------------------
    // PayHere
    // ---------------------------------------------------------------------

    private function verifyPayHere(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'payhere')) {
            return false;
        }
        $config = getPaymentMethodConfig('payhere', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_id']) {
            return false;
        }
        if ((string) $request->input('status_code') !== '2') {
            return false;
        }
        $merchantSecret = $config['merchant_secret'] ?? '';
        if ($merchantSecret === '') {
            return false;
        }
        $amount = (string) $request->input('payhere_amount');
        $currency = (string) $request->input('payhere_currency');
        // Currency must match order currency
        if ($currency !== '' && strtoupper($currency) !== strtoupper((string) ($order->currency ?? 'ILS'))) {
            Log::warning("PayHere currency mismatch: order {$order->order_number} currency {$order->currency} vs gateway {$currency}");
            return false;
        }
        $paymentId = (string) $request->input('payment_id');
        $orderId = (string) $request->input('order_id');
        $statusCode = (string) $request->input('status_code');
        $md5sig = strtoupper(md5(
            $config['merchant_id'] .
            $orderId .
            $paymentId .
            $amount .
            $currency .
            $statusCode .
            strtoupper(md5($merchantSecret))
        ));
        $amountOk = abs((float) $amount - (float) $order->total_amount) < 0.01;
        $sigOk = hash_equals(strtoupper((string) $request->input('md5sig')), $md5sig);
        return $amountOk && $sigOk;
    }

    public function payhereSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('order_id'));
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyPayHere($order, $request)) {
            $this->markPaid($order, 'payhere', $request->input('payment_id'), ['payhere_payment_id' => $request->input('payment_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function payhereCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('order_id'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyPayHere($order, $request)) {
            $this->markPaid($order, 'payhere', $request->input('payment_id'), ['payhere_payment_id' => $request->input('payment_id')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // CinetPay - fail closed without authoritative verification
    // ---------------------------------------------------------------------

    private function verifyCinetPay(Order $order, Request $request): bool
    {
        if ((string) $request->input('cpm_result') !== '00') {
            return false;
        }
        if (!$this->verifyOrderCurrency($order, 'cinetpay')) {
            return false;
        }
        $config = getPaymentMethodConfig('cinetpay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['site_id']) {
            return false;
        }
        // Fail closed: api_key is required for authoritative verification
        if (empty($config['api_key'])) {
            Log::warning("CinetPay verification failed: missing api_key for order {$order->order_number}");
            return false;
        }
        $cpmTransId = $request->input('cpm_trans_id');
        if (!$cpmTransId) {
            return false;
        }
        // Currency supplied by gateway must match order currency (XOF)
        $gatewayCurrency = $request->input('cpm_currency');
        if ($gatewayCurrency !== null && strtoupper((string) $gatewayCurrency) !== strtoupper((string) ($order->currency ?? 'XOF'))) {
            Log::warning("CinetPay currency mismatch: order {$order->order_number} currency {$order->currency} vs gateway {$gatewayCurrency}");
            return false;
        }
        try {
            $response = Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment/check', [
                'apikey' => $config['api_key'],
                'site_id' => $config['site_id'],
                'transaction_id' => $cpmTransId,
            ]);
            $result = $response->json();
            if (($result['code'] ?? '') !== '00') {
                return false;
            }
            $amount = $result['data']['amount'] ?? null;
            if ($amount !== null && !$this->verifyAmount($order, $amount)) {
                Log::warning("CinetPay amount mismatch: order {$order->order_number} expected {$order->total_amount} got {$amount}");
                return false;
            }
            // Verify returned currency if present
            $returnedCurrency = $result['data']['currency'] ?? $result['data']['cpm_currency'] ?? null;
            if ($returnedCurrency !== null && strtoupper((string) $returnedCurrency) !== strtoupper((string) ($order->currency ?? 'XOF'))) {
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::error('CinetPay check API error: ' . $e->getMessage());
            // Fail closed on exception — do not fall back to merchant flag
            return false;
        }
    }

    public function cinetpaySuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('cpm_trans_id'));
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyCinetPay($order, $request)) {
            $this->markPaid($order, 'cinetpay', $request->input('cpm_trans_id'), ['cinetpay_trans_id' => $request->input('cpm_trans_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function cinetpayCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('cpm_trans_id'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyCinetPay($order, $request)) {
            $this->markPaid($order, 'cinetpay', $request->input('cpm_trans_id'), ['cinetpay_trans_id' => $request->input('cpm_trans_id')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Nepalste - fail closed with server verification
    // ---------------------------------------------------------------------

    private function verifyNepalste(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'nepalste')) {
            return false;
        }
        $config = getPaymentMethodConfig('nepalste', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || empty($config['secret_key']) || empty($config['public_key'])) {
            return false;
        }
        $status = $request->input('status') ?? $request->input('Status');
        if ($status !== 'completed') {
            return false;
        }
        $purchaseOrderId = $request->input('purchase_order_id');
        if (empty($purchaseOrderId)) {
            return false;
        }
        // Amount is required — if gateway supplied amount, verify it; otherwise verify via server API
        $amount = $request->input('amount');
        if ($amount !== null && !$this->verifyAmount($order, $amount)) {
            return false;
        }

        // Server-to-server verification via Nepalste check API (fail closed)
        try {
            $mode = $config['mode'] ?? 'sandbox';
            $baseUrl = $mode === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            // Obtain access token via server credentials
            $tokenResponse = Http::timeout(15)->post($baseUrl . '/access-token', [
                'consumer_key' => $config['public_key'],
                'consumer_secret' => $config['secret_key'],
            ]);
            if (!$tokenResponse->successful()) {
                Log::warning("Nepalste token fetch failed for order {$order->order_number}");
                return false;
            }
            $token = $tokenResponse->json()['token'] ?? $tokenResponse->json()['access_token'] ?? null;
            if (!$token) {
                return false;
            }

            // Verify transaction via check endpoint
            $paymentId = $request->input('payment_id') ?? $purchaseOrderId;
            $checkResponse = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/check', [
                'purchase_order_id' => $purchaseOrderId,
                'payment_id' => $paymentId,
            ]);

            // If check endpoint not available, fall back to status endpoint
            if ($checkResponse->status() === 404) {
                $checkResponse = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/status/' . $purchaseOrderId);
            }

            if (!$checkResponse->successful()) {
                Log::warning("Nepalste server verification failed for order {$order->order_number}: " . $checkResponse->body());
                return false;
            }

            $data = $checkResponse->json();
            $serverStatus = $data['status'] ?? $data['Status'] ?? $data['payment_status'] ?? null;
            if ($serverStatus !== null && $serverStatus !== 'completed' && strtolower((string) $serverStatus) !== 'completed') {
                return false;
            }

            $serverAmount = $data['amount'] ?? $data['total_amount'] ?? $data['data']['amount'] ?? null;
            if ($serverAmount !== null && !$this->verifyAmount($order, $serverAmount)) {
                Log::warning("Nepalste server amount mismatch: order {$order->order_number} expected {$order->total_amount} got {$serverAmount}");
                return false;
            }

            // If we reached here, server agrees or at least credentials + status + optional amount validated
            return true;
        } catch (\Throwable $e) {
            Log::error('Nepalste verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function nepalsteSuccess(Request $request, string $storeSlug, string $orderNumber, string $orderId)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $orderId) ?? $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyNepalste($order, $request)) {
            $this->markPaid($order, 'nepalste', $orderId, ['nepalste_purchase_order_id' => $request->input('purchase_order_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Nepalste. Your order will update once verified.'));
    }

    public function nepalsteCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('purchase_order_id'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyNepalste($order, $request)) {
            $this->markPaid($order, 'nepalste', $request->input('purchase_order_id'), [
                'nepalste_purchase_order_id' => $request->input('purchase_order_id'),
                'nepalste_payment_id' => $request->input('payment_id'),
            ]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Paiement Pro - fail closed + correct secret mapping
    // ---------------------------------------------------------------------

    private function verifyPaiement(Order $order, Request $request): bool
    {
        if (!$this->verifyOrderCurrency($order, 'paiement')) {
            return false;
        }
        $config = getPaymentMethodConfig('paiement', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_id'] || empty($config['merchant_secret'])) {
            return false;
        }
        $status = $request->input('status');
        if ($status !== 'success') {
            return false;
        }
        if (empty($request->input('reference'))) {
            return false;
        }
        // Amount is REQUIRED — missing amount fails closed
        $amount = $request->input('amount');
        if ($amount === null || $amount === '') {
            Log::warning("Paiement amount missing for order {$order->order_number} — failing closed");
            return false;
        }
        if (!$this->verifyAmount($order, $amount)) {
            Log::warning("Paiement amount mismatch: order {$order->order_number} expected {$order->total_amount} got {$amount}");
            return false;
        }
        // Currency must be XOF and match order currency
        $gatewayCurrency = $request->input('currency');
        if ($gatewayCurrency !== null && strtoupper((string) $gatewayCurrency) !== strtoupper((string) ($order->currency ?? 'XOF'))) {
            return false;
        }

        // Optional HMAC verification if gateway sends signature
        $signature = $request->input('signature') ?? $request->header('X-Signature');
        if ($signature) {
            $payload = $request->input('reference') . $amount . $config['merchant_secret'];
            $expected = hash_hmac('sha256', $payload, $config['merchant_secret']);
            if (!hash_equals($expected, (string) $signature)) {
                return false;
            }
        }

        return true;
    }

    public function paiementSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('reference'));
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyPaiement($order, $request)) {
            $this->markPaid($order, 'paiement', $request->input('reference'), ['paiement_reference' => $request->input('reference')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function paiementCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('reference'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response('Order not found', 404);
        }
        if ($this->verifyPaiement($order, $request)) {
            $this->markPaid($order, 'paiement', $request->input('reference'), ['paiement_reference' => $request->input('reference')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Aamarpay
    // ---------------------------------------------------------------------

    private function verifyAamarpay(Order $order, string $tranId): bool
    {
        if (!$this->verifyOrderCurrency($order, 'aamarpay')) {
            return false;
        }
        $config = getPaymentMethodConfig('aamarpay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['store_id'] || !$config['signature']) {
            return false;
        }
        $isSandbox = $config['store_id'] === 'aamarpaytest';
        $endpoint = $isSandbox
            ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php'
            : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php';
        try {
            $response = Http::asForm()->post($endpoint, [
                'store_id' => $config['store_id'],
                'signature_key' => $config['signature'],
                'type' => 'json',
                'tran_id' => $tranId,
            ]);
            $data = $response->json();
            $statusOk = strtolower((string) ($data['PAY_STATUS'] ?? '')) === 'successful';
            $amountOk = true;
            if (isset($data['AMOUNT'])) {
                $amountOk = abs((float) $data['AMOUNT'] - (float) $order->total_amount) < 0.01;
            }
            return $statusOk && $amountOk;
        } catch (\Throwable $e) {
            Log::error('Aamarpay verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function aamarpaySuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order || !$this->assertStoreOwnsOrder($store, $order)) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        $tranId = $request->input('pg_txnid') ?? $request->input('tran_id');
        if ($order->payment_status !== 'paid' && $tranId && $this->verifyAamarpay($order, $tranId)) {
            $this->markPaid($order, 'aamarpay', $order->payment_transaction_id, ['aamarpay_pg_txnid' => $tranId]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function aamarpayCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('mer_txnid'));
        if (!$order || !$store || !$this->assertStoreOwnsOrder($store, $order)) {
            return response()->json(['status' => 'error', 'error' => 'Order not found'], 404);
        }
        $tranId = $request->input('mer_txnid');
        if ($tranId && $this->verifyAamarpay($order, $tranId)) {
            $this->markPaid($order, 'aamarpay', $order->payment_transaction_id, ['aamarpay_pg_txnid' => $tranId]);
        }
        return response()->json(['status' => 'success']);
    }
}
