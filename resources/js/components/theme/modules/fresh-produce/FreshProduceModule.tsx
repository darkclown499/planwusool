import { useAuth } from '@/contexts/AuthContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import { useCart } from '@/contexts/CartContext';
import React from 'react';
import { useCoreCommerce } from '@/components/theme/useCoreCommerce';
import { useThemeEngine } from '@/components/theme/ThemeEngineContext';
import { DynamicHero } from '@/components/theme/slots/DynamicHero';
import { DynamicProductGrid } from '@/components/theme/slots/DynamicProductGrid';
import { ModuleAnnouncement, ModuleFooter, ModuleHeader } from '../ModuleChrome';

/**
 * fresh-produce — Produce / Butcher niche.
 *
 * Banner-slider hero, weight-calculator product cards (grams / kg / lb / pieces,
 * price derived live from the per-kilo rate) and an express checkout modal with
 * a delivery-slot selector and HotSMS phone verification before the order goes
 * out (a WhatsApp order or a normal order).
 */
export const FreshProduceModule: React.FC = () => {
  const { config, banners, enableBanner } = useThemeEngine();
  const core = useCoreCommerce(config);
  const { config: storeConfig } = useStore();
  const product = useProduct();
  const ui = useUI();
  const auth = useAuth();
  const cart = useCart();

  const { categories, activeCategory, handleSearch, handleCategoryClick, groupProductsByCategory } = product;

  return (
    <div data-storefront="true" dir="rtl" className="flex min-h-screen flex-col bg-lime-50/40">
      <ModuleAnnouncement text={config.content.announcementText} accent={config.styling.primaryColor} />

      <ModuleHeader
        config={config}
        storeName={storeConfig.storeName}
        logo={storeConfig.logo}
        cartCount={cart.cartItems.length}
        cartType={config.layout.cartType}
        onCartClick={ui.handleCartClick}
        onSearch={handleSearch}
        isLoggedIn={auth.isLoggedIn}
        userName={`${auth.userProfile?.first_name ?? ''} ${auth.userProfile?.last_name ?? ''}`}
        onLoginClick={() => auth.setShowLoginModal(true)}
        onProfileClick={() => auth.setShowProfileModal(true)}
        onOrdersClick={() => auth.setShowOrdersModal(true)}
        onLogoutClick={() => auth.logout(core.store.slug)}
      />

      <DynamicHero
        type={config.layout.heroType}
        config={config}
        storeName={storeConfig.storeName}
        welcomeMessage={storeConfig.welcomeMessage}
        description={storeConfig.description}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        onSearch={handleSearch}
        banners={enableBanner ? banners : []}
      />

      {config.layout.stickyCategoryBar && categories.length > 0 && (
        <nav className="sticky top-16 z-30 border-b border-lime-100 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 text-xs font-semibold [scrollbar-width:none]">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 transition-colors ${
                  activeCategory === category.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === category.id ? { backgroundColor: config.styling.primaryColor } : undefined}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1 pb-10">
        <DynamicProductGrid
          cardStyle={config.layout.productCardStyle}
          config={config}
          core={core}
          sections={Object.entries(groupProductsByCategory()).map(([id, items]) => ({
            title: categories.find((c) => c.id === id)?.name || id,
            products: items,
          }))}
        />
      </main>

      <ModuleFooter
        storeName={storeConfig.storeName}
        logo={storeConfig.logo}
        phone={storeConfig.phoneNumber}
        email={storeConfig.email}
        address={storeConfig.address}
        socialMedia={storeConfig.socialMedia}
        copyrightText={storeConfig.copyrightText}
        accent={config.styling.primaryColor}
      />
    </div>
  );
};

export default FreshProduceModule;