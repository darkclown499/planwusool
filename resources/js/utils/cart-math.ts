/**
 * Cart math helpers shared by every theme module.
 *
 * All slots compute subtotal / tax / totals through these functions so prices
 * never diverge between the product grid, the cart drawer, the sticky bar and
 * the express checkout modal.
 */

export interface CartMathItem {
  price: number;
  quantity: number;
  taxPercentage?: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

/** Sum the cart into { subtotal, tax, total, itemCount }. */
export function computeCartTotals(items: CartMathItem[]): CartTotals {
  const totals = items.reduce(
    (acc, item) => {
      const lineTotal = item.price * item.quantity;
      const tax = item.taxPercentage ? (lineTotal * item.taxPercentage) / 100 : 0;
      return {
        subtotal: acc.subtotal + lineTotal,
        tax: acc.tax + tax,
        itemCount: acc.itemCount + item.quantity,
      };
    },
    { subtotal: 0, tax: 0, itemCount: 0 }
  );
  return { ...totals, total: totals.subtotal + totals.tax };
}

/** True when the cart qualifies for free delivery given a threshold. */
export function qualifiesForFreeDelivery(subtotal: number, threshold: number): boolean {
  return threshold > 0 && subtotal >= threshold;
}

/** Remaining amount before the free-delivery threshold; 0 when reached. */
export function amountToFreeDelivery(subtotal: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.max(0, threshold - subtotal);
}

/** Progress 0..1 toward the free-delivery threshold. */
export function freeDeliveryProgress(subtotal: number, threshold: number): number {
  if (threshold <= 0) return 1;
  return Math.min(1, Math.max(0, subtotal / threshold));
}

export interface CouponTotals extends CartTotals {
  discount: number;
  finalTotal: number;
}

/** Apply an applied coupon to the raw totals and return a final grand total. */
export function applyCouponTotals(
  totals: CartTotals,
  coupon?: { discount: number; type?: string; discount_amount?: number } | null
): CouponTotals {
  if (!coupon) {
    return { ...totals, discount: 0, finalTotal: totals.total };
  }
  const discount = coupon.type === 'percentage'
    ? (totals.subtotal * coupon.discount) / 100
    : (coupon.discount_amount ?? coupon.discount ?? 0);
  const capped = Math.max(0, Math.min(discount, totals.subtotal));
  return { ...totals, discount: capped, finalTotal: totals.subtotal - capped + totals.tax };
}