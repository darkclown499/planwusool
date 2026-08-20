import React from 'react';
import { Truck } from 'lucide-react';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import {
  amountToFreeDelivery,
  freeDeliveryProgress,
  qualifiesForFreeDelivery,
} from '@/utils/cart-math';

interface FreeDeliveryProgressProps {
  subtotal: number;
  threshold: number;
  /** The store's currency symbol (passed down so row totals match the rest of the UI). */
  currency?: string;
  className?: string;
}

/**
 * Free-delivery threshold progress bar used by the fashion-luxe drawer cart.
 * Shows how much more the shopper needs to add before shipping is free.
 */
export const FreeDeliveryProgress: React.FC<FreeDeliveryProgressProps> = ({
  subtotal,
  threshold,
  currency,
  className = '',
}) => {
  if (threshold <= 0) return null;

  const done = qualifiesForFreeDelivery(subtotal, threshold);
  const remaining = amountToFreeDelivery(subtotal, threshold);
  const progress = freeDeliveryProgress(subtotal, threshold);

  return (
    <div className={`rounded-xl bg-emerald-50 px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
        <Truck className="h-4 w-4 shrink-0" />
        {done ? (
          <span>مبروك! حصلت على التوصيل المجاني</span>
        ) : (
          <span>
            أضف <b>{formatStoreCurrency(remaining, undefined)}</b> للحصول على توصيل مجاني
          </span>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
};