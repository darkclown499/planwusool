<?php

namespace App\Services;

use App\Models\Setting;

class SmsService
{
    /**
     * تحديد المزوّد النشط (Twilio أو HotSMS).
     *
     * يعتمد على إعداد sms_provider لكل متجر، مع حفظ توافق رجعي:
     * إذا لم يُحدَّد المزوّد، يُستخدم Twilio تلقائياً.
     */
    public static function provider($userId, $storeId)
    {
        $settings = Setting::getUserSettings($userId, $storeId);

        $provider = $settings['sms_provider'] ?? 'twilio';

        if ($provider === 'hotsms') {
            // الرجوع إلى Twilio إذا لم تكن HotSMS مفعّلة
            if (($settings['is_hotsms_enabled'] ?? 'off') !== 'on') {
                return 'twilio';
            }
            return 'hotsms';
        }

        return 'twilio';
    }

    /**
     * إرسال رسالة SMS بناءً على قالب الإشعارات عبر المزوّد النشط.
     */
    public static function sendSMS($userId, $storeId, $to, $templateAction, $variables = [], $lang = 'en')
    {
        if (self::provider($userId, $storeId) === 'hotsms') {
            return HotsmsService::sendSMS($userId, $storeId, $to, $templateAction, $variables, $lang);
        }

        return TwilioService::sendSMS($userId, $storeId, $to, $templateAction, $variables, $lang);
    }

    /**
     * إرسال رسالة SMS نصية مباشرة عبر المزوّد النشط.
     */
    public static function sendRawSMS($userId, $storeId, $to, $message)
    {
        if (self::provider($userId, $storeId) === 'hotsms') {
            return HotsmsService::sendRawSMS($userId, $storeId, $to, $message);
        }

        return TwilioService::sendRawSMS($userId, $storeId, $to, $message);
    }
}
