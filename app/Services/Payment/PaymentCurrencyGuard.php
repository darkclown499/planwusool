<?php

namespace App\Services\Payment;

use App\Models\Order;

/**
 * Currency safety — never silently convert.
 * 10 ILS !== 10 USD/JOD. Minor units agorot/cents handled per provider.
 */
class PaymentCurrencyGuard
{
    public static function assertSupported(string $method, string $currency): void
    {
        $cur = strtoupper(trim($currency));
        if (!PaymentProviderCatalog::supportsCurrency($method, $cur)) {
            $supported = implode(', ', PaymentProviderCatalog::get($method)['currencies'] ?? []);
            throw new \Exception("العملة {$cur} غير مدعومة لهذه الطريقة. العملات المدعومة: {$supported}");
        }
    }

    public static function assertOrderCurrency(Order $order): void
    {
        $method = (string) ($order->payment_method ?? '');
        $currency = (string) ($order->currency ?? 'ILS');
        self::assertSupported($method, $currency);
    }

    /** Minor-unit helper — ILS agorot, JOD fils, USD cents. */
    public static function toMinorUnits(float $amount, string $currency): int
    {
        // JOD has 3 decimals (1000 fils), most others 2
        $decimals = strtoupper($currency) === 'JOD' ? 3 : 2;
        return (int) round($amount * (10 ** $decimals));
    }
}
