<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StorePage;
use App\Models\Product;
use App\Models\Category;
use App\Models\LandingPageCustomPage;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $baseUrl = rtrim(getSchemeAwareUrl(), '/');
        $stores = Store::whereHas('user', fn($q) => $q->where('is_active', 1))
            ->where('is_active', 1)
            ->get();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
        $xml .= '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' . "\n";
        $xml .= '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9' . "\n";
        $xml .= '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' . "\n";

        // Home page
        $xml .= $this->urlEntry($baseUrl, '1.0', 'daily');

        // Features page
        $xml .= $this->urlEntry($baseUrl . '/features', '0.8', 'weekly');

        // About page
        $xml .= $this->urlEntry($baseUrl . '/about', '0.6', 'monthly');

        // Terms & Privacy
        $xml .= $this->urlEntry($baseUrl . '/terms', '0.3', 'yearly');
        $xml .= $this->urlEntry($baseUrl . '/privacy', '0.3', 'yearly');

        // Landing custom pages (admin-created)
        $customPages = LandingPageCustomPage::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['slug', 'updated_at']);
        foreach ($customPages as $cp) {
            $xml .= $this->urlEntry($baseUrl . '/' . $cp->slug, '0.6', 'monthly', $cp->updated_at);
        }

        foreach ($stores as $store) {
            $storeUrl = $this->getStoreUrl($store);

            // Store home
            $xml .= $this->urlEntry($storeUrl, '0.9', 'daily', $store->updated_at);

            // Store products page
            $xml .= $this->urlEntry($storeUrl . '/products', '0.8', 'daily');

            // Categories
            $categories = Category::where('store_id', $store->id)->where('is_active', 1)->get();
            foreach ($categories as $category) {
                $xml .= $this->urlEntry($storeUrl . '/category/' . $category->slug, '0.7', 'weekly', $category->updated_at);
            }

            // Individual products — use seo_url_slug for SEO-friendly URLs
            $products = Product::where('store_id', $store->id)
                ->where('is_active', 1)
                ->get(['id', 'seo_url_slug', 'updated_at']);

            foreach ($products as $product) {
                $productSlug = $product->seo_url_slug ?: $product->id;
                $xml .= $this->urlEntry($storeUrl . '/product/' . $productSlug, '0.8', 'daily', $product->updated_at);
            }

            // Custom store pages (Professional plan feature)
            $pages = StorePage::where('store_id', $store->id)->where('is_active', 1)->get();
            foreach ($pages as $page) {
                $xml .= $this->urlEntry($storeUrl . '/page/' . $page->slug, '0.5', 'monthly', $page->updated_at);
            }
        }

        $xml .= '</urlset>';

        return response($xml, 200)
            ->header('Content-Type', 'application/xml')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function urlEntry(string $url, string $priority, string $changefreq, $lastmod = null): string
    {
        // Escape XML-significant characters (store names/domains are user-supplied)
        $url = htmlspecialchars($url, ENT_QUOTES | ENT_XML1, 'UTF-8');

        $mod = $lastmod ? \Carbon\Carbon::parse($lastmod)->format('Y-m-d') : now()->format('Y-m-d');

        return "  <url>\n" .
               "    <loc>{$url}</loc>\n" .
               "    <lastmod>{$mod}</lastmod>\n" .
               "    <changefreq>{$changefreq}</changefreq>\n" .
               "    <priority>{$priority}</priority>\n" .
               "  </url>\n";
    }

    private function getStoreUrl(Store $store): string
    {
        // Priority 1: Verified custom domain from store_domains table
        $verifiedDomain = $store->getVerifiedDomain();
        if ($verifiedDomain) {
            return 'https://' . $verifiedDomain->domain_name;
        }
        if ($store->enable_custom_domain && $store->custom_domain) {
            return 'https://' . $store->custom_domain;
        }
        if ($store->enable_custom_subdomain && $store->custom_subdomain) {
            return 'https://' . $store->custom_subdomain . '.' . getBaseDomain();
        }
        return 'https://' . $store->slug . '.' . getBaseDomain();
    }
}
