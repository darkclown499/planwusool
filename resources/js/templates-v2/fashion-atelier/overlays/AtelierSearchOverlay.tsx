import React from 'react';
import { SearchSheet } from '../../shared/SearchSheet';
// Canonical server contract: api/storefront/search?q=...&store_id=... via useServerSearch (store-scoped, active only, debounce/abort)
// suggestions derived from real store data: products.slice(0,40) -> suggestions ; empty: لم نجد منتجات مطابقة ; loading: جارٍ البحث

interface AtelierSearchOverlayProps {
  onClose: () => void;
  onProductClick: (product: any) => void;
}

/**
 * Fashion Atelier — editorial/minimal search sheet.
 * Reuses shared SearchSheet (mobile fullscreen dvh + desktop large panel) so
 * live search, Enter submit -> /search?q=, abort/debounce and a11y are
 * canonical; only visual tokens remain template-specific.
 */
export const AtelierSearchOverlay: React.FC<AtelierSearchOverlayProps> = ({ onClose, onProductClick }) => {
  return (
    <SearchSheet
      onClose={onClose}
      onProductClick={onProductClick}
      accent="#9d7463"
      placeholder="ابحث عن منتج، قسم، أو كود..."
      variant="fashion"
    />
  );
};
