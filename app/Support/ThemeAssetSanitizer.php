<?php

namespace App\Support;

/**
 * Sanitizers for merchant-provided theme customization assets
 * (custom.css / scripts.js / head_inject.html) stored per-store in
 * template_overrides and injected into the public storefront.
 *
 * Merchants may fully customize their own storefront, so the goal here is
 * not whitelisting HTML — it is preventing the payloads from breaking out
 * of their intended container (<style>, <script>, <head>) or executing
 * server-side code.
 */
class ThemeAssetSanitizer
{
    private const MAX_CSS_LENGTH = 100000;
    private const MAX_JS_LENGTH = 100000;
    private const MAX_HTML_LENGTH = 100000;

    /** Shared hardening: kill PHP tags and null bytes/control chars. */
    private static function base(string $value): string
    {
        $value = str_replace(["<?php", "<?=", "<?"], '', (string) $value);
        // Remove any remaining short-open style tags (<?= covered above).
        $value = preg_replace('/<\?/', '', $value) ?? '';
        // Strip control characters except \t \n \r.
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';

        return $value;
    }

    /** Custom CSS — prevent closing the <style> container early. */
    public static function css(?string $value): string
    {
        $value = self::base((string) $value);
        $value = preg_replace('/<\/?\s*style/i', '', $value) ?? '';

        return mb_substr($value, 0, self::MAX_CSS_LENGTH);
    }

    /** Custom JS — prevent closing the <script> container early. */
    public static function js(?string $value): string
    {
        $value = self::base((string) $value);
        $value = preg_replace('/<\/?\s*script/i', '', $value) ?? '';

        return mb_substr($value, 0, self::MAX_JS_LENGTH);
    }

    /**
     * Raw HTML injected into <head> (meta tags, verification codes,
     * pixel snippets). PHP tags removed; container kept raw because
     * merchants own their storefront markup.
     */
    public static function html(?string $value): string
    {
        $value = self::base((string) $value);

        return mb_substr($value, 0, self::MAX_HTML_LENGTH);
    }
}
