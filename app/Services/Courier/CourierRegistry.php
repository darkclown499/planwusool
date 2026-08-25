<?php

namespace App\Services\Courier;

use App\Contracts\CourierProviderInterface;
use App\Services\Courier\Providers\AramexProvider;
use App\Services\Courier\Providers\DhlProvider;
use App\Services\Courier\Providers\MockProvider;

class CourierRegistry
{
    /**
     * Provider slug => class
     */
    public const PROVIDERS = [
        'aramex' => AramexProvider::class,
        'dhl' => DhlProvider::class,
        'mock' => MockProvider::class,
    ];

    /**
     * Full catalog (local + global + custom) for merchant UI.
     * Providers not in PROVIDERS are catalog-only (coming soon / manual).
     */
    public static function catalog(): array
    {
        return [
            // === Palestinian — aggregator platform ===
            ['slug'=>'togo','name'=>'TOGO','name_ar'=>'TOGO','region'=>'local','type'=>'aggregator','status'=>'manual','coverage'=>'الضفة • القدس • غزة','services'=>['عدة شركات','تتبع','تحصيل ودفع'],'site'=>'https://api.togo.ps','logo'=>'/images/couriers/togo.svg','evidence'=>'Verified: https://api.togo.ps/ar + en — TOGO connects merchants with delivery companies and payment gateways, escrow; app Togo Merchant; aggregator platform, not single courier — partnership required'],
            // === Local Palestinian — private couriers (manual/coordination) ===
            ['slug'=>'wassel','name'=>'Wassel Logistics','name_ar'=>'واصل لوجستيك','region'=>'local','type'=>'courier','status'=>'manual','coverage'=>'الضفة • القدس • غزة','services'=>['الدفع عند الاستلام','تتبع الشحنات'],'site'=>'https://wassel.ps','logo'=>'/images/couriers/wassel.svg','evidence'=>'Verified: wassel.ps / wasselgroup.ps — PEX listed 2005, 1700974444 pickup@wassel.ps, FedEx exclusive agent since 2017 — PRIVATE/MANUAL'],
            ['slug'=>'bosta','name'=>'Bosta Express','name_ar'=>'بوستا إكسبرس','region'=>'local','type'=>'courier','status'=>'manual','coverage'=>'الضفة • القدس • الداخل','services'=>['الدفع عند الاستلام','تتبع الشحنات'],'site'=>'https://bosta.co','logo'=>'/images/couriers/bosta.svg','evidence'=>'Verified: MTIT certified 2018, 4 warehouses/25 vehicles/20k/mo, 17003344 — no public docs — PRIVATE'],
            ['slug'=>'united_express','name'=>'United Express','name_ar'=>'يونايتد إكسبرس','region'=>'local','type'=>'courier','status'=>'manual','coverage'=>'رام الله • الضفة','services'=>['الدفع عند الاستلام','تتبع الشحنات'],'site'=>'https://unitedexpress.ps','logo'=>'/images/couriers/united-express.svg','evidence'=>'Verified: unitedexpress.ps + App Store 6463820474 — no public docs — PRIVATE'],
            ['slug'=>'city_express','name'=>'City Express Palestine','name_ar'=>'سيتي إكسبرس','region'=>'local','type'=>'courier','status'=>'manual','coverage'=>'فلسطين','services'=>['توصيل يدوي'],'site'=>null,'logo'=>'/images/couriers/city-express.svg','evidence'=>'Verified: LinkedIn 2012, small fleet — manual only'],
            // === Global — READY API ===
            ['slug'=>'aramex','name'=>'Aramex','name_ar'=>'أرامكس','region'=>'global','type'=>'courier','status'=>'ready','coverage'=>'محلي ودولي','services'=>['إنشاء الشحنات','تتبع','بوليصة شحن','تحديث تلقائي','تحصيل عند التسليم'],'site'=>'https://www.aramex.com/developers','logo'=>'/images/couriers/aramex.svg','evidence'=>'VERIFIED API: aramex.com/developers — Shipping Services API'],
            ['slug'=>'dhl','name'=>'DHL Express','name_ar'=>'دي إتش إل','region'=>'global','type'=>'courier','status'=>'ready','coverage'=>'دولي','services'=>['إنشاء الشحنات','تتبع','بوليصة شحن','تحديث تلقائي','تحصيل عند التسليم'],'site'=>'https://developer.dhl.com','logo'=>'/images/couriers/dhl.svg','evidence'=>'VERIFIED API: developer.dhl.com — MyDHL API'],
            ['slug'=>'fedex','name'=>'FedEx','name_ar'=>'فيديكس','region'=>'global','type'=>'courier','status'=>'ready','coverage'=>'دولي','services'=>['إنشاء الشحنات','تتبع','بوليصة شحن','تحصيل عند التسليم'],'site'=>'https://developer.fedex.com','logo'=>'/images/couriers/fedex.svg','evidence'=>'VERIFIED API: FedEx Developer Portal — Ship & Track'],
            ['slug'=>'ups','name'=>'UPS','name_ar'=>'يو بي إس','region'=>'global','type'=>'courier','status'=>'ready','coverage'=>'دولي','services'=>['إنشاء الشحنات','تتبع','بوليصة شحن'],'site'=>'https://developer.ups.com','logo'=>'/images/couriers/ups.svg','evidence'=>'VERIFIED API: UPS Developer Portal'],
            // === Custom / Mock (internal) ===
            ['slug'=>'mock','name'=>'Mock Courier (Test)','name_ar'=>'تجريبي','region'=>'custom','type'=>'courier','status'=>'ready','coverage'=>'اختبار داخلي','services'=>['إنشاء الشحنات','تتبع','بوليصة شحن'],'site'=>null,'logo'=>null,'evidence'=>'Internal test provider — CI/E2E only, not shown to merchant'],
            ['slug'=>'custom','name'=>'Custom API','name_ar'=>'ربط مخصص','region'=>'custom','type'=>'courier','status'=>'manual','coverage'=>'متقدم','services'=>[],'site'=>null,'logo'=>null,'evidence'=>'Advanced/Beta — SSRF protected'],
        ];
    }

    public static function make(string $slug): ?CourierProviderInterface
    {
        $class = self::PROVIDERS[$slug] ?? null;
        if (!$class) return null;
        return app($class);
    }

    public static function isSupported(string $slug): bool
    {
        return isset(self::PROVIDERS[$slug]);
    }

    public static function supportedSlugs(): array
    {
        return array_keys(self::PROVIDERS);
    }
}
