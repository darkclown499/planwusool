import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency-formatter';
import { usePage } from '@inertiajs/react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  canRedeem,
  cashEquivalent,
  fetchLoyaltyBalance,
  getLoyaltySettingsFromPage,
  maxRedeemableDiscount,
  normalizeLoyaltySettings,
  pointsNeededForDiscount,
  type LoyaltySettings,
} from '@/utils/loyalty';
import { Switch } from '@/components/ui/switch';

interface Props {
  subtotal: number;
  onDiscountChange: (discount: number, pointsUsed: number) => void;
}

export const CheckoutLoyaltyDeduction: React.FC<Props> = ({ subtotal, onDiscountChange }) => {
  const page = usePage().props as any;
  const storeSettings = page?.storeSettings || {};
  const currencies = page?.currencies || [];
  const { store } = useStore();
  const { isLoggedIn } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(() => getLoyaltySettingsFromPage());
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    fetchLoyaltyBalance(store.id)
      .then((res) => {
        if (res) {
          setBalance(res.balance);
          setSettings(res.settings);
        } else {
          // try public settings fallback
          const fallback = getLoyaltySettingsFromPage();
          if (fallback) setSettings(fallback);
        }
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, store.id]);

  const effectiveSettings = settings ?? (storeSettings?.loyalty ? normalizeLoyaltySettings(storeSettings.loyalty) : null);

  const canUse = useMemo(() => {
    if (!isLoggedIn || balance === null || !effectiveSettings) return false;
    return canRedeem(balance, effectiveSettings);
  }, [isLoggedIn, balance, effectiveSettings]);

  const { discount, pointsUsed } = useMemo(() => {
    if (!enabled || !canUse || !effectiveSettings || balance === null) return { discount: 0, pointsUsed: 0 };
    const maxDiscount = maxRedeemableDiscount(subtotal, effectiveSettings);
    const balanceCash = cashEquivalent(balance, effectiveSettings);
    const achievable = Math.min(maxDiscount, balanceCash);
    const pts = pointsNeededForDiscount(achievable, effectiveSettings);
    // cap points to balance
    const cappedPts = Math.min(pts, balance);
    const finalDiscount = Math.min(achievable, cashEquivalent(cappedPts, effectiveSettings));
    // re-ensure not exceeding maxDiscount
    const clamped = Math.min(finalDiscount, maxDiscount);
    const finalPts = pointsNeededForDiscount(clamped, effectiveSettings);
    return { discount: Math.round(clamped * 100) / 100, pointsUsed: Math.min(finalPts, balance) };
  }, [enabled, canUse, effectiveSettings, balance, subtotal]);

  useEffect(() => {
    onDiscountChange(discount, pointsUsed);
  }, [discount, pointsUsed, onDiscountChange]);

  if (!isLoggedIn) return null;
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-700">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل رصيد النقاط...
      </div>
    );
  }
  if (!effectiveSettings || !effectiveSettings.is_enabled) return null;
  if (balance === null) return null;

  const cash = cashEquivalent(balance, effectiveSettings);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">استخدم نقاط الولاء</p>
            <p className="text-xs text-slate-600">
              رصيدك: {balance} نقطة ({formatCurrency(cash, storeSettings, currencies)}) · الحد الأدنى: {effectiveSettings.minimum_redemption_points} نقطة
            </p>
          </div>
        </div>
        <Switch checked={enabled} disabled={!canUse} onCheckedChange={(v) => setEnabled(v && canUse)} />
      </div>

      {!canUse && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          تحتاج إلى {Math.max(0, effectiveSettings.minimum_redemption_points - (balance ?? 0))} نقطة إضافية للاستبدال
        </p>
      )}

      {enabled && canUse && discount > 0 && (
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-amber-200">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">خصم النقاط</span>
            <span className="font-bold text-emerald-600">-{formatCurrency(discount, storeSettings, currencies)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            سيتم خصم {pointsUsed} نقطة · الحد الأقصى {effectiveSettings.maximum_discount_percentage}% من الإجمالي
          </p>
        </div>
      )}
      {enabled && canUse && discount === 0 && (
        <p className="mt-2 text-xs text-slate-500">لا يوجد خصم متاح للرصيد الحالي.</p>
      )}
    </div>
  );
};

export default CheckoutLoyaltyDeduction;
