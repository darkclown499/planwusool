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
            'Delivery' => 'التوصيل',
            'Delivery Dashboard' => 'لوحة التوصيل',
            'Zones' => 'المناطق',
            'Drivers' => 'السائقون',
            'Payments' => 'المدفوعات',
            'Sales' => 'المبيعات',
            'Inventory' => 'المخزون',
            'Payment Operations' => 'عمليات الدفع',
            'COD Payments' => 'الدفع عند الاستلام',
            'Product Feeds' => 'ربط المنتجات مع Google',
            'WhatsApp Commerce' => 'التواصل عبر واتساب',
            'Partner Program' => 'برنامج الشركاء',
        ];
        foreach ($required as $key => $expected) {
            $this->assertArrayHasKey($key, $ar, "Missing ar key $key");
            $this->assertSame($expected, $ar[$key], "Wrong translation for $key");
            $this->assertNotSame($key, $ar[$key], "Label $key is raw English");
        }
    }

    /** Config file exports primary areas compact list */
    public function test_primary_areas_count(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("'dashboard'", $content);
        $this->assertStringContainsString("'orders'", $content);
        $this->assertStringContainsString("'delivery'", $content, "Delivery primary area must exist");
        $this->assertStringContainsString("'payments'", $content, "Payments primary area must exist");
        $this->assertStringContainsString("'sales'", $content, "Sales primary area must exist");
        $this->assertStringContainsString("'products'", $content);
        $this->assertStringContainsString("'customers'", $content);
        $this->assertStringContainsString("'store'", $content);
        $this->assertStringContainsString("'marketing'", $content);
        $this->assertStringContainsString("'analytics'", $content);
        $this->assertStringContainsString("'settings'", $content);
        $count = substr_count($content, "labelKey:");
        $this->assertGreaterThanOrEqual(11, $count);
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
        $this->assertStringContainsString("Returns", $content, "Returns must be in web orders context nav");
        $this->assertStringContainsString("Delivery Dashboard", $content, "Delivery Dashboard must be in delivery context nav");
        $this->assertStringContainsString("Inventory", $content, "Inventory must be in POS/sales context nav");
        $this->assertStringContainsString("WhatsApp Commerce", $content, "WhatsApp must be in marketing context nav");
        $this->assertStringContainsString("Product Feeds", $content, "Product Feeds must be in marketing context nav");
        $this->assertStringContainsString("Partner Program", $content, "Partner Program must be in marketing context nav");
    }

    /** No duplicate feature across groups: COD only in payments, Media only in store, Referral only in marketing */
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

        $paymentsStart = strpos($content, "case 'payments':");
        $paymentsBlock = substr($content, $paymentsStart, 2000);
        $this->assertStringContainsString("COD Payments", $paymentsBlock);
        $this->assertStringContainsString("Payment Operations", $paymentsBlock);

        $ordersStart = strpos($content, "case 'orders':");
        $ordersEnd = strpos($content, "case 'delivery':", $ordersStart);
        $ordersBlock = substr($content, $ordersStart, $ordersEnd - $ordersStart);
        $this->assertStringContainsString("Returns", $ordersBlock);
        $this->assertStringNotContainsString("COD Payments", $ordersBlock, "COD must not be in orders");

        $deliveryStart = strpos($content, "case 'delivery':");
        $deliveryBlock = substr($content, $deliveryStart, 2000);
        $this->assertStringContainsString("Delivery Dashboard", $deliveryBlock);
        $this->assertStringContainsString("Zones", $deliveryBlock);
        $this->assertStringContainsString("Drivers", $deliveryBlock);

        $salesStart = strpos($content, "case 'sales':");
        $salesBlock = substr($content, $salesStart, 2000);
        $this->assertStringContainsString("Inventory", $salesBlock);

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
        $this->assertStringContainsString("/delivery", $content, "Delivery routes must be resolved to delivery area");
        $this->assertStringContainsString("/cod-payments", $content, "COD routes must be resolved to payments area");
        $this->assertStringContainsString("/payments/operations", $content, "Payment Operations must be resolved to payments area");
        $this->assertStringContainsString("/pos", $content, "POS must be resolved to sales area");
        $this->assertStringContainsString("/inventory", $content, "Inventory must be resolved to sales area");
        $this->assertStringContainsString("/products", $content);
        $this->assertStringContainsString("/stores", $content);
        $this->assertStringContainsString("designer", $content);
        $this->assertStringContainsString("payments", $content);
        $this->assertStringContainsString("shipping", $content);
        $this->assertStringContainsString("abandoned-carts", $content);
        $this->assertStringContainsString("express-checkout", $content);
        $this->assertStringContainsString("product-feeds", $content, "Product feeds must be resolved to marketing area");
        $this->assertStringContainsString("whatsapp-commerce", $content, "WhatsApp commerce must be resolved to marketing area");
        $this->assertStringContainsString("partner", $content, "Partner must be resolved to marketing area");
        $this->assertStringContainsString("loyalty", $content, "Loyalty must be resolved to marketing area");
    }

    /** AppSidebar uses two-level components + premium widths */
    public function test_app_sidebar_uses_two_level(): void
    {
        $content = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("MerchantPrimaryNav", $content);
        $this->assertStringContainsString("MerchantContextNav", $content);
        $this->assertStringContainsString("resolvePrimaryId", $content);
        $this->assertStringContainsString("getMerchantContextNav", $content);
        // Refined widths: primary 168px + context 180px = 348px (21.75rem);
        // primary-only (dashboard/analytics/store-settings) collapses to 10.5rem.
        $this->assertStringContainsString("'21.75rem'", $content, "Sidebar width should be 21.75rem with context (168+180)");
        $this->assertStringContainsString("'10.5rem'", $content, "Sidebar width should be 10.5rem without context (168px)");
        $this->assertStringNotContainsString("'19rem'", $content, "Stale 19rem/304px width must be removed");
        $this->assertStringNotContainsString("5.75rem", $content);
        $this->assertStringContainsString("w-[168px]", $content, "Primary nav column is 168px");
        $this->assertStringContainsString("w-[180px]", $content, "Context nav column is 180px");
    }

    /** Desktop navigation hierarchy is lighter premium style */
    public function test_desktop_hierarchy_premium_style(): void
    {
        $primary = file_get_contents(resource_path('js/components/merchant/MerchantPrimaryNav.tsx'));
        // Quieter inactive, emerald active without heavy border/shadow
        $this->assertStringContainsString("bg-emerald-50", $primary, "Active should use subtle emerald background");
        $this->assertStringNotContainsString("shadow-[0_1px_3px", $primary, "Should not have heavy card shadow on primary items");
        $this->assertStringContainsString("text-gray-600", $primary, "Inactive should be quieter");

        $context = file_get_contents(resource_path('js/components/merchant/MerchantContextNav.tsx'));
        $this->assertStringContainsString("text-[10.5px]", $context, "Context section title should be small muted");
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
        $this->assertStringContainsString("h-7 w-7", $sidebar, "Compact plan icon 7x7");
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
        $this->assertStringContainsString("21.75rem", $sidebar);
        $this->assertStringNotContainsString("304px", $sidebar);

        $ui = file_get_contents(resource_path('js/components/ui/sidebar.tsx'));
        $this->assertStringContainsString("--sidebar-width", $ui);
        // Tailwind v4 parenthesized var syntax drives the sidebar column width
        // and the content offset (SVB: relative flex sibling + flex-1 inset)
        $this->assertStringContainsString("w-(--sidebar-width)", $ui, "Offset must be driven by the --sidebar-width CSS variable");
        $this->assertStringContainsString("group-data-[side=right]:border-l", $ui, "RTL border must flip to the opposite side");
        $this->assertStringContainsString("overflow-x-hidden", $ui, "No horizontal scroll from the sidebar");
    }

    /** Horizontal scroll eliminated, RTL correct */
    public function test_no_horizontal_scroll_and_rtl(): void
    {
        $shell = file_get_contents(resource_path('js/components/app-shell.tsx'));
        $this->assertStringContainsString("overflow-hidden", $shell);
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

    /** Permission gates preserved: no navigation entitlement added without backend gate */
    public function test_permission_gates_not_weakened(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // POS / Inventory gated on manage-pos
        $salesStart = strpos($content, "case 'sales':");
        $salesBlock = substr($content, $salesStart, 2000);
        $this->assertStringContainsString("hasPermission('manage-pos')", $salesBlock, "Sales (POS/Inventory) must remain gated on manage-pos");
        // Delivery gated on manage-orders
        $deliveryStart = strpos($content, "case 'delivery':");
        $deliveryBlock = substr($content, $deliveryStart, 2000);
        $this->assertStringContainsString("hasPermission('manage-orders')", $deliveryBlock, "Delivery context must remain gated on manage-orders");
        // Returns gated on manage-orders
        $ordersStart = strpos($content, "case 'orders':");
        $ordersBlock = substr($content, $ordersStart, 2000);
        $this->assertStringContainsString("hasPermission('manage-orders')", $ordersBlock, "Orders/Returns context must remain gated on manage-orders");
        // COD / Payment Operations gated on manage-cod-payments / manage-orders
        $paymentsStart = strpos($content, "case 'payments':");
        $paymentsBlock = substr($content, $paymentsStart, 2000);
        $this->assertStringContainsString("hasPermission('manage-cod-payments')", $paymentsBlock, "COD must remain gated on manage-cod-payments");
        $this->assertStringContainsString("hasPermission('manage-orders')", $paymentsBlock, "Payment Operations must remain gated on manage-orders");
        // WhatsApp gated on settings-stores
        $marketingStart = strpos($content, "case 'marketing':");
        $marketingBlock = substr($content, $marketingStart, 2500);
        $this->assertStringContainsString("hasPermission('settings-stores')", $marketingBlock, "WhatsApp + Product Feeds must remain gated on settings-stores");
        $this->assertStringContainsString("hasPermission('manage-referral')", $marketingBlock, "Referral must remain gated on manage-referral");
    }

    /** Primary areas must not appear for users without the required permission */
    public function test_primary_area_permission_gates(): void
    {
        $content = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // Sales area only for manage-pos
        $this->assertStringContainsString("{ id: 'sales', labelKey: 'Sales', labelAr: 'المبيعات', icon: DollarSign, permissionAny: ['manage-pos'] }", $content, "Sales primary area must require manage-pos");
        // Delivery area only for manage-orders
        $this->assertStringContainsString("{ id: 'delivery', labelKey: 'Delivery', labelAr: 'التوصيل', icon: Truck, permissionAny: ['manage-orders'] }", $content, "Delivery primary area must require manage-orders");
        // Payments area requires manage-cod-payments or manage-orders
        $this->assertStringContainsString("{ id: 'payments', labelKey: 'Payments', labelAr: 'المدفوعات', icon: CreditCard, permissionAny: ['manage-cod-payments', 'manage-orders'] }", $content, "Payments primary area must require COD or orders permission");
        // Marketing must include everything needed
        $this->assertStringContainsString("permissionAny: ['manage-coupon-system', 'manage-advanced-coupons', 'manage-abandoned-carts', 'manage-express-checkout', 'manage-referral', 'manage-loyalty', 'settings-stores']", $content, "Marketing primary area permissionAny must not lose gates");
        // Customers no longer includes loyalty (moved to marketing)
        $this->assertStringContainsString("{ id: 'customers', labelKey: 'Customers', labelAr: 'العملاء', icon: Users, permissionAny: ['manage-customers'] }", $content, "Customers primary area must not gate on loyalty");
    }

    /** Desktop and mobile consumers both reuse the canonical merchant-navigation config */
    public function test_desktop_mobile_use_canonical_source(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("getMerchantContextNav", $sidebar);
        $this->assertStringContainsString("resolvePrimaryId", $sidebar);
        $this->assertStringContainsString("MERCHANT_PRIMARY_AREAS", $sidebar);
        $primary = file_get_contents(resource_path('js/components/merchant/MerchantPrimaryNav.tsx'));
        $this->assertStringContainsString("MERCHANT_PRIMARY_AREAS", $primary, "Desktop primary nav must iterate canonical config");
    }

    // ── P2D-01: Mobile Bottom Navigation Tests ──────────────────────

    /** Mobile bottom nav component exists and exports correctly */
    public function test_mobile_bottom_nav_component_exists(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("MerchantMobileBottomNav", $component);
        $this->assertStringContainsString("resolvePrimaryId", $component, "Must reuse canonical route resolver");
    }

    /** Mobile bottom nav has all required primary destinations */
    public function test_mobile_bottom_nav_has_required_destinations(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("LayoutDashboard", $component, "Dashboard icon must be present");
        $this->assertStringContainsString("ShoppingCart", $component, "Orders icon must be present");
        $this->assertStringContainsString("Package", $component, "Products icon must be present");
        $this->assertStringContainsString("DollarSign", $component, "POS/Sales icon must be present");
        $this->assertStringContainsString("MoreHorizontal", $component, "More entry must be present");
    }

    /** Mobile bottom nav resolves dashboard route correctly */
    public function test_mobile_bottom_nav_dashboard_route(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("route('dashboard')", $component, "Dashboard must resolve via named route");
    }

    /** Mobile bottom nav resolves orders route correctly */
    public function test_mobile_bottom_nav_orders_route(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("route('orders.index')", $component, "Orders must resolve via named route");
    }

    /** Mobile bottom nav resolves products route correctly */
    public function test_mobile_bottom_nav_products_route(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("route('products.index')", $component, "Products must resolve via named route");
    }

    /** Mobile POS shortcut obeys permission semantics */
    public function test_mobile_bottom_nav_pos_permission_gated(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("manage-pos", $component, "POS must be gated on manage-pos permission");
        $this->assertStringContainsString("permissionAny", $component, "Items must use permissionAny filtering");
    }

    /** More entry opens existing full navigation drawer */
    public function test_mobile_bottom_nav_more_opens_drawer(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("setOpenMobile", $component, "More must trigger the existing sidebar drawer");
    }

    /** Desktop navigation remains available and unaffected */
    public function test_desktop_nav_unaffected(): void
    {
        $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
        $this->assertStringContainsString("hidden xl:flex", $sidebar, "Desktop nav must remain xl:flex only");
        $primary = file_get_contents(resource_path('js/components/merchant/MerchantPrimaryNav.tsx'));
        $this->assertStringContainsString("MERCHANT_PRIMARY_AREAS", $primary, "Desktop primary nav unchanged");
    }

    /** Mobile nav does not create unauthorized links */
    public function test_mobile_bottom_nav_uses_permission_filtering(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("hasPermission", $component, "Must filter items by permission");
        $this->assertStringContainsString("filter", $component, "Must use Array.filter for permission gating");
    }

    /** Canonical Arabic labels are used in mobile bottom nav */
    public function test_mobile_bottom_nav_arabic_labels(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("لوحة التحكم", $component, "Dashboard Arabic label");
        $this->assertStringContainsString("الطلبات", $component, "Orders Arabic label");
        $this->assertStringContainsString("المنتجات", $component, "Products Arabic label");
        $this->assertStringContainsString("نقطة البيع", $component, "POS Arabic label");
        $this->assertStringContainsString("المزيد", $component, "More Arabic label");
    }

    /** Mobile bottom nav does not expose tenant authority from client state */
    public function test_mobile_bottom_nav_no_client_tenant_authority(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        // Must not trust store_id from client state as authority — route resolution is server-side
        $this->assertStringNotContainsString("localStorage", $component, "Must not read store from localStorage");
        $this->assertStringNotContainsString("sessionStorage", $component, "Must not read store from sessionStorage");
    }

    /** Layout integrates mobile bottom nav for merchants only, hidden for superadmin */
    public function test_layout_integrates_bottom_nav_merchant_only(): void
    {
        $layout = file_get_contents(resource_path('js/layouts/app/app-sidebar-layout.tsx'));
        $this->assertStringContainsString("MerchantMobileBottomNav", $layout, "Layout must import MerchantMobileBottomNav");
        $this->assertStringContainsString("isMerchant", $layout, "Bottom nav must be conditional on merchant role");
        $this->assertStringContainsString("xl:hidden", $layout, "Bottom nav must be hidden on desktop");
    }

    /** Mobile bottom nav uses aria-label for accessibility */
    public function test_mobile_bottom_nav_accessibility(): void
    {
        $component = file_get_contents(resource_path('js/components/merchant/MerchantMobileBottomNav.tsx'));
        $this->assertStringContainsString("aria-label", $component, "Must have aria-label for accessibility");
        $this->assertStringContainsString("aria-current", $component, "Active item must use aria-current");
    }
}
