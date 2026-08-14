<?php

namespace App\Services;

use App\Models\Setting;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TwilioService
{
    public static function sendSMS($userId, $storeId, $to, $templateAction, $variables = [], $lang = 'ar')
    {
        try {
            if (empty($to)) {
                return false;
            }

            // Get Twilio settings from settings table
            $settings = Setting::getUserSettings($userId, $storeId);
            
            if (($settings['is_twilio_enabled'] ?? 'off') !== 'on') {
                return false;
            }

            $message = SmsTemplateService::resolve($settings, $templateAction, $variables, $lang);
            if ($message === null) {
                return false;
            }

            // Prevent duplicate SMS within a short window (multiple payment webhooks may fire)
            $dedupeKey = 'twilio_sms_' . md5($userId . '|' . $storeId . '|' . $to . '|' . $templateAction . '|' . serialize($variables));
            if (Cache::has($dedupeKey)) {
                return false;
            }
            Cache::put($dedupeKey, true, 10);

            $sent = self::sendWithSettings($settings, $to, $message);

            // Notify the store owner about new orders / status updates
            if (($settings['twilio_notify_owner'] ?? 'off') === 'on' && !empty($settings['twilio_owner_phone'])) {
                self::sendWithSettings($settings, $settings['twilio_owner_phone'], $message);
            }

            return $sent;
        } catch (Exception $e) {
            Log::error('Twilio SMS error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إرسال رسالة SMS نصية مباشرة بدون قالب.
     */
    public static function sendRawSMS($userId, $storeId, $to, $message)
    {
        if (!$to) {
            return false;
        }

        try {
            $dedupeKey = 'twilio_sms_raw_' . md5($userId . '|' . $storeId . '|' . $to . '|' . $message);
            if (Cache::has($dedupeKey)) {
                return false;
            }
            Cache::put($dedupeKey, true, 10);

            $settings = Setting::getUserSettings($userId, $storeId);
            return self::sendWithSettings($settings, $to, $message);
        } catch (Exception $e) {
            Log::error('Twilio SMS error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إرسال رسالة SMS تجريبية باستخدام البيانات المُدخلة مباشرة.
     */
    public static function sendTestSMS($sid, $token, $fromNumber, $to)
    {
        try {
            if (!$sid || !$token || !$fromNumber || !$to) {
                throw new Exception('Twilio credentials not configured');
            }

            $message = __('Test SMS from') . ' ' . config('app.name', 'Wusool') . ' - ' . now()->format('Y-m-d H:i:s');
            return self::sendViaCredentials($sid, $token, $fromNumber, $to, $message);
        } catch (Exception $e) {
            Log::error('Twilio test SMS error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إرسال رسالة اعتماداً على إعدادات المستخدم/المتجر المخزنة.
     */
    private static function sendWithSettings(array $settings, $to, $message)
    {
        if (($settings['is_twilio_enabled'] ?? 'off') !== 'on') {
            return false;
        }

        $sid = $settings['twilio_sid'] ?? null;
        $token = $settings['twilio_token'] ?? null;
        $fromNumber = $settings['twilio_from'] ?? null;

        if (!$sid || !$token || !$fromNumber) {
            throw new Exception('Twilio credentials not configured');
        }

        return self::sendViaCredentials($sid, $token, $fromNumber, $to, $message);
    }

    /**
     * إرسال رسالة SMS مباشرة إلى Twilio API.
     */
    private static function sendViaCredentials($sid, $token, $fromNumber, $to, $message)
    {
        // Normalize phone number to E.164-like format
        $to = self::normalizePhone($to);
        $fromNumber = self::normalizePhone($fromNumber);

        $url = 'https://api.twilio.com/2010-04-01/Accounts/' . $sid . '/Messages.json';
        
        $data = [
            'From' => $fromNumber,
            'To' => $to,
            'Body' => $message
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $sid . ':' . $token);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 201) {
            Log::info('Twilio SMS sent', ['to' => $to]);
            return true;
        } else {
            Log::error('Twilio SMS failed', ['response' => $response, 'http_code' => $httpCode]);
            return false;
        }
    }

    /**
     * تطبيع رقم الهاتف إلى صيغة مناسبة لـ Twilio.
     */
    private static function normalizePhone($phone)
    {
        $phone = trim((string) $phone);

        // Remove spaces, dashes, parentheses and dots
        $phone = preg_replace('/[\s\-\(\)\.]/', '', $phone);

        // Replace leading 00 with +
        if (str_starts_with($phone, '00')) {
            $phone = '+' . substr($phone, 2);
        }

        // Ensure a leading + exists so Twilio accepts it as E.164
        if ($phone !== '' && !str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }
}