
/**
 * Generate a store URL on its subdomain, e.g. https://techvibe.wusool.ps/order/ABC.
 * Every store is served on its own {storeSlug}.{APP_DOMAIN} subdomain, so the
 * store slug is always passed as the domain parameter to the route.
 */
export const generateStoreUrl = (routeName: string, store: any, params: any = {}) => {
    // Use the global route() function
    if (typeof (window as any).route !== 'function') {
        console.warn('Ziggy route() function not found');
        return '';
    }

    const route = (window as any).route;

    return route(routeName, { storeSlug: store?.slug, ...params });
};
