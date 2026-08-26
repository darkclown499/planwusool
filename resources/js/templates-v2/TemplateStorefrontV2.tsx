import { toast } from '@/components/custom-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import { useOrder } from '@/contexts/OrderContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import type { TemplateModule } from './types';
import React, { useEffect } from 'react';

/**
 * Injects Product JSON-LD structured data into the document head when a
 * product detail modal is open. Enables Google rich results (price,
 * availability, image) for individual products.
 */
const ProductSchema: React.FC<{ product: any; store?: any }> = ({ product, store }) => {
    useEffect(() => {
        if (!product?.name) return;

        const baseUrl = window.location.origin;
        const slug = product.seoUrlSlug || product.id;
        const img = product.image || '';
        const availability = product.availability === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock';

        const schema: Record<string, any> = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            url: `${baseUrl}/product/${slug}`,
            image: img || undefined,
            description: product.short_description || product.description || undefined,
            sku: product.sku || undefined,
            brand: store?.name ? { '@type': 'Brand', name: store.name } : undefined,
            offers: {
                '@type': 'Offer',
                priceCurrency: store?.currency_code || 'USD',
                price: (Number(product.price) || 0).toFixed(2),
                availability,
                url: `${baseUrl}/product/${slug}`,
            },
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'product-schema';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);

        return () => {
            document.getElementById('product-schema')?.remove();
        };
    }, [product?.name, product?.price, product?.availability, store?.name, store?.currency_code]);

    return null;
};
import { TemplateAuthForm, TemplateAuthGate } from './shared/neutral/AuthModal';
import { TemplateAddressesModal } from './shared/neutral/AddressesModal';

/**
 * Storefront overlay host for template system v2.
 *
 * Mounts the resolved template module's OWN overlay components (its bespoke
 * cart, product detail, checkout, search...) using the exact same props
 * contract and shopping-flow state machine as the legacy host: auth gate,
 * guest checkout, payment-redirect success handling, order completion.
 * Any slot the template has not branded falls back to the accent-tinted
 * neutral set. The whole stack renders inside a CSS-variable scope derived
 * from `module.meta.accent` so neutral pieces adopt the store identity.
 */
