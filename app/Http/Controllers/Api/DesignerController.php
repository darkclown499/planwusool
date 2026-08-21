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