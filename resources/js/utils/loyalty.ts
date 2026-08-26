export interface LoyaltySettings {
  is_enabled: boolean;
  points_per_currency: number;
  points_value: number;
  minimum_redemption_points: number;
  maximum_discount_percentage: number;
  signup_bonus_points?: number;
  review_bonus_points?: number;
}

export function getLoyaltySettingsFromPage(): LoyaltySettings | null {
  const page: any = typeof window !== 'undefined' ? (window as any).page?.props : null;
  const fromStore = page?.storeSettings?.loyalty ?? page?.storeSettings?.loyalty_settings ?? null;
  const fromLoyalty = page?.loyaltySettings ?? page?.loyalty_settings ?? null;
  const raw = fromLoyalty ?? fromStore ?? null;
  if (raw) return normalizeLoyaltySettings(raw);
  // fallback from legacy config field
  const cfg: any = (window as any).page?.props?.store?.loyalty_settings ?? (window as any).page?.props?.storeSettings?.loyaltySettings ?? null;
  if (cfg) return normalizeLoyaltySettings(cfg);
  return null;
}

export function normalizeLoyaltySettings(raw: any): LoyaltySettings {
  return {
    is_enabled: !!(raw.is_enabled ?? raw.enabled ?? false),
    points_per_currency: Number(raw.points_per_currency ?? raw.pointsPerCurrency ?? 1) || 1,
    points_value: Number(raw.points_value ?? raw.pointsValue ?? 0.01) || 0.01,
    minimum_redemption_points: Number(raw.minimum_redemption_points ?? raw.minimumRedemptionPoints ?? raw.min_redemption_points ?? 100) || 100,
    maximum_discount_percentage: Number(raw.maximum_discount_percentage ?? raw.maximumDiscountPercentage ?? raw.max_discount_percentage ?? 50) || 50,
    signup_bonus_points: Number(raw.signup_bonus_points ?? 0) || 0,
    review_bonus_points: Number(raw.review_bonus_points ?? 0) || 0,
  };
}

export function calcEarnedPoints(amount: number, settings?: LoyaltySettings | null): number {
  const s = settings ?? getLoyaltySettingsFromPage();
  if (!s || !s.is_enabled || amount <= 0) return 0;
  return Math.floor(amount * s.points_per_currency);
}

/**
 * Shared variant-aware effective price for loyalty preview.
 * Resolves the purchasable price for the currently selected variants:
 * - if all variant groups selected and a matching variantCombinations entry exists with a price, use that
 * - otherwise use product.price (catalog effective price, already sale-adjusted)
 * Single source for all 6 templates — do not duplicate logic per template.
 */
export function getEffectiveLoyaltyPrice(product: any, selection?: Record<string, string> | null): number {
  try {
    const base = Number(product?.price) || 0;
    if (!product || !selection || !product.variants?.length) return base;
    const groups: any[] = product.variants || [];
    const missing = groups.filter((g: any) => !selection[g.name]);
    if (missing.length > 0) return base;
    const combos: any[] = product.variantCombinations || product.variant_combinations || product.variant_combinations || [];
    if (!combos.length) return base;
    const selVals = Object.values(selection).map((v) => String(v).trim());
    const match = combos.find((c: any) => {
      const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
      if (vals.length !== selVals.length) return false;
      return selVals.every((sv) => vals.includes(sv));
    });
    if (match && match.price !== undefined && String(match.price).trim() !== '') {
      const n = Number(match.price);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return base;
  } catch {
    return Number(product?.price) || 0;
  }
}

export function cashEquivalent(points: number, settings?: LoyaltySettings | null): number {
  const s = settings ?? getLoyaltySettingsFromPage();
  if (!s || points <= 0) return 0;
  return Math.round(points * s.points_value * 100) / 100;
}

export function maxRedeemableDiscount(subtotal: number, settings?: LoyaltySettings | null): number {
  const s = settings ?? getLoyaltySettingsFromPage();
  if (!s) return 0;
  return Math.round(subtotal * (s.maximum_discount_percentage / 100) * 100) / 100;
}

export function pointsNeededForDiscount(discount: number, settings?: LoyaltySettings | null): number {
  const s = settings ?? getLoyaltySettingsFromPage();
  if (!s || s.points_value <= 0) return 0;
  return Math.ceil(discount / s.points_value);
}

export function canRedeem(balance: number, settings?: LoyaltySettings | null): boolean {
  const s = settings ?? getLoyaltySettingsFromPage();
  if (!s || !s.is_enabled) return false;
  return balance >= s.minimum_redemption_points;
}

export async function fetchLoyaltyBalance(storeId: number | string): Promise<{ balance: number; settings: LoyaltySettings } | null> {
  try {
    const res = await fetch(route('api.loyalty.balance', { store_id: storeId } as any) as any, {
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return { balance: Number(data.balance ?? 0), settings: normalizeLoyaltySettings(data.settings ?? {}) };
  } catch {
    return null;
  }
}

export async function fetchLoyaltySettings(storeId: number | string): Promise<LoyaltySettings | null> {
  try {
    const res = await fetch(`/api/loyalty/settings?store_id=${storeId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return normalizeLoyaltySettings(data.settings ?? {});
  } catch {
    return null;
  }
}
