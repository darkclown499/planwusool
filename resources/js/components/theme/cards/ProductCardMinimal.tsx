import { getImageUrl } from '@/utils/image-helper';
import { Plus } from 'lucide-react';
import React from 'react';
import { ThemeCardProps } from '../types';

/** Cleanest possible card: image, name, price, one add-to-cart button. */
export const ProductCardMinimal: React.FC<ThemeCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onWhatsAppOrder,
  showWhatsApp,
  showUrgencyBadge,
  accentColor = '#10b981',
  className = '',
}) => {
  const outOfStock = product.availability === 'out_of_stock' || product.stockQuantity <= 0;

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
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
        {showUrgencyBadge && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
            باقي {product.stockQuantity} فقط
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">نفدت الكمية</span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button type="button" onClick={() => onProductClick(product)} className="text-left">
          <h3 className="line-clamp-2 min-h-9 text-sm font-medium leading-snug text-gray-800">{product.name}</h3>
        </button>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">{product.originalPrice}</span>
            )}
            <p className="text-base font-extrabold text-gray-900">{product.price}</p>
          </div>
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => onAddToCart({ ...product, quantity: 1 })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
            aria-label={`أضف ${product.name} إلى السلة`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {showWhatsApp && onWhatsAppOrder && !outOfStock && (
          <button
            type="button"
            onClick={() => onWhatsAppOrder({ ...product, quantity: 1 })}
            className="mt-1 rounded-md bg-[#25D366]/10 py-1.5 text-[11px] font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
          >
            اطلب عبر واتساب
          </button>
        )}
      </div>
    </div>
  );
};