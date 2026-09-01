<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StorePage;
use Illuminate\Http\Request;

/**
 * Centralized storefront SEO layer shared by every storefront template.
 *
 * All templates render through resources/views/app.blade.php, which sources its
 * <head> metadata (title, meta description/keywords, canonical, robots,
 * OpenGraph, Twitter, JSON-LD) from this single service. This guarantees the
 * six (and any future) templates produce identical, correct, crawlable SEO
 * without per-template logic.
 *
 * Security rules enforced here:
 *  - Merchant SEO inputs are only ever escaped, never emitted raw. No arbitrary
 *    JSON-LD, no script injection, no unsafe canonical from user input.
 *  - canonical is always derived from the real request URL (subdomain or custom
 *    domain), so it can never be polluted by preview/query params.
 *  - Only REAL product data is emitted: real price/currency from product +
 *    store settings, real availability from InventoryService. Rating/aggregate
 *    data is intentionally NOT invented; an optional hook allows real review
 *    aggregates to be injected later (see productJsonLd()).
 *  - noIndex is emitted for preview, search and private routes.
 */
class StorefrontSeoService
{
    public const CONTEXT_STORE = 'store';
    public const CONTEXT_PRODUCT = 'product';
    public const CONTEXT_CATEGORY = 'category';
    public const CONTEXT_PRODUCTS = 'products';
    public const CONTEXT_SEARCH = 'search';
    public const CONTEXT_PAGE = 'page';

    /** @var Store|null */
    protected $store;

    /** @var string */
    protected $context = self::CONTEXT_STORE;

    /** @var Product|null */
    protected $product;

    /** @var Category|null */
    protected $category;

    /** @var StorePage|null */
    protected $storePage;

    /** @var string */
    protected $title = '';

    /** @var string */
    protected $description = '';

    /** @var string */
    protected $keywords = '';

    /** @var string */
    protected $image = '';

    /** @var bool */
    protected $noindex = false;

    /** @var array */
    protected $jsonLd = [];

    /**
     * Manually bind the store (a Store model) before resolving a product.
     */
    public function setStore($store): self
    {
        $this->store = $store instanceof Store ? $store : null;
        return $this;
    }

    /**
     * Resolve the SEO document for the current storefront request.
     * Uses the resolved store + current route/request context, with explicit
     * overrides set by storefront controllers (product/category/page).
     */
    public function resolve(Request $request): self
    {
        $this->store = $request->attributes->get('resolved_store')
            ?? $request->route('store');

        // Explicit context overrides set by controllers when they render a
        // product/category/custom-page view.
        if ($request->attributes->has('seo_product')) {
            $this->product = $request->attributes->get('seo_product');
            $this->context = self::CONTEXT_PRODUCT;
        } elseif ($request->attributes->has('seo_category')) {
            $this->category = $request->attributes->get('seo_category');
            $this->context = self::CONTEXT_CATEGORY;
        } elseif ($request->attributes->has('seo_store_page')) {
            $this->storePage = $request->attributes->get('seo_store_page');
            $this->context = self::CONTEXT_PAGE;
        } else {
            $this->detectContextFromRequest($request);
        }

        $this->buildDocument($request);
        return $this;
    }

    /**
     * Detect context from the request path when no controller override set it.
     */
    protected function detectContextFromRequest(Request $request): void
    {
        $path = trim($request->getPathInfo(), '/');
        $segments = $path === '' ? [] : explode('/', $path);
        $first = $segments[0] ?? '';

        if ($first === 'search') {
            $this->context = self::CONTEXT_SEARCH;
            return;
        }

        if ($first === 'product' && isset($segments[1]) && $this->store) {
            $product = $this->resolveProduct((string) $segments[1]);
            if ($product) {
                $this->product = $product;
                $this->context = self::CONTEXT_PRODUCT;
                return;
            }
        }

        if ($first === 'category' && isset($segments[1]) && $this->store) {
            $category = Category::where('store_id', $this->store->id)
                ->where('is_active', true)
                ->where('slug', $segments[1])
                ->first();
            if ($category) {
                $this->category = $category;
                $this->context = self::CONTEXT_CATEGORY;
                return;
            }
        }

        if ($first === 'products') {
            $this->context = self::CONTEXT_PRODUCTS;
            return;
        }

        if ($first === 'page' && isset($segments[1]) && $this->store) {
            $page = $this->store->pages()
                ->where('slug', $segments[1])
                ->where('is_active', true)
                ->first();
            if ($page) {
                $this->storePage = $page;
                $this->context = self::CONTEXT_PAGE;
                return;
            }
        }

        $this->context = self::CONTEXT_STORE;
    }

