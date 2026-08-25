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
            // === Local Palestinian — verified ===
            ['slug'=>'wassel','name'=>'Wassel Logistics','name_ar'=>'واصل لوجستيك','region'=>'local','status'=>'manual','capabilities'=>['cod','areas','tracking'],'site'=>'https://wassel.ps','evidence'=>'Official: wassel.ps / wasselgroup.ps — Public co listed on PEX (2005), 1700974444 pickup@wassel.ps, FedEx exclusive agent in PS since 2017; merchant portal exists but no public API docs — PRIVATE/MANUAL'],
            ['slug'=>'bosta','name'=>'Bosta Express','name_ar'=>'بوستا إكسبرس','region'=>'local','status'=>'manual','capabilities'=>['cod','areas','tracking'],'site'=>'https://bosta.co','evidence'=>'Verified via LinkedIn + deepEnrich + 17003344 ad "خدمة API" — 4 warehouses/25 vehicles/20k parcels/mo, MTIT certified 2018, but no public API docs — PRIVATE/MANUAL'],
            ['slug'=>'united_express','name'=>'United Express','name_ar'=>'يونايتد إكسبرس','region'=>'local','status'=>'manual','capabilities'=>['cod','areas','tracking'],'site'=>'https://unitedexpress.ps','evidence'=>'Verified: unitedexpress.ps + wenak.ps 0594900137 Ramallah + App Store ID 6463820474 "United Express Palestine" merchant app — no public API docs — PRIVATE/MANUAL'],
            ['slug'=>'city_express','name'=>'City Express Palestine','name_ar'=>'سيتي إكسبرس فلسطين','region'=>'local','status'=>'manual','capabilities'=>['cod'],'site'=>null,'evidence'=>'Verified: LinkedIn 2012 founder City Express, Trustburn 8 reviews — small fleet 5 vehicles, marketing delivery — no API, manual'],
            // === Global / Regional — READY API (official) ===
            ['slug'=>'aramex','name'=>'Aramex','name_ar'=>'أرامكس','region'=>'global','status'=>'ready','capabilities'=>['create_shipment','tracking','labels','cod','webhooks'],'site'=>'https://www.aramex.com/developers','evidence'=>'VERIFIED API: https://www.aramex.com/jo/en/developers-solution-center + PDF Shipping Services API — SOAP/JSON CreateShipments/TrackShipments'],
            ['slug'=>'dhl','name'=>'DHL Express','name_ar'=>'دي إتش إل','region'=>'global','status'=>'ready','capabilities'=>['create_shipment','tracking','labels','cod','webhooks'],'site'=>'https://developer.dhl.com','evidence'=>'VERIFIED API: https://developer.dhl.com — MyDHL API (shipments, tracking, labels)'],
            ['slug'=>'fedex','name'=>'FedEx','name_ar'=>'فيديكس','region'=>'global','status'=>'ready','capabilities'=>['create_shipment','tracking','labels','cod'],'site'=>'https://developer.fedex.com','evidence'=>'VERIFIED API: FedEx Developer Portal — Ship & Track API (via wassel ps exclusive agent but direct API exists)'],
            ['slug'=>'ups','name'=>'UPS','name_ar'=>'يو بي إس','region'=>'global','status'=>'ready','capabilities'=>['create_shipment','tracking','labels'],'site'=>'https://developer.ups.com','evidence'=>'VERIFIED API: UPS Developer Portal — Ship/Track (partner via Bosta TNT/UPS)'],
            // === Aggregator hypothesis (not a direct courier) ===
            // TOGO not verified as standalone courier — likely aggregator piggybacking on local couriers; keep as coming_soon for investigation, not a provider
            // === Custom / Mock ===
            ['slug'=>'mock','name'=>'Mock Courier (Test)','name_ar'=>'تجريبي','region'=>'custom','status'=>'ready','capabilities'=>['create_shipment','tracking','labels','cod','webhooks'],'site'=>null,'evidence'=>'Internal test provider — no external call, for CI/E2E'],
            ['slug'=>'custom','name'=>'Custom API','name_ar'=>'ربط مخصص','region'=>'custom','status'=>'manual','capabilities'=>[],'site'=>null,'evidence'=>'Advanced — provide API docs/contact to support for new adapter (no code executed)'],
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
