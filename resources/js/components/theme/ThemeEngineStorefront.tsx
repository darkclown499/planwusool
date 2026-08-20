import { toast } from '@/components/custom-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import { router } from '@inertiajs/react';
import React, { useEffect } from 'react';
import {
  TemplateOrderDetailsModal,
  TemplateOrderSuccessModal,
  TemplateProfileModal,
  TemplateMyOrdersModal,
} from '@/templates/storefront/CustomerModals';
import { TemplateAuthForm, TemplateAuthGate } from '@/templates/storefront/AuthModal';
import { TemplateProductDetailModal } from '@/templates/storefront/ProductDetailModal';
import { useCoreCommerce } from './useCoreCommerce';
import { useThemeEngine } from './ThemeEngineContext';
import { DynamicCart } from './slots/DynamicCart';
import { ThemeCheckoutModal } from './ThemeCheckoutModal';

/**
 * Storefront overlay host for the Theme Engine.
 *
 * Mirrors the template system's overlay stack (auth, orders, profile, product
 * detail) but renders the cart and checkout from the *theme config slots* -
 * every cart type still drives the exact same `useCart` / `useCheckout`
 * pipeline underneath.
 */
export const ThemeEngineStorefront: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useThemeEngine();
  const core = useCoreCommerce(config);
  const cart = useCart();
  const auth = useAuth();
  const ui = useUI();
  const product = useProduct();
  const order = useOrder();

  const store = core.store;
  const storeSlug = store?.slug ?? '';
  const loginEnabled = true;
  const requireLogin = false;

  // Payment redirects (Paystack, Skrill, Flutterwave...) return with
  // payment_status + order_number -> show the shared success modal.
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

  // Gate checkout behind login when the store requires it.
  const handleCheckoutClick = () => {
    ui.setShowCart(false);
    if (auth.isLoggedIn) {
      ui.setShowCheckout(true);
    } else if (requireLogin) {
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
    if (auth.isLoggedIn) order.loadUserOrders();
    toast.success('تم إتمام الطلب بنجاح!');
  };

  const isStickyCart = config.layout.cartType === 'sticky_bottom_bar';
  const showCartOverlay = ui.showCart && !isStickyCart;

  return (
    <>
      {children}

      {/* Sticky bar always sits on the page; other cart types appear on demand. */}
      <DynamicCart
        type={config.layout.cartType}
        open={showCartOverlay}
        config={config}
        core={core}
        onClose={ui.handleCloseCart}
        onCheckout={handleCheckoutClick}
        onProductClick={product.handleProductClick}
      />

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
              onSuccess: () => ui.setShowCheckout(true),
            });
          }}
        />
      )}

      {ui.showCheckout && (
        <ThemeCheckoutModal
          config={config}
          onClose={() => ui.setShowCheckout(false)}
          onOrderComplete={handleOrderComplete}
          inline={false}
        />
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
        <TemplateProfileModal
          userProfile={auth.userProfile}
          storeSlug={storeSlug}
          onClose={() => auth.setShowProfileModal(false)}
        />
      )}
    </>
  );
};