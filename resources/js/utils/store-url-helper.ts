
/**
 * Generate a store URL, handling custom domains/subdomains.
 * If a custom domain is active, it omits the 'store/{slug}' prefix.
 */
export const generateStoreUrl = (routeName: string, store: any, params: any = {}) => {
    // Use the global route() function
    if (typeof (window as any).route !== 'function') {
        console.warn('Ziggy route() function not found');
        return '';
    }

    const route = (window as any).route;

    // Always include storeSlug for Ziggy to avoid "parameter required" errors,
    // but we will strip it from the generated URL if custom domain is active.
    const routeUrl = route(routeName, { storeSlug: store?.slug, ...params });

    const currentHost = window.location.hostname;

    // Check if we are actually on this store's custom domain or subdomain
    const isOnCustomDomain = store?.enable_custom_domain && store?.custom_domain === currentHost;
    const isOnCustomSubdomain = store?.enable_custom_subdomain && currentHost.startsWith(store?.custom_subdomain + '.');

    // Only strip the /store/slug prefix if we are actually ON the custom domain/subdomain.
    // AND we are NOT on the logout route, to prevent collisions with the main app logout.
    if ((isOnCustomDomain || isOnCustomSubdomain) && routeName !== 'store.logout') {
        const storePrefix = `/store/${store?.slug}`;
        if (routeUrl.includes(storePrefix)) {
            return routeUrl.replace(storePrefix, '');
        }
    }

    return routeUrl;
};
