<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\ThemeAssetSanitizer;
use Illuminate\Http\Request;

/**
 * Visual Designer API — the drag & drop store builder.
 *
 * Unlike TemplateEditorController (form-based, tier-gated per field), the
 * designer owns the full store layout: the ordered section list, the design
 * tokens and the active template. Any store owner (or admin) with access may
 * redesign their own store; premium templates stay gated by the plan-aware
 * theme picker on the client side.
 */
class DesignerController extends Controller
{
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $overrides = $store->template_overrides ?? [];

        // Store categories power the designer's category multi-select editor.
        // Image values follow the same /storage/... convention as the storefront.
        $categories = \App\Models\Category::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'image'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'image' => $c->image,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => $overrides['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
            'content' => $store->store_content ?? [],
            'custom_css' => $overrides['custom_css'] ?? '',
            'custom_js' => $overrides['custom_js'] ?? '',
            'head_inject' => $overrides['head_inject'] ?? '',
            'availableThemes' => $request->user()->getAvailableThemes(),
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = $request->user();

        $validated = $request->validate([
            'theme' => 'sometimes|string',
            'sections' => 'sometimes|array',
            'design_tokens' => 'sometimes|array',
            'content' => 'sometimes|array|max:300',
            'custom_css' => 'sometimes|nullable|string|max:100000',
            'custom_js' => 'sometimes|nullable|string|max:100000',
            'head_inject' => 'sometimes|nullable|string|max:100000',
        ]);

        if (isset($validated['theme'])) {
            $available = $user->getAvailableThemes();
            $theme = Store::normalizeThemeSlug($validated['theme']);
            if (!in_array($theme, $available, true)) {
                return response()->json(['error' => 'This template is not available on your current plan.'], 422);
            }
            $store->theme = $theme;
        }

        if (isset($validated['sections'])) {
            $store->template_overrides = array_merge($store->template_overrides ?? [], [
                'sections' => $this->normalizeSections($validated['sections']),
            ]);
        }

        if (isset($validated['design_tokens'])) {
            $store->design_tokens = $validated['design_tokens'];
            // Sync branding to StoreConfiguration so ThemeController fallback chain
            // and legacy integrations see the same logo/favicon. Single source remains
            // design_tokens; this is a mirrored write for backward compat.
            try {
                if (array_key_exists('logo', $validated['design_tokens'])) {
                    \App\Models\StoreConfiguration::setConfiguration($store->id, 'logo', (string) ($validated['design_tokens']['logo'] ?? ''));
                }
                if (array_key_exists('favicon', $validated['design_tokens'])) {
                    \App\Models\StoreConfiguration::setConfiguration($store->id, 'favicon', (string) ($validated['design_tokens']['favicon'] ?? ''));
                }
            } catch (\Throwable $e) {
                // non-fatal
            }
        }

        // Slot content (v2 editor): dotted keys expand into the store_content
        // blob so templates read them via the merged content object.
        // FIX: correctly persist nested structures like hero_banner (type, images[], video_url, overlay_opacity)
        // without dropping them on refresh. Previous logic used array_values(array_filter(is_scalar)) which
        // stripped associative keys and nested arrays (e.g., hero_images).
        if (isset($validated['content']) && is_array($validated['content'])) {
            $merged = $store->store_content ?? [];
            foreach ($validated['content'] as $key => $value) {
                $key = (string) $key;
                if ($key === '' || strlen($key) > 100) {
                    continue;
                }
                $sanitized = $this->sanitizeContentValue($value);
                // Allow null to clear a key, but skip invalid structures
                if ($sanitized === null && $value !== null && !is_scalar($value) && !is_array($value)) {
                    continue;
                }
                data_set($merged, $key, $sanitized);
            }
            $store->store_content = $merged;
        }

        // Custom code assets (code editor mode) — sanitized before storage so
        // the storefront injection can never break out of its container.
        $customAssetKeys = ['custom_css', 'custom_js', 'head_inject'];
        if (collect($customAssetKeys)->contains(fn ($key) => array_key_exists($key, $validated))) {
            $overrides = $store->template_overrides ?? [];
            foreach ($customAssetKeys as $key) {
                if (array_key_exists($key, $validated)) {
                    $overrides[$key] = match ($key) {
                        'custom_css' => ThemeAssetSanitizer::css($validated[$key]),
                        'custom_js' => ThemeAssetSanitizer::js($validated[$key]),
                        default => ThemeAssetSanitizer::html($validated[$key]),
                    };
                }
            }
            $store->template_overrides = $overrides;
        }

        $store->save();
        $store->refresh();

        $overrides = $store->template_overrides ?? [];

        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => $overrides['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
            'content' => $store->store_content ?? [],
            'custom_css' => $overrides['custom_css'] ?? '',
            'custom_js' => $overrides['custom_js'] ?? '',
            'head_inject' => $overrides['head_inject'] ?? '',
        ]);
    }

    /**
     * Normalize the incoming section list: drop empty entries, coerce
     * booleans/order, merge default props so the stored shape is always valid.
     */
    protected function normalizeSections(array $sections): array
    {
        return collect($sections)
            ->filter(function ($section) {
                return is_array($section) && !empty($section['type']);
            })
            ->map(function ($section, $index) {
                $type = (string) ($section['type'] ?? 'custom');
                return [
                    'id' => (string) ($section['id'] ?? $type . '-' . ($index + 1)),
                    'type' => $type,
                    'enabled' => array_key_exists('enabled', $section) ? (bool) $section['enabled'] : true,
                    'order' => is_numeric($section['order'] ?? null) ? (int) $section['order'] : $index,
                    'props' => is_array($section['props'] ?? null) ? $section['props'] : [],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Recursively sanitize content values so hero_banner and other nested
     * structures persist correctly.
     * - Scalars and null pass through (with length cap for strings).
     * - Indexed arrays are filtered to scalars (for hero_images as string[]).
     * - Associative arrays (like hero_banner) are preserved with their keys,
     *   recursing into nested values (e.g., hero_banner.images => string[]).
     * This fixes the previous bug where array_values(array_filter(is_scalar))
     * dropped hero_images and converted hero_banner into an indexed array,
     * causing saved hero_type/hero_images/overlay settings to disappear on refresh.
     */
    private function sanitizeContentValue(mixed $value): mixed
    {
        if (is_null($value) || is_scalar($value)) {
            if (is_string($value) && strlen($value) > 100000) {
                return substr($value, 0, 100000);
            }
            return $value;
        }

        if (is_array($value)) {
            if (count($value) > 100) {
                $value = array_slice($value, 0, 100, true);
            }

            $isAssoc = array_keys($value) !== range(0, count($value) - 1);

            if ($isAssoc) {
                $result = [];
                foreach ($value as $k => $v) {
                    $k = (string) $k;
                    if ($k === '' || strlen($k) > 100) {
                        continue;
                    }
                    $sanitized = $this->sanitizeContentValue($v);
                    // Keep nulls to allow clearing, skip only truly invalid
                    if ($sanitized !== null || $v === null) {
                        $result[$k] = $sanitized;
                    } elseif (is_array($v)) {
                        // If sanitize returned null for an array, skip that key
                        continue;
                    }
                }
                return $result;
            }

            // Indexed array — keep only scalar strings (e.g., hero_images: string[])
            $filtered = array_values(array_filter($value, fn ($v) => is_scalar($v) && $v !== '' && $v !== null));
            // Cap each string length
            $filtered = array_map(fn ($v) => is_string($v) && strlen($v) > 5000 ? substr($v, 0, 5000) : $v, $filtered);
            return array_slice($filtered, 0, 50);
        }

        return null;
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return (int) $store->user_id === (int) $user->id
            || (int) $store->id === (int) ($user->current_store ?? 0);
    }
}