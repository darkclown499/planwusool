import { getImageUrl } from '@/utils/image-helper';
import { ShoppingBag, Ruler } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ThemeCardProps } from '../types';
import { QuickVariantPicker } from '../widgets/QuickVariantPicker';

/**
 * Spec-heavy card for fashion/tech/electronics: shows size/colour variants on
 * the card itself plus the most relevant custom spec fields inline.
 */
export const ProductCardDetailedSpec: React.FC<ThemeCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onWhatsAppOrder,
  showWhatsApp,
  showQuickVariantPicker,
  swatchStyle = 'square',
  accentColor = '#e11d48',
  className = '',
}) => {
  const outOfStock = product.availability === 'out_of_stock' || product.stockQuantity <= 0;
  const [selection, setSelection] = useState<Record<string, string>>({});

  const specs = useMemo(() => (product.customFields || []).slice(0, 3), [product.customFields]);

  const add = () => {
    onAddToCart({
      ...product,
      quantity: 1,
      selectedVariants: selection,
    });
  };

  return (
    <div className={`group flex flex-col overflow-hidden rounded-sm bg-white shadow-sm transition-shadow hover:shadow-lg ${className}`}>
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className="relative block aspect-[3/4] w-full overflow-hidden bg-gray-50"
        aria-label={product.name}
      >
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-sm bg-gray-900 px-3 py-1 text-xs font-bold text-white">نفدت الكمية</span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onProductClick(product)} className="text-left">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>
        </button>

        {specs.length > 0 && (
          <ul className="space-y-0.5 border-t border-gray-100 pt-2">
            {specs.map((spec) => (
              <li key={spec.name} className="flex items-center gap-1 text-[11px] text-gray-500">
                <Ruler className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="font-medium">{spec.name}:</span> {spec.value}
              </li>
            ))}
          </ul>
        )}

        {showQuickVariantPicker && product.variants && product.variants.length > 0 && (
          <QuickVariantPicker
            variants={product.variants}
            swatchStyle={swatchStyle}
            accentColor={accentColor}
            onChange={setSelection}
          />
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="min-w-0">
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">{product.originalPrice}</span>
            )}
            <p className="text-base font-extrabold text-gray-900">{product.price}</p>
          </div>
          <button
            type="button"
            disabled={outOfStock}
            onClick={add}
            className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <ShoppingBag className="h-4 w-4" />
            أضف
          </button>
        </div>

        {showWhatsApp && onWhatsAppOrder && !outOfStock && (
          <button
            type="button"
            onClick={() =>
              onWhatsAppOrder({ ...product, quantity: 1, selectedVariants: selection })
            }
            className="rounded-sm bg-[#25D366]/10 py-1.5 text-[11px] font-bold text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
          >
            اطلب عبر واتساب
          </button>
        )}
      </div>
    </div>
  );
};