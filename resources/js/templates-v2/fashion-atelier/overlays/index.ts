import type { TemplateOverlays } from '../../types';
import { NEUTRAL_OVERLAYS } from '../../shared/neutral';
import { AtelierCartDrawer } from './AtelierCartDrawer';
import { AtelierProductDetail } from './AtelierProductDetail';
import { AtelierSearchOverlay } from './AtelierSearchOverlay';

/**
 * Atelier overlay set. The three highest-frequency surfaces (cart, product
 * detail, search) are fully bespoke; the rest ride the accent-tinted
 * neutral set until their dedicated branding pass.
 */
export const atelierOverlays: TemplateOverlays = {
  ...NEUTRAL_OVERLAYS,
  cart: AtelierCartDrawer,
  product_detail: AtelierProductDetail,
  search: AtelierSearchOverlay,
};
