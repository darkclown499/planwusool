import { toast } from '@/components/custom-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import { useOrder } from '@/contexts/OrderContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import { getFamilyPageComponent } from '@/themes/registry';
import type { TemplateFamily } from '@/builder/types';
import { router } from '@inertiajs/react';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateAuthForm, TemplateAuthGate } from './AuthModal';

/**
 * Storefront overlay host for the template system.
 * Mounted once inside ThemeProvider, it wires the template page to the full
 * storefront feature stack (cart, checkout with payment + delivery methods,
 * customer login/register, product details, orders and profile). Every
 * overlay below (cart/product-detail/checkout/order-success/profile/orders/
 * order-detail/search) is resolved through getFamilyPageComponent so a
 * family can ship its own on-brand version — anything it doesn't override
 * falls back to the shared component every store already used.
 *
 * Deliberately does NOT `import '@/themes/load-families'` itself: this
 * module sits inside the `@/templates/storefront` barrel, which several
 * generic builder sections import — so a family module (reachable from
 * load-families.ts) importing this file back would re-enter it while
 * themes/registry.ts is still mid-evaluation, throwing on its `registry`
 * const. dynamic.tsx / StoreSite.tsx trigger the family bootstrap instead,
 * from outside that cycle, before this component ever renders.
 */
export const TemplateStorefront: React.FC<{ children: React.ReactNode; family?: TemplateFamily | null }> = ({ children, family = null }) => {
    const { t } = useTranslation();
    const { store, behavior } = useStore();
    const cart = useCart();
    const auth = useAuth();
    const ui = useUI();
    const product = useProduct();
    const order = useOrder();

    const storeSlug = store?.slug;

    const TemplateCartDrawer = useMemo(() => getFamilyPageComponent(family, 'cart')!, [family]);
    const TemplateProductDetailModal = useMemo(() => getFamilyPageComponent(family, 'product_detail')!, [family]);
    const TemplateCheckout = useMemo(() => getFamilyPageComponent(family, 'checkout')!, [family]);
    const TemplateOrderSuccessModal = useMemo(() => getFamilyPageComponent(family, 'order_success')!, [family]);
    const TemplateProfileModal = useMemo(() => getFamilyPageComponent(family, 'profile')!, [family]);
    const TemplateMyOrdersModal = useMemo(() => getFamilyPageComponent(family, 'orders')!, [family]);
    const TemplateOrderDetailsModal = useMemo(() => getFamilyPageComponent(family, 'order_detail')!, [family]);
    const SearchOverlay = useMemo(() => getFamilyPageComponent(family, 'search')!, [family]);

    const loginEnabled = behavior?.enable_customer_login !== false;
    const requireLogin = behavior?.require_login_checkout === true;

    // Payment redirects (Paystack, Skrill, Flutterwave...) return to the store
    // with payment_status + order_number in the URL -> show the success modal.
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPaymentStatus = urlParams.get('payment_status');
        const urlOrderNum = urlParams.get('order_number');
        if (urlPaymentStatus === 'success' && urlOrderNum) {
            order.setOrderNumber(urlOrderNum);
            order.setShowOrderSuccess(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCheckoutClick = () => {
        ui.setShowCart(false);
        if (auth.isLoggedIn) {
            ui.setShowCheckout(true);
        } else if (requireLogin) {
            // Login required: send straight to the login form (no guest option).
            ui.setShowAuthModal(false);
            auth.setShowLoginModal(true);
        } else if (!loginEnabled) {
            // Login disabled: go straight to checkout as guest.
            ui.setShowCheckout(true);
        } else {
            ui.setShowAuthModal(true);
        }
    };

    const handleOrderComplete = () => {
        ui.setShowCheckout(false);
        ui.setShowCart(false);
        cart.clearCart?.();
        if (auth.isLoggedIn) {
            order.loadUserOrders();
        }
        toast.success('تم إتمام الطلب بنجاح!');
    };

    return (
        <>
            {children}

            {ui.showCart && (
                <TemplateCartDrawer
                    onClose={ui.handleCloseCart}
                    onCheckout={handleCheckoutClick}
                    onProductClick={(p: any) => product.handleProductClick(p)}
                />
            )}

            {product.showProductDetail && product.selectedProduct && (
                <TemplateProductDetailModal
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
                        router.reload({
                            only: ['isLoggedIn', 'customer', 'customer_address'],
                            onSuccess: () => {
                                ui.setShowCheckout(true);
                            },
                        });
                    }}
                />
            )}

            {ui.showCheckout && (
                <CheckoutProvider userProfile={auth.userProfile} isLoggedIn={auth.isLoggedIn} store={store} onOrderComplete={handleOrderComplete}>
                    <TemplateCheckout
                        onClose={() => ui.setShowCheckout(false)}
                        onOrderComplete={handleOrderComplete}
                        showOrderSuccess={order.showOrderSuccess}
                        setShowOrderSuccess={order.setShowOrderSuccess}
                        orderNumber={order.orderNumber}
                        setOrderNumber={order.setOrderNumber}
                    />
                </CheckoutProvider>
            )}

            {order.showOrderSuccess && order.orderNumber && (
                <TemplateOrderSuccessModal
                    orderNumber={order.orderNumber}
                    onClose={() => order.setShowOrderSuccess(false)}
                    onContinueShopping={() => order.setShowOrderSuccess(false)}
                />
            )}

            {auth.showOrdersModal && (
                <TemplateMyOrdersModal
                    orders={order.userOrders}
                    loading={order.loadingOrders}
                    storeSlug={storeSlug}
                    onClose={() => auth.setShowOrdersModal(false)}
                    onViewOrder={order.handleViewOrder}
                />
            )}

            {order.showOrderDetailsModal && order.selectedOrderId && (
                <TemplateOrderDetailsModal
                    orderNumber={order.selectedOrderId}
                    storeSlug={storeSlug}
                    onClose={() => order.setShowOrderDetailsModal(false)}
                />
            )}

            {auth.showProfileModal && (
                <TemplateProfileModal userProfile={auth.userProfile} storeSlug={storeSlug} onClose={() => auth.setShowProfileModal(false)} />
            )}

            {ui.showSearch && <SearchOverlay onClose={() => ui.setShowSearch(false)} />}
        </>
    );
};
