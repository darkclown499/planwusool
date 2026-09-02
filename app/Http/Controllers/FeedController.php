<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Store;
use App\Services\Feeds\GoogleMerchantXmlFeed;
use App\Services\Feeds\ProductFeedService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Public, per-store product feed endpoints.
 *
 * Feeds are intentionally public (catalog-only data) so Google Merchant
 * Center can fetch them periodically without login. The store is resolved
 * exclusively from the request host (subdomain or custom domain) — never from
 * client-supplied store ids — preserving tenant isolation. No customer,
 * order, cost, supplier or secret data is exposed.
 */
class FeedController extends Controller
{
    /**
     * Resolve the store from the current request.
     *
     * Subdomain requests carry a storeSlug route param; custom-domain requests
     * arrive already resolved by DomainResolver (resolved_store attribute).
     */
    private function resolveStore(Request $request): ?Store
    {
        if ($request->attributes->has('resolved_store')) {
            $store = $request->attributes->get('resolved_store');
            if ($store instanceof Store) {
                return $store;
            }
        }

        $storeSlug = $request->route('storeSlug');
        if ($storeSlug) {
            return Store::where('slug', $storeSlug)->first();
        }

        return null;
    }

    /**
     * Google Merchant Center product feed (XML). Memory-safe streaming with
     * eager-loaded categories and chunked iteration (no N+1, no unbounded
     * in-memory collection).
     */
    public function google(Request $request): StreamedResponse
    {
        $store = $this->resolveStore($request);
        if (!$store) {
            abort(404);
        }

        $service = app(ProductFeedService::class);
        $serializer = app(GoogleMerchantXmlFeed::class);

        $response = new StreamedResponse(function () use ($service, $serializer, $store, $request) {
            $serializer->open();

            Product::query()
                ->with(['category.parent'])
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->orderBy('id')
                ->chunkById(200, function ($chunk) use ($service, $serializer, $request) {
                    foreach ($chunk as $product) {
                        foreach ($service->normalizeProduct($product, $product->store, true, $request) as $item) {
                            $serializer->addItem($item);
                        }
                    }
                }, 'id');

            $serializer->close();
        }, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=300',
        ]);

        return $response;
    }

    /**
     * Generic CSV product feed built from the same normalized feed items.
     * Headers explicitly override the admin dashboard context so the feed
     * never returns HTML/Inertia markup. Cell values are sanitized against
     * spreadsheet formula injection.
     */
    public function csv(Request $request): StreamedResponse
    {
        $store = $this->resolveStore($request);
        if (!$store) {
            abort(404);
        }

        $service = app(ProductFeedService::class);

        $response = new StreamedResponse(function () use ($service, $store, $request) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'id', 'item_group_id', 'title', 'description', 'link', 'image_link',
                'availability', 'price', 'sale_price', 'brand', 'gtin', 'mpn', 'sku',
                'condition', 'product_type',
            ]);

            Product::query()
                ->with(['category.parent'])
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->orderBy('id')
                ->chunkById(200, function ($chunk) use ($service, $out, $request) {
                    foreach ($chunk as $product) {
                        foreach ($service->normalizeProduct($product, $product->store, true, $request) as $item) {
                            fputcsv($out, [
                                $item['id'],
                                $item['item_group_id'] ?? '',
                                $this->sanitizeCsv($item['title']),
                                $this->sanitizeCsv($item['description']),
                                $item['link'],
                                $item['image_link'],
                                $item['availability'],
                                $item['price'],
                                $item['sale_price'] ?? '',
                                $item['brand'] ?? '',
                                $item['gtin'] ?? '',
                                $item['mpn'] ?? '',
                                $item['sku'] ?? '',
                                $item['condition'],
                                $item['product_type'] ?? '',
                            ]);
                        }
                    }
                }, 'id');

            fclose($out);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="products.csv"',
            'Cache-Control' => 'public, max-age=300',
        ]);

        return $response;
    }

    /**
     * Neutralize spreadsheet formula injection in untrusted text fields.
     */
    private function sanitizeCsv(string $value): string
    {
        if ($value === '') {
            return $value;
        }
        // A leading apostrophe disarms formula cells in Excel/Sheets.
        if (in_array($value[0], ['=', '+', '-', '@'], true)) {
            return "'" . $value;
        }
        return $value;
    }
}
