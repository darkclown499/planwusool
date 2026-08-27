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
        $count = substr_count($content, "labelKey:");
        $this->assertGreaterThanOrEqual(8, $count);
    }

    /** Contextual nav map covers required level-2 groups */
    public function test_contextual_map_covers_required_groups(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("Payment Methods", $content);
        $this->assertStringContainsString("Shipping & Delivery", $content);
        $this->assertStringContainsString("Email & Notifications", $content);
        $this->assertStringContainsString("Domain", $content);
        $this->assertStringContainsString("Integrations", $content);
        $this->assertStringContainsString("Users & Roles", $content);
        $this->assertStringContainsString("Media Library", $content);
        $this->assertStringContainsString("COD Payments", $content);
        $this->assertStringContainsString("Referral Program", $content);
        $this->assertStringContainsString("Abandoned Carts", $content);
        $this->assertStringContainsString("Express Checkout", $content);
    }

    /** No duplicate feature across groups: COD only in orders, Media only in store, Referral only in marketing */
    public function test_no_duplicate_feature_across_groups(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $settingsStart = strpos($content, "case 'settings':");
        $settingsBlock = substr($content, $settingsStart, 3000);
        $this->assertStringNotContainsString("COD Payments", $settingsBlock, "COD must not be in settings");
        $this->assertStringNotContainsString("Media Library", $settingsBlock, "Media must not be in settings");
        $this->assertStringNotContainsString("Referral Program", $settingsBlock, "Referral must not be in settings");

        $marketingStart = strpos($content, "case 'marketing':");
        $marketingBlock = substr($content, $marketingStart, 2000);
        $this->assertStringContainsString("Referral Program", $marketingBlock);

        $ordersStart = strpos($content, "case 'orders':");
        $ordersBlock = substr($content, $ordersStart, 2000);
        $this->assertStringContainsString("COD Payments", $ordersBlock);

        $storeStart = strpos($content, "case 'store':");
        $storeBlock = substr($content, $storeStart, 2000);
        $this->assertStringContainsString("Media Library", $storeBlock);
    }

    /** Primary resolver covers route → area mapping per spec */
    public function test_primary_resolver_covers_spec_routes(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
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

    /** AppSidebar uses two-level components + premium widths */
    public function test_app_sidebar_uses_two_level(): void
    {
        $content = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("MerchantPrimaryNav", $content);
        $this->assertStringContainsString("MerchantContextNav", $content);
        $this->assertStringContainsString("resolvePrimaryId", $content);
        $this->assertStringContainsString("getMerchantContextNav", $content);
        // Premium widths: primary ~80px (5rem) + context ~176px (11rem) = 16rem total, not 19rem/304px
        $this->assertStringContainsString("'16rem'", $content, "Sidebar width should be 16rem with context (80+176)");
        $this->assertStringContainsString("'5rem'", $content, "Sidebar width should be 5rem without context (80px)");
        $this->assertStringNotContainsString("'19rem'", $content, "Stale 19rem/304px width must be removed");
        $this->assertStringNotContainsString("5.75rem", $content);
        $this->assertStringContainsString("w-[80px]", $content, "Primary nav target ~80px");
        $this->assertStringContainsString("w-[176px]", $content, "Context nav target ~176px (160-190)");
    }

    /** Desktop navigation hierarchy is lighter premium style */
    public function test_desktop_hierarchy_premium_style(): void
    {
        $primary = file_get_contents(resource_path('js/components/merchant/MerchantPrimaryNav.tsx'));
        // Quieter inactive, emerald active without heavy border/shadow
        $this->assertStringContainsString("bg-emerald-50", $primary, "Active should use subtle emerald background");
        $this->assertStringNotContainsString("shadow-[0_1px_3px", $primary, "Should not have heavy card shadow on primary items");
        $this->assertStringContainsString("text-gray-500", $primary, "Inactive should be quieter");

        $context = file_get_contents(resource_path('js/components/merchant/MerchantContextNav.tsx'));
        $this->assertStringContainsString("text-[11px]", $context, "Context section title should be small muted");
        $this->assertStringContainsString("uppercase", $context);
        $this->assertStringNotContainsString("rounded-xl", $context, "Context should not use large cards");
        $this->assertStringContainsString("bg-emerald-50", $context);
    }

    /** Layout includes mobile switcher + drawer architecture, 1280 breakpoint */
    public function test_layout_includes_mobile_switcher(): void
    {
        $content = file_get_contents(resource_path('js/layouts/app/app-sidebar-layout.tsx'));
        $this->assertStringContainsString("MerchantMobileSectionSwitcher", $content);
        $ctx = file_get_contents(resource_path('js/components/merchant/MerchantMobileSectionSwitcher.tsx'));
        $this->assertStringContainsString("xl:hidden", $ctx);
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("hidden xl:flex", $sidebar, "Desktop permanent nav xl:flex (1280+)");
        $this->assertStringContainsString("xl:hidden", $sidebar, "Mobile drawer xl:hidden (<1280)");
        $hook = file_get_contents(resource_path('js/hooks/use-mobile.tsx'));
        $this->assertStringContainsString("1280", $hook, "Mobile breakpoint must be 1280");
    }

    /** Mobile drawer is single Sheet from right with nested primary+context */
    public function test_mobile_drawer_single_sheet_nested(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("MerchantDrawerNav", $sidebar, "Drawer should use nested MerchantDrawerNav");
        $this->assertStringContainsString("border-s", $sidebar, "Nested context should have start border (RTL-aware)");
        // Drawer footer contains compact plan + user
        $this->assertStringContainsString("compactPlanRow", $sidebar);
        $this->assertStringContainsString("NavUser", $sidebar);

        $uiSidebar = file_get_contents(resource_path('js/components/ui/sidebar.tsx'));
        $this->assertStringContainsString("isMobile", $uiSidebar);
        // Sheet should open from side prop (RTL = right)
        $this->assertStringContainsString("side={side}", $uiSidebar);
    }

    /** Context links available inside drawer (no duplicate definitions) */
    public function test_context_links_available_in_drawer(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        // Drawer iterates MERCHANT_PRIMARY_AREAS and renders contextNav.items nested under active
        $this->assertStringContainsString("MERCHANT_PRIMARY_AREAS", $sidebar);
        $this->assertStringContainsString("contextNav.items", $sidebar);
        // Must not duplicate navigation definitions — reuse config
        $this->assertStringContainsString("getMerchantContextNav", $sidebar);
        $this->assertStringContainsString("resolvePrimaryId", $sidebar);
    }

    /** Plan footer is compact row, not large detached card */
    public function test_plan_footer_compact(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        // Compact row: small zap icon, plan name, Upgrade link, no rounded-xl heavy card
        $this->assertStringContainsString("h-6 w-6", $sidebar, "Compact plan icon 6x6");
        $this->assertStringNotContainsString("rounded-xl bg-white border border-gray-200/60 p-3 shadow-sm", $sidebar, "Large detached plan card must be removed");
        $this->assertStringContainsString("Upgrade", $sidebar);
        $this->assertStringContainsString("border-t border-gray-100", $sidebar, "Compact row uses subtle border, not huge card");
    }

    /** User footer is compact single row with truncate and min-w-0 */
    public function test_user_footer_compact_truncate(): void
    {
        $navUser = file_get_contents(resource_path('js/components/nav-user.tsx'));
        $this->assertStringContainsString("min-w-0", $navUser);
        $this->assertStringContainsString("truncate", $navUser);

        $userInfo = file_get_contents(resource_path('js/components/user-info.tsx'));
        $this->assertStringContainsString("min-w-0", $userInfo);
        $this->assertStringContainsString("truncate", $userInfo);
        $this->assertStringContainsString("overflow-hidden", $userInfo);
        // Avatar-only fallback for narrow primary-only mode
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("h-7 w-7", $sidebar, "Narrow mode avatar should be compact");
    }

    /** Header is compact and not crowding, RTL aware */
    public function test_header_compact_responsive(): void
    {
        $header = file_get_contents(resource_path('js/components/app-sidebar-header.tsx'));
        $this->assertStringContainsString("h-13", $header, "Header should be compact ~52px");
        $this->assertStringContainsString("border-gray-100", $header);
        // Secondary actions hidden on mobile
        $this->assertStringContainsString("hidden xl:flex", $header);
        $this->assertStringContainsString("overflow-x-clip", $header);
        // Preserve essential: store switcher, language, notifications
        $this->assertStringContainsString("StoreSwitcher", $header);
        $this->assertStringContainsString("LanguageSwitcher", $header);
        $this->assertStringContainsString("MerchantNotificationBell", $header);
    }

    /** Content offset equals actual sidebar width via CSS variable, no stale 304px */
    public function test_content_offset_uses_css_variable(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("--sidebar-width", $sidebar);
        $this->assertStringContainsString("16rem", $sidebar);
        $this->assertStringNotContainsString("304px", $sidebar);

        $ui = file_get_contents(resource_path('js/components/ui/sidebar.tsx'));
        $this->assertStringContainsString("--sidebar-width", $ui);
        $this->assertStringContainsString("peer-data-[side=right]:pr-[var(--sidebar-width)]", $ui, "RTL offset must use pr with sidebar width");
        $this->assertStringContainsString("overflow-x-clip", $ui);
    }

    /** Horizontal scroll eliminated, RTL correct */
    public function test_no_horizontal_scroll_and_rtl(): void
    {
        $shell = file_get_contents(resource_path('js/components/app-shell.tsx'));
        $this->assertStringContainsString("overflow-x-hidden", $shell);
        $this->assertStringContainsString("max-w-full", $shell);
        $this->assertStringContainsString("min-w-0", $shell);

        $content = file_get_contents(resource_path('js/components/app-content.tsx'));
        $this->assertStringContainsString("overflow-x-hidden", $content);
        $this->assertStringContainsString("min-w-0", $content);

        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("dir={position === 'right' ? 'rtl'", $sidebar);
        $this->assertStringContainsString("side={position}", $sidebar);
    }

    /** Build artifact exists (vite build already ran) */
    public function test_build_artifacts_exist(): void
    {
        $this->assertFileExists(public_path('build/manifest.json'));
    }
}
