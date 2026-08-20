<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

/**
 * Tier-aware template state editor.
 *
 * Central place for per-store template state (theme, design tokens, section
 * overrides, content blob, behavior toggles). Every write is checked against
 * the owner's plan capabilities, so a lower-tier request can never smuggle in
 * keys reserved for a higher tier (defence in depth — the UI also hides them).
 */
class TemplateEditorController extends Controller
{
    /**
     * Get the full template state for the store.
     */
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $capabilities = $this->capabilities($request->user());

        return response()->json([
            'success' => true,
            'template' => [
                'theme' => $store->getTemplateSlug(),
                'theme_config' => $store->theme_config ?? \App\Services\ThemeConfigService::resolve($store->getTemplateSlug()),
                'design_tokens' => $store->design_tokens ?? [],
                'template_overrides' => $store->template_overrides ?? [],
                'content' => $store->getMergedStoreContent(),
            ],
            'behavior' => $this->getBehavior($store),
            'capabilities' => $capabilities,
            'availableThemes' => $request->user()->getAvailableThemes(),
        ]);
    }

    /**
     * Save the full template state, enforcing per-feature tier access.
     */
    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = $request->user();
        $capabilities = $this->capabilities($user);

        $validated = $request->validate([
            'theme' => 'nullable|string',
            'theme_config' => 'nullable|array',
            'design_tokens' => 'nullable|array',
            'template_overrides' => 'nullable|array',
            'content' => 'nullable|array',
            'behavior' => 'nullable|array',
        ]);

        // Theme change is available to every tier (within plan-accessible slugs).
        if (isset($validated['theme'])) {
            $available = $user->getAvailableThemes();
            $theme = Store::normalizeThemeSlug($validated['theme']);
            if (!in_array($theme, $available, true)) {
                return response()->json(['error' => 'This template is not available on your current plan.'], 422);
            }
            $store->theme = $theme;
            // Seed the matching theme.config.json schema for engine themes.
            if (\App\Services\ThemeConfigService::isEngineTheme($theme)) {
                $store->theme_config = \App\Services\ThemeConfigService::merge($store->theme_config, $theme);
            }
        }

        // Schema-driven theme config overrides (engine themes only).
        if (isset($validated['theme_config'])) {
            $store->theme_config = \App\Services\ThemeConfigService::save(
                $validated['theme_config'],
                $store->getTemplateSlug()
            );
        }

        // Colors / design tokens — every tier may set colors.
        if (isset($validated['design_tokens'])) {
            $store->design_tokens = $validated['design_tokens'];
        }

        // Section overrides — only Professional may override section props
        // (advanced control). Other tiers can only keep existing overrides.
        if (isset($validated['template_overrides'])) {
            if (!$capabilities['advanced']) {
                return response()->json(['error' => 'Advanced template editing requires the Professional plan.'], 403);
            }
            $store->template_overrides = $validated['template_overrides'];
        }

        // Content blob — section-scoped by tier.
        if (isset($validated['content'])) {
            $merged = $store->getMergedStoreContent();
            $store->store_content = $this->mergeContentByTier($merged, $validated['content'], $capabilities);
        }

        // Behavior toggles — Professional only.
        if (isset($validated['behavior'])) {
            if (!$capabilities['behavior']) {
                return response()->json(['error' => 'Storefront behavior toggles require the Professional plan.'], 403);
            }
            $this->saveBehavior($store, $validated['behavior']);
        }

        $store->save();

        // Fresh merge so the response reflects what actually persisted.
        $store->refresh();

        return response()->json([
            'success' => true,
            'template' => [
                'theme' => $store->getTemplateSlug(),
                'theme_config' => $store->theme_config ?? \App\Services\ThemeConfigService::resolve($store->getTemplateSlug()),
                'design_tokens' => $store->design_tokens ?? [],
                'template_overrides' => $store->template_overrides ?? [],
                'content' => $store->getMergedStoreContent(),
            ],
            'behavior' => $this->getBehavior($store),
            'capabilities' => $capabilities,
        ]);
    }

    /**
     * Merge the submitted content blob into the existing one, only allowing
     * sections/keys the user's tier may edit.
     */
    protected function mergeContentByTier(array $current, array $incoming, array $caps): array
    {
        $allowedSections = ['announcement', 'features', 'testimonials', 'faqs', 'trust_bar', 'newsletter'];

        if ($caps['banners']) {
            $allowedSections[] = 'banner';
            $allowedSections[] = 'banners'; // promotional banner carousel slides
        }
        if ($caps['hero']) {
            $allowedSections[] = 'hero';
        }
        if ($caps['video']) {
            $allowedSections[] = 'video';
        }

        $allowedSections = array_flip($allowedSections);

        foreach ($incoming as $section => $value) {
            if (!isset($allowedSections[$section])) {
                continue; // silently ignore sections the tier cannot edit
            }
            $current[$section] = $value;
        }

        return $current;
    }

    /**
     * Behavior toggles stored in store_configurations.
     */
    protected function getBehavior(Store $store): array
    {
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);

        return [
            'enable_customer_login' => (bool) ($config['enable_customer_login'] ?? true),
            'enable_customer_registration' => (bool) ($config['enable_customer_registration'] ?? true),
            'require_login_checkout' => (bool) ($config['require_login_checkout'] ?? false),
            'show_whatsapp_order_button' => (bool) ($config['show_whatsapp_order_button'] ?? true),
            'show_search' => (bool) ($config['show_search'] ?? true),
            'show_cart' => (bool) ($config['show_cart'] ?? true),
            'show_auth_button' => (bool) ($config['show_auth_button'] ?? true),
        ];
    }

    protected function saveBehavior(Store $store, array $behavior): void
    {
        foreach (Store::BEHAVIOR_KEYS as $key) {
            if (array_key_exists($key, $behavior)) {
                \App\Models\StoreConfiguration::updateConfiguration(
                    $store->id,
                    $key,
                    (bool) $behavior[$key] ? 'true' : 'false'
                );
            }
        }

        \App\Models\StoreConfiguration::forgetConfiguration($store->id);
    }

    protected function capabilities($user): array
    {
        return \getTemplateCapabilities($user);
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