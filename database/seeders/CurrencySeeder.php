<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if currency data already exists
        if (Currency::exists()) {
            $this->command->info('Currency data already exists. Skipping seeder to preserve existing data.');
            return;
        }

        $currencies = config('app.is_demo') ? $this->getDemoCurrencies() : $this->getMainCurrencies();

        foreach ($currencies as $currency) {
            Currency::firstOrCreate(
                ['code' => $currency['code']],
                $currency
            );
        }

    }

    private function getDemoCurrencies(): array
    {
        return [
            // Major Global Currencies
            ['name' => 'US Dollar', 'code' => 'USD', 'symbol' => '$', 'description' => 'United States Dollar', 'is_default' => true],
            ['name' => 'Euro', 'code' => 'EUR', 'symbol' => '€', 'description' => 'Euro', 'is_default' => false],
            ['name' => 'British Pound', 'code' => 'GBP', 'symbol' => '£', 'description' => 'British Pound Sterling', 'is_default' => false],
            ['name' => 'Japanese Yen', 'code' => 'JPY', 'symbol' => '¥', 'description' => 'Japanese Yen', 'is_default' => false],
            ['name' => 'Canadian Dollar', 'code' => 'CAD', 'symbol' => 'C$', 'description' => 'Canadian Dollar', 'is_default' => false],
            ['name' => 'Australian Dollar', 'code' => 'AUD', 'symbol' => 'A$', 'description' => 'Australian Dollar', 'is_default' => false],
            ['name' => 'Swiss Franc', 'code' => 'CHF', 'symbol' => 'CHF', 'description' => 'Swiss Franc', 'is_default' => false],
            ['name' => 'Chinese Yuan', 'code' => 'CNY', 'symbol' => '¥', 'description' => 'Chinese Yuan', 'is_default' => false],
            
            // European Currencies
            ['name' => 'Swedish Krona', 'code' => 'SEK', 'symbol' => 'kr', 'description' => 'Swedish Krona', 'is_default' => false],
            ['name' => 'Norwegian Krone', 'code' => 'NOK', 'symbol' => 'kr', 'description' => 'Norwegian Krone', 'is_default' => false],
            ['name' => 'Danish Krone', 'code' => 'DKK', 'symbol' => 'kr', 'description' => 'Danish Krone', 'is_default' => false],
            ['name' => 'Polish Zloty', 'code' => 'PLN', 'symbol' => 'zł', 'description' => 'Polish Zloty', 'is_default' => false],
            ['name' => 'Czech Koruna', 'code' => 'CZK', 'symbol' => 'Kč', 'description' => 'Czech Koruna', 'is_default' => false],
            ['name' => 'Hungarian Forint', 'code' => 'HUF', 'symbol' => 'Ft', 'description' => 'Hungarian Forint', 'is_default' => false],
            
            // Asian Currencies
            ['name' => 'Indian Rupee', 'code' => 'INR', 'symbol' => '₹', 'description' => 'Indian Rupee', 'is_default' => false],
            ['name' => 'South Korean Won', 'code' => 'KRW', 'symbol' => '₩', 'description' => 'South Korean Won', 'is_default' => false],
            ['name' => 'Singapore Dollar', 'code' => 'SGD', 'symbol' => 'S$', 'description' => 'Singapore Dollar', 'is_default' => false],
            ['name' => 'Hong Kong Dollar', 'code' => 'HKD', 'symbol' => 'HK$', 'description' => 'Hong Kong Dollar', 'is_default' => false],
            ['name' => 'Thai Baht', 'code' => 'THB', 'symbol' => '฿', 'description' => 'Thai Baht', 'is_default' => false],
            ['name' => 'Malaysian Ringgit', 'code' => 'MYR', 'symbol' => 'RM', 'description' => 'Malaysian Ringgit', 'is_default' => false],
            ['name' => 'Indonesian Rupiah', 'code' => 'IDR', 'symbol' => 'Rp', 'description' => 'Indonesian Rupiah', 'is_default' => false],
            ['name' => 'Philippine Peso', 'code' => 'PHP', 'symbol' => '₱', 'description' => 'Philippine Peso', 'is_default' => false],
            ['name' => 'Vietnamese Dong', 'code' => 'VND', 'symbol' => '₫', 'description' => 'Vietnamese Dong', 'is_default' => false],
            
            // Middle East & Africa
            ['name' => 'UAE Dirham', 'code' => 'AED', 'symbol' => 'د.إ', 'description' => 'UAE Dirham', 'is_default' => false],
            ['name' => 'Saudi Riyal', 'code' => 'SAR', 'symbol' => '﷼', 'description' => 'Saudi Riyal', 'is_default' => false],
            ['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪', 'description' => 'Israeli Shekel', 'is_default' => false],
            ['name' => 'Turkish Lira', 'code' => 'TRY', 'symbol' => '₺', 'description' => 'Turkish Lira', 'is_default' => false],
            ['name' => 'South African Rand', 'code' => 'ZAR', 'symbol' => 'R', 'description' => 'South African Rand', 'is_default' => false],
            ['name' => 'Nigerian Naira', 'code' => 'NGN', 'symbol' => '₦', 'description' => 'Nigerian Naira', 'is_default' => false],
            ['name' => 'Egyptian Pound', 'code' => 'EGP', 'symbol' => '£', 'description' => 'Egyptian Pound', 'is_default' => false],
            
            // Americas
            ['name' => 'Mexican Peso', 'code' => 'MXN', 'symbol' => '$', 'description' => 'Mexican Peso', 'is_default' => false],
            ['name' => 'Brazilian Real', 'code' => 'BRL', 'symbol' => 'R$', 'description' => 'Brazilian Real', 'is_default' => false],
            ['name' => 'Argentine Peso', 'code' => 'ARS', 'symbol' => '$', 'description' => 'Argentine Peso', 'is_default' => false],
            ['name' => 'Chilean Peso', 'code' => 'CLP', 'symbol' => '$', 'description' => 'Chilean Peso', 'is_default' => false],
            ['name' => 'Colombian Peso', 'code' => 'COP', 'symbol' => '$', 'description' => 'Colombian Peso', 'is_default' => false],
            
            // Others
            ['name' => 'New Zealand Dollar', 'code' => 'NZD', 'symbol' => 'NZ$', 'description' => 'New Zealand Dollar', 'is_default' => false],
            ['name' => 'Russian Ruble', 'code' => 'RUB', 'symbol' => '₽', 'description' => 'Russian Ruble', 'is_default' => false],
        ];
    }

    private function getMainCurrencies(): array
    {
        return [
            ['name' => 'US Dollar', 'code' => 'USD', 'symbol' => '$', 'description' => 'United States Dollar', 'is_default' => true],
            ['name' => 'Euro', 'code' => 'EUR', 'symbol' => '€', 'description' => 'Euro', 'is_default' => false],
            ['name' => 'British Pound', 'code' => 'GBP', 'symbol' => '£', 'description' => 'British Pound Sterling', 'is_default' => false],
            ['name' => 'Japanese Yen', 'code' => 'JPY', 'symbol' => '¥', 'description' => 'Japanese Yen', 'is_default' => false],
            ['name' => 'Canadian Dollar', 'code' => 'CAD', 'symbol' => 'C$', 'description' => 'Canadian Dollar', 'is_default' => false],
            ['name' => 'Australian Dollar', 'code' => 'AUD', 'symbol' => 'A$', 'description' => 'Australian Dollar', 'is_default' => false],
            ['name' => 'Indian Rupee', 'code' => 'INR', 'symbol' => '₹', 'description' => 'Indian Rupee', 'is_default' => false],
            ['name' => 'Chinese Yuan', 'code' => 'CNY', 'symbol' => '¥', 'description' => 'Chinese Yuan', 'is_default' => false],
        ];
    }
}