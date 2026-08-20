import { useProduct } from '@/contexts/ProductContext';
import { useTranslation } from 'react-i18next';
import React, { useMemo } from 'react';
import type { ThemeProductCardStyle, ThemeConfig } from '@/config/theme.schema';
import { AddToCartPayload, CoreCommerce, ThemeProduct } from '../types';
import { ProductCardBulkAdd } from '../cards/ProductCardBulkAdd';
import { ProductCardMinimal } from '../cards/ProductCardMinimal';
import { ProductCardDetailedSpec } from '../cards/ProductCardDetailedSpec';
import { ProductCardWeightCalculator } from '../cards/ProductCardWeightCalculator';

interface DynamicProductGridProps {
  cardStyle: ThemeProductCardStyle;
  config: ThemeConfig;
  core: CoreCommerce;
  /** Rendered sections; defaults to category-grouped products from the product context. */
  sections?: { title: string; subtitle?: string; products: ThemeProduct[] }[];
}

/** Map a card style to its component so the grid slot stays a pure switch. */
const CARD_COMPONENTS = {
  bulk_add: ProductCardBulkAdd,
  minimal: ProductCardMinimal,
  detailed_spec: ProductCardDetailedSpec,
  weight_calculator: ProductCardWeightCalculator,
} as const;

export const DynamicProductGrid: React.FC<DynamicProductGridProps> = ({
  cardStyle,
  config,
  core,
  sections,
}) => {
  const { t } = useTranslation();
  const product = useProduct();
  const { cart } = core;

  const CardComponent = CARD_COMPONENTS[cardStyle] ?? ProductCardMinimal;

  const addToCart = (payload: AddToCartPayload) => {
    void cart.addToCart({
      ...payload,
      quantity: payload.quantity ?? 1,
      selectedVariants: payload.selectedVariants ?? undefined,
    });
  };

  const whatsapp = (payload: AddToCartPayload) =>
    core.triggerWhatsAppOrder([{ ...payload, quantity: payload.quantity ?? 1 }]);

  const shareCardProps = {
    onProductClick: product.handleProductClick,
    onAddToCart: addToCart,
    onWhatsAppOrder: config.commerce.enableWhatsAppOrdering ? whatsapp : undefined,
    showWhatsApp: config.commerce.enableWhatsAppOrdering,
    showUrgencyBadge: config.features.enableUrgencyBadges,
    showQuickVariantPicker: config.features.enableQuickVariantPicker,
    accentColor: config.styling.primaryColor,
    swatchStyle: config.layout.swatchStyle,
    currency: core.store.currency,
  };

  const gridClass = `grid gap-3 sm:gap-4 ${
    config.layout.gridColumns === 2
      ? 'grid-cols-2'
      : config.layout.gridColumns === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : config.layout.gridColumns >= 5
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
  }`;

  const renderCard = (item: ThemeProduct) => (
    <CardComponent key={item.id} product={item} {...shareCardProps} />
  );

  const visibleSections: { title: string; subtitle?: string; products: ThemeProduct[] }[] | null = useMemo(() => {
    if (product.searchQuery) return null;
    if (sections && sections.length > 0) return sections;

    const grouped = product.groupProductsByCategory();
    return Object.entries(grouped)
      .map(([id, products]) => ({
        title: product.categories.find((c) => c.id === id)?.name || id,
        products,
      }))
      .filter((section) => section.products.length > 0);
  }, [sections, product]);

  // Search mode: flat results grid (no category sections).
  if (product.searchQuery) {
    return (
      <section id="theme-products" className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          {t('نتائج البحث')}{' '}
          <span className="text-sm font-normal text-gray-500">({product.filteredProducts.length})</span>
        </h2>
        <div className={gridClass}>{product.filteredProducts.map(renderCard)}</div>
      </section>
    );
  }

  return (
    <div id="theme-products" className="mx-auto max-w-7xl space-y-10 px-4 py-6">
      {(visibleSections ?? []).map((section) => (
        <section key={section.title || 'products'} id={`category-${section.products[0]?.categoryId ?? section.title}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">{section.title || t('المنتجات')}</h2>
            {section.subtitle && <span className="text-xs text-gray-500">{section.subtitle}</span>}
          </div>
          <div className={gridClass}>{section.products.map(renderCard)}</div>
        </section>
      ))}
    </div>
  );
};