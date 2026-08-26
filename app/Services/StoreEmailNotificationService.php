<?php

namespace App\Services;

use App\Models\Store;
use App\Models\Setting;

class StoreEmailNotificationService
{
    // All supported types — only add types that have reliable domain events
    public const TYPES = [
        'order_created' => ['group'=>'orders','label'=>'تأكيد الطلب','desc'=>'يرسل للعميل عند استلام الطلب في المتجر.','default'=>true],
        'order_cancelled' => ['group'=>'orders','label'=>'إلغاء الطلب','desc'=>'عند إلغاء الطلب.','default'=>true],
        'payment_received' => ['group'=>'payment','label'=>'تأكيد الدفع','desc'=>'عند تأكيد استلام الدفع.','default'=>true],
        'shipment_created' => ['group'=>'shipping','label'=>'تم شحن الطلب','desc'=>'عند إنشاء الشحنة ورقم التتبع.','default'=>true],
        'shipment_in_transit' => ['group'=>'shipping','label'=>'الطلب في الطريق','desc'=>'عند تحديث الحالة إلى قيد النقل.','default'=>false],
        'shipment_out_for_delivery' => ['group'=>'shipping','label'=>'خرج للتوصيل','desc'=>'عند خروجه للتوصيل.','default'=>false],
        'shipment_delivered' => ['group'=>'shipping','label'=>'تم التسليم','desc'=>'عند تأكيد التسليم.','default'=>true],
        'shipment_failed' => ['group'=>'shipping','label'=>'فشل التوصيل','desc'=>'عند فشل التوصيل.','default'=>true],
        'shipment_returned' => ['group'=>'shipping','label'=>'تم الإرجاع','desc'=>'عند إرجاع الشحنة.','default'=>false],
        // welcome is optional
        'welcome_customer' => ['group'=>'account','label'=>'رسالة ترحيب','desc'=>'بعد تأكيد الحساب (اختياري).','default'=>false],
    ];

    public const GROUPS = [
        'account'=>['label'=>'الحساب','icon'=>'user'],
        'orders'=>['label'=>'الطلبات','icon'=>'shopping-bag'],
        'payment'=>['label'=>'الدفع','icon'=>'credit-card'],
        'shipping'=>['label'=>'الشحن','icon'=>'truck'],
    ];

    private const STORAGE_KEY = 'email_notification_prefs';

    public static function defaults(): array
    {
        $out=[];
        foreach (self::TYPES as $k=>$v) $out[$k]=$v['default'];
        return $out;
    }

    public static function getPrefs(Store $store): array
    {
        $raw = getSetting(self::STORAGE_KEY, null, $store->user_id, $store->id);
        if ($raw) {
            $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
            if (is_array($decoded)) {
                return array_merge(self::defaults(), $decoded);
            }
        }
        return self::defaults();
    }

    public static function isEnabled(Store $store, string $type): bool
    {
        $prefs = self::getPrefs($store);
        // email_verification is controlled by verification policy, not here
        if (!isset(self::TYPES[$type])) return false;
        // respect mail connection: if not connected, treat as disabled for UI warning but still check pref
        return (bool)($prefs[$type] ?? false);
    }

    public static function setPref(Store $store, string $type, bool $enabled): bool
    {
        if (!isset(self::TYPES[$type])) return false;
        $prefs = self::getPrefs($store);
        $prefs[$type] = $enabled;
        updateSetting(self::STORAGE_KEY, json_encode($prefs), $store->user_id, $store->id);
        return true;
    }

    public static function getGrouped(Store $store): array
    {
        $prefs = self::getPrefs($store);
        $connected = StoreMailService::isConnected($store);
        $groups=[];
        foreach (self::GROUPS as $gk=>$gmeta) {
            $items=[];
            foreach (self::TYPES as $tk=>$tmeta) {
                if ($tmeta['group']!==$gk) continue;
                $items[]=[
                    'key'=>$tk,
                    'label'=>$tmeta['label'],
                    'description'=>$tmeta['desc'],
                    'enabled'=>(bool)($prefs[$tk]??false),
                    'group'=>$gk,
                ];
            }
            $groups[]=['id'=>$gk,'label'=>$gmeta['label'],'icon'=>$gmeta['icon'],'features'=>$items];
        }
        return ['groups'=>$groups,'connected'=>$connected,'defaults'=>self::defaults()];
    }
}
