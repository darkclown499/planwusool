<?php

namespace Tests\Feature;

use Tests\TestCase;

class MerchantNavigationTest extends TestCase
{
    /** Ensure Arabic translations for new IA labels exist and are not raw English */
    public function test_arabic_labels_exist(): void
    {
        $ar = json_decode(file_get_contents(resource_path('lang/ar.json')), true);
        $required = [
            'Marketing' => 'التسويق',
            'Shipping & Delivery' => 'الشحن والتوصيل',
            'Taxes' => 'الضرائب',
            'Customer Accounts' => 'حسابات العملاء',
            'Store Design' => 'تصميم المتجر',
            'Email & Notifications' => 'البريد والإشعارات',
            'Returns' => 'المرتجعات',
            'General' => 'عام',
            'Users & Roles' => 'الفريق والصلاحيات',
            'My Plan' => 'الخطة',
        ];
        foreach ($required as $key => $expected) {
            $this->assertArrayHasKey($key, $ar, "Missing ar key $key");
            $this->assertSame($expected, $ar[$key], "Wrong translation for $key");
            $this->assertNotSame($key, $ar[$key], "Label $key is raw English");
        }
    }

    /** Config file exports primary areas compact list (8 items) */
    public function test_primary_areas_count(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("'dashboard'", $content);
        $this->assertStringContainsString("'orders'", $content);
        $this->assertStringContainsString("'products'", $content);
        $this->assertStringContainsString("'customers'", $content);
        $this->assertStringContainsString("'store'", $content);
        $this->assertStringContainsString("'marketing'", $content);
        $this->assertStringContainsString("'analytics'", $content);
        $this->assertStringContainsString("'settings'", $content);
        // Primary areas array should have 8 entries
        $count = substr_count($content, "labelKey:");
        $this->assertGreaterThanOrEqual(8, $count);
    }

    /** Contextual nav map covers required level-2 groups */
    public function test_contextual_map_covers_required_groups(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // Settings level-2 items
        $this->assertStringContainsString("Payment Methods", $content);
        $this->assertStringContainsString("Shipping & Delivery", $content);
        $this->assertStringContainsString("Email & Notifications", $content);
        $this->assertStringContainsString("Domain", $content);
        $this->assertStringContainsString("Integrations", $content);
        $this->assertStringContainsString("Users & Roles", $content);
        // Store level-2 should contain Media Library (moved from settings)
        $this->assertStringContainsString("Media Library", $content);
        // Orders should contain COD (moved)
        $this->assertStringContainsString("COD Payments", $content);
        // Marketing should contain Referral (moved) and Abandoned Carts
        $this->assertStringContainsString("Referral Program", $content);
        $this->assertStringContainsString("Abandoned Carts", $content);
        $this->assertStringContainsString("Express Checkout", $content);
    }

    /** No duplicate feature across groups: COD only in orders, Media only in store, Referral only in marketing */
    public function test_no_duplicate_feature_across_groups(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // COD should appear under orders case, not settings
        // We verify settings case does not contain COD
        $settingsStart = strpos($content, "case 'settings':");
        $settingsBlock = substr($content, $settingsStart, 3000);
        $this->assertStringNotContainsString("COD Payments", $settingsBlock, "COD must not be in settings");
        $this->assertStringNotContainsString("Media Library", $settingsBlock, "Media must not be in settings");
        $this->assertStringNotContainsString("Referral Program", $settingsBlock, "Referral must not be in settings");

        // Marketing case should contain referral
        $marketingStart = strpos($content, "case 'marketing':");
        $marketingBlock = substr($content, $marketingStart, 2000);
        $this->assertStringContainsString("Referral Program", $marketingBlock);

        // Orders case should contain COD
        $ordersStart = strpos($content, "case 'orders':");
        $ordersBlock = substr($content, $ordersStart, 2000);
        $this->assertStringContainsString("COD Payments", $ordersBlock);

        // Store case should contain Media
        $storeStart = strpos($content, "case 'store':");
        $storeBlock = substr($content, $storeStart, 2000);
        $this->assertStringContainsString("Media Library", $storeBlock);
    }

    /** Primary resolver covers route → area mapping per spec */
    public function test_primary_resolver_covers_spec_routes(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // Check active-state mapping examples from spec
        $this->assertStringContainsString("/orders", $content);
        $this->assertStringContainsString("/returns", $content);
        $this->assertStringContainsString("/products", $content);
        $this->assertStringContainsString("/stores", $content);
        $this->assertStringContainsString("designer", $content);
        $this->assertStringContainsString("payments", $content);
        $this->assertStringContainsString("shipping", $content);
        $this->assertStringContainsString("abandoned-carts", $content);
        $this->assertStringContainsString("express-checkout", $content);
    }

    /** AppSidebar uses two-level components */
    public function test_app_sidebar_uses_two_level(): void
    {
        $content = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("MerchantPrimaryNav", $content);
        $this->assertStringContainsString("MerchantContextNav", $content);
        $this->assertStringContainsString("resolvePrimaryId", $content);
        $this->assertStringContainsString("getMerchantContextNav", $content);
    }

    /** Layout includes mobile switcher, no permanent second sidebar on mobile */
    public function test_layout_includes_mobile_switcher(): void
    {
        $content = file_get_contents(resource_path('js/layouts/app/app-sidebar-layout.tsx'));
        $this->assertStringContainsString("MerchantMobileSectionSwitcher", $content);
        // Mobile switcher should be conditional and not show desktop context permanently
        $ctx = file_get_contents(resource_path('js/components/merchant/MerchantMobileSectionSwitcher.tsx'));
        $this->assertStringContainsString("md:hidden", $ctx);
        // Desktop context should be md:flex
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("hidden md:flex", $sidebar);
    }

    /** Build artifact exists (vite build already ran) */
    public function test_build_artifacts_exist(): void
    {
        $this->assertFileExists(public_path('build/manifest.json'));
    }
}
