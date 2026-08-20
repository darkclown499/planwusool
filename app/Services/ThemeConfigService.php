<?php

namespace App\Services;

use App\Models\Store;

/**
 * ThemeConfigService
 * ------------------
 * Server-side source of truth for the schema-driven theme engine's
 * `theme.config.json`. The base schema for each engine theme is shipped in
 * public/theme-configs/<slug>.json (the same files the admin previews) so the
 * backend can inject the matching schema when a theme is applied, without
 * duplicating the presets in PHP.
 */
class ThemeConfigService
{
    /** Whether a theme slug is one of the schema-driven engine themes. */
    public static function isEngineTheme(?string $slug): bool
    {
        return is_string($slug) && in_array($slug, Store::ENGINE_THEMES, true);
    }

    /**
     * Resolve the base theme.config.json for an engine theme, or null for the
     * legacy template themes (rendered by the section renderer, no schema).
     */
    public static function resolve(?string $slug): ?array
    {
        if (!self::isEngineTheme($slug)) {
            return null;
        }

        $path = public_path('theme-configs/' . $slug . '.json');
        if (!file_exists($path)) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Merge a stored theme_config over its preset. When the stored config
     * belongs to a different theme (id mismatch) the preset wins so switching
     * themes always starts from that theme's schema.
     */
    public static function merge(?array $stored, ?string $slug): array
    {
        $preset = self::resolve($slug) ?? [];

        if (!is_array($stored) || ($stored['id'] ?? null) !== $slug) {
            return $preset;
        }

        return array_replace_recursive($preset, $stored);
    }

    /**
     * Persist a submitted theme_config, normalized against the current theme's
     * preset so a partial payload (e.g. only features.enable_banner) never
     * blanks the rest of the schema.
     */
    public static function save(?array $submitted, ?string $slug): ?array
    {
        if (!self::isEngineTheme($slug)) {
            return null;
        }

        if (!is_array($submitted) || $submitted === []) {
            return self::resolve($slug);
        }

        unset($submitted['id']);
        $normalized = self::merge([], $slug);
        $sane = array_filter($submitted, fn ($v) => $v !== null);

        return array_replace_recursive($normalized, $sane);
    }

    /**
     * Toggle the promotional banner feature flag inside a theme_config array.
     */
    public static function setBannerEnabled(array $config, bool $enabled): array
    {
        $features = $config['features'] ?? [];
        $features['enable_banner'] = $enabled;
        $config['features'] = $features;

        return $config;
    }

    /** Read banner slides from a theme config's content block (if any). */
    public static function bannerSlides(?array $config): array
    {
        if (!is_array($config)) {
            return [];
        }

        $slides = $config['content']['banners'] ?? [];

        return is_array($slides) ? $slides : [];
    }
}