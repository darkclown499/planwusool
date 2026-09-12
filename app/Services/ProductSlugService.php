<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Str;

/**
 * FIX PACK 01 — canonical, backend-authoritative product slug generation.
 *
 * Arabic product names must auto-produce valid URL-safe slugs without forcing
 * the merchant into advanced SEO fields. Str::slug() (intl transliterator)
 * deterministically transliterates Arabic, e.g. "بن عربي فاخر" → "bn-aarby-fakhr".
 * Uniqueness is store-scoped: Store A slugs never block Store B.
 */
class ProductSlugService
{
    /**
     * Generate a valid, store-scoped unique slug from a product name.
     */
    public static function generate(string $name, int $storeId, ?int $excludeId = null): string
    {
        $base = Str::slug(trim($name));
        $base = strtolower(trim((string) $base));
        // Str::slug may return '' for symbol-only names.
        if ($base === '') {
            $base = 'product';
        }
        // Keep within the 191-char column; leave room for -N suffixes.
        $base = substr($base, 0, 150);
        $base = trim($base, '-');
        if ($base === '') {
            $base = 'product';
        }

        $slug = $base;
        $counter = 2;
        while (self::exists($slug, $storeId, $excludeId)) {
            $suffix = '-' . $counter;
            $slug = substr($base, 0, 191 - strlen($suffix)) . $suffix;
            $counter++;
            // Safety bound; collisions beyond this are practically impossible.
            if ($counter > 1000) {
                $slug = substr($base, 0, 150) . '-' . uniqid();
                break;
            }
        }

        return $slug;
    }

    /**
     * Whether a slug needs backend auto-generation: blank or non-ASCII
     * (e.g. Arabic auto-derived frontend slug). Latin invalid slugs
     * (spaces/symbols) are left for strict validation to reject clearly.
     */
    public static function needsGeneration(?string $slug): bool
    {
        $slug = trim((string) $slug);
        if ($slug === '') {
            return true;
        }
        return (bool) preg_match('/[^\x00-\x7F]/', $slug);
    }

    private static function exists(string $slug, int $storeId, ?int $excludeId): bool
    {
        $query = Product::where('store_id', $storeId)->where('seo_url_slug', $slug);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
