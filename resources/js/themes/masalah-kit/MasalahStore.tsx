import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { useProduct } from '../../contexts/ProductContext';
import { useOrder } from '../../contexts/OrderContext';
import { useUI } from '../../contexts/UIContext';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HeroSlider } from './components/HeroSlider';
import { ProductGrid } from './components/ProductGrid';
import { ProductDetail } from './components/ProductDetail';
import { Footer } from './components/Footer';
import { useMasalahTheme } from './MasalahThemeProvider';
import { useStorefrontLocale } from '../../contexts/StorefrontLocaleContext';
import { CartDrawer } from '../gadgets-store/components/CartDrawer';
import { Checkout } from '../gadgets-store/components/Checkout';
import { AuthModal } from '../gadgets-store/components/AuthModal';
import { LoginModal } from '../gadgets-store/components/LoginModal';
import { ProfileModal } from '../gadgets-store/components/ProfileModal';
import { MyOrdersModal } from '../gadgets-store/components/MyOrdersModal';
import { OrderDetailsModal } from '../gadgets-store/components/OrderDetailsModal';
import { ResetPasswordModal } from '../gadgets-store/components/ResetPasswordModal';
import { OrderSuccessModal } from '../gadgets-store/components/OrderSuccessModal';

export const MasalahStore: React.FC = () => {
  const theme = useMasalahTheme();
  const { t, dir } = useStorefrontLocale();
  const { config, store } = useStore();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const {
    isLoggedIn,
    userProfile,
    showLoginModal,
    showProfileModal,
    showOrdersModal,
    setShowLoginModal,
    setShowProfileModal,
    setShowOrdersModal,
    setShowWishlistModal,
    logout
  } = useAuth();

  const { wishlistCount } = useWishlist();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    setQuantity,
    syncGuestCart,
    loadCart
  } = useCart();

  const {
    categories,
    filteredProducts,
    activeCategory,
    searchQuery,
    selectedProduct,
    selectedImageIndex,
    showProductDetail,
    handleSearch,
    handleProductClick,
    handleCloseProductDetail,
    handleImageSelect,
    handleCategoryClick,
    groupProductsByCategory
  } = useProduct();

  const {
    userOrders,
    loadingOrders,
    selectedOrderId,
    showOrderDetailsModal,
    showOrderSuccess,
    orderNumber,
    setSelectedOrderId,
    setShowOrderDetailsModal,
    setShowOrderSuccess,
    setOrderNumber,
    loadUserOrders,
    handleViewOrder
  } = useOrder();

  const {
    showCart,
    showCheckout,
    showAuthModal,
    showResetPasswordModal,
    resetToken,
    setShowCart,
    setShowCheckout,
    setShowAuthModal,
    setShowResetPasswordModal,
    handleCartClick,
    handleCloseCart
  } = useUI();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPaymentStatus = urlParams.get('payment_status');
    const urlOrderNum = urlParams.get('order_number');

    if (urlPaymentStatus === 'success' && urlOrderNum) {
      setOrderNumber(urlOrderNum);
      setShowOrderSuccess(true);
      return;
    }

    const pageProps = (window as any).page?.props;
    if (pageProps?.payment_status === 'success' && pageProps?.order_number) {
      setOrderNumber(pageProps.order_number);
      setShowOrderSuccess(true);
      return;
    }

    const handleOrderSuccess = (event: CustomEvent) => {
      setOrderNumber(event.detail.orderNumber);
      setShowOrderSuccess(true);
    };

    window.addEventListener('showOrderSuccess', handleOrderSuccess as EventListener);

    return () => {
      window.removeEventListener('showOrderSuccess', handleOrderSuccess as EventListener);
    };
  }, [setOrderNumber, setShowOrderSuccess]);

  useEffect(() => {
    if (showOrdersModal && isLoggedIn) {
      loadUserOrders();
    }
  }, [showOrdersModal, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && cartItems.length > 0) {
      syncGuestCart();
    }
  }, [isLoggedIn]);

  const groupedProducts = groupProductsByCategory();

  const visibleProducts = searchQuery
    ? filteredProducts
    : Object.values(groupedProducts).flat();

  const featuredProducts = visibleProducts.slice(0, 8);

  const handleBuyNow = (product: any) => {
    addToCart(product).then(() => {
      handleCartClick();
    });
  };

  const renderCategorySections = () => {
    if (searchQuery) {
      return (
        <ProductGrid
          id="masalah-products"
          title={t('نتائج البحث')}
          subtitle={`${filteredProducts.length} ${t('منتج مطابق')}`}
          products={filteredProducts}
          onAddToCart={addToCart}
          onProductClick={handleProductClick}
        />
      );
    }

    return categories.map((category) => {
      const products = groupedProducts[category.id] || [];
      if (products.length === 0) return null;
      return (
        <ProductGrid
          key={category.id}
          id={`category-${category.id}`}
          title={category.name}
          subtitle={`${products.length} ${t('منتج')}`}
          products={products}
          onAddToCart={addToCart}
          onProductClick={handleProductClick}
        />
      );
    });
  };

  const renderSections = () => {
    if (theme.layout.sectionMode === 'featured') {
      return (
        <>
          {featuredProducts.length > 0 && (
            <ProductGrid
              id="masalah-products"
          title={t('منتجات مميزة')}
          subtitle={t('اختيارات مختارة بعناية لكم')}
              products={featuredProducts}
              onAddToCart={addToCart}
              onProductClick={handleProductClick}
            />
          )}
          {!searchQuery && renderCategorySections()}
        </>
      );
    }
    return renderCategorySections();
  };

  return (
    <div data-storefront="true" dir="rtl" className="min-h-screen bg-gray-50">
      <CustomCodeInjector
        customCss={store?.custom_css}
        customJavascript={store?.custom_javascript}
      />

      <Header
        storeName={config.storeName}
        logo={config.logo}
        onSearch={handleSearch}
        cartCount={cartItems.length}
        onCartClick={handleCartClick}
        onLoginClick={() => setShowLoginModal(true)}
        isLoggedIn={isLoggedIn}
        userName={`${userProfile?.first_name} ${userProfile?.last_name}`}
        onProfileClick={() => setShowProfileModal(true)}
        onOrdersClick={() => setShowOrdersModal(true)}
        onLogoutClick={() => logout(store?.slug)}
        onMenuClick={() => setShowMobileSidebar(true)}
        onWishlistClick={() => setShowWishlistModal(true)}
        wishlistCount={wishlistCount}
      />

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-6 items-start">
        <div className="hidden md:block">
          <Sidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
            phone={config.phoneNumber}
            address={config.address}
            socialMedia={config.socialMedia}
          />
        </div>

        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileSidebar(false)} />
            <div className="absolute top-0 right-0 bottom-0 w-72 bg-gray-50 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-800">{t('القائمة')}</span>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1.5 rounded-full bg-white shadow cursor-pointer"
                  aria-label={t('إغلاق')}
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Sidebar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryClick={handleCategoryClick}
                phone={config.phoneNumber}
                address={config.address}
                socialMedia={config.socialMedia}
                onClose={() => setShowMobileSidebar(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <HeroSlider storeName={config.storeName} welcomeMessage={config.welcomeMessage} />
          <div className="space-y-8 mt-2">{renderSections()}</div>
        </main>
      </div>

      <Footer
        storeName={config.storeName}
        logo={config.logo}
        email={config.email}
        phone={config.phoneNumber}
        address={config.address}
        copyrightText={config.copyrightText}
        socialMedia={config.socialMedia}
      />

      {showCart && (
        <CartDrawer
          cartItems={cartItems}
          currency={config.currency}
          onClose={handleCloseCart}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onQuantityChange={setQuantity}
          onProductClick={handleProductClick}
          onCheckout={() => {
            setShowCart(false);
            if (isLoggedIn) {
              setShowCheckout(true);
            } else {
              setShowAuthModal(true);
            }
          }}
        />
      )}

      {showProductDetail && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          selectedImageIndex={selectedImageIndex}
          onClose={handleCloseProductDetail}
          onImageSelect={handleImageSelect}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          storePhone={config.phoneNumber}
          deliveryAreas={theme.copy.deliveryAreas}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            setShowLoginModal(true);
          }}
          onContinueAsGuest={() => {
            setShowAuthModal(false);
            setShowCheckout(true);
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            router.reload({
              only: ['isLoggedIn', 'customer', 'customer_address'],
              onSuccess: () => {
                if (cartItems.length > 0) {
                  syncGuestCart();
                } else {
                  setTimeout(() => {
                    loadCart();
                  }, 100);
                }
              }
            });
          }}
          storeSlug={store?.slug}
        />
      )}

      {showCheckout && (
        <Checkout
          cartItems={cartItems}
          currency={config.currency}
          onClose={() => setShowCheckout(false)}
          onOrderComplete={() => {
            setShowCheckout(false);
            setShowCart(false);
            handleCloseCart();
            toast.success(t('تم إتمام الطلب بنجاح!'));
          }}
          showOrderSuccess={showOrderSuccess}
          setShowOrderSuccess={setShowOrderSuccess}
          orderNumber={orderNumber}
          setOrderNumber={setOrderNumber}
          onUpdateCart={() => {}}
          userProfile={userProfile}
          isLoggedIn={isLoggedIn}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onQuantityChange={setQuantity}
          store={store}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          userProfile={userProfile}
          onUpdateProfile={() => {}}
          onUpdatePassword={() => {}}
          storeSlug={store?.slug}
        />
      )}

      {showOrdersModal && (
        <MyOrdersModal
          onClose={() => setShowOrdersModal(false)}
          orders={userOrders}
          currency={config.currency}
          loading={loadingOrders}
          onViewOrder={handleViewOrder}
        />
      )}

      {showOrderDetailsModal && selectedOrderId && (
        <OrderDetailsModal
          onClose={() => {
            setShowOrderDetailsModal(false);
            setSelectedOrderId(null);
          }}
          orderNumber={selectedOrderId}
          storeSlug={store?.slug}
        />
      )}

      {showResetPasswordModal && resetToken && (
        <ResetPasswordModal
          resetToken={resetToken}
          storeSlug={store?.slug}
          onClose={() => setShowResetPasswordModal(false)}
        />
      )}

      {showOrderSuccess && (
        <OrderSuccessModal
          orderNumber={orderNumber}
          storeSlug={store?.slug}
          onClose={() => setShowOrderSuccess(false)}
          onContinueShopping={() => {
            setShowOrderSuccess(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('payment_status');
            url.searchParams.delete('order_number');
            window.history.replaceState({}, '', url.pathname);
          }}
          store={store}
        />
      )}

      <WhatsAppWidget
        phone={config.whatsapp_widget_phone || ''}
        message={config.whatsapp_widget_message || theme.copy.whatsappMessage}
        position={config.whatsapp_widget_position || 'right'}
        showOnMobile={config.whatsapp_widget_show_on_mobile !== false}
        showOnDesktop={config.whatsapp_widget_show_on_desktop !== false}
        enabled={config.whatsapp_widget_enabled || false}
      />
    </div>
  );
};
