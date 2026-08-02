import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
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
  Footer
} from './components';

// Import shared components from gadgets theme for now
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { Checkout } from './components/Checkout';
import { AuthModal } from './components/AuthModal';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { MyOrdersModal } from './components/MyOrdersModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';

interface BeautyStoreProps {
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

const BeautyStoreContent: React.FC = () => {
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
    logout 
  } = useAuth();
  
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
    <div data-storefront="true" dir="rtl" className="min-h-screen bg-white">
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
      
      <div className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          {categories.map((category) => (
            <div key={category.id} id={`category-${category.id}`} className="mb-12 md:mb-16">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-serif font-light text-gray-900 text-center mb-2">
                  {category.name}
                </h2>
                <div className="w-20 h-0.5 bg-fuchsia-400 mx-auto"></div>
              </div>
              <ProductGrid
                products={searchQuery ? filteredProducts.filter(p => p.categoryId === category.id) : groupedProducts[category.id] || []}
                currency={config.currency}
                onAddToCart={addToCart}
                onProductClick={handleProductClick}
                categoryName={category.name}
              />
            </div>
          ))}
        </div>
      </div>
      
      <Footer 
        storeName={config.storeName}
        logo={config.logo}
        email={config.email}
        copyrightText={config.copyrightText}
        socialMedia={config.socialMedia}
      />
      
      {/* Modals and Overlays - Reusing from gadgets theme */}
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
                // Load user's cart data after login
                if (cartItems.length > 0) {
                  syncGuestCart();
                } else {
                  // Load existing user cart if no guest items
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
      
      {showOrderSuccess && (
        <OrderSuccessModal
          orderNumber={orderNumber}
          storeSlug={store?.slug}
          onClose={() => setShowOrderSuccess(false)}
          onContinueShopping={() => {
            setShowOrderSuccess(false);
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

export const BeautyStore: React.FC<BeautyStoreProps> = (props) => {
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
        <BeautyStoreContent />
      </ThemeProvider>
    </PWAProvider>
  );
};