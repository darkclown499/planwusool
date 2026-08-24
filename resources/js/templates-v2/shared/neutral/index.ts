import type { ComponentType } from 'react';
import { TemplateCartDrawer as NeutralCartDrawer } from './CartDrawer';
import { TemplateProductDetailModal } from './ProductDetailModal';
import { TemplateCheckout } from './CheckoutModal';
import {
  TemplateOrderSuccessModal,
  TemplateProfileModal,
  TemplateMyOrdersModal,
  TemplateOrderDetailsModal,
} from './CustomerModals';
import { WishlistModal } from '@/components/storefront/WishlistModal';
import { NeutralSearchOverlay } from './NeutralSearchOverlay';

/* ===================================================================== */
/* Accent-tinted neutral overlays.                                        */
/*                                                                        */
/* A v2 template owns every visual pixel of its overlays; these are the   */
/* battle-tested fallbacks for any slot a template has not branded yet.   */
/* They read the --twc-* CSS variables, so mounting them inside the       */
/* template's accent scope makes them adopt the store's identity without  */
/* being part of what makes the template distinct.                        */
/* ===================================================================== */

export interface NeutralOverlaySet {
  cart: ComponentType<any>;
  product_detail: ComponentType<any>;
  checkout: ComponentType<any>;
  order_success: ComponentType<any>;
  profile: ComponentType<any>;
  orders: ComponentType<any>;
  order_detail: ComponentType<any>;
  wishlist: ComponentType<any>;
  search: ComponentType<any>;
}

export const NEUTRAL_OVERLAYS: NeutralOverlaySet = {
  cart: NeutralCartDrawer,
  product_detail: TemplateProductDetailModal,
  checkout: TemplateCheckout,
  order_success: TemplateOrderSuccessModal,
  profile: TemplateProfileModal,
  orders: TemplateMyOrdersModal,
  order_detail: TemplateOrderDetailsModal,
  wishlist: WishlistModal,
  search: NeutralSearchOverlay,
};
