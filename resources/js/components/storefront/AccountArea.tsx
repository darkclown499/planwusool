import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { WishlistModal } from '@/components/storefront/WishlistModal';
import { DownloadsModal } from '@/components/storefront/DownloadsModal';
import { LoyaltyModal } from '@/components/storefront/LoyaltyModal';

/**
 * Central account-area host.
 *
 * Rendered once inside ThemeProvider so the new shared account features
 * (wishlist, digital downloads, loyalty points) work on every theme.
 * It also consumes the `action` prop (query string or URL path deep links
 * such as /my-orders, /my-profile, /wishlist, /my-downloads) and opens the
 * matching modal — the per-theme Profile/Orders modals are driven through
 * the same AuthContext state.
 */
export const AccountArea: React.FC = () => {
  const {
    isLoggedIn,
    showWishlistModal,
    showDownloadsModal,
    showLoyaltyModal,
    setShowWishlistModal,
    setShowDownloadsModal,
    setShowLoyaltyModal,
    setShowProfileModal,
    setShowOrdersModal,
    setShowLoginModal
  } = useAuth();
  const { action } = useUI();

  useEffect(() => {
    if (!action) return;

    const openAccount = (open: () => void) => {
      if (isLoggedIn) {
        open();
      } else {
        setShowLoginModal(true);
      }
    };

    switch (action) {
      case 'my-profile':
        openAccount(() => setShowProfileModal(true));
        break;
      case 'my-orders':
        openAccount(() => setShowOrdersModal(true));
        break;
      case 'wishlist':
        openAccount(() => setShowWishlistModal(true));
        break;
      case 'my-downloads':
        openAccount(() => setShowDownloadsModal(true));
        break;
      case 'my-loyalty':
        openAccount(() => setShowLoyaltyModal(true));
        break;
      default:
        break;
    }
  }, [
    action,
    isLoggedIn,
    setShowProfileModal,
    setShowOrdersModal,
    setShowWishlistModal,
    setShowDownloadsModal,
    setShowLoyaltyModal,
    setShowLoginModal
  ]);

  return (
    <>
      {showWishlistModal && <WishlistModal onClose={() => setShowWishlistModal(false)} />}
      {showDownloadsModal && <DownloadsModal onClose={() => setShowDownloadsModal(false)} />}
      {showLoyaltyModal && <LoyaltyModal onClose={() => setShowLoyaltyModal(false)} />}
    </>
  );
};