export const TemplateStorefrontV2: React.FC<{ children: React.ReactNode; module: TemplateModule }> = ({ children, module }) => {
    const { store, behavior } = useStore();
    const cart = useCart();
    const auth = useAuth();
    const ui = useUI();
    const product = useProduct();
    const order = useOrder();

    const overlays = module.overlays || {};
    const storeSlug = (store as any)?.slug;

    const CartDrawer = overlays.cart;
    const ProductDetailModal = overlays.product_detail;
    const CheckoutModal = overlays.checkout;
    const OrderSuccessModal = overlays.order_success;
    const ProfileModal = overlays.profile;
    const MyOrdersModal = overlays.orders;
    const OrderDetailsModal = overlays.order_detail;
    const WishlistOverlay = overlays.wishlist;
    const SearchOverlay = overlays.search;

    const customerAccountsEnabled = behavior?.customer_accounts_enabled !== false;
    const loginEnabled = customerAccountsEnabled && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
    const guestEnabled = !customerAccountsEnabled ? true : behavior?.guest_checkout !== false;
    const requireLogin = customerAccountsEnabled && behavior?.require_login_checkout === true;

    // Payment redirects (Paystack, Skrill, Flutterwave...) return to the store
    // with payment_status + order_number in the URL -> show the success modal ONCE.
    // One-time consumption: sessionStorage guards replay + URL cleanup prevents refresh/back replay.
    useEffect(() => {
        const CONSUMED_KEY = 'wusool_order_success_consumed';
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const status = urlParams.get('payment_status');
            const ord = urlParams.get('order_number');
            if (status === 'success' && ord) {
                const marker = `${ord}:${status}`;
                const already = sessionStorage.getItem(CONSUMED_KEY);
                // Query params are NOT trusted authority. Only honour if a real order
                // previously set the marker via CheckoutContext (server-confirmed).
                // Manual ?order_number=FAKE... with no marker -> silently clean, no modal, no state change.
                const shouldShow = already === marker;
                // Always clean URL immediately (transient state consumed)
                urlParams.delete('payment_status');
                urlParams.delete('order_number');
                const qs = urlParams.toString();
                const clean = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
                window.history.replaceState({}, '', clean);
                if (shouldShow) {
                    order.setOrderNumber(ord);
                    order.setShowOrderSuccess(true);
                }
            }
        } catch {}
        // Listen for in-app checkout success event (CheckoutContext dispatch)
        const handler = (e: any) => {
            try {
                const ord = e?.detail?.orderNumber;
                if (ord) {
                    const marker = `${ord}:success`;
                    sessionStorage.setItem(CONSUMED_KEY, marker);
                    order.setOrderNumber(ord);
                    order.setShowOrderSuccess(true);
                }
            } catch {}
        };
        window.addEventListener('showOrderSuccess' as any, handler);
        return () => window.removeEventListener('showOrderSuccess' as any, handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load orders whenever the My Orders modal opens (covers both logged-in and guest session)
    useEffect(() => {
        if (auth.showOrdersModal) {
            order.loadUserOrders();
        }
    }, [auth.showOrdersModal]);

    const handleCheckoutClick = () => {
        ui.setShowCart(false);
        if (auth.isLoggedIn) {
            ui.setShowCheckout(true);
            return;
        }
        if (!customerAccountsEnabled) {
            ui.setShowCheckout(true);
            return;
        }
        // Guest disabled + login enabled => must login
        if (!guestEnabled && loginEnabled) {
            ui.setShowAuthModal(false);
            auth.setShowLoginModal(true);
            return;
        }
        // Guest disabled + login disabled => deadlock, allow guest checkout
        if (!guestEnabled && !loginEnabled) {
            ui.setShowCheckout(true);
            return;
        }
        if (requireLogin) {
            ui.setShowAuthModal(false);
            auth.setShowLoginModal(true);
            return;
        }
        if (!loginEnabled) {
            ui.setShowCheckout(true);
            return;
        }
        if (!guestEnabled) {
            ui.setShowAuthModal(false);
            auth.setShowLoginModal(true);
            return;
        }
        ui.setShowAuthModal(true);
    };

    const handleOrderComplete = () => {
        ui.setShowCheckout(false);
        ui.setShowCart(false);
        cart.clearCart?.();
        order.loadUserOrders();
        // Success toast is now shown inside CheckoutContext's onSuccess callback only,
        // after server confirms the order — prevents premature toast on validation failure.
    };

    return (
        <div
            style={{
                ['--twc-primary-600' as any]: module.meta.accent,
                ['--twc-primary-700' as any]: module.meta.accent,
                ['--twc-primary-500' as any]: module.meta.accent,
            }}
        >
            {children}

            {/* Bespoke / neutral overlay stack */}
            {ui.showCart && CartDrawer && (
                <CartDrawer
                    onClose={ui.handleCloseCart}
                    onCheckout={handleCheckoutClick}
                    onProductClick={(p: any) => product.handleProductClick(p)}
                />
            )}

            {product.showProductDetail && product.selectedProduct && ProductDetailModal && (
                <>
                    <ProductSchema product={product.selectedProduct} store={store} />
                    <ProductDetailModal
                        product={product.selectedProduct}
                        selectedImageIndex={product.selectedImageIndex}
                        onClose={product.handleCloseProductDetail}
                        onImageSelect={product.handleImageSelect}
                    />
                </>
            )}

            {ui.showAuthModal && customerAccountsEnabled && (
                <TemplateAuthGate
                    loginEnabled={loginEnabled}
                    guestEnabled={guestEnabled}
                    onClose={() => ui.setShowAuthModal(false)}
                    onLogin={() => {
                        ui.setShowAuthModal(false);
                        if (loginEnabled) auth.setShowLoginModal(true);
                        else ui.setShowCheckout(true);
                    }}
                    onContinueAsGuest={() => {
                        ui.setShowAuthModal(false);
                        ui.setShowCheckout(true);
                    }}
                />
            )}

            {auth.showLoginModal && customerAccountsEnabled && loginEnabled && (
                <TemplateAuthForm
                    onClose={() => auth.setShowLoginModal(false)}
                    storeSlug={storeSlug}
                    onLoginSuccess={() => {
                        auth.setShowLoginModal(false);
                        cart.syncGuestCart?.();
                        window.location.reload();
                    }}
                />
            )}

            {ui.showCheckout && CheckoutModal && (
                <CheckoutProvider userProfile={auth.userProfile} isLoggedIn={auth.isLoggedIn} store={store} onOrderComplete={handleOrderComplete}>
                    <CheckoutModal
                        onClose={() => ui.setShowCheckout(false)}
                        onOrderComplete={handleOrderComplete}
                        showOrderSuccess={order.showOrderSuccess}
                        setShowOrderSuccess={order.setShowOrderSuccess}
                        orderNumber={order.orderNumber}
                        setOrderNumber={order.setOrderNumber}
                    />
                </CheckoutProvider>
            )}

            {order.showOrderSuccess && order.orderNumber && !ui.showCheckout && OrderSuccessModal && (
                <OrderSuccessModal
                    orderNumber={order.orderNumber}
                    onClose={() => {
                        order.setShowOrderSuccess(false);
                        // Prevent stale URL replay if user manually re-adds params
                        try {
                            const url = new URL(window.location.href);
                            if (url.searchParams.has('payment_status') || url.searchParams.has('order_number')) {
                                url.searchParams.delete('payment_status');
                                url.searchParams.delete('order_number');
                                window.history.replaceState({}, '', url.toString());
                            }
                        } catch {}
                    }}
                    onContinueShopping={() => {
                        order.setShowOrderSuccess(false);
                        try {
                            const url = new URL(window.location.href);
                            if (url.searchParams.has('payment_status') || url.searchParams.has('order_number')) {
                                url.searchParams.delete('payment_status');
                                url.searchParams.delete('order_number');
                                window.history.replaceState({}, '', url.toString());
                            }
                        } catch {}
                    }}
                />
            )}

            {auth.showOrdersModal && customerAccountsEnabled && (auth.isLoggedIn || loginEnabled) && MyOrdersModal && (
                <MyOrdersModal
                    orders={order.userOrders}
                    loading={order.loadingOrders}
                    storeSlug={storeSlug}
                    onClose={() => auth.setShowOrdersModal(false)}
                    onViewOrder={order.handleViewOrder}
                />
            )}

            {order.showOrderDetailsModal && order.selectedOrderId && customerAccountsEnabled && OrderDetailsModal && (
                <OrderDetailsModal
                    orderNumber={order.selectedOrderId}
                    storeSlug={storeSlug}
                    onClose={() => order.setShowOrderDetailsModal(false)}
                />
            )}

            {auth.showProfileModal && customerAccountsEnabled && (auth.isLoggedIn || loginEnabled) && ProfileModal && (
                <ProfileModal userProfile={auth.userProfile} storeSlug={storeSlug} onClose={() => auth.setShowProfileModal(false)} />
            )}

            {auth.showWishlistModal && WishlistOverlay && <WishlistOverlay onClose={() => auth.setShowWishlistModal(false)} />}

            {(auth as any).showAddressesModal && customerAccountsEnabled && auth.isLoggedIn && (
                <TemplateAddressesModal onClose={() => (auth as any).setShowAddressesModal(false)} />
            )}

            {ui.showSearch && SearchOverlay && (
                <SearchOverlay
                    onClose={() => ui.setShowSearch(false)}
                    onProductClick={(p: any) => product.handleProductClick(p)}
                />
            )}
        </div>
    );
};
