<?php

namespace App\Services;

use App\Models\NotificationTemplateLang;
use App\Models\Notification;

class SmsTemplateService
{
    /**
     * تحويل نص القالب إلى الرسالة النهائية (باستبدال المتغيرات).
     *
     * @return string|null تُرجع null إذا كان القالب معطلاً أو غير موجود.
     */
    public static function resolve(array $settings, string $templateAction, array $variables, string $lang): ?string
    {
        $actionKey = strtolower(str_replace(' ', '_', $templateAction));
        $templateKey = 'twilio_' . $actionKey . '_enabled';

        // قالب معطل على مستوى المتجر
        if (($settings[$templateKey] ?? 'off') !== 'on') {
            return null;
        }

        // قالب معطل من قِبل السوبر أدمن
        $notification = Notification::where('action', $templateAction)->first();
        if (!$notification || $notification->status !== 'on') {
            return null;
        }

        $template = NotificationTemplateLang::whereHas('notification', function ($query) use ($templateAction) {
            $query->where('action', $templateAction);
        })->where('lang', $lang)->first();

        if (!$template) {
            $template = NotificationTemplateLang::whereHas('notification', function ($query) use ($templateAction) {
                $query->where('action', $templateAction);
            })->where('lang', 'en')->first();
        }

        if (!$template) {
            return null;
        }

        // نص مخصص من صفحة إعدادات SMS (مشترك بين جميع المزودين)
        $contentKey = 'twilio_content_' . $actionKey;
        $content = !empty($settings[$contentKey]) ? $settings[$contentKey] : $template->content;

        foreach ($variables as $key => $value) {
            $content = str_replace('{' . $key . '}', $value, $content);
        }

        return $content;
    }
}
