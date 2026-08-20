import type { ThemeConfig } from '@/config/theme.schema';
import { useProduct } from '@/contexts/ProductContext';
import { useTranslation } from 'react-i18next';
import React, { useMemo } from 'react';
import type { AddToCartPayload, CoreCommerce, ThemeProduct } from '../../types';
import { MarketFastProductCard } from './ProductCardBulk';

interface MarketFastProductGridProps {
  config: ThemeConfig;
  core: CoreCommerce;
  /** Optional pre-grouped sections; defaults to category grouping from context. */
  sections?: { id: string; title: string; products: ThemeProduct[] }[];
}

/** Dense grid — 2 columns on phones, 4 on desktop as requested for quick batching. */
const GRID_CLASS = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export const MarketFastProductGrid: React.FC<MarketFastProductGridProps> = ({ config, core, sections }) => {
  const { t } = useTranslation();
  const product = useProduct();
  const { cart } = core;

  const visibleSections = useMemo(() => {
    if (product.searchQuery) return null;
    if (sections && sections.length > 0) return sections;
    const grouped = product.groupProductsByCategory();
    return Object.entries(grouped)
      .map(([id, items]) => ({ id, title: product.categories.find((c) => c.id === id)?.name || id, products: items }))
      .filter((section) => section.products.length > 0);
  }, [sections, product]);

  const renderCard = (item: ThemeProduct) => {
    const cartIdx = cart.cartItems.findIndex((i) => i.id === item.id);
    const cartQuantity = cartIdx >= 0 ? cart.cartItems[cartIdx].quantity : 0;

    const add = () => {
      if (cartIdx >= 0) {
        // Item already in the cart -> bump the same line (keeps the stepper accurate)
        void cart.updateQuantity(cartIdx, 1);
      } else {
        const payload: AddToCartPayload = { ...item, quantity: 1 };
        void cart.addToCart(payload);
      }
    };

    const decrement = () => {
      if (cartIdx < 0) return;
      if (cartQuantity > 1) void cart.updateQuantity(cartIdx, -1);
      else void cart.removeFromCart(cartIdx);
    };

    return (
      <MarketFastProductCard
        key={item.id}
        product={item}
        cartQuantity={cartQuantity}
        accent={config.styling.primaryColor}
        onAdd={add}
        onDecrement={decrement}
        onProductClick={product.handleProductClick}
      />
    );
  };

  // Search mode: flat result grid so shoppers see matches fast.
  if (product.searchQuery) {
    return (
      <section id="theme-products" className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
        <h2 className="mb-3 text-base font-extrabold text-slate-900">
          {t('نتائج البحث')} <span className="text-sm font-normal text-slate-400">({product.filteredProducts.length})</span>
        </h2>
        <div className={GRID_CLASS}>{product.filteredProducts.map(renderCard)}</div>
      </section>
    );
  }

  return (
    <div id="theme-products" className="mx-auto max-w-7xl space-y-7 px-3 py-4 sm:px-4">
      {(visibleSections ?? []).map((section) => (
        <section key={section.id || section.title} id={`category-${section.id}`} className="scroll-mt-24">
          <h2 className="mb-3 text-base font-extrabold text-slate-900">{section.title}</h2>
          <div className={GRID_CLASS}>{section.products.map(renderCard)}</div>
        </section>
      ))}
    </div>
  );
};

export default MarketFastProductGrid;