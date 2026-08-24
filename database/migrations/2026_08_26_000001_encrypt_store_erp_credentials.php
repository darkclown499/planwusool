<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use App\Models\StoreErpConfig;

return new class extends Migration
{
    public function up(): void
    {
        $configs = StoreErpConfig::all();
        foreach ($configs as $config) {
            $raw = $config->getAttributes();
            $needsSave = false;
            foreach (['api_key', 'api_password', 'api_username'] as $field) {
                $value = $raw[$field] ?? null;
                if ($value === null || $value === '') continue;
                try {
                    Crypt::decryptString($value);
                    // Already encrypted
                } catch (\Throwable $e) {
                    // Plaintext legacy — re-encrypt via mutator
                    $config->{$field} = $value;
                    $needsSave = true;
                }
            }
            if ($needsSave) {
                $config->saveQuietly();
            }
        }
    }

    public function down(): void
    {
        // Decrypt back to plaintext for rollback (not recommended for production)
        $configs = StoreErpConfig::all();
        foreach ($configs as $config) {
            foreach (['api_key', 'api_password', 'api_username'] as $field) {
                $value = $config->getAttributes()[$field] ?? null;
                if ($value === null || $value === '') continue;
                try {
                    $plain = Crypt::decryptString($value);
                    \DB::table('store_erp_configs')->where('id', $config->id)->update([$field => $plain]);
                } catch (\Throwable $e) {
                    // already plaintext
                }
            }
        }
    }
};
