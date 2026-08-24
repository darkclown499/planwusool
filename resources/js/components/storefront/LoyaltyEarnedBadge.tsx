import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { calcEarnedPoints, fetchLoyaltySettings, getLoyaltySettingsFromPage, type LoyaltySettings } from '@/utils/loyalty';
import { usePage } from '@inertiajs/react';

export const LoyaltyEarnedBadge: React.FC<{ amount: number; className?: string; variant?: 'inline' | 'pill' }> = ({
  amount,
  className = '',
  variant = 'pill',
}) => {
  const page = usePage().props as any;
  const storeId = page?.store?.id ?? page?.storeSettings?.store_id ?? null;
  const [settings, setSettings] = useState<LoyaltySettings | null>(() => getLoyaltySettingsFromPage());

  useEffect(() => {
    if (settings) return;
    if (!storeId) return;
    fetchLoyaltySettings(storeId).then((s) => {
      if (s) setSettings(s);
    });
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const points = calcEarnedPoints(amount, settings);
  if (!settings || !settings.is_enabled || points <= 0) return null;

  if (variant === 'inline') {
    return <span className={`inline-flex items-center gap-1 text-xs font-bold text-amber-600 ${className}`}>كسب {points} نقطة</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 ${className}`}>
      <Gift className="h-3 w-3" /> كسب {points} نقطة
    </span>
  );
};

export default LoyaltyEarnedBadge;
