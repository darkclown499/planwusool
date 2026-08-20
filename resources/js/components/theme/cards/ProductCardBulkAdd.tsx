import { getImageUrl } from '@/utils/image-helper';
import { Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ThemeCardProps } from '../types';
import { QuantityStepper } from '../widgets/QuantityStepper';

/**
 * Bulk-add card for fast grocery checkout (market-fast).
 * The whole card is a large tappable target; a persistent + button and a
 * quantity stepper sit below the price so shoppers can stack multiples without
 * opening the product modal.
 */
export const ProductCardBulkAdd: React.FC<ThemeCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onWhatsAppOrder,
  showWhatsApp,
  showUrgencyBadge,
  showQuickVariantPicker,
  accentColor = '#16a34a',
  className = '',
}) => {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.availability === 'out_of_stock' || product.stockQuantity <= 0;

  const selection = useMemo(() => ({ quantity, variants: undefined as Record<string, string> | undefined }), [quantity]);

  const add = (qty: number) => {
    onAddToCart({ ...product, quantity: qty, selectedVariants: selection.variants });
  };

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className="relative block aspect-square w-full overflow-hidden bg-gray-100"
        aria-label={product.name}
      >
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {showUrgencyBadge && product.stockQuantity > 0 && (
          <span className="absolute right-2 top-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                product.stockQuantity <= 5 ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            >
              {product.stockQuantity <= 5 ? 'كمية محدودة' : 'متبقي'}
            </span>
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-bold text-white">
              نفدت الكمية
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <button type="button" onClick={() => onProductClick(product)} className="text-left">
          <h3 className="line-clamp-2 min-h-9 text-sm font-semibold leading-snug text-gray-800">
            {product.name}
          </h3>
        </button>

        {showQuickVariantPicker && product.variants && product.variants.length > 0 && (
          <QuantityStepper
            quantity={quantity}
            stock={product.stockQuantity}
            onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrease={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
            size="sm"
          />
        )}

        <div className="mt-auto flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            {product.originalPrice && (
              <span className="block text-[11px] text-gray-400 line-through">
                {product.originalPrice}
              </span>
            )}
            <span className="block text-sm font-extrabold text-gray-900">
              {product.price}
            </span>
          </div>
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => add(quantity)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
            aria-label={`أضف ${product.name} إلى السلة`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showWhatsApp && onWhatsAppOrder && !outOfStock && (
          <button
            type="button"
            onClick={() => onWhatsAppOrder({ ...product, quantity, selectedVariants: selection.variants })}
            className="rounded-lg bg-[#25D366]/10 py-1.5 text-[11px] font-bold text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
          >
            اطلب عبر واتساب
          </button>
        )}
      </div>
    </div>
  );
};