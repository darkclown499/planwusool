import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Store,
    Megaphone,
    BarChart3,
    Settings,
} from 'lucide-react';
import type { NavItem } from '@/types';

// ─────────────────────────────────────────────────────────────
// Primary merchant areas — compact Level-1 sidebar (8 max)
// Answers: "Which part of my business am I managing?"
// ─────────────────────────────────────────────────────────────
export type PrimaryId =
    | 'dashboard'
    | 'orders'
    | 'products'
    | 'customers'
    | 'store'
    | 'marketing'
    | 'analytics'
    | 'settings';

// Matches the merchant "Store Settings" cluster — General, Payments, Shipping,
// Taxes, Email, Domains, Integrations under a given store. These pages drop the
// heavy desktop secondary sidebar and surface their sub-nav as horizontal
// in-page tabs instead.
const STORE_SETTINGS_RE = /^\/stores\/[^/]+\/(settings|payments|shipping|taxes|email-settings|domains|integrations)(\/|$)/;

// Merchant store-shipping & tax settings land on the global /shipping and /tax
// routes (the /stores/{id}/shipping and /stores/{id}/taxes canonical routes
// redirect to them), so include those landing pages too. Parenthesise prevents
// matching admin CRUD sub-paths (e.g. /tax/create, /shipping/create).
const STORE_SETTINGS_GLOBAL_RE = /^\/(shipping|tax)$/;

export function isStoreSettingsUrl(url: string): boolean {
    const path = String(url || '').split('?')[0].replace(/\/+$/, '') || '/';
    return STORE_SETTINGS_RE.test(path) || STORE_SETTINGS_GLOBAL_RE.test(path);
}

export interface PrimaryArea {
    id: PrimaryId;
    labelKey: string; // i18n key — must have Arabic translation
    labelAr: string; // canonical Arabic fallback
    icon: LucideIcon;
    // used for determining if area should be visible (optional)
    permissionAny?: string[];
}

export const MERCHANT_PRIMARY_AREAS: PrimaryArea[] = [
    { id: 'dashboard', labelKey: 'Dashboard', labelAr: 'الرئيسية', icon: LayoutDashboard },
    { id: 'orders', labelKey: 'Orders', labelAr: 'الطلبات', icon: ShoppingCart, permissionAny: ['manage-orders'] },
    { id: 'products', labelKey: 'Products', labelAr: 'المنتجات', icon: Package, permissionAny: ['manage-products', 'manage-categories', 'manage-product-reviews', 'manage-digital-downloads'] },
    { id: 'customers', labelKey: 'Customers', labelAr: 'العملاء', icon: Users, permissionAny: ['manage-customers', 'manage-loyalty'] },
    { id: 'store', labelKey: 'Store', labelAr: 'المتجر', icon: Store, permissionAny: ['manage-stores', 'settings-stores', 'manage-media'] },
    { id: 'marketing', labelKey: 'Marketing', labelAr: 'التسويق', icon: Megaphone, permissionAny: ['manage-coupon-system', 'manage-advanced-coupons', 'manage-abandoned-carts', 'manage-express-checkout', 'manage-referral'] },
    { id: 'analytics', labelKey: 'Analytics & Reporting', labelAr: 'التقارير', icon: BarChart3, permissionAny: ['manage-analytics'] },
    { id: 'settings', labelKey: 'Settings', labelAr: 'الإعدادات', icon: Settings },
];

// ─────────────────────────────────────────────────────────────
// Arabic label cleanup map — centralizes merchant-facing labels
// Backend route names are NOT changed.
// ─────────────────────────────────────────────────────────────
export const MERCHANT_AR_LABELS: Record<string, string> = {
    Dashboard: 'الرئيسية',
    Orders: 'الطلبات',
    Returns: 'المرتجعات',
    'COD Payments': 'التحصيل عند الاستلام',
    Products: 'المنتجات',
    Categories: 'التصنيفات',
    'Product Reviews': 'التقييمات',
    'Digital Downloads': 'المنتجات الرقمية',
    Customers: 'العملاء',
    'Customer Accounts': 'حسابات العملاء',
    'Loyalty Points': 'نقاط الولاء',
    Store: 'المتجر',
    Stores: 'المتاجر',
    'Store Design': 'تصميم المتجر',
    'Store Settings': 'إعدادات المتجر',
    'Media Library': 'مكتبة الوسائط',
    Marketing: 'التسويق',
    Coupons: 'الكوبونات',
    'Advanced Coupons': 'الكوبونات المتقدمة',
    'Abandoned Carts': 'السلال المتروكة',
    'Express Checkout': 'روابط البيع السريع',
    'Referral Program': 'برنامج الإحالة',
    'Analytics & Reporting': 'التقارير',
    Settings: 'الإعدادات',
    General: 'عام',
    'Payment Methods': 'طرق الدفع',
    'Shipping & Delivery': 'الشحن والتوصيل',
    Taxes: 'الضرائب',
    'Email & Notifications': 'البريد والإشعارات',
    Domain: 'الدومين',
    Integrations: 'التكاملات',
    'Users & Roles': 'الفريق والصلاحيات',
    'My Plan': 'الخطة',
    'Platform Settings': 'إعدادات المنصة',
    // sub-labels for Level-2
    Overview: 'نظرة عامة',
};

