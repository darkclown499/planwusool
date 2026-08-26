import { useEffect, useMemo, useState } from 'react';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { useStorefrontCore as useCore } from '@/templates-v2/shared/contexts';

/* ===================================================================== */
/* Headless shared layer for v2 templates.                                */
/* NO JSX in here — only data, math and browser plumbing that every       */
/* bespoke template consumes through its own visual language.             */
/* ===================================================================== */

/**
 * Safe storefront core for v2 templates. Same contract as the legacy
 * helper, with a richer product-context fallback (full catalog + detail
 * handlers) so bespoke roots render correctly even outside the live
 * storefront providers (e.g. the template gallery preview).
 */
export function useStorefrontCore() {
  const core = useCore();
  const product = {
    products: [] as any[],
    selectedProduct: null as any,
    showProductDetail: false,
    handleCloseProductDetail: () => {},
    ...(core.product || {}),
  };
  return { ...core, product };
}

/** Product shape the storefront payload ships (light catalog fields). */
export interface V2Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image?: string;
  images?: string[];
  sku?: string;
  stockQuantity?: number;
  categoryId?: string;
  category?: string;
  availability?: 'in_stock' | 'out_of_stock' | string;
  description?: string;
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  customFields?: { name: string; value: string }[];
  taxName?: string;
  taxPercentage?: number;
}

/** Discount percentage between original and current price (0 when none). */
export function discountPercent(product: Pick<V2Product, 'price' | 'originalPrice'>): number {
  const original = Number(product?.originalPrice ?? 0);
  const price = Number(product?.price ?? 0);
  if (!original || !price || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

/** True when the product is variable ("متوفر بعدة خيارات"). */
export function isVariableProduct(product: V2Product): boolean {
  return Array.isArray(product?.variants) && product.variants.length > 0;
}

/**
 * Low-stock urgency: returns remaining count when it is above zero and at
 * or below `threshold`, otherwise null. Powers "آخر 3 قطع" badges.
 */
export function lowStockRemaining(
  product: Pick<V2Product, 'stockQuantity' | 'availability'>,
  threshold = 5
): number | null {
  if (product?.availability === 'out_of_stock') return null;
  const qty = Number(product?.stockQuantity ?? NaN);
  if (!Number.isFinite(qty)) return null;
  if (qty <= 0 || qty > threshold) return null;
  return qty;
}

/** Currency-aware price formatter bound to the active store. */
export function usePriceFormatter() {
  const { config } = useStorefrontCore();
  const currency = useMemo(() => {
    // Prefer the page-level store currency injected by the backend.
    const pageCurrency = typeof window !== 'undefined' ? (window as any)?.page?.props?.storeCurrency : undefined;
    return (
      pageCurrency ||
      ((config as any)?.currencyObject ?? undefined)
    );
  }, [config]);
  return (amount: number | string) => formatStoreCurrency(amount, currency);
}

/** Single source for free-shipping threshold — reads every known key so Designer values propagate to every template.
 *  Canonical business setting is behavior.free_shipping_enabled / threshold (StoreConfiguration).
 *  Content Designer keys are legacy fallback; fallback param is IGNORED when behavior says disabled (null = no free shipping UI).
 *  If behavior is provided and enabled===false, returns null immediately regardless of content/fallback.
 */
export function resolveFreeShippingThreshold(content: any, fallback: number | null = null, behavior?: any): number | null {
  // Canonical behavior check first
  if (behavior && typeof behavior === 'object' && 'free_shipping_enabled' in behavior) {
    if (!behavior.free_shipping_enabled) return null;
    const bThr = behavior.free_shipping_threshold;
    if (bThr !== null && bThr !== undefined && bThr !== '') {
      const n = Number(bThr);
      if (Number.isFinite(n) && n > 0) return n;
    }
    // enabled but no threshold set -> no free shipping UI (merchant must set threshold)
    return null;
  }
  // Legacy content fallback (Designer) - only used if behavior not present (preview mode)
  const raw = (content as any)?.free_shipping_threshold ?? (content as any)?.freeShippingThreshold ?? (content as any)?.settings?.free_shipping_threshold ?? (content as any)?.homepage?.free_shipping_threshold ?? fallback;
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Free-shipping progress towards a threshold (null when disabled/none set). */
export function freeShippingProgress(
  subtotal: number,
  threshold: number | null
): { percent: number; remaining: number; qualified: boolean } | null {
  if (!threshold || threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  return {
    percent: Math.min(100, Math.round((subtotal / threshold) * 100)),
    remaining,
    qualified: subtotal >= threshold,
  };
}

/**
 * Rotating announcement bar messages — returns the index of the currently
 * visible message, advancing every `intervalMs`. Pauses with a single item.
 */
export function useRotatingAnnouncement(count: number, intervalMs = 4500): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);
  return Math.min(index, Math.max(0, count - 1));
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Live countdown to an ISO/Date target for urgency banners. */
export function useCountdown(target?: string | Date | null): CountdownParts | null {
  const targetTime = useMemo(() => {
    if (!target) return null;
    const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
    return Number.isFinite(t) ? t : null;
  }, [target]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetTime) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  if (!targetTime) return null;
  const diff = targetTime - now;
  const expired = diff <= 0;
  const total = expired ? 0 : Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired,
  };
}

/** Cart totals shared by every overlay: subtotal, tax and grand total. */
export function computeCartTotals(items: any[]): {
  subtotal: number;
  tax: number;
  total: number;
  count: number;
} {
  let subtotal = 0;
  let tax = 0;
  let count = 0;
  for (const item of items || []) {
    const line = (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
    subtotal += line;
    count += Number(item?.quantity) || 0;
    if (item?.taxPercentage) tax += (line * Number(item.taxPercentage)) / 100;
  }
  return { subtotal, tax, total: subtotal + tax, count };
}

/** Build the store-scoped URL helper (category/product links inside storefront). */
export function storePath(storeSlug: string, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `/store/${storeSlug}${clean === '/' ? '' : clean}`;
}