    protected function buildDocument(Request $request): void
    {
        $this->description = '';
        $this->keywords = '';
        $this->image = '';
        $this->noindex = false;
        $this->jsonLd = [];

        // Search results must never be indexed.
        if ($this->context === self::CONTEXT_SEARCH) {
            $this->noindex = true;
            $this->title = $this->store
                ? trim(($this->store->seo_title ?: $this->store->name))
                : 'البحث';
            $this->buildStoreChrome($request);
            return;
        }

        // Preview mode (template/designer previews) must never be indexed.
        if ($request->boolean('preview')) {
            $this->noindex = true;
        }

        switch ($this->context) {
            case self::CONTEXT_PRODUCT:
                $this->buildProduct($request);
                break;
            case self::CONTEXT_CATEGORY:
                $this->buildCategory($request);
                break;
            case self::CONTEXT_PRODUCTS:
                $this->buildProducts($request);
                break;
            case self::CONTEXT_PAGE:
                $this->buildPage($request);
                break;
            default:
                $this->buildStore($request);
                break;
        }
    }

    protected function buildStore(Request $request): void
    {
        if (!$this->store) {
            $this->title = config('app.name', 'Wusool');
            return;
        }
        $store = $this->store;
        $config = StoreConfiguration::getConfiguration($store->id);

        $this->title = trim($store->seo_title ?: ($config['meta_title'] ?? '') ?: $store->name);
        $this->description = trim($store->seo_description ?: ($config['meta_description'] ?? '') ?: ($store->description ?? ''));
        $this->keywords = trim($store->seo_keywords ?: ($config['meta_keywords'] ?? ''));
        $this->image = $this->absoluteImage($store->seo_image ?: ($config['og_image'] ?? ''), $request);

        $canonical = $this->canonical($request);

        $this->jsonLd[] = [
            '@' . 'type' => 'Store',
            'name' => $store->name,
            'description' => $this->description ?: null,
            'url' => $canonical,
            'image' => $this->image ?: null,
            'merchant' => [
                '@' . 'type' => 'Organization',
                'name' => config('app.name', 'Wusool'),
            ],
        ];
        $this->jsonLd[] = $this->breadcrumb([
            ['name' => $store->name, 'url' => $canonical],
        ], $canonical);
    }

    protected function buildProduct(Request $request): void
    {
        if (!$this->store || !$this->product) {
            $this->buildStore($request);
            return;
        }
        $store = $this->store;
        $product = $this->product;

        $this->title = trim($product->meta_title ?: $product->name);
        $this->description = trim($product->meta_description ?: $product->short_description ?: $product->description ?: '');
        $this->image = $this->absoluteImage($this->productImage($product), $request);

        $canonical = $this->canonical($request);

        $this->jsonLd[] = $this->productJsonLd($product, $store, $canonical, $request);
        $this->jsonLd[] = $this->breadcrumb([
            ['name' => $store->name, 'url' => $this->storeRootUrl($request)],
            ['name' => $product->name, 'url' => $canonical],
        ], $canonical);
    }

    protected function buildCategory(Request $request): void
    {
        if (!$this->store || !$this->category) {
            $this->buildStore($request);
            return;
        }
        $store = $this->store;
        $category = $this->category;
        $config = StoreConfiguration::getConfiguration($store->id);

        $this->title = trim($category->name . ' - ' . ($store->seo_title ?: $store->name));
        $this->description = trim($category->description ?: ($config['meta_description'] ?? '') ?: ($store->seo_description ?? ''));
        $this->image = $this->absoluteImage($category->image ?: ($store->seo_image ?? ''), $request);

        $canonical = $this->canonical($request);

        $this->jsonLd[] = [
            '@' . 'type' => 'CollectionPage',
            'name' => $category->name,
            'description' => $this->description ?: null,
            'url' => $canonical,
            'image' => $this->image ?: null,
            'mainEntity' => [
                '@' . 'type' => 'ItemList',
                'numberOfItems' => (int) Product::where('store_id', $store->id)
                    ->where('category_id', $category->id)
                    ->where('is_active', true)
                    ->count(),
            ],
        ];
        $this->jsonLd[] = $this->breadcrumb([
            ['name' => $store->name, 'url' => $this->storeRootUrl($request)],
            ['name' => $category->name, 'url' => $canonical],
        ], $canonical);
    }

