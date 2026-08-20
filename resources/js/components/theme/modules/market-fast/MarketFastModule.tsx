import { useAuth } from '@/contexts/AuthContext';
import { useProduct } from '@/contexts/ProductContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import React from 'react';
import { useCoreCommerce } from '@/components/theme/useCoreCommerce';
import { useThemeEngine } from '@/components/theme/ThemeEngineContext';
import { ModuleFooter } from '../ModuleChrome';
import { MarketFastHeader } from './Header';
import { MarketFastHeroOffers } from './HeroOffers';
import { MarketFastProductGrid } from './ProductGrid';
import { MarketFastStickyCartBar } from './StickyCartBar';

/**
 * market-fast — Grocery / Supermarket niche (v2 UI).
 *
 * Compact navbar + sticky category rail, a slim promo slider, a dense bulk-add
 * grid whose cards morph into +/− steppers once an item enters the cart, and a
 * floating sticky bottom bar for one-tap express checkout. Every interaction is
 * routed through the shared core commerce hooks (cart + checkout + WhatsApp).
 *
 * The module provides its own cart bar (layout.customCartSlot) so the engine
 * skips the generic DynamicCart overlay to avoid rendering two bars.
 */
const MARKET_FAST_CSS = `
  .mf-bar-in { animation: mfBarIn 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
  @keyframes mfBarIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) { .mf-bar-in { animation: none; } }
  .mf-pop { animation: mfPop 0.22s ease; }
  @keyframes mfPop {
    0% { transform: scale(0.6); }
    70% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
`;

export const MarketFastModule: React.FC = () => {
  const { config, banners, enableBanner } = useThemeEngine();
  const core = useCoreCommerce(config);
  const { config: storeConfig } = useStore();
  const product = useProduct();
  const ui = useUI();
  const auth = useAuth();

  const { categories, activeCategory, handleSearch, handleCategoryClick, groupProductsByCategory } = product;

  const deliveryZone = storeConfig.city
    ? `التوصيل إلى ${storeConfig.city}`
    : storeConfig.state
      ? `التوصيل إلى ${storeConfig.state}`
      : 'توصيل سريع لجميع المناطق';

  const openCheckout = () => {
    ui.setShowCart(false);
    if (auth.isLoggedIn) {
      ui.setShowCheckout(true);
    } else {
      // Guests land on the auth gate which offers a "continue as guest" path
      // straight into the shared checkout flow (same as every other theme).
      ui.setShowAuthModal(true);
    }
  };

  const handleCartClick = () => {
    if (core.cart.cartItems.length > 0) {
      openCheckout();
    } else {
      document.getElementById('theme-products')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div data-storefront="true" dir="rtl" className="flex min-h-screen flex-col bg-[#f8fafc]">
      <style>{MARKET_FAST_CSS}</style>

      <MarketFastHeader
        config={config}
        storeName={storeConfig.storeName}
        logo={storeConfig.logo}
        deliveryZone={deliveryZone}
        onSearch={handleSearch}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        cartCount={core.cart.cartItems.length}
        isLoggedIn={auth.isLoggedIn}
        userName={`${auth.userProfile?.first_name ?? ''} ${auth.userProfile?.last_name ?? ''}`.trim()}
        onLoginClick={() => auth.setShowLoginModal(true)}
        onProfileClick={() => auth.setShowProfileModal(true)}
        onOrdersClick={() => auth.setShowOrdersModal(true)}
        onLogoutClick={() => auth.logout(core.store.slug)}
        onCartClick={handleCartClick}
      />

      <MarketFastHeroOffers config={config} banners={enableBanner ? banners : []} />

      <main className="flex-1 pb-24">
        <MarketFastProductGrid
          config={config}
          core={core}
          sections={Object.entries(groupProductsByCategory()).map(([id, items]) => ({
            id,
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

      <MarketFastStickyCartBar config={config} core={core} onCheckout={openCheckout} />

      {/*
        The storefront overlay host (ThemeEngineStorefront) still renders the
        auth gate, checkout modal, product detail, orders and profile — the shared
        cart extras live in this module.
      */}
    </div>
  );
};

export default MarketFastModule;