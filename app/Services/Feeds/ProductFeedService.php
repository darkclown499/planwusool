<?php

namespace App\Services\Feeds;

use App\Models\Product;
use App\Models\Store;
use App\Services\Currency\CurrencyService;
use App\Services\InventoryService;
use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Centralized, format-agnostic product feed domain layer.
 *
 * Normalizes Wusool catalog data (products + variant combinations) into feed
 * items ONCE. Feed serializers (Google Merchant XML, generic CSV, future
 * Meta/TikTok) consume these normalized items without re-implementing product
 * business logic.
 *
 * Rules enforced here:
 *  - Only storefront-visible (is_active) products owned by the store are
 *    considered. Store isolation is guaranteed by scoping every query to
 *    store_id.
 *  - Availability comes from InventoryService (single source of truth).
 *  - Price comes from canonical Product::effectivePrice()/effectivePriceForVariant()
 *    and canonical CurrencyService. Sale price only when a real product-level
 *    sale exists (hasEffectiveSale()).
 *  - Identifiers: real SKU / barcode are emitted when present. GTIN/MPN are
 *    NEVER fabricated; identifier_exists reflects genuine availability.
 *  - Feed item IDs are stable (store_id + product_id [+ variant uuid]); they
 *    never change when title/description/price/stock change.
 *
 * No customer, order, cost, supplier or merchant-secret data is ever included.
 */
class ProductFeedService
{
    /**
     * Resolve the canonical currency ISO code for a store (same canonical
     * resolver used by storefront SEO/pricing).
     */
    public function currencyCode(Store $store): string
    {
        try {
            $settings = CurrencyService::getCurrencySettings(
                $store->user ? $store->user->id : null,
                $store->id
            );
            $code = $settings['defaultCurrency'] ?? null;
        } catch (\Throwable $e) {
            $code = null;
        }
        return (is_string($code) && $code !== '') ? $code : 'ILS';
    }

    /**
     * Canonical storefront product URL for the feed's g:link.
     * Uses Store::getStoreUrl() (verified custom domain → custom subdomain →
     * default subdomain) so it exactly matches the canonical SEO/storefront
     * URL, including HTTPS when the canonical storefront URL is HTTPS.
     */
    public function productUrl(Store $store, Product $product, ?Request $request = null): string
    {
        $slug = $product->seo_url_slug ?: (string) $product->id;
        return $store->route('/product/' . $slug, [], $request);
    }

    /**
     * Stable feed item id for a product (or variant).
     * Global scope is ensured by prefixing the store id so cross-store
     * collisions can never occur.
     */
    public function feedId(Product $product, ?string $variantUuid = null): string
    {
        $base = (int) $product->store_id . '-' . (int) $product->id;
        if ($variantUuid) {
            return $base . '-' . $variantUuid;
        }
        return $base;
    }

    /**
     * Normalized item_group_id (product id) for variants, or null for a
     * standalone product row.
     */
    public function itemGroupId(Store $store, Product $product): string
    {
        return (int) $store->id . '-' . (int) $product->id;
    }

    /**
     * Whether a product should be emitted as per-variant feed items.
     * Mirrors the sellable variant model: non-empty variant_combinations.
     */
    public function hasFeedableVariants(Product $product): bool
    {
        $combos = $product->variant_combinations;
        return is_array($combos) && count($combos) > 0;
    }

