<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Jobs\WebhookJob;

trait HandlesWebhooks
{
    /**
     * Dispatch webhook to queue for async processing
     */
    protected function queueWebhook(string $gateway, array $payload): void
    {
        $jobClass = $this->getWebhookJobClass($gateway);
        
        if ($jobClass) {
            $jobClass::dispatch($payload, $this->getGatewayName());
        } else {
            // Fallback: log and process synchronously if no job class
            $this->logInfo("No queue job for {$this->getGatewayName()}, processing synchronously");
            $this->processWebhookSync($payload);
        }
    }

    /**
     * Get the webhook job class for a gateway
     */
    protected function getWebhookJobClass(string $gateway): ?string
    {
        $jobMap = [
            'mercadopago' => \App\Jobs\MercadoPagoWebhookJob::class,
            'paypal' => \App\Jobs\PayPalWebhookJob::class,
            'stripe' => \App\Jobs\StripeWebhookJob::class,
            'paystack' => \App\Jobs\PaystackWebhookJob::class,
            'flutterwave' => \App\Jobs\FlutterwaveWebhookJob::class,
            'paytabs' => \App\Jobs\PayTabsWebhookJob::class,
            'skrill' => \App\Jobs\SkrillWebhookJob::class,
            'coingate' => \App\Jobs\CoinGateWebhookJob::class,
            'payfast' => \App\Jobs\PayFastWebhookJob::class,
            'mollie' => \App\Jobs\MollieWebhookJob::class,
            'toyyibpay' => \App\Jobs\ToyyibPayWebhookJob::class,
            'midtrans' => \App\Jobs\MidtransWebhookJob::class,
            'cashfree' => \App\Jobs\CashfreeWebhookJob::class,
            'iyzipay' => \App\Jobs\IyzipayWebhookJob::class,
            'benefit' => \App\Jobs\BenefitWebhookJob::class,
            'ozow' => \App\Jobs\OzowWebhookJob::class,
            'easebuzz' => \App\Jobs\EasebuzzWebhookJob::class,
            'khalti' => \App\Jobs\KhaltiWebhookJob::class,
            'authorizenet' => \App\Jobs\AuthorizeNetWebhookJob::class,
            'fedapay' => \App\Jobs\FedaPayWebhookJob::class,
            'payhere' => \App\Jobs\PayHereWebhookJob::class,
            'cinetpay' => \App\Jobs\CinetPayWebhookJob::class,
            'paiement' => \App\Jobs\PaiementWebhookJob::class,
            'nepalste' => \App\Jobs\NepalsteWebhookJob::class,
            'yookassa' => \App\Jobs\YooKassaWebhookJob::class,
            'aamarpay' => \App\Jobs\AamarpayWebhookJob::class,
            'midtrans' => \App\Jobs\MidtransWebhookJob::class,
            'cashfree' => \App\Jobs\CashfreeWebhookJob::class,
            'iyzipay' => \App\Jobs\IyzipayWebhookJob::class,
            'benefit' => \App\Jobs\BenefitWebhookJob::class,
            'ozow' => \App\Jobs\OzowWebhookJob::class,
            'easebuzz' => \App\Jobs\EasebuzzWebhookJob::class,
            'khalti' => \App\Jobs\KhaltiWebhookJob::class,
            'authorizenet' => \App\Jobs\AuthorizeNetWebhookJob::class,
            'fedapay' => \App\Jobs\FedaPayWebhookJob::class,
            'payhere' => \App\Jobs\PayHereWebhookJob::class,
            'cinetpay' => \App\Jobs\CinetPayWebhookJob::class,
            'paiement' => \App\Jobs\PaiementWebhookJob::class,
            'nepalste' => \App\Jobs\NepalsteWebhookJob::class,
            'yookassa' => \App\Jobs\YooKassaWebhookJob::class,
            'aamarpay' => \App\Jobs\AamarpayWebhookJob::class,
            'midtrans' => \App\Jobs\MidtransWebhookJob::class,
            'paytr' => \App\Jobs\PaytrWebhookJob::class,
            'bank' => \App\Jobs\BankTransferWebhookJob::class,
            'razorpay' => \App\Jobs\RazorpayWebhookJob::class,
            'cashfree' => \App\Jobs\CashfreeWebhookJob::class,
            'paypal' => \App\Jobs\PayPalWebhookJob::class,
        ];

        return $jobMap[strtolower($gateway)] ?? null;
    }

    /**
     * Get the gateway name (to be implemented by controller)
     */
    abstract protected function getGatewayName(): string;

    /**
     * Process webhook synchronously (fallback)
     */
    abstract protected function processWebhookSync(array $payload): void;

    protected function logError(string $message, array $context = []): void
    {
        \Illuminate\Support\Facades\Log::error("Webhook error: {$message}", $context);
    }

    protected function logInfo(string $message, array $context = []): void
    {
        \Illuminate\Support\Facades\Log::info($message, $context);
    }
}