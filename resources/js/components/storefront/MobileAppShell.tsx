import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Home, LayoutGrid, Package, Search, ShoppingCart, Store, User, X } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getTemplateModule } from '@/templates-v2/registry';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useProduct } from '@/contexts/ProductContext';
import { useUI } from '@/contexts/UIContext';
import { useOrder } from '@/contexts/OrderContext';
import { useStorefrontLocale } from '@/contexts/StorefrontLocaleContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { getImageUrl } from '@/utils/image-helper';

type TabId = 'home' | 'categories' | 'cart' | 'orders' | 'account';

interface TabButtonProps {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  active: boolean;
  accent: string;
  badge?: number;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, active, accent, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="relative flex flex-1 flex-col items-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[11px] font-medium transition-colors"
    style={{ color: active ? accent : '#6B7280' }}
  >
    <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
    {typeof badge === 'number' && badge > 0 && (
      <span className="absolute top-1 start-1/2 ms-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    <span className="leading-none">{label}</span>
  </button>
);

export const MobileAppShell: React.FC = () => {
  const { config, behavior, store } = useStore() as any;
  const customerAccountsEnabled = behavior?.customer_accounts_enabled !== false;
  // V2 templates own their intentional mobile header; global header would duplicate search/wishlist/logo
  const isV2 = !!getTemplateModule(store?.theme);
  const loginEnabled = customerAccountsEnabled && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const { t } = useStorefrontLocale();

  const {
    isLoggedIn,
    showLoginModal,
    showProfileModal,
    showOrdersModal,
    showWishlistModal,
    showDownloadsModal,
    showLoyaltyModal,
    setShowLoginModal,
    setShowProfileModal,
    setShowOrdersModal,
    setShowWishlistModal,
  } = useAuth();

  const { cartItems } = useCart();
  const { categories, activeCategory, searchQuery, handleSearch, handleCategoryClick } = useProduct();
  const wishlist = useWishlist();
  const wishlistCount = wishlist?.count ?? 0;

  const {
    showCart,
    showCheckout,
    showAuthModal,
    showResetPasswordModal,
    handleCartClick,
    setShowSearch,
    showSearch,
  } = useUI();

  const { showOrderDetailsModal, showOrderSuccess } = useOrder();

  const [showCategoriesSheet, setShowCategoriesSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const accent = config.theme?.primaryColor || '#4F46E5';

  const anyOverlayOpen =
    showCart ||
    showCheckout ||
    showAuthModal ||
    showResetPasswordModal ||
    showLoginModal ||
    showProfileModal ||
    showOrdersModal ||
    showWishlistModal ||
    showDownloadsModal ||
    showLoyaltyModal ||
    showOrderDetailsModal ||
    showOrderSuccess ||
    showCategoriesSheet ||
    showSearch;

  const goHome = () => {
    setActiveTab('home');
    if (searchQuery) handleSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pickCategory = (categoryId: string) => {
    setShowCategoriesSheet(false);
    setActiveTab('home');
    if (searchQuery) handleSearch('');
    handleCategoryClick(categoryId);
  };

  const openAccount = (open: () => void) => {
    if (!customerAccountsEnabled) return;
    if (!loginEnabled && !isLoggedIn) return;
    if (isLoggedIn) {
      open();
    } else {
      if (!loginEnabled) return;
      setShowLoginModal(true);
    }
  };

  return (
    <>
      {/* App header — legacy global header; hidden for v2 templates which own intentional mobile header (prevents duplicated search/wishlist/logo) */}
      {!isV2 && (
      <header dir="rtl" data-app-shell="header" className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md shadow-sm md:hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Logo on right (RTL start) — single brand mark */}
          <div className="flex shrink-0 items-center gap-2">
            {config.logo ? (
              <img src={getImageUrl(config.logo)} alt={config.storeName} className="h-8 w-auto max-w-24 object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: accent }}>
                <Store className="h-4 w-4" />
              </span>
            )}
            <h1 className="hidden max-w-24 truncate text-[13px] font-bold text-gray-900 sm:block">{config.storeName}</h1>
          </div>
          {/* Search — unified server-backed: opens shared SearchOverlay (same contract as desktop) */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="h-9 w-full rounded-full border border-gray-200 bg-gray-50 ps-9 pe-3 text-start text-sm text-gray-900 hover:bg-white"
            >
              <span className={searchQuery ? 'text-gray-900' : 'text-gray-400'}>{searchQuery || t('ابحث عن المنتجات...')}</span>
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                aria-label={t('مسح البحث')}
                className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Wishlist — single instance on mobile (priority 5) */}
          <button
            type="button"
            onClick={() => setShowWishlistModal(true)}
            aria-label={t('المفضلة')}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <Heart className="h-5 w-5" strokeWidth={1.7} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </button>

        </div>
      </header>
      )}

      {/* Bottom tab bar — native app navigation */}
      <nav data-app-shell="tabs" className={`fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden ${anyOverlayOpen ? 'hidden' : ''}`}>
        <div className="flex items-stretch">
          <TabButton
            id="home"
            label={t('الرئيسية')}
            icon={Home}
            active={activeTab === 'home'}
            accent={accent}
            onClick={goHome}
          />
          <TabButton
            id="categories"
            label={t('الأقسام')}
            icon={LayoutGrid}
            active={activeTab === 'categories'}
            accent={accent}
            onClick={() => {
              setActiveTab('categories');
              setShowCategoriesSheet(true);
            }}
          />
          <TabButton
            id="cart"
            label={t('السلة')}
            icon={ShoppingCart}
            active={activeTab === 'cart'}
            accent={accent}
            badge={cartItems.length}
            onClick={handleCartClick}
          />
          {(customerAccountsEnabled && (isLoggedIn || loginEnabled)) && (
          <TabButton
            id="orders"
            label={t('طلباتي')}
            icon={Package}
            active={activeTab === 'orders'}
            accent={accent}
            onClick={() => openAccount(() => setShowOrdersModal(true))}
          />
          )}
          {(customerAccountsEnabled && (isLoggedIn || loginEnabled)) && (
          <TabButton
            id="account"
            label={t('حسابي')}
            icon={User}
            active={activeTab === 'account'}
            accent={accent}
            onClick={() => {
              if (isLoggedIn) {
                window.location.href = '/account';
              } else {
                if (!loginEnabled) return;
                setShowLoginModal(true);
              }
            }}
          />
          )}
        </div>
      </nav>

      {/* Categories bottom sheet */}
      {showCategoriesSheet && (
        <div data-app-shell="sheet" className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoriesSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{t('الأقسام')}</h2>
              <button
                type="button"
                onClick={() => setShowCategoriesSheet(false)}
                aria-label={t('إغلاق')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-category-id={category.id}
                    onClick={() => pickCategory(category.id)}
                    className={`rounded-xl border p-3 text-start text-sm font-medium transition-colors ${
                      isActive ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: accent } : undefined}
                  >
                    <span className="line-clamp-2 leading-snug">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
