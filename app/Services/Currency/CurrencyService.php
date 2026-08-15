<?php

namespace App\Services\Currency;

use App\Models\Currency;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class CurrencyService
{
    public const SETTINGS_CACHE_TTL = 300;

    /**
     * Get currency settings for a user/store
     */
    public function getCurrencySettings(?int $userId = null, ?int $storeId = null): array
    {
        if (request()->is('install*') || request()->is('update*') || request()->is('installer*') || !file_exists(storage_path('installed'))) {
            return $this->getDefaultSettings();
        }

        if (is_null($userId)) {
            if (auth()->user()) {
                $user = auth()->user();
                if ($user->type === 'superadmin') {
                    $userId = $user->id;
                    $storeId = null;
                } elseif ($user->type === 'company') {
                    $userId = $user->id;
                    $storeId = $storeId ?: getCurrentStoreId($user);
                } else {
                    $userId = $user->created_by;
                    $companyUser = User::find($user->created_by);
                    $storeId = $storeId ?: ($companyUser ? getCurrentStoreId($companyUser) : null);
                }
            } else {
                $superadminId = getSuperadminId();
                $userId = $superadminId;
                $storeId = null;
            }
        }

        if (!$userId) {
            return $this->getDefaultSettings();
        }

        if ($storeId) {
            $storeSettings = Setting::where('user_id', $userId)
                ->where('store_id', $storeId)
                ->pluck('value', 'key')
                ->toArray();
            if (!empty($storeSettings)) {
                return array_merge($this->getDefaultSettings(), $storeSettings);
            }
        }

        $userSettings = Setting::where('user_id', $userId)
            ->whereNull('store_id')
            ->pluck('value', 'key')
            ->toArray();
        if (!empty($userSettings)) {
            return array_merge($this->getDefaultSettings(), $userSettings);
        }

        if ($userId !== getSuperadminId()) {
            $superadminSettings = Setting::where('user_id', getSuperadminId())
                ->whereNull('store_id')
                ->pluck('value', 'key')
                ->toArray();
            if (!empty($superadminSettings)) {
                return array_merge($this->getDefaultSettings(), $superadminSettings);
            }
        }

        return $this->getDefaultSettings();
    }

    public function getDefaultSettings(): array
    {
        return [
            'decimalFormat' => '2',
            'defaultCurrency' => 'ILS',
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'floatNumber' => true,
            'currencySymbolSpace' => false,
            'currencySymbolPosition' => 'after',
        ];
    }

    /**
     * Format currency using store-specific settings
     */
    public function formatStoreCurrency($amount, ?int $userId = null, ?int $storeId = null): string
    {
        if (is_null($userId) && auth()->check()) {
            $userId = auth()->id();
            if (is_null($storeId) && auth()->user()->current_store) {
                $storeId = getCurrentStoreId(auth()->user());
            }
        }

        $numAmount = is_string($amount) ? (float)$amount : $amount;

        try {
            $storeSettings = $storeId ? Setting::getUserSettings($userId, $storeId) : [];
            $currencyCode = $storeSettings['defaultCurrency'] ?? Setting::getSetting('defaultCurrency', 'ILS');
            $currency = \App\Models\Currency::where('code', $currencyCode)->first();

            $symbol = $currency ? $currency->symbol : '₪';
            $position = $storeSettings['currencySymbolPosition'] ?? 'before';
            $decimals = (int)($storeSettings['decimalFormat'] ?? 2);
            $decimalSeparator = $storeSettings['decimalSeparator'] ?? '.';
            $thousandsSeparator = $storeSettings['thousandsSeparator'] ?? ',';

            $formattedNumber = number_format($numAmount, $decimals, $decimalSeparator, $thousandsSeparator);

            return $position === 'after'
                ? $formattedNumber . ' ' . $symbol
                : $symbol . ' ' . $formattedNumber;

        } catch (\Exception $e) {
            return '₪' . number_format($numAmount, 2);
        }
    }

    /**
     * Format currency based on store settings (matches TypeScript formatCurrency function)
     */
    public function formatCurrency($amount, array $storeSettings = [], array $currencies = []): string
    {
        $defaultCurrency = $storeSettings['defaultCurrency'] ?? 'ILS';
        $decimalFormat = $storeSettings['decimalFormat'] ?? '2';
        $decimalSeparator = $storeSettings['decimalSeparator'] ?? '.';
        $thousandsSeparator = $storeSettings['thousandsSeparator'] ?? ',';
        $currencySymbolPosition = $storeSettings['currencySymbolPosition'] ?? 'after';
        $currencySymbolSpace = $storeSettings['currencySymbolSpace'] ?? false;
        $floatNumber = $storeSettings['floatNumber'] ?? true;

        $numAmount = is_string($amount) ? (float)$amount : $amount;
        if (is_nan($numAmount)) return '₪0.00';

        $currency = null;
        foreach ($currencies as $curr) {
            if ($curr['code'] === $defaultCurrency) {
                $currency = $curr;
                break;
            }
        }
        $symbol = $currency['symbol'] ?? '₪';

        $finalAmount = ($floatNumber === false || $floatNumber === '0')
            ? floor($numAmount)
            : $numAmount;

        $decimalPlaces = (int)$decimalFormat ?: 2;
        $formattedNumber = number_format($finalAmount, $decimalPlaces, '.', '');

        $parts = explode('.', $formattedNumber);

        if ($thousandsSeparator && $thousandsSeparator !== 'none') {
            $parts[0] = preg_replace('/\B(?=(\d{3})+(?!\d))/', $thousandsSeparator, $parts[0]);
        }

        $finalNumber = implode($decimalSeparator, $parts);

        $space = ($currencySymbolSpace === true || $currencySymbolSpace === '1') ? ' ' : '';

        $primary = $currencySymbolPosition === 'after'
            ? $finalNumber . $space . $symbol
            : $symbol . $space . $finalNumber;

        $secondary = $this->getSecondaryCurrencyInfo($storeSettings, $currencies);
        if ($secondary !== null) {
            $secondaryAmount = $numAmount * $secondary['exchangeRate'];
            $secondaryNumber = number_format($secondaryAmount, $decimalPlaces, '.', '');
            $secondaryParts = explode('.', $secondaryNumber);
            if ($thousandsSeparator && $thousandsSeparator !== 'none') {
                $secondaryParts[0] = preg_replace('/\B(?=(\d{3})+(?!\d))/', $thousandsSeparator, $secondaryParts[0]);
            }
            $secondaryFinalNumber = implode($decimalSeparator, $secondaryParts);
            $secondaryStr = $currencySymbolPosition === 'after'
                ? $secondaryFinalNumber . $space . $secondary['symbol']
                : $secondary['symbol'] . $space . $secondaryFinalNumber;
            return $primary . ' ≈ ' . $secondaryStr;
        }

        return $primary;
    }

    /**
     * Resolve the configured secondary currency
     */
    public function getSecondaryCurrencyInfo(array $storeSettings = [], array $currencies = []): ?array
    {
        $code = $storeSettings['secondaryCurrency'] ?? null;
        $exchangeRate = isset($storeSettings['exchangeRate']) ? (float) $storeSettings['exchangeRate'] : 0;
        if (!$code || $exchangeRate <= 0) {
            return null;
        }

        $symbol = null;
        foreach ($currencies as $curr) {
            if (($curr['code'] ?? null) === $code) {
                $symbol = $curr['symbol'] ?? null;
                break;
            }
        }
        if (!$symbol) {
            $symbol = $code;
        }

        return [
            'symbol' => $symbol,
            'exchangeRate' => $exchangeRate,
        ];
    }

    /**
     * Format currency amount using superadmin settings (for plan prices)
     */
    public function formatCurrencyAmount($amount, ?int $userId = null, ?int $storeId = null): string
    {
        $superadminId = getSuperadminId();
        $settings = $this->getCurrencySettings($superadminId, null);
        $currencies = Currency::all()->map(function ($currency) {
            return [
                'code' => $currency->code,
                'symbol' => $currency->symbol,
                'name' => $currency->name,
            ];
        })->toArray();

        return $this->formatCurrency($amount, $settings, $currencies);
    }

    public function getAllCurrencies(): array
    {
        return Currency::orderBy('name')->get()->map(function ($currency) {
            return [
                'code' => $currency->code,
                'symbol' => $currency->symbol,
                'name' => $currency->name,
            ];
        })->toArray();
    }
}