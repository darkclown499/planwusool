<?php

namespace App\Services;

use App\Models\Store;
use App\Models\Order;
use App\Models\OrderShipment;

class StoreEmailLayout
{
    public static function render(Store $store, string $title, string $bodyHtml, ?Order $order = null): string
    {
        $logo = null;
        try {
            $conf = \App\Models\StoreConfiguration::getConfiguration($store->id);
            $logo = $conf['logo'] ?? ($store->store_content['brand']['logo'] ?? null);
            if ($logo) {
                // get_file or Storage url
                if (function_exists('get_file')) $logo = get_file($logo);
                else $logo = \Illuminate\Support\Facades\Storage::url($logo);
            }
        } catch (\Throwable $e) { $logo=''; }
        $logoHtml = $logo ? '<div style="text-align:center;margin-bottom:16px;"><img src="'.e($logo).'" alt="'.e($store->name).'" style="max-height:48px;max-width:160px;object-fit:contain;" /></div>' : '';

        $storeName = e($store->name);
        // Arabic RTL, table-safe, inline styles only
        return '<div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;background:#f8fafc;padding:24px;">'
            .'<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">'
            .'<div style="padding:28px;">'
            .$logoHtml
            .'<h1 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:800;">'.$storeName.'</h1>'
            .'<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:800;">'.e($title).'</h2>'
            .$bodyHtml
            .'</div>'
            .'<div style="padding:16px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">'
            .'<p style="margin:0;color:#94a3b8;font-size:11px;">يعمل المتجر عبر Wusool</p>'
            .'</div>'
            .'</div></div>';
    }

    // Central Arabic status mapping (reuse)
    public static function orderStatusLabel(string $status): string
    {
        return [
            'pending'=>'قيد الانتظار',
            'confirmed'=>'تم التأكيد',
            'processing'=>'قيد التجهيز',
            'shipped'=>'تم الشحن',
            'delivered'=>'تم التسليم',
            'cancelled'=>'ملغي',
            'failed'=>'فشل',
            'refunded'=>'مسترجع',
            'in_transit'=>'قيد النقل',
            'out_for_delivery'=>'خرج للتوصيل',
        ][strtolower($status)] ?? $status;
    }

    public static function shipmentStatusLabel(string $status): string
    {
        return [
            'pending'=>'قيد الانتظار',
            'created'=>'تم إنشاء الشحنة',
            'picked_up'=>'تم الاستلام من المتجر',
            'in_transit'=>'قيد النقل',
            'out_for_delivery'=>'خرج للتوصيل',
            'delivered'=>'تم التسليم',
            'failed'=>'فشل التوصيل',
            'returned'=>'تم الإرجاع',
            'cancelled'=>'ملغي',
        ][strtolower($status)] ?? $status;
    }
}
