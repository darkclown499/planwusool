import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { fetchLoyaltyBalance } from '@/utils/loyalty';

export const HeaderLoyaltyBadge: React.FC<{ className?: string; compactOnMobile?: boolean }> = ({ className = '', compactOnMobile = true }) => {
  const { isLoggedIn, setShowLoyaltyModal } = useAuth();
  const { store } = useStore();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !store?.id) return;
    let cancelled = false;
    fetchLoyaltyBalance(store.id).then((res) => {
      if (!cancelled && res) setBalance(res.balance);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, store?.id]);

  if (!isLoggedIn) return null;
  if (balance === null) return null;

  return (
    <button
      type="button"
      onClick={() => setShowLoyaltyModal(true)}
      aria-label="نقاط الولاء"
      title={`${balance} نقطة`}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100 ${compactOnMobile ? 'max-[380px]:hidden' : ''} ${className}`}
    >
      <Gift className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{balance.toLocaleString('ar-EG')} نقطة</span>
      <span className="sm:hidden">{balance > 999 ? `${Math.floor(balance/1000)}k` : balance}</span>
    </button>
  );
};

export default HeaderLoyaltyBadge;
