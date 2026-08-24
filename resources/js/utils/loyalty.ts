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
    is_enabled: !!(raw.is_enabled ?? raw.enabled ?? true),
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
