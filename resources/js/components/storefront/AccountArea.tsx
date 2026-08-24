import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { DownloadsModal } from '@/components/storefront/DownloadsModal';
import { LoyaltyModal } from '@/components/storefront/LoyaltyModal';
import { getFamilyPageComponent } from '@/themes/registry';
import '@/themes/load-families';
import type { TemplateFamily } from '@/builder/types';

/**
 * Central account-area host.
 *
 * Rendered once inside ThemeProvider so the new shared account features
 * (wishlist, digital downloads, loyalty points) work on every theme.
 * It also consumes the `action` prop (query string or URL path deep links
 * such as /my-orders, /my-profile, /wishlist, /my-downloads) and opens the
 * matching modal — the per-theme Profile/Orders modals are driven through
 * the same AuthContext state. `wishlist` resolves through the family page
 * registry so a family can ship its own on-brand wishlist; downloads/loyalty
 * stay generic (niche features, no per-family variants yet).
 */
export const AccountArea: React.FC<{ family?: TemplateFamily | null }> = ({ family = null }) => {
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
  const WishlistModal = useMemo(() => getFamilyPageComponent(family, 'wishlist')!, [family]);

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
