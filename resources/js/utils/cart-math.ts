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

export interface ShippingMethodLike {
  id: number | string;
  type?: string | null;
  cost?: number | string | null;
  handling_fee?: number | string | null;
}

/**
 * Server-authoritative shipping fee for a method on a given subtotal.
 * Mirrors CartCalculationService / ShippingSelectionService::computeFee:
 *  - free_shipping / free        => 0
 *  - percentage_based            => subtotal * cost / 100 + handling_fee
 *  - everything else (flat_rate) => cost + handling_fee
 */
export function computeShippingFee(method: ShippingMethodLike | undefined | null, subtotal: number): number {
  if (!method) return 0;
  const type = method.type;
  if (type === 'free_shipping' || type === 'free') return 0;
  const cost = Number(method.cost ?? 0) || 0;
  const handling = Number(method.handling_fee ?? 0) || 0;
  const raw = type === 'percentage_based' ? (subtotal * cost) / 100 + handling : cost + handling;
  return Math.round(raw * 100) / 100;
}

/** True when the server would charge 0 for this method on this subtotal. */
export function isShippingMethodFree(method: ShippingMethodLike | undefined | null, subtotal: number): boolean {
  return computeShippingFee(method, subtotal) === 0;
}

/**
 * P4A-02 canonical default selection (mirrors ShippingSelectionService):
 * empty => ''; exactly one => it; multiple => first genuinely-free method,
 * otherwise the first method in the provided (server-ordered) list.
 */
export function resolveDefaultShippingMethod(methods: ShippingMethodLike[], subtotal: number): string {
  if (!methods || methods.length === 0) return '';
  if (methods.length === 1) return String(methods[0].id);
  const free = methods.find((m) => isShippingMethodFree(m, subtotal));
  return String((free ?? methods[0]).id);
}