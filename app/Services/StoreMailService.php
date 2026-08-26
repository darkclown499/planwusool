<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

/**
 * Merchant-owned email delivery for a single store.
 *
 * ONE canonical source: Setting table with user_id+store_id.
 * Status values: not_configured | incomplete | testing | connected | error | disabled
 * No Wusool fallback for customer verification emails.
 */
class StoreMailService
{
    // Status constants
    public const STATUS_NOT_CONFIGURED = 'not_configured';
    public const STATUS_INCOMPLETE = 'incomplete';
    public const STATUS_TESTING = 'testing';
    public const STATUS_CONNECTED = 'connected';
    public const STATUS_ERROR = 'error';

    public const REQUIRED_KEYS = ['email_host','email_port','email_username','email_password','email_from_address','email_from_name','email_encryption'];

    /**
     * Get raw config for a store (decrypted password included internally, never exposed).
     */
    public static function getRawConfig(Store $store): array
    {
        $userId = $store->user_id;
        $storeId = $store->id;
        return [
            'provider' => getSetting('email_provider', 'smtp', $userId, $storeId),
            'driver' => getSetting('email_driver', 'smtp', $userId, $storeId),
            'host' => getSetting('email_host', '', $userId, $storeId),
            'port' => getSetting('email_port', '', $userId, $storeId),
            'username' => getSetting('email_username', '', $userId, $storeId),
            'password' => getSetting('email_password', '', $userId, $storeId),
            'encryption' => getSetting('email_encryption', 'tls', $userId, $storeId),
            'from_address' => getSetting('email_from_address', '', $userId, $storeId),
            'from_name' => getSetting('email_from_name', $store->name, $userId, $storeId),
            'status' => getSetting('email_status', self::STATUS_NOT_CONFIGURED, $userId, $storeId),
            'last_tested_at' => getSetting('email_last_tested_at', null, $userId, $storeId),
            'last_error' => getSetting('email_last_error', null, $userId, $storeId),
        ];
    }

    public static function getMaskedConfig(Store $store): array
    {
        $raw = self::getRawConfig($store);
        $status = self::getStatus($store);
        return [
            'provider' => $raw['provider'],
            'driver' => $raw['driver'],
            'host' => $raw['host'],
            'port' => $raw['port'],
            'username' => $raw['username'],
            'encryption' => $raw['encryption'],
            'from_address' => $raw['from_address'],
            'from_name' => $raw['from_name'],
            'password_configured' => !empty($raw['password']),
            'password_masked' => !empty($raw['password']) ? '••••••••' : '',
            'status' => $status,
            'last_tested_at' => $raw['last_tested_at'],
            // never expose raw error with credentials; sanitized only
            'last_error' => $raw['last_error'] ? self::sanitizeError($raw['last_error']) : null,
        ];
    }

    public static function getStatus(Store $store): string
    {
        $raw = self::getRawConfig($store);
        $storedStatus = strtolower(trim((string)($raw['status'] ?? self::STATUS_NOT_CONFIGURED)));
        $allowed = [self::STATUS_NOT_CONFIGURED,self::STATUS_INCOMPLETE,self::STATUS_TESTING,self::STATUS_CONNECTED,self::STATUS_ERROR];
        $status = in_array($storedStatus,$allowed,true) ? $storedStatus : self::STATUS_NOT_CONFIGURED;

        // Derive incomplete if required fields missing but status says connected
        $incomplete = self::isIncomplete($raw);
        if ($incomplete && $status === self::STATUS_CONNECTED) {
            return self::STATUS_INCOMPLETE;
        }
        if ($incomplete && $status === self::STATUS_NOT_CONFIGURED) {
            // check if any field filled -> incomplete else not_configured
            $any = !empty($raw['host']) || !empty($raw['username']) || !empty($raw['from_address']);
            return $any ? self::STATUS_INCOMPLETE : self::STATUS_NOT_CONFIGURED;
        }
        return $status;
    }

    public static function isIncomplete(array $raw): bool
    {
        foreach (['host','port','username','password','from_address','from_name'] as $k) {
            if (empty(trim((string)($raw[$k] ?? '')))) return true;
        }
        if (trim($raw['host']) === 'smtp.example.com') return true;
        return false;
    }

    public static function isConfigured(Store $store): bool
    {
        // Configured = required fields present (not necessarily tested)
        $raw = self::getRawConfig($store);
        return !self::isIncomplete($raw);
    }

    public static function isConnected(Store $store): bool
    {
        return self::getStatus($store) === self::STATUS_CONNECTED;
    }

