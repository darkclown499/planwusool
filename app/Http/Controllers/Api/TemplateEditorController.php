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
      * Single source of truth — mirrors ThemeController::getStoreBehavior.
      */
    protected function getBehavior(Store $store): array
    {
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $toBool = [\App\Models\StoreConfiguration::class, 'toBool'];
        $master = $toBool($config['customer_accounts_enabled'] ?? null, true);
        $loginRaw = $toBool($config['enable_customer_login'] ?? null, true);
        $showAuthRaw = $toBool($config['show_auth_button'] ?? null, true);
        $effectiveLogin = $master && $loginRaw && $showAuthRaw;
        $effectiveRegistration = $master && $toBool($config['customer_registration_enabled'] ?? $config['enable_customer_registration'] ?? null, true);
        $verificationMethod = strtolower(trim((string)($config['customer_verification_method'] ?? 'email')));
        $verificationMethod = in_array($verificationMethod, ['none','email'], true) ? $verificationMethod : 'email';

        return [
            'customer_accounts_enabled' => $master,
            'enable_customer_login' => $effectiveLogin,
            'enable_customer_registration' => $effectiveRegistration,
            'customer_registration_enabled' => $effectiveRegistration,
            'require_login_checkout' => $master && $toBool($config['require_login_checkout'] ?? null, false),
            'show_whatsapp_order_button' => $toBool($config['show_whatsapp_order_button'] ?? null, true),
            'show_search' => $toBool($config['show_search'] ?? null, true),
            'show_cart' => $toBool($config['show_cart'] ?? null, true),
            'show_auth_button' => $effectiveLogin,
            'guest_checkout' => $master ? $toBool($config['guest_checkout'] ?? null, true) : true,
            'customer_verification_method' => $verificationMethod,
        ];
    }

    protected function saveBehavior(Store $store, array $behavior): void
    {
        foreach (Store::BEHAVIOR_KEYS as $key) {
            if (array_key_exists($key, $behavior)) {
                \App\Models\StoreConfiguration::setConfiguration(
                    $store->id,
                    $key,
                    (bool) $behavior[$key] ? 'true' : 'false'
                );
            }
        }
        // guest_checkout is not in BEHAVIOR_KEYS but is a customer-accounts toggle
        if (array_key_exists('guest_checkout', $behavior)) {
            \App\Models\StoreConfiguration::setConfiguration(
                $store->id,
                'guest_checkout',
                (bool) $behavior['guest_checkout'] ? 'true' : 'false'
            );
        }
        // canonical registration alias — keep both in sync
        if (array_key_exists('customer_registration_enabled', $behavior)) {
            $val = (bool) $behavior['customer_registration_enabled'] ? 'true' : 'false';
            \App\Models\StoreConfiguration::setConfiguration($store->id, 'customer_registration_enabled', $val);
            \App\Models\StoreConfiguration::setConfiguration($store->id, 'enable_customer_registration', $val);
        }
        // verification enum
        if (array_key_exists('customer_verification_method', $behavior)) {
            $m = strtolower(trim((string)$behavior['customer_verification_method']));
            if (in_array($m, ['none','email'], true)) {
                \App\Models\StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', $m);
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
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        if ((int)$store->user_id === (int)$user->id) return true;
        if ((int)$store->id === (int)($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('settings-stores'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}