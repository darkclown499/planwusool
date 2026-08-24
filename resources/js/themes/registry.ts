import type { ComponentType } from 'react';
import type { BuilderSectionComponent } from '@/builder/registry';
import { getSectionComponent } from '@/builder/registry';
import type { BuilderPageSlot, BuilderSectionType, TemplateFamily } from '@/builder/types';
import { TemplateCartDrawer } from '@/templates/storefront/CartDrawer';
import { TemplateProductDetailModal } from '@/templates/storefront/ProductDetailModal';
import { TemplateCheckout } from '@/templates/storefront/CheckoutModal';
import {
  TemplateOrderSuccessModal,
  TemplateProfileModal,
  TemplateMyOrdersModal,
  TemplateOrderDetailsModal,
} from '@/templates/storefront/CustomerModals';
import { WishlistModal } from '@/components/storefront/WishlistModal';
import { GenericSearchOverlay } from '@/builder/sections/Search';

/**
 * A design family module. Each family owns a set of bespoke section
 * components (its own Header, Hero, Categories, Products, Footer, ...) that
 * are genuinely different React trees — different markup, composition and
 * spacing, not just recolored copies. A family only needs to override the
 * section types that define its visual identity; anything it doesn't
 * override (faq/video/newsletter/contact/reviews/...) transparently falls
 * back to the shared generic section (resources/js/builder/sections/*),
 * which already reads the same design tokens, so it never looks broken —
 * it just isn't part of what makes the family visually distinct.
 */
export interface FamilyModule {
  key: TemplateFamily;
  name: string;
  sections: Partial<Record<BuilderSectionType, BuilderSectionComponent>>;
  /**
   * Family overrides for shopping-flow overlays (product detail, cart,
   * checkout, account, search, ...). Unlike `sections` these are fixed
   * singletons resolved by `getFamilyPageComponent`, not part of the
   * orderable/toggleable homepage section stack. A family only needs to
   * register the slots that make it visually distinct — anything it
   * doesn't override falls back to the shared generic overlay below, so a
   * family with zero `pages` entries still ships a fully working store.
   */
  pages?: Partial<Record<BuilderPageSlot, ComponentType<any>>>;
}

const registry: Partial<Record<TemplateFamily, FamilyModule>> = {};

export function registerFamily(mod: FamilyModule) {
  registry[mod.key] = mod;
}

/**
 * Resolve the component that should render a given section type for a
 * given family — the family's own component if it has one, otherwise the
 * shared generic pipeline component. This single function is what makes
 * every template genuinely distinct: the live storefront (StoreSite), the
 * Designer canvas preview, and the page/category chrome all resolve
 * sections through it, so what the merchant edits is exactly what ships.
 */
export function getFamilySectionComponent(
  family: TemplateFamily | null | undefined,
  type: BuilderSectionType
): BuilderSectionComponent | null {
  const fam = family ? registry[family] : null;
  return fam?.sections[type] || getSectionComponent(type);
}

export function getFamilyModule(family: TemplateFamily | null | undefined): FamilyModule | null {
  return (family && registry[family]) || null;
}

/**
 * The shared shopping-flow overlays every store gets today, used as the
 * fallback for any family (or slot) that doesn't ship its own. Keeping
 * this map here — rather than inlining the components in TemplateStorefront
 * — is what lets a family override just one or two slots (e.g. only
 * `product_detail` and `cart`) while everything else stays byte-identical
 * to what every other store already renders.
 */
const GENERIC_PAGES: Partial<Record<BuilderPageSlot, ComponentType<any>>> = {
  product_detail: TemplateProductDetailModal,
  cart: TemplateCartDrawer,
  checkout: TemplateCheckout,
  order_success: TemplateOrderSuccessModal,
  profile: TemplateProfileModal,
  orders: TemplateMyOrdersModal,
  order_detail: TemplateOrderDetailsModal,
  wishlist: WishlistModal,
  search: GenericSearchOverlay,
};

/**
 * Resolve the component that should render a given shopping-flow overlay
 * for a given family — mirrors getFamilySectionComponent's fallback order
 * (family override, else the shared generic overlay) so every family works
 * out of the box and only needs to register the slots it wants to brand.
 */
export function getFamilyPageComponent(
  family: TemplateFamily | null | undefined,
  slot: BuilderPageSlot
): ComponentType<any> | null {
  const fam = family ? registry[family] : null;
  return fam?.pages?.[slot] || GENERIC_PAGES[slot] || null;
}

export const FAMILY_LABELS: Record<TemplateFamily, string> = {
  'modern-minimal': 'مودرن مينيمال',
  'dense-marketplace': 'سوق كثيف',
  'flash-deals': 'عروض البرق',
  'editorial-boutique': 'بوتيك تحريري',
  'playful-cards': 'بطاقات مرحة',
  'food-menu': 'قائمة طعام',
  'visual-tech': 'تقني بصري',
};

// Family bootstrap (the side-effect imports that call registerFamily() for
// every family) intentionally lives in its own module — see
// resources/js/themes/load-families.ts — instead of at the bottom of this
// file. Family components routinely import back into the storefront
// template layer (useStorefrontCore, TemplateStorefront's barrel, ...),
// and TemplateStorefront itself needs getFamilyPageComponent() from *this*
// file; if this file also pulled in every family module, that would close
// a require cycle back onto itself. Splitting the two keeps this module a
// pure leaf: anything can import the resolvers here without also loading
// (or being loaded by) family component trees.
