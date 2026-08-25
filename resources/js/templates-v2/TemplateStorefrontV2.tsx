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
import { TemplateAuthForm, TemplateAuthGate } from './shared/neutral/AuthModal';

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

    const CartDrawer = overlays.cart!;
    const ProductDetailModal = overlays.product_detail!;
    const CheckoutModal = overlays.checkout!;
    const OrderSuccessModal = overlays.order_success!;
    const ProfileModal = overlays.profile!;
    const MyOrdersModal = overlays.orders!;
    const OrderDetailsModal = overlays.order_detail!;
    const WishlistOverlay = overlays.wishlist!;
    const SearchOverlay = overlays.search!;

    const customerAccountsEnabled = behavior?.customer_accounts_enabled !== false;
    const loginEnabled = customerAccountsEnabled && behavior?.enable_customer_login !== false;
    const requireLogin = customerAccountsEnabled && behavior?.require_login_checkout === true;

    // Payment redirects (Paystack, Skrill, Flutterwave...) return to the store
    // with payment_status + order_number in the URL -> show the success modal.
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_status') === 'success' && urlParams.get('order_number')) {
            order.setOrderNumber(urlParams.get('order_number')!);
            order.setShowOrderSuccess(true);
        }
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
        } else if (!customerAccountsEnabled) {
            ui.setShowCheckout(true);
        } else if (requireLogin) {
            ui.setShowAuthModal(false);
            auth.setShowLoginModal(true);
        } else if (!loginEnabled) {
            ui.setShowCheckout(true);
        } else {
            ui.setShowAuthModal(true);
        }
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
            {ui.showCart && (
                <CartDrawer
                    onClose={ui.handleCloseCart}
                    onCheckout={handleCheckoutClick}
                    onProductClick={(p: any) => product.handleProductClick(p)}
                />
            )}

            {product.showProductDetail && product.selectedProduct && (
                <ProductDetailModal
                    product={product.selectedProduct}
                    selectedImageIndex={product.selectedImageIndex}
                    onClose={product.handleCloseProductDetail}
                    onImageSelect={product.handleImageSelect}
                />
            )}

            {ui.showAuthModal && (
                <TemplateAuthGate
                    onClose={() => ui.setShowAuthModal(false)}
                    onLogin={() => {
                        ui.setShowAuthModal(false);
                        auth.setShowLoginModal(true);
                    }}
                    onContinueAsGuest={() => {
                        ui.setShowAuthModal(false);
                        ui.setShowCheckout(true);
                    }}
                />
            )}

            {auth.showLoginModal && (
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

            {ui.showCheckout && (
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

            {order.showOrderSuccess && order.orderNumber && !ui.showCheckout && (
                <OrderSuccessModal
                    orderNumber={order.orderNumber}
                    onClose={() => order.setShowOrderSuccess(false)}
                    onContinueShopping={() => order.setShowOrderSuccess(false)}
                />
            )}

            {auth.showOrdersModal && (
                <MyOrdersModal
                    orders={order.userOrders}
                    loading={order.loadingOrders}
                    storeSlug={storeSlug}
                    onClose={() => auth.setShowOrdersModal(false)}
                    onViewOrder={order.handleViewOrder}
                />
            )}

            {order.showOrderDetailsModal && order.selectedOrderId && (
                <OrderDetailsModal
                    orderNumber={order.selectedOrderId}
                    storeSlug={storeSlug}
                    onClose={() => order.setShowOrderDetailsModal(false)}
                />
            )}

            {auth.showProfileModal && (
                <ProfileModal userProfile={auth.userProfile} storeSlug={storeSlug} onClose={() => auth.setShowProfileModal(false)} />
            )}

            {auth.showWishlistModal && <WishlistOverlay onClose={() => auth.setShowWishlistModal(false)} />}

            {ui.showSearch && (
                <SearchOverlay
                    onClose={() => ui.setShowSearch(false)}
                    onProductClick={(p: any) => product.handleProductClick(p)}
                />
            )}
        </div>
    );
};
