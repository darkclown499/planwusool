import React from 'react';
import { SearchSheet } from '../SearchSheet';

interface NeutralSearchOverlayProps {
  onClose: () => void;
  onProductClick: (product: any) => void;
}

/**
 * Minimal accent-neutral search fallback — now delegates to shared SearchSheet
 * so bazaar-market (and any future unbranded template) gets the same mobile
 * dvh sheet, server-backed live search, Enter -> /search?q=, abort/debounce and
 * correct product row contract. Reads --twc-* variables for accent.
 */
export const NeutralSearchOverlay: React.FC<NeutralSearchOverlayProps> = ({ onClose, onProductClick }) => {
  return (
    <SearchSheet
      onClose={onClose}
      onProductClick={onProductClick}
      placeholder="ابحث عن منتج…"
      variant="neutral"
    />
  );
};
