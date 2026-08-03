import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { useProduct } from '../../contexts/ProductContext';
import { useOrder } from '../../contexts/OrderContext';
import { useUI } from '../../contexts/UIContext';
import PWAProvider from '@/components/pwa/PWAProvider';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import {
  Header,
  HeroSection,
  CategoryTabs,
  ProductGrid,
  Footer,
  CartDrawer,
  ProductDetailModal,
  Checkout,
  AuthModal,
  LoginModal,
  ProfileModal,
  ResetPasswordModal,
  MyOrdersModal,
  OrderDetailsModal,
  OrderSuccessModal
} from './components';


interface ToyStoreProps {
  config: any;
  categories: any[];
  products: any[];
  store?: any;
  isLoggedIn?: boolean;
  customer?: any;
  customer_address?: any[];
  showResetModal?: boolean;
  resetToken?: string;
  payment_status?: string;
  order_number?: string;
  action?: string | null;
}

const ToyStoreContent: React.FC = () => {
  const { config, store } = useStore();
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

  const { count: wishlistCount } = useWishlist();
  
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

  // Handle payment status from props and URL
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

  // Load orders when orders modal is opened
  useEffect(() => {
    if (showOrdersModal && isLoggedIn) {
      loadUserOrders();
    }
  }, [showOrdersModal, isLoggedIn]);

  // Sync cart when user logs in
  useEffect(() => {
    if (isLoggedIn && cartItems.length > 0) {
      syncGuestCart();
    }
  }, [isLoggedIn]);

  const groupedProducts = groupProductsByCategory();

  return (
    <div data-storefront="true" dir="rtl" className="min-h-screen bg-blue-50">
      {/* Inject custom CSS and JavaScript */}
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
        onWishlistClick={() => setShowWishlistModal(true)}
        wishlistCount={wishlistCount}
      />
      
      <HeroSection 
        storeName={config.storeName}
        description={config.description}
        welcomeMessage={config.welcomeMessage}
        address={config.address}
        city={config.city}
        state={config.state}
        country={config.country}
        postalCode={config.postalCode}
      />
      
      <CategoryTabs 
        categories={categories} 
        onCategoryClick={handleCategoryClick} 
        activeCategory={activeCategory} 
      />
      
      <div className="pb-24 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categories.map((category) => (
            <div key={category.id} id={`category-${category.id}`} className="mb-8 md:mb-16">
              <div className="sticky top-32 bg-blue-50 px-2 py-3 sm:px-4 sm:py-4 md:static md:bg-blue-50 md:px-0 md:py-6">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-12 sm:w-16 md:w-20 lg:w-24 h-0.5 sm:h-1 bg-purple-400 rounded-full mx-1 sm:mx-2"></div>
                  </div>
                  <h2 className="px-2 sm:px-3 md:px-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-700 text-center">
                    {category.name}
                  </h2>
                  <div className="flex items-center">
                    <div className="w-12 sm:w-16 md:w-20 lg:w-24 h-0.5 sm:h-1 bg-purple-400 rounded-full mx-1 sm:mx-2"></div>
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                  </div>
                </div>
              </div>
              <ProductGrid
                products={searchQuery ? filteredProducts.filter(p => p.categoryId === category.id) : groupedProducts[category.id] || []}
                currency={config.currency}
                onAddToCart={addToCart}
                onProductClick={handleProductClick}
              />
            </div>
          ))}
        </div>
      </div>
      
      <Footer 
        storeName={config.storeName}
        email={config.email}
        copyrightText={config.copyrightText}
        socialMedia={config.socialMedia}
      />
      
      {/* Modals and Overlays */}
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
        <ProductDetailModal
          product={selectedProduct}
          currency={config.currency}
          selectedImageIndex={selectedImageIndex}
          onClose={handleCloseProductDetail}
          onImageSelect={handleImageSelect}
          onAddToCart={addToCart}
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
            toast.success('تم إتمام الطلب بنجاح!');
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
      
      {showOrderSuccess && orderNumber && (
        <OrderSuccessModal
          orderNumber={orderNumber}
          storeSlug={store?.slug}
          onClose={() => {
            setShowOrderSuccess(false);
            setOrderNumber('');
          }}
          onContinueShopping={() => {
            setShowOrderSuccess(false);
            setOrderNumber('');
            // Clean URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('payment_status');
            url.searchParams.delete('order_number');
            window.history.replaceState({}, '', url.pathname);
          }}
                  store={store}
        />
      )}
      
      {/* WhatsApp Widget */}
      <WhatsAppWidget
        phone={config.whatsapp_widget_phone || ''}
        message={config.whatsapp_widget_message || 'مرحباً! أحتاج مساعدة في...'}
        position={config.whatsapp_widget_position || 'right'}
        showOnMobile={config.whatsapp_widget_show_on_mobile !== false}
        showOnDesktop={config.whatsapp_widget_show_on_desktop !== false}
        enabled={config.whatsapp_widget_enabled || false}
      />
    </div>
  );
};

export const ToyStore: React.FC<ToyStoreProps> = (props) => {
  return (
    <PWAProvider store={props.store}>
      <ThemeProvider 
        config={props.config}
        store={props.store}
        categories={props.categories}
        products={props.products}
        isLoggedIn={props.isLoggedIn}
        customer={props.customer}
        customerAddress={props.customer_address}
        showResetModal={props.showResetModal}
        resetToken={props.resetToken}
        paymentStatus={props.payment_status}
        orderNumber={props.order_number}
        action={props.action}
      >
        <ToyStoreContent />
      </ThemeProvider>
    </PWAProvider>
  );
};