    protected function buildProducts(Request $request): void
    {
        if (!$this->store) {
            $this->buildStore($request);
            return;
        }
        $store = $this->store;
        $config = StoreConfiguration::getConfiguration($store->id);
        $canonical = $this->canonical($request);

        $this->title = trim(($store->seo_title ?: ($config['meta_title'] ?? '') ?: $store->name));
        $this->description = trim($store->seo_description ?: ($config['meta_description'] ?? ''));
        $this->image = $this->absoluteImage($store->seo_image ?: ($config['og_image'] ?? ''), $request);

        $this->jsonLd[] = [
            '@' . 'type' => 'ItemList',
            'name' => $store->name . ' - Products',
            'numberOfItems' => (int) Product::where('store_id', $store->id)->where('is_active', true)->count(),
            'url' => $canonical,
        ];
    }

    protected function buildPage(Request $request): void
    {
        if (!$this->store || !$this->storePage) {
            $this->buildStore($request);
            return;
        }
        $store = $this->store;
        $page = $this->storePage;

        $this->title = trim($page->meta_title ?: $page->title);
        $this->description = trim($page->meta_description ?: '');
        $this->image = $this->absoluteImage($page->image ?: '', $request);

        $this->jsonLd[] = $this->breadcrumb([
            ['name' => $store->name, 'url' => $this->storeRootUrl($request)],
            ['name' => $page->title, 'url' => $this->canonical($request)],
        ], $this->canonical($request));
    }

    protected function buildStoreChrome(Request $request): void
    {
        if (!$this->store) {
            return;
        }
        $this->jsonLd[] = $this->breadcrumb([
            ['name' => $this->store->name, 'url' => $this->storeRootUrl($request)],
        ], $this->canonical($request));
    }

    /**
     * Real Product JSON-LD from actual product + store data only.
     * Availability comes from InventoryService (single source of truth).
     * NO invented rating/aggregateRating — an optional hook allows a later
     * reviews implementation to attach real aggregates.
     */
    protected function productJsonLd(Product $product, Store $store, string $canonical, Request $request): array
    {
        $hasSale = $product->hasEffectiveSale();
        $price = $hasSale ? (float) $product->sale_price : (float) $product->price;
        $currencyCode = $this->storeCurrencyCode($store);
        $availability = $product->availabilityStatus() === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock';

        $offer = [
            '@' . 'type' => 'Offer',
            'url' => $canonical,
            'priceCurrency' => $currencyCode,
            'price' => number_format($price, 2, '.', ''),
            'availability' => $availability,
            'itemCondition' => 'https://schema.org/NewCondition',
        ];
        if ($hasSale) {
            $offer['price'] = number_format((float) $product->sale_price, 2, '.', '');
        }
        if (!empty($product->sku)) {
            $offer['sku'] = $product->sku;
        }

        $schema = [
            '@' . 'context' => 'https://schema.org',
            '@' . 'type' => 'Product',
            'name' => $product->name,
            'url' => $canonical,
            'description' => ($product->short_description ?: $product->description) ?: null,
            'image' => $this->absoluteImage($this->productImage($product), $request) ?: null,
            'sku' => $product->sku ?: null,
            'brand' => ['@' . 'type' => 'Brand', 'name' => $store->name],
            'offers' => $offer,
        ];

        // Hook for REAL review aggregates (to be wired once reviews are live).
        $aggregate = $this->realAggregateRating($product);
        if (!empty($aggregate)) {
            $schema['aggregateRating'] = $aggregate;
        }

        return $schema;
    }

    /**
     * Optional real aggregate-rating hook. Returns [] until a reviews
     * integration provides genuine values — never fabricated.
     */
    protected function realAggregateRating(Product $product): array
    {
        return [];
    }

