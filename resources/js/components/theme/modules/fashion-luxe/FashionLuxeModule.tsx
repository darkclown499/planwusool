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
 * fashion-luxe — Fashion / Apparel niche.
 *
 * Full-bleed hero with a looping background video, a slide-over side drawer
 * cart (with inline size/colour variant chips) and a free-delivery threshold
 * progress bar. The drawer and cards still drive the shared cart / checkout.
 */
export const FashionLuxeModule: React.FC = () => {
  const { config, banners, enableBanner } = useThemeEngine();
  const core = useCoreCommerce(config);
  const { config: storeConfig } = useStore();
  const product = useProduct();
  const ui = useUI();
  const auth = useAuth();
  const cart = useCart();

  const { categories, activeCategory, handleSearch, handleCategoryClick, groupProductsByCategory } = product;

  return (
    <div data-storefront="true" dir="rtl" className="flex min-h-screen flex-col bg-white">
      <ModuleAnnouncement text={config.content.announcementText} accent={config.styling.primaryColor} dark={config.styling.colorMode === 'dark'} />

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

      {/* Full-bleed hero: background video when config.content.heroMedia is set. */}
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

export default FashionLuxeModule;