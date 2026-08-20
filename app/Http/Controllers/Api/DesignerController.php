<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
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

        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => ($store->template_overrides ?? [])['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
            'availableThemes' => $request->user()->getAvailableThemes(),
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

        $store->save();
        $store->refresh();

        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => ($store->template_overrides ?? [])['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
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