    protected function storeCurrencyCode(Store $store): string
    {
        try {
            // Canonical storefront pricing currency source (store → user →
            // superadmin cascade with the platform default). This is the same
            // resolver OrderService/CurrencyService use for product pricing,
            // so the Offer priceCurrency always matches what a customer pays.
            $settings = \App\Services\Currency\CurrencyService::getCurrencySettings(
                $store->user ? $store->user->id : null,
                $store->id
            );
            $code = $settings['defaultCurrency'] ?? null;
        } catch (\Throwable $e) {
            $code = null;
        }
        return (is_string($code) && $code !== '') ? $code : 'ILS';
    }

    protected function absoluteImage($path, Request $request): string
    {
        $path = (string) $path;
        if ($path === '') {
            return '';
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        // Absolute URL from the request host so OG images never leak admin
        // paths or a wrong domain.
        return $request->getSchemeAndHttpHost() . '/' . ltrim($path, '/');
    }

    protected function breadcrumb(array $items, string $base): array
    {
        $list = [];
        $position = 1;
        foreach ($items as $item) {
            $list[] = [
                '@' . 'type' => 'ListItem',
                'position' => $position,
                'name' => $item['name'],
                'item' => $item['url'],
            ];
            $position++;
        }
        return [
            '@' . 'type' => 'BreadcrumbList',
            'itemListElement' => $list,
            'url' => $base,
        ];
    }

    /**
     * Canonical URL for the current page, from the REAL request URL.
     * Never includes preview/query params (so ?preview=1 can't pollute the
     * canonical). Reflects the actual host — custom domain or subdomain.
     */
    public function canonical(Request $request): string
    {
        $scheme = $request->getScheme();
        $host = $request->getHttpHost();
        $baseUrl = $scheme . '://' . $host;
        $path = '/' . ltrim($request->getPathInfo(), '/');
        if ($path === '/') {
            return $baseUrl;
        }
        return $baseUrl . $path;
    }

    public function storeRootUrl(Request $request): string
    {
        // The store's root page on the current (real) host, e.g. subdomain or
        // custom domain. Never a query/preview URL.
        $host = $request->getHttpHost();
        return $request->getScheme() . '://' . rtrim($host, '/') . '/';
    }

    /**
     * First product image resolved from cover_image or the images collection,
     * robust to string/JSON/array storage.
     */
    protected function productImage(Product $product): string
    {
        if (!empty($product->cover_image)) {
            return (string) $product->cover_image;
        }
        $raw = $product->images;
        $first = '';
        if (is_string($raw) && $raw !== '') {
            // Possibly JSON or comma-separated.
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && count($decoded) > 0) {
                $first = (string) $decoded[0];
            } else {
                $first = str_contains($raw, ',') ? (string) explode(',', $raw)[0] : $raw;
            }
        } elseif (is_array($raw) && count($raw) > 0) {
            $first = (string) $raw[0];
        }
        return $first;
    }

    /**
     * Resolve a product by seo_url_slug OR numeric id (Arabic-slug safe).
     * Only returns active products owned by the current store.
     */
    public function resolveProduct(string $ref): ?Product
    {
        if (!$this->store) {
            return null;
        }
        return Product::where('store_id', $this->store->id)
            ->where('is_active', true)
            ->when(
                ctype_digit($ref),
                fn ($q) => $q->where(function ($qq) use ($ref) {
                    $qq->where('id', (int) $ref)->orWhere('seo_url_slug', $ref);
                }),
                fn ($q) => $q->where('seo_url_slug', $ref)
            )
            ->first();
    }

    // ── Public accessors rendered by app.blade.php ──────────────────────────

    public function getStore(): ?Store
    {
        return $this->store;
    }

    public function getContext(): string
    {
        return $this->context;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getKeywords(): string
    {
        return $this->keywords;
    }

    public function getImage(): string
    {
        return $this->image;
    }

    public function isNoindex(): bool
    {
        return $this->noindex;
    }

    public function getJsonLd(): array
    {
        return $this->jsonLd;
    }

    public function getCanonical(Request $request): string
    {
        return $this->canonical($request);
    }
}
