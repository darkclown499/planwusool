<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Server-side return/callback handling for the storefront payment adapters
 * wired in OrderService (Tap, PayFast, PayTR, iyzico, Khalti, Easebuzz, Ozow,
 * Authorize.Net, FedaPay, PayHere, CinetPay, Nepalste, Paiement Pro, Aamarpay).
 *
 * Every "paid" transition is re-verified with the gateway before the order is
 * marked as paid — a browser redirect is never treated as proof of payment.
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

    private function markPaid(Order $order, string $gateway, ?string $transactionId = null, array $details = []): void
    {
        if ($order->payment_status === 'paid') {
            return;
        }
        $order->update([
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_gateway' => $gateway,
            'payment_transaction_id' => $transactionId ?: $order->payment_transaction_id,
            'payment_details' => array_merge($order->payment_details ?? [], array_merge($details, [
                'verified_at' => now(),
            ])),
        ]);
    }

    private function redirectResult(Store $store, string $storeSlug, bool $ok, ?Order $order = null, string $warning = null)
    {
        $base = $this->storeHomeUrl($store, $storeSlug);
        if ($ok) {
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
        if (!$store || !$order) {
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
        $order = $this->findOrder($orderNumber);
        if (!$order) {
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
            return $charge && (($charge->status ?? null) === 'CAPTURED');
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
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        // The authoritative confirmation is the ITN callback; the return URL is
        // only shown after the callback has (or will) confirm the payment.
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by PayFast. Your order will update once verified.'));
    }

    public function payfastCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber);
        if (!$order) {
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
        $order = $this->findOrder($orderNumber, $request->input('merchant_oid'));
        if (!$order) {
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
        if (!$store || !$order) {
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
        $order = $this->findOrder($orderNumber);
        if (!$order) {
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
        if (!$store || !$order) {
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
        $config = getPaymentMethodConfig('khalti', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['secret_key']) {
            return false;
        }
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
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
        if (!$store || !$order) {
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
        $order = $this->findOrder($orderNumber);
        if (!$order) {
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
            return $statusOk && $reqStatus;
        } catch (\Throwable $e) {
            Log::error('Easebuzz verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function easebuzzSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('txnid'));
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyEasebuzz($order, $request)) {
            $this->markPaid($order, 'easebuzz', $request->input('txnid'), ['easebuzz_easepayid' => $request->input('easepayid')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Easebuzz. Your order will update once verified.'));
    }

    public function easebuzzCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber, $request->input('txnid'));
        if (!$order) {
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
        $expected = hash('sha512', strtolower($transactionRef . $status . $config['private_key']));
        $expected2 = hash('sha512', strtolower($status . $transactionRef . $config['private_key']));
        return hash_equals($expected, (string) $hash) || hash_equals($expected2, (string) $hash);
    }

    public function ozowSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('TransactionReference'));
        if (!$store || !$order) {
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
        $order = $this->findOrder($orderNumber, $request->input('TransactionReference'));
        if (!$order) {
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
            $amountOk = abs((float) $txn->getAuthAmount() - (float) $order->total_amount) < 0.01;
            return $txn && strtolower((string) $txn->getTransactionStatus()) === 'approved' && $amountOk;
        } catch (\Throwable $e) {
            Log::error('AuthorizeNet verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function authorizenetSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber);
        if (!$store || !$order) {
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

    // ---------------------------------------------------------------------
    // FedaPay
    // ---------------------------------------------------------------------

    private function verifyFedaPay(Order $order, ?string $transactionId): bool
    {
        if (!$transactionId) {
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
            $response = \Illuminate\Support\Facades\Http::withToken($config['secret_key'])
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
        $order = $this->findOrder($orderNumber);
        if (!$order) {
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
        if (!$store || !$order) {
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
        $config = getPaymentMethodConfig('payhere', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_id']) {
            return false;
        }
        if ((string) $request->input('status_code') !== '2') {
            return false;
        }
        $merchantSecret = $config['merchant_secret'] ?? '';
        $amount = (string) $request->input('payhere_amount');
        $currency = (string) $request->input('payhere_currency');
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
        $sigOk = strtoupper((string) $request->input('md5sig')) === $md5sig;
        return $amountOk && $sigOk;
    }

    public function payhereSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('order_id'));
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyPayHere($order, $request)) {
            $this->markPaid($order, 'payhere', $request->input('payment_id'), ['payhere_payment_id' => $request->input('payment_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function payhereCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber, $request->input('order_id'));
        if (!$order) {
            return response('Order not found', 404);
        }
        if ($this->verifyPayHere($order, $request)) {
            $this->markPaid($order, 'payhere', $request->input('payment_id'), ['payhere_payment_id' => $request->input('payment_id')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // CinetPay
    // ---------------------------------------------------------------------

    private function verifyCinetPay(Order $order, Request $request): bool
    {
        if ((string) $request->input('cpm_result') !== '00') {
            return false;
        }
        $config = getPaymentMethodConfig('cinetpay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['site_id']) {
            return false;
        }
        // If an API key is configured, double-check with CinetPay's check API.
        if (!empty($config['api_key'])) {
            try {
                $response = \Illuminate\Support\Facades\Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment/check', [
                    'apikey' => $config['api_key'],
                    'site_id' => $config['site_id'],
                    'transaction_id' => $request->input('cpm_trans_id'),
                ]);
                $result = $response->json();
                $amountOk = true;
                if (isset($result['data']['amount'])) {
                    $amountOk = abs((float) $result['data']['amount'] - (float) $order->total_amount) < 0.01;
                }
                return ($result['code'] ?? '') === '00' && $amountOk;
            } catch (\Throwable $e) {
                Log::error('CinetPay check API error: ' . $e->getMessage());
                // Fall back to the merchant-side result flag only.
            }
        }
        return true;
    }

    public function cinetpaySuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('cpm_trans_id'));
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyCinetPay($order, $request)) {
            $this->markPaid($order, 'cinetpay', $request->input('cpm_trans_id'), ['cinetpay_trans_id' => $request->input('cpm_trans_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function cinetpayCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber, $request->input('cpm_trans_id'));
        if (!$order) {
            return response('Order not found', 404);
        }
        if ($this->verifyCinetPay($order, $request)) {
            $this->markPaid($order, 'cinetpay', $request->input('cpm_trans_id'), ['cinetpay_trans_id' => $request->input('cpm_trans_id')]);
        }
        return response('OK', 200);
    }

    // ---------------------------------------------------------------------
    // Nepalste
    // ---------------------------------------------------------------------

    private function verifyNepalste(Order $order, Request $request): bool
    {
        $config = getPaymentMethodConfig('nepalste', $order->store->user->id, $order->store_id);
        return $config['enabled']
            && ($request->input('status') ?? $request->input('Status')) === 'completed'
            && !empty($request->input('purchase_order_id'));
    }

    public function nepalsteSuccess(Request $request, string $storeSlug, string $orderNumber, string $orderId)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $orderId) ?? $this->findOrder($orderNumber);
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyNepalste($order, $request)) {
            $this->markPaid($order, 'nepalste', $orderId, ['nepalste_purchase_order_id' => $request->input('purchase_order_id')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order, __('Payment is being confirmed by Nepalste. Your order will update once verified.'));
    }

    public function nepalsteCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber, $request->input('purchase_order_id'));
        if (!$order) {
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
    // Paiement Pro
    // ---------------------------------------------------------------------

    private function verifyPaiement(Order $order, Request $request): bool
    {
        $config = getPaymentMethodConfig('paiement', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['merchant_id']) {
            return false;
        }
        $status = $request->input('status');
        $amountOk = true;
        $amount = $request->input('amount');
        if ($amount !== null) {
            $amountOk = abs((float) $amount - (float) $order->total_amount) < 0.01;
        }
        return $status === 'success' && $amountOk && !empty($request->input('reference'));
    }

    public function paiementSuccess(Request $request, string $storeSlug, string $orderNumber)
    {
        $store = $this->resolveStore($storeSlug);
        $order = $this->findOrder($orderNumber, $request->input('reference'));
        if (!$store || !$order) {
            return redirect()->to($this->storeHomeUrl($store, $storeSlug))->withErrors(['error' => __('Payment verification failed.')]);
        }
        if ($order->payment_status !== 'paid' && $this->verifyPaiement($order, $request)) {
            $this->markPaid($order, 'paiement', $request->input('reference'), ['paiement_reference' => $request->input('reference')]);
        }
        return $this->redirectResult($store, $storeSlug, $order->payment_status === 'paid', $order);
    }

    public function paiementCallback(Request $request, string $storeSlug, string $orderNumber)
    {
        $order = $this->findOrder($orderNumber, $request->input('reference'));
        if (!$order) {
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
        $config = getPaymentMethodConfig('aamarpay', $order->store->user->id, $order->store_id);
        if (!$config['enabled'] || !$config['store_id'] || !$config['signature']) {
            return false;
        }
        $isSandbox = $config['store_id'] === 'aamarpaytest';
        $endpoint = $isSandbox
            ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php'
            : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php';
        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post($endpoint, [
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
        if (!$store || !$order) {
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
        $order = $this->findOrder($orderNumber, $request->input('mer_txnid'));
        if (!$order) {
            return response()->json(['status' => 'error', 'error' => 'Order not found'], 404);
        }
        $tranId = $request->input('mer_txnid');
        if ($tranId && $this->verifyAamarpay($order, $tranId)) {
            $this->markPaid($order, 'aamarpay', $order->payment_transaction_id, ['aamarpay_pg_txnid' => $tranId]);
        }
        return response()->json(['status' => 'success']);
    }
}