import React, { useContext, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { StoreContext } from '@/contexts/StoreContext';
import { fetchLoyaltyBalance, getLoyaltySettingsFromPage } from '@/utils/loyalty';

export const HeaderLoyaltyBadge: React.FC<{ className?: string; compactOnMobile?: boolean }> = ({ className = '', compactOnMobile = true }) => {
  // Safe outside AuthProvider/StoreProvider (e.g. template gallery preview `V2PreviewProviders`)
  // — use raw contexts with fallback instead of useAuth()/useStore() which throw.
  const authCtx = useContext(AuthContext);
  const storeCtx = useContext(StoreContext);
  if (!authCtx || !storeCtx) return null;
  const { isLoggedIn, setShowLoyaltyModal } = authCtx;
  const { store } = storeCtx;
  const [balance, setBalance] = useState<number | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !store?.id) return;
    let cancelled = false;
    // Check canonical loyalty enabled first; hide badge completely when OFF
    const pageSettings = getLoyaltySettingsFromPage();
    if (pageSettings) {
      setIsEnabled(pageSettings.is_enabled);
      if (!pageSettings.is_enabled) return;
    }
    fetchLoyaltyBalance(store.id).then((res) => {
      if (!cancelled && res) {
        setBalance(res.balance);
        if (res.settings) setIsEnabled(res.settings.is_enabled);
        else if (!pageSettings) setIsEnabled(true);
      } else if (!cancelled && pageSettings) {
        setIsEnabled(pageSettings.is_enabled);
      }
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, store?.id]);

  if (!isLoggedIn) return null;
  if (isEnabled === false) return null;
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
