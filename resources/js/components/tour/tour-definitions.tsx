export interface TourStep {
    id: string;
    path: string;
    selector?: string;
    resolveTarget?: () => Element | null;
    titleKey: string;
    descKey: string;
}

export function getTourSteps(storeId?: number | null): TourStep[] {
    const steps: TourStep[] = [
        {
            id: 'dashboard',
            path: route('dashboard'),
            titleKey: 'Dashboard',
            descKey: 'Tour dashboard description',
        },
        {
            id: 'products',
            path: route('products.index'),
            resolveTarget: () => {
                const link = document.querySelector('a[href*="/products/create"]');
                if (link) return link;
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find((b) => /إنشاء|إضافة|create|new/i.test(b.textContent || '')) || null;
            },
            titleKey: 'Products',
            descKey: 'Tour products description',
        },
        {
            id: 'categories',
            path: route('categories.index'),
            titleKey: 'Categories',
            descKey: 'Tour categories description',
        },
        {
            id: 'orders',
            path: route('orders.index'),
            titleKey: 'Orders',
            descKey: 'Tour orders description',
        },
        {
            id: 'customers',
            path: route('customers.index'),
            titleKey: 'Customers',
            descKey: 'Tour customers description',
        },
        {
            id: 'shipping',
            path: route('shipping.index'),
            titleKey: 'Shipping',
            descKey: 'Tour shipping description',
        },
    ];

    if (storeId) {
        steps.push({
            id: 'store-settings',
            path: route('stores.settings', storeId),
            titleKey: 'Store Settings',
            descKey: 'Tour store settings description',
        });
    }

    steps.push(
        {
            id: 'coupons',
            path: route('coupon-system.index'),
            titleKey: 'Coupons',
            descKey: 'Tour coupons description',
        },
        {
            id: 'analytics',
            path: route('analytics.index'),
            titleKey: 'Analytics & Reporting',
            descKey: 'Tour analytics description',
        },
        {
            id: 'users',
            path: route('users.index'),
            titleKey: 'Users',
            descKey: 'Tour users description',
        },
        {
            id: 'media-library',
            path: route('media-library'),
            titleKey: 'Media Library',
            descKey: 'Tour media description',
        },
        {
            id: 'system-settings',
            path: route('settings'),
            titleKey: 'Settings',
            descKey: 'Tour settings description',
        },
    );

    return steps;
}