// ─────────────────────────────────────────────────────────────
// Route → Primary area mapping (active state for Level-1)
// Must cover all merchant routes per spec.
// ─────────────────────────────────────────────────────────────
export function resolvePrimaryId(url: string, storeId?: string | number | null): PrimaryId | null {
    const path = url.split('?')[0].replace(/\/+$/, '') || '/';
    const sid = storeId ? String(storeId) : '';

    // Dashboard
    if (path === '/dashboard' || path === '/' ) return 'dashboard';

    // Orders area: /orders, /returns, /cod-payments, /payments/operations, /pos
    if (path.startsWith('/orders') || path.startsWith('/returns') || path.startsWith('/cod-payments') || path.startsWith('/payments/operations') || path.startsWith('/pos')) {
        return 'orders';
    }

    // Products area
    if (path.startsWith('/products') || path.startsWith('/categories') || path.startsWith('/product-reviews') || path.startsWith('/digital-downloads')) {
        return 'products';
    }
    if (sid && path === `/stores/${sid}/categories`) return 'products';

    // Customers area
    if (path.startsWith('/customers') || path.startsWith('/loyalty')) return 'customers';
    if (sid && path.startsWith(`/stores/${sid}/customer-accounts`)) return 'customers';

    // Marketing area — must be checked BEFORE store/settings because abandoned-carts lives under /stores/{id}/abandoned-carts but belongs to marketing
    if (path.startsWith('/coupon-system') || path.startsWith('/advanced-coupons') || path.startsWith('/express-checkout') || path.startsWith('/referral')) {
        return 'marketing';
    }
    if (path.startsWith('/abandoned-carts')) return 'marketing';
    if (sid && path.startsWith(`/stores/${sid}/abandoned-carts`)) return 'marketing';

    // Analytics
    if (path.startsWith('/analytics')) return 'analytics';

    // Store area: stores index, designer, features, themes/templates, media-library
    if (path === '/stores' || path.startsWith('/stores') && (path.endsWith('/designer') || path.includes('/designer') || path.includes('/features') || path.includes('/templates') || path.includes('/themes'))) {
        // But need to distinguish settings-owned store routes that belong to settings
        // Designer is store, settings is handled below
        if (sid && (path === `/stores/${sid}/designer` || path.startsWith(`/stores/${sid}/designer`))) return 'store';
        if (path.startsWith('/stores') && !sid) {
            // fallback for stores index without sid context
            if (path === '/stores' || path.match(/^\/stores\/\d+\/designer/)) return 'store';
        }
    }
    // More precise: /stores index and /stores/{id}/designer → store
    if (path === '/stores' || path.match(/^\/stores\/[^/]+\/designer/)) return 'store';
    if (path === '/media-library') return 'store';
    // Store pages / content could be under store as well
    if (path.startsWith('/stores') && path.includes('/features')) return 'store';

    // Settings area: payments, shipping, taxes, email, domains, integrations, users, etc.
    if (sid && (
        path.startsWith(`/stores/${sid}/payments`) ||
        path.startsWith(`/stores/${sid}/shipping`) ||
        path.startsWith(`/stores/${sid}/taxes`) ||
        path.startsWith(`/stores/${sid}/email-settings`) ||
        path.startsWith(`/stores/${sid}/notifications`) ||
        path.startsWith(`/stores/${sid}/domains`) ||
        path.startsWith(`/stores/${sid}/integrations`) ||
        path.startsWith(`/stores/${sid}/erp`) ||
        path.startsWith(`/stores/${sid}/settings`)
    )) return 'settings';

    if (path.startsWith('/shipping') && !path.startsWith('/shipping/') ) {
        // generic /shipping → settings (will redirect to store-specific)
        // but only if not already handled; treat as settings
        return 'settings';
    }
    if (path.startsWith('/tax') || path.startsWith('/shipping') || path.startsWith('/currencies') || path.startsWith('/notification-templates') || path.startsWith('/email-templates')) {
        // legacy tax/shipping under global → settings
        // currencies/templates are admin but map to settings for merchants if they see plan
        // keep narrow: tax/shipping only
        if (path.startsWith('/tax') || path.startsWith('/shipping')) return 'settings';
    }
    if (path.startsWith('/users') || path.startsWith('/roles') || path.startsWith('/permissions') || path.startsWith('/notifications') || path.startsWith('/plans') || path.startsWith('/plan-')) {
        return 'settings';
    }
    // Fallback for /stores/{id}/settings and /stores/{id}/domains etc already handled
    if (path.match(/^\/stores\/[^/]+\/(payments|shipping|taxes|email-settings|domains|integrations|notifications|settings)/)) {
        return 'settings';
    }

    // Store overview fallback: /stores/* that didn't match settings → store
    if (path.startsWith('/stores')) return 'store';

    return null;
}

// ─────────────────────────────────────────────────────────────
// Contextual Level-2 navigation map
// Returns contextual items for the active primary area.
// Must reuse existing canonical routes, no duplicate feature
// across groups.
// ─────────────────────────────────────────────────────────────
export interface ContextNavItem extends NavItem {
    // NavItem already has title, href, activePaths, permission etc
}

export function getMerchantContextNav(
    primaryId: PrimaryId | null,
    opts: {
        storeId?: string | number | null;
        t: (key: string) => string;
        permissions: string[];
        hasPermission: (p: string) => boolean;
        routeExists: (name: string) => boolean;
        safeRoute: (name: string, params: any, fallback: string) => string;
    }
): { title: string; items: ContextNavItem[] } | null {
    const { storeId, t, hasPermission, routeExists, safeRoute } = opts;
    const sid = storeId ? String(storeId) : null;

    const titleFor = (id: PrimaryId): string => {
        const area = MERCHANT_PRIMARY_AREAS.find(a => a.id === id);
        return area ? t(area.labelKey) : '';
    };

    const tryRoute = (name: string, fallback: string) => {
        try { return route(name); } catch { return fallback; }
    };

    switch (primaryId) {
        case 'dashboard':
            return null; // no secondary nav for dashboard
        case 'orders': {
            const items: ContextNavItem[] = [];
            if (hasPermission('manage-orders')) {
                items.push({ title: t('Orders'), href: tryRoute('orders.index', '/orders') });
                items.push({ title: t('Returns') !== 'Returns' ? t('Returns') : 'المرتجعات', href: tryRoute('returns.index', '/returns') });
            }
            if (hasPermission('manage-cod-payments')) {
                items.push({ title: t('COD Payments'), href: tryRoute('cod-payments.index', '/cod-payments') });
            }
            if (hasPermission('manage-orders')) {
                items.push({ title: t('Payment Operations') !== 'Payment Operations' ? t('Payment Operations') : 'عمليات الدفع', href: tryRoute('payments.operations', '/payments/operations'), activePaths: ['/payments/operations'] });
            }
            if (hasPermission('manage-pos') && routeExists('pos.index')) {
                items.push({ title: t('POS System'), href: tryRoute('pos.index', '/pos') });
            }
            return { title: titleFor('orders'), items };
        }
        case 'products': {
            const items: ContextNavItem[] = [];
            if (hasPermission('manage-products')) items.push({ title: t('Products'), href: tryRoute('products.index', '/products') });
            if (hasPermission('manage-categories')) {
                const href = sid ? `/stores/${sid}/categories` : tryRoute('categories.index', '/categories');
                const activePaths = sid ? [`/stores/${sid}/categories`, '/categories'] : ['/categories'];
                try { activePaths.push(route('categories.index')); } catch {}
                items.push({ title: t('Categories'), href, activePaths: [...new Set(activePaths)] });
            }
            if (hasPermission('manage-product-reviews')) items.push({ title: t('Product Reviews'), href: tryRoute('product-reviews.index', '/product-reviews') });
            if (hasPermission('manage-digital-downloads')) items.push({ title: t('Digital Downloads'), href: tryRoute('digital-downloads.index', '/digital-downloads') });
            return { title: titleFor('products'), items };
        }
        case 'customers': {
            const items: ContextNavItem[] = [];
            if (hasPermission('manage-customers')) items.push({ title: t('Customers'), href: tryRoute('customers.index', '/customers') });
            if (sid && hasPermission('settings-stores')) {
                items.push({ title: t('Customer Accounts') !== 'Customer Accounts' ? t('Customer Accounts') : 'حسابات العملاء', href: `/stores/${sid}/customer-accounts`, activePaths: [`/stores/${sid}/customer-accounts`] });
            }
            if (hasPermission('manage-loyalty')) {
                items.push({ title: t('Loyalty Points'), href: tryRoute('loyalty.settings', '/loyalty/settings') });
            }
            return { title: titleFor('customers'), items };
        }
        case 'store': {
            const items: ContextNavItem[] = [];
            if (hasPermission('manage-stores')) {
                items.push({ title: t('Stores') !== 'Stores' ? t('Stores') : 'المتاجر', href: tryRoute('stores.index', '/stores') });
            }
            if (sid && hasPermission('settings-stores')) {
                items.push({ title: t('Store Design') !== 'Store Design' ? t('Store Design') : 'تصميم المتجر', href: safeRoute('stores.designer', sid, `/stores/${sid}/designer`) });
            }
            if (hasPermission('manage-media')) {
                items.push({ title: t('Media Library'), href: tryRoute('media-library', '/media-library') });
            }
            // Store Features / Pages placeholder if exists — keep minimal
            return { title: titleFor('store'), items };
        }
        case 'marketing': {
            const items: ContextNavItem[] = [];
            if (hasPermission('manage-coupon-system')) items.push({ title: t('Coupons'), href: tryRoute('coupon-system.index', '/coupon-system') });
            if (hasPermission('manage-advanced-coupons')) items.push({ title: t('Advanced Coupons'), href: tryRoute('advanced-coupons.index', '/advanced-coupons') });
            if (hasPermission('manage-abandoned-carts')) {
                const href = sid ? `/stores/${sid}/abandoned-carts` : tryRoute('abandoned-carts.index', '/abandoned-carts');
                items.push({ title: t('Abandoned Carts'), href, activePaths: sid ? [`/stores/${sid}/abandoned-carts`, '/abandoned-carts'] : ['/abandoned-carts'] });
            }
            if (hasPermission('manage-express-checkout')) {
                items.push({ title: t('Express Checkout') !== 'Express Checkout' ? t('Express Checkout') : 'روابط البيع السريع', href: tryRoute('express-checkout.index', '/express-checkout') });
            }
            if (hasPermission('manage-referral')) {
                items.push({ title: t('Referral Program'), href: tryRoute('referral.index', '/referral') });
            }
            return { title: titleFor('marketing'), items };
        }
        case 'analytics': {
            // Single item but still show context to keep IA consistent; no subnav needed but we provide one
            return null;
        }
        case 'settings': {
            const items: ContextNavItem[] = [];
            if (sid && hasPermission('settings-stores')) {
                items.push({ title: t('General') !== 'General' ? t('General') : 'عام', href: safeRoute('stores.settings', sid, `/stores/${sid}/settings`), activePaths: [`/stores/${sid}/settings`] });
                items.push({ title: t('Payment Methods'), href: `/stores/${sid}/payments`, activePaths: [`/stores/${sid}/payments`] });
                items.push({ title: t('Shipping & Delivery') !== 'Shipping & Delivery' ? t('Shipping & Delivery') : 'الشحن والتوصيل', href: `/stores/${sid}/shipping`, activePaths: [`/stores/${sid}/shipping`, '/shipping'] });
                items.push({ title: t('Taxes') !== 'Taxes' ? t('Taxes') : 'الضرائب', href: `/stores/${sid}/taxes`, activePaths: [`/stores/${sid}/taxes`, '/tax'] });
                items.push({ title: t('Email & Notifications') !== 'Email & Notifications' ? t('Email & Notifications') : 'البريد والإشعارات', href: `/stores/${sid}/email-settings`, activePaths: [`/stores/${sid}/email-settings`, `/stores/${sid}/notifications/email`, `/stores/${sid}/notifications/whatsapp`] });
                items.push({ title: t('Domain') !== 'Domain' ? t('Domain') : 'الدومين', href: `/stores/${sid}/domains`, activePaths: [`/stores/${sid}/domains`] });
                items.push({ title: t('Integrations'), href: `/stores/${sid}/integrations`, activePaths: [`/stores/${sid}/integrations`, `/stores/${sid}/integrations/erp`] });
            }
            if (hasPermission('manage-users')) {
                items.push({ title: t('Users & Roles') !== 'Users & Roles' ? t('Users & Roles') : 'الفريق والصلاحيات', href: tryRoute('users.index', '/users') });
            }
            if (hasPermission('manage-notifications')) {
                // Customer Notifications under settings email section already covers, but keep explicit if permission
                // avoid duplicate — skip if email-settings already present
            }
            if (hasPermission('manage-plans')) {
                items.push({ title: t('My Plan') !== 'My Plan' ? t('My Plan') : 'الخطة', href: tryRoute('plans.index', '/plans') });
            }
            // Referral moved to marketing, COD moved to orders, Media moved to store — NOT here
            // Platform Settings is admin-only — hidden for company users
            return { title: titleFor('settings'), items };
        }
        default:
            return null;
    }
}
