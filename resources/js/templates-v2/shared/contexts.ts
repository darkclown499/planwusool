import { AuthContext } from '@/contexts/AuthContext';
import { CartContext } from '@/contexts/CartContext';
import { OrderContext } from '@/contexts/OrderContext';
import { ProductContext } from '@/contexts/ProductContext';
import { StoreContext } from '@/contexts/StoreContext';
import { UIContext } from '@/contexts/UIContext';
import { WishlistContext } from '@/contexts/WishlistContext';
import { useContext } from 'react';

/**
 * Safe storefront context access.
 * Template sections render on the live storefront (wrapped in ThemeProvider),
 * but also appear in admin/preview contexts where the storefront providers
 * are not mounted. Unlike the useX() hooks (which throw when a provider is
 * missing), this reads the raw context objects and degrades to inert
 * fallbacks so template sections never crash a preview.
 */
export function useStorefrontCore() {
    const cart = useContext(CartContext) || {
        cartItems: [] as any[],
        addToCart: async () => {},
        removeFromCart: async () => {},
        updateQuantity: async () => {},
        setQuantity: async () => {},
        syncGuestCart: async () => {},
    };

    const auth = useContext(AuthContext) || {
        isLoggedIn: false,
        userProfile: null as any,
        customer: null as any,
        setShowLoginModal: () => {},
        setShowOrdersModal: () => {},
        setShowProfileModal: () => {},
        setShowWishlistModal: () => {},
        setShowAddressesModal: () => {},
        logout: () => {},
    };

    const ui = useContext(UIContext) || {
        setShowCart: () => {},
        setShowCheckout: () => {},
        setShowAuthModal: () => {},
        setShowSearch: () => {},
        handleCartClick: () => {},
        handleCloseCart: () => {},
    };

    const storeCtx = useContext(StoreContext) || {
        store: { id: 0, slug: '', name: '' } as any,
        config: {} as any,
        content: undefined,
        behavior: {} as any,
    };

    const product = useContext(ProductContext) || {
        filteredProducts: [] as any[],
        categories: [] as any[],
        activeCategory: 'all',
        handleSearch: () => {},
        handleProductClick: () => {},
        handleCategoryClick: () => {},
    };

    const order = useContext(OrderContext) || {
        userOrders: [] as any[],
        loadingOrders: false,
        loadUserOrders: async () => {},
        handleViewOrder: () => {},
    };

    const wishlist = useContext(WishlistContext) || {
        items: [] as any[],
        count: 0,
        isInWishlist: () => false,
        toggle: async () => false,
    };

    return {
        cart,
        auth,
        ui,
        store: storeCtx.store,
        config: storeCtx.config,
        content: storeCtx.content,
        behavior: (storeCtx as any).behavior || {},
        product,
        order,
        wishlist,
    };
}
