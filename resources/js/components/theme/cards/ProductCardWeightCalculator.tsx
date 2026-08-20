import { getImageUrl } from '@/utils/image-helper';
import { Scale } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { WEIGHT_UNITS, convertWeight, formatWeight, priceForWeight } from '@/utils/weight';
import { ThemeCardProps } from '../types';
import { QuantityStepper } from '../widgets/QuantityStepper';

/**
 * Price-on-demand card for fresh produce. The base price is per kilogram; the
 * shopper picks a unit (grams / kg / lb / oz / pieces) and a quantity, and the
 * line price is recomputed live before it ever reaches the shared cart.
 *
 * The converted amount is attached to the cart item as a variant ("1.5 kg") so
 * the drawer, sticky bar and WhatsApp message all show the agreed weight, while
 * the numeric quantity stays 1 for the integer-backed cart API.
 */
export const ProductCardWeightCalculator: React.FC<ThemeCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onWhatsAppOrder,
  showWhatsApp,
  showUrgencyBadge,
  accentColor = '#65a30d',
  className = '',
}) => {
  const [unit, setUnit] = useState<'g' | 'kg' | 'lb' | 'oz' | 'pcs'>('kg');
  const [quantity, setQuantity] = useState(1);

  const outOfStock = product.availability === 'out_of_stock' || product.stockQuantity <= 0;

  // Effective unit price for the selected unit (kg price converted down).
  const unitPrice = useMemo(
    () => (unit === 'pcs' ? product.price : priceForWeight(product.price, 1, unit)),
    [product.price, unit]
  );

  // Total for the requested quantity; prices are rounded to 2dp for display.
  const lineTotal = useMemo(
    () => Number((unitPrice * quantity).toFixed(2)),
    [unitPrice, quantity]
  );

  const weightLabel =
    unit === 'pcs' ? `${quantity} قطعة` : `${formatWeight(quantity, unit)} ${unit}`;

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
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
        {showUrgencyBadge && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            طازج اليوم
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">نفدت الكمية</span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onProductClick(product)} className="text-left">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-800">{product.name}</h3>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <Scale className="h-3.5 w-3.5" />
          <span>السعر بالكيلو: {product.price}</span>
        </div>

        {/* Unit picker + quantity stepper compute the live price client-side. */}
        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap gap-1">
            {WEIGHT_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  unit === u
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                }`}
              >
                {u === 'pcs' ? 'قطعة' : u}
              </button>
            ))}
          </div>

          {unit === 'pcs' ? (
            <QuantityStepper
              quantity={quantity}
              stock={Math.max(99, product.stockQuantity)}
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
              onIncrease={() => setQuantity((q) => Math.min(99, q + 1))}
              size="sm"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.1}
                step={unit === 'g' ? 50 : 0.1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-800 focus:border-emerald-500 focus:outline-none"
                aria-label="الكمية"
              />
              <span className="shrink-0 text-xs font-medium text-gray-500">{unit}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through">{product.originalPrice}</span>
              )}
              <p className="text-base font-extrabold text-gray-900">{lineTotal}</p>
            </div>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() =>
                onAddToCart({
                  ...product,
                  quantity: 1,
                  price: lineTotal,
                  selectedVariants: { 'الوزن': weightLabel },
                })
              }
              className="rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: accentColor }}
            >
              أضف
            </button>
          </div>
        </div>

        {showWhatsApp && onWhatsAppOrder && !outOfStock && (
          <button
            type="button"
            onClick={() =>
              onWhatsAppOrder({
                ...product,
                quantity: 1,
                price: lineTotal,
                selectedVariants: { 'الوزن': weightLabel },
              })
            }
            className="rounded-lg bg-[#25D366]/10 py-1.5 text-[11px] font-bold text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
          >
            اطلب عبر واتساب
          </button>
        )}
      </div>
    </div>
  );
};