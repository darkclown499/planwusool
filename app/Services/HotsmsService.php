<?php

namespace App\Services;

use App\Models\Setting;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class HotsmsService
{
    /**
     * إرسال رسالة SMS بناءً على قالب الإشعارات (نفس منطق Twilio).
     */
    public static function sendSMS($userId, $storeId, $to, $templateAction, $variables = [], $lang = 'en')
    {
        try {
            if (empty($to)) {
                return false;
            }

            $settings = Setting::getUserSettings($userId, $storeId);

            if (($settings['is_hotsms_enabled'] ?? 'off') !== 'on') {
                return false;
            }

            $message = SmsTemplateService::resolve($settings, $templateAction, $variables, $lang);
            if ($message === null) {
                return false;
            }

            // منع الرسائل المكررة خلال نافذة قصيرة
            $dedupeKey = 'hotsms_sms_' . md5($userId . '|' . $storeId . '|' . $to . '|' . $templateAction . '|' . serialize($variables));
            if (Cache::has($dedupeKey)) {
                return false;
            }
            Cache::put($dedupeKey, true, 10);

            $sent = self::sendWithSettings($settings, $to, $message);

            // إشعار المالك بطلب جديد / تحديث حالة
            if (($settings['hotsms_notify_owner'] ?? 'off') === 'on' && !empty($settings['hotsms_owner_phone'])) {
                self::sendWithSettings($settings, $settings['hotsms_owner_phone'], $message);
            }

            return $sent;
        } catch (Exception $e) {
            Log::error('HotSMS SMS error: ' . $e->getMessage());
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
            $dedupeKey = 'hotsms_sms_raw_' . md5($userId . '|' . $storeId . '|' . $to . '|' . $message);
            if (Cache::has($dedupeKey)) {
                return false;
            }
            Cache::put($dedupeKey, true, 10);

            $settings = Setting::getUserSettings($userId, $storeId);
            return self::sendWithSettings($settings, $to, $message);
        } catch (Exception $e) {
            Log::error('HotSMS SMS error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إرسال رسالة SMS تجريبية باستخدام البيانات المُدخلة مباشرة.
     */
    public static function sendTestSMS($userName, $password, $sender, $to)
    {
        try {
            if (!$userName || !$password || !$to) {
                throw new Exception('HotSMS credentials not configured');
            }

            $message = __('Test SMS from') . ' ' . config('app.name', 'Wusool') . ' - ' . now()->format('Y-m-d H:i:s');
            return self::sendViaCredentials($userName, $password, $sender, $to, $message);
        } catch (Exception $e) {
            Log::error('HotSMS test SMS error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * إرسال رسالة اعتماداً على إعدادات المستخدم/المتجر المخزنة.
     */
    private static function sendWithSettings(array $settings, $to, $message)
    {
        if (($settings['is_hotsms_enabled'] ?? 'off') !== 'on') {
            return false;
        }

        $userName = $settings['hotsms_user_name'] ?? null;
        $password = $settings['hotsms_password'] ?? null;
        $sender = $settings['hotsms_sender'] ?? null;

        if (!$userName || !$password) {
            throw new Exception('HotSMS credentials not configured');
        }

        return self::sendViaCredentials($userName, $password, $sender, $to, $message);
    }

    /**
     * إرسال رسالة SMS مباشرة إلى HotSMS API.
     */
    private static function sendViaCredentials($userName, $password, $sender, $to, $message)
    {
        $to = self::normalizePhone($to);

        $url = 'https://www.hotsms.ps/sendbulksms.php';

        $data = [
            'user_name' => $userName,
            'password' => $password,
            'msg' => $message,
            'numbers' => $to,
            'urlencode' => 1,
        ];

        if (!empty($sender)) {
            $data['sender'] = $sender;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $response = trim((string) $response);

        // HotSMS تُرجع "OK" عند النجاح، أو رمز خطأ نصي
        if (str_starts_with($response, 'OK')) {
            Log::info('HotSMS SMS sent', ['to' => $to]);
            return true;
        }

        Log::error('HotSMS SMS failed', ['response' => $response, 'http_code' => $httpCode]);
        return false;
    }

    /**
     * تطبيع رقم الهاتف إلى الصيغة الدولية بدون + (مثل 970591234567).
     */
    private static function normalizePhone($phone)
    {
        $phone = trim((string) $phone);
        $phone = preg_replace('/[\s\-\(\)\.]/', '', $phone);
        if (str_starts_with($phone, '00')) {
            $phone = substr($phone, 2);
        }
        if (str_starts_with($phone, '+')) {
            $phone = substr($phone, 1);
        }
        return $phone;
    }
}