    /**
     * Resolve the primary public image (root-relative or absolute) for a
     * product. Reuses the same robust resolution as StorefrontSeoService.
     */
    public function productImage(Product $product): string
    {
        if (!empty($product->cover_image)) {
            return (string) $product->cover_image;
        }
        $raw = $product->images;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && count($decoded) > 0) {
                return (string) $decoded[0];
            }
            return str_contains($raw, ',') ? (string) explode(',', $raw)[0] : $raw;
        }
        if (is_array($raw) && count($raw) > 0) {
            return (string) $raw[0];
        }
        return '';
    }

    /**
     * All additional product images (after the primary), as root-relative or
     * absolute paths.
     */
    public function additionalImages(Product $product): array
    {
        $images = [];
        $raw = $product->images;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $images = $decoded;
            } else {
                $images = str_contains($raw, ',') ? explode(',', $raw) : [$raw];
            }
        } elseif (is_array($raw)) {
            $images = $raw;
        }
        $primary = $this->productImage($product);
        if ($primary !== '' && in_array($primary, $images, true)) {
            $images = array_values(array_filter($images, fn ($i) => (string) $i !== (string) $primary));
        }
        return array_values(array_filter($images, fn ($i) => trim((string) $i) !== ''));
    }

    /**
     * Normalize a description for safe feed output: strip HTML to plain text,
     * collapse whitespace, trim. Preserves Arabic/emoji/UTF-8.
     */
    public function normalizeDescription(Product $product): string
    {
        $text = trim((string) ($product->short_description ?: $product->description));
        if ($text === '') {
            return $product->name;
        }
        $text = preg_replace('/<[^>]*>/', ' ', $text) ?? $text;
        // Decode common entities so we don't emit raw HTML entity soup/unsafe markup.
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        return trim($text) === '' ? $product->name : trim($text);
    }

    /**
     * Build a Google-style product_type path ("Parent > Child") from the
     * product's category chain, or null when the product has no category.
     */
    public function productType(Product $product): ?string
    {
        $category = $product->category;
        if (!$category) {
            return null;
        }
        $names = [$category->name];
        $parent = $category->parent;
        $guard = 0;
        while ($parent && $guard++ < 20) {
            array_unshift($names, $parent->name);
            $parent = $parent->parent;
        }
        return implode(' > ', array_filter($names, fn ($n) => trim((string) $n) !== ''));
    }

    /**
     * The store-feedable availability value, driven by canonical inventory.
     * Maps Wusool availability to Google feed values.
     */
    public function availability(Product $product): string
    {
        return InventoryService::productAvailability($product) === 'out_of_stock'
            ? 'out_of_stock'
            : 'in_stock';
    }

    /**
     * Variant-level availability for a single combination.
     */
    public function variantAvailability(Product $product, array $combination): string
    {
        if (!$product->track_inventory) {
            return 'in_stock';
        }
        if ($product->allow_backorder) {
            return 'in_stock';
        }
        $stock = (int) ($combination['stock'] ?? 0);
        return $stock > 0 ? 'in_stock' : 'out_of_stock';
    }

    /**
     * Eligibility validation for a product. Returns a list of exclusion
     * reasons; empty list means the product is feed-eligible.
     *
     * Reasons are Wusool feed-eligibility diagnostics only — they are NOT
     * Google approval/rejection feedback.
     */
    public function eligibilityReasons(Product $product): array
    {
        $reasons = [];
        if (!$product->is_active) {
            $reasons[] = 'not_published';
        }
        if (trim((string) $product->name) === '') {
            $reasons[] = 'missing_title';
        }
        $price = (float) ($product->price ?? 0);
        if ($price <= 0) {
            $reasons[] = 'invalid_price';
        }
        if ($this->productImage($product) === '') {
            $reasons[] = 'missing_image';
        }
        return $reasons;
    }

    /**
     * Variant-level eligibility validation.
     */
    public function variantEligibilityReasons(Product $product, array $combination): array
    {
        $reasons = [];
        if (!$product->is_active) {
            $reasons[] = 'not_published';
        }
        $price = $combination['price'] ?? $product->price;
        if ((float) $price <= 0) {
            $reasons[] = 'invalid_price';
        }
        if ($this->productImage($product) === '') {
            $reasons[] = 'missing_image';
        }
        return $reasons;
    }

    /**
     * Normalize a product into one or more feed items (one per variant when
     * the product uses variant combinations; otherwise a single product item).
     *
     * Optionally filters out items that fail eligibility validation.
     *
     * @return array<int, array<string,mixed>>
     */
    public function normalizeProduct(Product $product, Store $store, bool $applyEligibility = true, ?Request $request = null): array
    {
        if ($applyEligibility && $this->eligibilityReasons($product)) {
            return [];
        }

        if ($this->hasFeedableVariants($product)) {
            return $this->normalizeVariants($product, $store, $applyEligibility, $request);
        }

        return [$this->normalizeStandalone($product, $store, $request)];
    }

    /**
     * Normalize each variant combination of a variant product.
     */
    protected function normalizeVariants(Product $product, Store $store, bool $applyEligibility, ?Request $request = null): array
    {
        $items = [];
        $currency = $this->currencyCode($store);
        $image = $this->productImage($product);
        $additional = $this->additionalImages($product);
        $primary = $this->absoluteImageUrl($store, $image, $request);
        $description = $this->normalizeDescription($product);
        $productType = $this->productType($product);
        $brand = $store->name;

        foreach (($product->variant_combinations ?? []) as $combination) {
            if ($applyEligibility && $this->variantEligibilityReasons($product, $combination)) {
                continue;
            }
            $uuid = (string) ($combination['uuid'] ?? '');
            $label = (string) ($combination['label'] ?? '');
            $title = $label !== '' ? $product->name . ' - ' . $label : $product->name;

            // Variant price: explicit combination price > base effective price.
            $combinationPrice = $combination['price'] ?? null;
            if ($combinationPrice !== null && $combinationPrice !== '' && (float) $combinationPrice > 0) {
                $price = (float) $combinationPrice;
                $salePrice = null;
            } else {
                $price = $product->effectivePrice();
                $salePrice = $product->hasEffectiveSale() ? (float) $product->sale_price : null;
            }

            $hasGtin = false;
            $hasMpn = false;

            $items[] = [
                'id' => $this->feedId($product, $uuid),
                'item_group_id' => $this->itemGroupId($store, $product),
                'title' => $title,
                'description' => $description,
                'link' => $this->productUrl($store, $product, $request),
                'image_link' => $primary,
                'additional_image_links' => array_map(
                    fn ($img) => $this->absoluteImageUrl($store, (string) $img, $request),
                    $additional
                ),
                'availability' => $this->variantAvailability($product, $combination),
                'price' => $this->money($price, $currency),
                'price_amount' => $price,
                'sale_price' => $salePrice !== null ? $this->money($salePrice, $currency) : null,
                'sale_price_amount' => $salePrice,
                'currency' => $currency,
                'brand' => $brand,
                'gtin' => null,
                'mpn' => null,
                'sku' => $product->sku ?: null,
                'barcode' => $product->barcode ?: null,
                'condition' => 'new',
                'product_type' => $productType,
                'identifier_exists' => $hasGtin || $hasMpn ? 'yes' : 'no',
            ];
        }

        return $items;
    }

    /**
     * Normalize a standalone (non-variant) product.
     */
    protected function normalizeStandalone(Product $product, Store $store, ?Request $request = null): array
    {
        $currency = $this->currencyCode($store);
        $price = $product->effectivePrice();
        $salePrice = $product->hasEffectiveSale() ? (float) $product->sale_price : null;

        // We never fabricate GTIN/MPN. Only real data would be emitted; there
        // is no product GTIN/MPN field, so identifier_exists reflects that.
        $hasGtin = false;
        $hasMpn = false;

        return [
            'id' => $this->feedId($product),
            'item_group_id' => null,
            'title' => $product->name,
            'description' => $this->normalizeDescription($product),
            'link' => $this->productUrl($store, $product, $request),
            'image_link' => $this->absoluteImageUrl($store, $this->productImage($product), $request),
            'additional_image_links' => array_map(
                fn ($img) => $this->absoluteImageUrl($store, (string) $img, $request),
                $this->additionalImages($product)
            ),
            'availability' => $this->availability($product),
            'price' => $this->money($price, $currency),
            'price_amount' => $price,
            'sale_price' => $salePrice !== null ? $this->money($salePrice, $currency) : null,
            'sale_price_amount' => $salePrice,
            'currency' => $currency,
            'brand' => $store->name,
            'gtin' => null,
            'mpn' => null,
            'sku' => $product->sku ?: null,
            'barcode' => $product->barcode ?: null,
            'condition' => 'new',
            'product_type' => $this->productType($product),
            'identifier_exists' => $hasGtin || $hasMpn ? 'yes' : 'no',
        ];
    }

    /**
     * Resolve a possibly root-relative image path to an absolute public URL
     * on the store's canonical domain.
     */
    public function absoluteImageUrl(Store $store, string $path, ?Request $request = null): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return rtrim($store->getStoreUrl($request), '/') . '/' . ltrim($path, '/');
    }

    /**
     * Format an amount with its ISO currency code for a feed.
     */
    protected function money(float $amount, string $currency): string
    {
        return number_format($amount, 2, '.', '') . ' ' . $currency;
    }

    /**
     * Get the store's eligible products as an eager-loaded query ready for
     * chunked/streamed iteration.
     */
    public function eligibleProductsQuery(Store $store): EloquentBuilder
    {
        return Product::query()
            ->with(['category.parent'])
            ->where('store_id', $store->id)
            ->where('is_active', true);
    }

    /**
     * Count feedback for merchant UI: eligible items, excluded products and
     * their reasons. Only counts storefront-visible products for performance.
     */
    public function dashboardStats(Store $store): array
    {
        $reasons = ['not_published' => 0, 'missing_title' => 0, 'invalid_price' => 0, 'missing_image' => 0];
        $excluded = 0;
        $eligibleItems = 0;

        $this->eligibleProductsQuery($store)
            ->orderBy('id')
            ->chunk(200, function (Collection $chunk) use (&$eligibleItems, &$excluded, &$reasons) {
                foreach ($chunk as $product) {
                    $productReasons = $this->eligibilityReasons($product);
                    if (!empty($productReasons)) {
                        $excluded++;
                        foreach ($productReasons as $reason) {
                            $reasons[$reason] = isset($reasons[$reason]) ? $reasons[$reason] + 1 : 1;
                        }
                        continue;
                    }
                    if ($this->hasFeedableVariants($product)) {
                        $eligibleItems += count($product->variant_combinations ?? []);
                    } else {
                        $eligibleItems += 1;
                    }
                }
            });

        return [
            'eligible_items' => $eligibleItems,
            'excluded_products' => $excluded,
            'reasons' => $reasons,
        ];
    }
}
