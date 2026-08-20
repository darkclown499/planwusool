import type { ThemeProduct } from '../../types';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { Minus, Plus } from 'lucide-react';
import React from 'react';

export interface MarketFastProductCardProps {
  product: ThemeProduct;
  /** Quantity of this product already in the cart (drives the +/− stepper). */
  cartQuantity: number;
  accent?: string;
  onAdd: () => void;
  onDecrement: () => void;
  onProductClick: (product: ThemeProduct) => void;
}

/**
 * Dense grocery card for the market-fast grid.
 *
 * - Image with a red discount badge top-right when a sale price is active.
 * - Two-line title and a price row (current + struck-through original).
 * - Quantity control: full-width "أضف" button at qty 0 → interactive [−] n [+] stepper
 *   once the item is in the cart. All state flows through the shared cart context.
 */
export const MarketFastProductCard = ({
  product,
  cartQuantity,
  accent = '#059669',
  onAdd,
  onDecrement,
  onProductClick,
}: MarketFastProductCardProps) => {
  const outOfStock = product.availability === 'out_of_stock' || product.stockQuantity <= 0;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-shadow hover:shadow-md">
      {/* Image */}
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100"
        aria-label={product.name}
      >
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {discount !== null && discount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            -{discount}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">نفدت الكمية</span>
          </span>
        )}
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-2">
        <button type="button" onClick={() => onProductClick(product)} className="text-left">
          <h3 className="line-clamp-2 min-h-8 text-xs font-bold text-slate-800">{product.name}</h3>
        </button>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-base font-extrabold text-slate-900">{formatStoreCurrency(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[11px] font-medium text-slate-400 line-through">{formatStoreCurrency(product.originalPrice)}</span>
          )}
        </div>

        {/* Qty control transforms from "أضف" → stepper once cartQuantity > 0 */}
        <div className="mt-2">
          {outOfStock ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-400"
            >
              نفدت الكمية
            </button>
          ) : cartQuantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-[0.985]"
            >
              أضف
            </button>
          ) : (
            <div className="flex w-full items-center justify-between rounded-xl bg-emerald-50 px-1.5 py-1">
              <button
                type="button"
                onClick={onDecrement}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm transition hover:text-red-500 active:scale-90"
                aria-label="تقليل الكمية"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              {/* key change re-triggers the pop animation on each increment */}
              <span key={cartQuantity} className="mf-pop min-w-7 text-center text-sm font-extrabold text-slate-900">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition active:scale-90"
                style={{ backgroundColor: accent }}
                aria-label="زيادة الكمية"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketFastProductCard;