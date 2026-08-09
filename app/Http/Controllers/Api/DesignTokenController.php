<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class DesignTokenController extends Controller
{
    /**
     * Get store's design tokens (merged with template defaults).
     */
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'design_tokens' => $store->getMergedDesignTokens(),
            'template_config' => $store->getMergedTemplateConfig(),
            'template_slug' => $store->getTemplateSlug(),
            'has_advanced_builder' => $store->hasAdvancedBuilder(),
        ]);
    }

    /**
     * Update design tokens (advanced builder access required).
     */
    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if (!$store->hasAdvancedBuilder()) {
            return response()->json(['error' => 'Advanced builder requires a premium plan.'], 403);
        }

        $request->validate([
            'design_tokens' => 'required|array',
        ]);

        $store->update([
            'design_tokens' => $request->design_tokens,
        ]);

        return response()->json([
            'success' => true,
            'design_tokens' => $store->getMergedDesignTokens(),
        ]);
    }

    /**
     * Update template overrides (section order/visibility).
     */
    public function updateOverrides(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'overrides' => 'required|array',
        ]);

        $store->update([
            'template_overrides' => $request->overrides,
        ]);

        return response()->json([
            'success' => true,
            'template_config' => $store->getMergedTemplateConfig(),
        ]);
    }

    /**
     * Select/activate a template for the store (plan access enforced).
     */
    public function selectTemplate(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'template_slug' => 'required|string|exists:templates,slug',
        ]);

        $templateSlug = $request->template_slug;

        if (!$store->canUseTemplate($templateSlug)) {
            return response()->json([
                'error' => 'This template requires a higher plan. Please upgrade your subscription.',
            ], 403);
        }

        $store->update([
            'template_slug' => $templateSlug,
            'theme' => $templateSlug, // Keep legacy theme column in sync
        ]);

        return response()->json([
            'success' => true,
            'template_slug' => $templateSlug,
        ]);
    }

    /**
     * Authorize that the authenticated user owns the store.
     */
    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $store->user_id === $user->id;
    }
}