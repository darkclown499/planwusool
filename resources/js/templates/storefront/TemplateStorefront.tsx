import { toast } from '@/components/custom-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import { useOrder } from '@/contexts/OrderContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import { router } from '@inertiajs/react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateAuthForm, TemplateAuthGate } from './AuthModal';
import { TemplateCartDrawer } from './CartDrawer';
import { TemplateCheckout } from './CheckoutModal';
import { TemplateMyOrdersModal, TemplateOrderDetailsModal, TemplateOrderSuccessModal, TemplateProfileModal } from './CustomerModals';
import { TemplateProductDetailModal } from './ProductDetailModal';

/**
 * Storefront overlay host for the template system.
 * Mounted once inside ThemeProvider, it wires the template page to the full
 * storefront feature stack (cart, checkout with payment + delivery methods,
 * customer login/register, product details, orders and profile).
 */
export const TemplateStorefront: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { store } = useStore();
    const cart = useCart();
    const auth = useAuth();
    const ui = useUI();
    const product = useProduct();
    const order = useOrder();

    const storeSlug = store?.slug;

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
                    onProductClick={(p) => product.handleProductClick(p)}
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
        </>
    );
};
