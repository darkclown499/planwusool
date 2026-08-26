import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currency-formatter';
import { cashEquivalent, normalizeLoyaltySettings, type LoyaltySettings } from '@/utils/loyalty';
import { usePage } from '@inertiajs/react';

interface HistoryItem {
  id: string | number;
  points: number;
  type: string;
  description?: string;
  created_at?: string;
  balance_after?: number;
}

export const LoyaltyOverview: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { store } = useStore();
  const page = usePage().props as any;
  const storeSettings = page?.storeSettings || {};
  const currencies = page?.currencies || [];

  const [balance, setBalance] = useState<number | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [bRes, hRes] = await Promise.all([
          fetch(route('api.loyalty.balance', { store_id: store.id } as any) as any, { headers: { Accept: 'application/json' } }),
          fetch(route('api.loyalty.history', { store_id: store.id, limit: 30 } as any) as any, { headers: { Accept: 'application/json' } }),
        ]);
        if (bRes.ok) {
          const d = await bRes.json();
          setBalance(Number(d.balance ?? 0));
          if (d.settings) setSettings(normalizeLoyaltySettings(d.settings));
        }
        if (hRes.ok) {
          const d = await hRes.json();
          setHistory(d.history || []);
        }
        // fallback settings from page props if API didn't return
        if (!settings) {
          const fallback = storeSettings?.loyalty ?? null;
          if (fallback) setSettings(normalizeLoyaltySettings(fallback));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, store.id]);

  const effectiveSettings = settings ?? (storeSettings?.loyalty ? normalizeLoyaltySettings(storeSettings.loyalty) : null);
  const cash = cashEquivalent(balance ?? 0, effectiveSettings);
  const isEnabled = effectiveSettings?.is_enabled ?? false;

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <h3 className="text-lg font-bold text-slate-900">نقاط الولاء</h3>
        <p className="mt-2 text-sm text-slate-600">سجّل الدخول لعرض رصيد نقاطك</p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (effectiveSettings && !isEnabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">برنامج الولاء غير مفعل حالياً في هذا المتجر</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total points + cash equivalent */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 p-5 text-white">
          <p className="text-xs text-white/80">رصيد النقاط الحالي</p>
          <p className="mt-1 text-3xl font-black">{balance ?? 0} نقطة</p>
          <p className="mt-1 text-xs text-white/80">اجمع النقاط مع كل طلب</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-bold text-emerald-700">القيمة النقدية</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{formatCurrency(cash, storeSettings, currencies)}</p>
          <p className="mt-1 text-xs text-emerald-600">
            {effectiveSettings ? `كل نقطة = ${formatCurrency(effectiveSettings.points_value, storeSettings, currencies)}` : ''}
          </p>
          {effectiveSettings && (
            <p className="mt-1 text-xs text-slate-500">
              الحد الأدنى للاستبدال: {effectiveSettings.minimum_redemption_points} نقطة · حد الخصم: {effectiveSettings.maximum_discount_percentage}%
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <h3 className="pt-2 text-sm font-bold text-slate-900">سجل النقاط</h3>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-slate-500">لا يوجد سجل نقاط بعد</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={String(item.id)} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.description || item.type}</p>
                    {item.created_at && <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('ar-EG')}</p>}
                  </div>
                  <span className={`shrink-0 text-sm font-black ${Number(item.points) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {Number(item.points) > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LoyaltyOverview;
