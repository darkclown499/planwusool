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
 * market-fast — Supermarket / Grocery niche.
 *
 * Compact hero + sticky category bar, inline +/- quantity cards (bulk_add) and
 * a floating sticky bottom bar with the running total + quick checkout. All
 * commerce behaviour comes from `useCoreCommerce`, never re-implemented here.
 */
export const MarketFastModule: React.FC = () => {
  const { config } = useThemeEngine();
  const core = useCoreCommerce(config);
  const { config: storeConfig } = useStore();
  const product = useProduct();
  const ui = useUI();
  const auth = useAuth();
  const cart = useCart();

  const { categories, activeCategory, handleSearch, handleCategoryClick, groupProductsByCategory } = product;

  const stickyCategoryBar = config.layout.stickyCategoryBar;

  return (
    <div data-storefront="true" dir="rtl" className="flex min-h-screen flex-col bg-gray-50">
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
      />

      {/* Sticky category bar for fast basket hopping across grocery aisles. */}
      {stickyCategoryBar && categories.length > 0 && (
        <nav className="sticky top-16 z-30 border-b border-gray-100 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 text-xs font-semibold [scrollbar-width:none]">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 transition-colors ${
                  activeCategory === category.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === category.id ? { backgroundColor: config.styling.primaryColor } : undefined}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1 pb-28">
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

export default MarketFastModule;