    public static function updateConfig(Store $store, array $data): void
    {
        $userId = $store->user_id;
        $storeId = $store->id;
        // Only update provided keys; blank password preserves old
        $map = [
            'provider' => 'email_provider',
            'driver' => 'email_driver',
            'host' => 'email_host',
            'port' => 'email_port',
            'username' => 'email_username',
            'encryption' => 'email_encryption',
            'from_address' => 'email_from_address',
            'from_name' => 'email_from_name',
        ];
        foreach ($map as $inputKey => $settingKey) {
            if (array_key_exists($inputKey, $data)) {
                updateSetting($settingKey, (string)$data[$inputKey], $userId, $storeId);
            }
        }
        if (array_key_exists('password', $data)) {
            $pw = (string)$data['password'];
            // blank or masked value => preserve
            if ($pw !== '' && $pw !== '••••••••' && $pw !== '••••••••••••') {
                updateSetting('email_password', $pw, $userId, $storeId);
            }
        }
        // After save, if was connected but fields changed, downgrade to incomplete until re-tested
        // But keep testing status if caller will test immediately; caller should set status
        $rawAfter = self::getRawConfig($store);
        $incomplete = self::isIncomplete($rawAfter);
        $currentStatus = getSetting('email_status', self::STATUS_NOT_CONFIGURED, $userId, $storeId);
        if ($incomplete) {
            updateSetting('email_status', self::STATUS_INCOMPLETE, $userId, $storeId);
        } elseif ($currentStatus === self::STATUS_CONNECTED) {
            // credentials edited but still complete -> require re-test
            updateSetting('email_status', self::STATUS_INCOMPLETE, $userId, $storeId);
        }
        // clear cache is handled by Setting model
    }

    public static function setStatus(Store $store, string $status, ?string $error = null): void
    {
        $userId = $store->user_id;
        $storeId = $store->id;
        $allowed = [self::STATUS_NOT_CONFIGURED,self::STATUS_INCOMPLETE,self::STATUS_TESTING,self::STATUS_CONNECTED,self::STATUS_ERROR];
        if (!in_array($status,$allowed,true)) $status = self::STATUS_ERROR;
        updateSetting('email_status', $status, $userId, $storeId);
        if ($status === self::STATUS_TESTING || $status === self::STATUS_CONNECTED || $status === self::STATUS_ERROR) {
            updateSetting('email_last_tested_at', now()->toIso8601String(), $userId, $storeId);
        }
        if ($error !== null) {
            $sanitized = self::sanitizeError($error);
            updateSetting('email_last_error', $sanitized, $userId, $storeId);
        } elseif ($status === self::STATUS_CONNECTED) {
            updateSetting('email_last_error', '', $userId, $storeId);
        }
    }

    private static function sanitizeError(string $msg): string
    {
        // Remove any credential-like substrings
        $msg = preg_replace('/password[^\s]*/i', '[redacted]', $msg);
        $msg = preg_replace('/username[^\s]*/i', '[redacted]', $msg);
        // Trim and limit length
        $msg = trim(mb_substr($msg, 0, 500));
        return $msg;
    }

    /**
     * Apply store mail config to Laravel mailer (no fallback). Returns true if applied.
     */
    public static function applyConfig(Store $store): bool
    {
        $raw = self::getRawConfig($store);
        if (self::isIncomplete($raw)) return false;
        Config::set([
            'mail.default' => $raw['driver'] ?: 'smtp',
            'mail.mailers.smtp.host' => $raw['host'],
            'mail.mailers.smtp.port' => $raw['port'],
            'mail.mailers.smtp.encryption' => $raw['encryption'] === 'none' ? null : $raw['encryption'],
            'mail.mailers.smtp.username' => $raw['username'],
            'mail.mailers.smtp.password' => $raw['password'],
            'mail.from.address' => $raw['from_address'],
            'mail.from.name' => $raw['from_name'],
        ]);
        return true;
    }

    /**
     * Send a mailable using THIS store's config. No Wusool fallback. Throws if not configured.
     */
    public static function sendViaStore(Store $store, \Illuminate\Mail\Mailable $mailable, string $to): void
    {
        if (!self::isConnected($store)) {
            throw new \RuntimeException('store_mail_not_connected');
        }
        $applied = self::applyConfig($store);
        if (!$applied) {
            throw new \RuntimeException('store_mail_not_configured');
        }
        Mail::to($to)->send($mailable);
    }

    /**
     * Test connection by sending a real test email. Updates status to connected/error.
     */
    public static function testAndSend(Store $store, string $testEmail): array
    {
        $raw = self::getRawConfig($store);
        if (self::isIncomplete($raw)) {
            self::setStatus($store, self::STATUS_INCOMPLETE, 'بيانات البريد ناقصة');
            return ['ok'=>false,'error'=>'incomplete','message'=>'بيانات البريد ناقصة'];
        }
        self::setStatus($store, self::STATUS_TESTING);
        try {
            self::applyConfig($store);
            Mail::to($testEmail)->send(new \App\Mail\TestMail());
            self::setStatus($store, self::STATUS_CONNECTED);
            return ['ok'=>true,'message'=>'تم إرسال رسالة تجريبية بنجاح'];
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            // Never expose raw stack with credentials; sanitize
            $safe = self::sanitizeError($msg);
            \Log::warning('Store mail test failed', ['store_id'=>$store->id,'error'=>$safe]);
            self::setStatus($store, self::STATUS_ERROR, $safe);
            return ['ok'=>false,'error'=>'send_failed','message'=>'فشل الإرسال: '.$safe];
        }
    }
}
