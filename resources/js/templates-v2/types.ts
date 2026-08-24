import type { ComponentType } from 'react';

/* ===================================================================== */
/* Wusool Template System v2 — "كل قالب متجر مستقل"                      */
/*                                                                       */
/* Every template is a self-contained store application: its own layout, */
/* header/footer, product cards, hero, category page and shopping-flow   */
/* overlays. Nothing visual is shared between templates — only the       */
/* headless data layer (contexts + utils) is common plumbing.            */
/* ===================================================================== */

export type PlanTier = 'starter' | 'growth' | 'professional';

/** The six launch sectors. Each slug is a fully bespoke template folder. */
export type V2TemplateSlug =
  | 'fashion-atelier'
  | 'grocery-souq'
  | 'bakery-house'
  | 'restaurant-menu'
  | 'electronics-hub'
  | 'bazaar-market';

/** Payload of the dedicated /category/{slug} listing route. */
export interface TemplateCategoryPageData {
  category: {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    description?: string | null;
    product_count?: number;
  };
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  sort: string;
}

/**
 * What the storefront entry (dynamic/category pages) hands to a template
 * root. `storeData` is the merged store blob: { ...store, categories,
 * products, config, content, offers, pages, behavior }.
 */
export interface TemplateRootProps {
  storeData: any;
  mode: 'home' | 'page' | 'category';
  /** Custom store page body when mode === 'page'. */
  page?: any | null;
  /** Category listing payload when mode === 'category'. */
  categoryData?: TemplateCategoryPageData | null;
  isPreview?: boolean;
}

/**
 * Shopping-flow overlay slots owned by the template. Each is the template's
 * own bespoke component — same props contract as the legacy generic overlays
 * so the hosting flow (cart/auth/checkout state machine) stays identical.
 */
export interface TemplateOverlays {
  cart?: ComponentType<any>;
  product_detail?: ComponentType<any>;
  checkout?: ComponentType<any>;
  order_success?: ComponentType<any>;
  profile?: ComponentType<any>;
  orders?: ComponentType<any>;
  order_detail?: ComponentType<any>;
  wishlist?: ComponentType<any>;
  search?: ComponentType<any>;
}

export interface TemplateMeta {
  slug: V2TemplateSlug;
  name: string;
  name_en: string;
  sector: string;
  sector_en: string;
  description: string;
  /** CSS background used as the picker thumbnail. */
  preview: string;
  /** Brand accent hex — used by neutral fallbacks to blend in. */
  accent: string;
  is_free: boolean;
  plan_required: PlanTier;
}

/**
 * Editable-content declaration for the slots-based designer: what the
 * merchant may change inside this template without touching its identity
 * (texts, images, featured picks, toggles). Phase-3 editor generates its
 * form from this schema.
 */
export type EditableSlotType =
  | 'text'
  | 'textarea'
  | 'image'
  | 'boolean'
  | 'color'
  | 'link'
  | 'product_pick'
  | 'category_pick';

export interface EditableSlot {
  key: string;
  label: string;
  label_en?: string;
  type: EditableSlotType;
  default?: any;
  group?: string;
  hint?: string;
}

export interface TemplateModule {
  meta: TemplateMeta;
  /** The full homepage/page/category renderer — owns every pixel. */
  Root: ComponentType<TemplateRootProps>;
  /** Bespoke overlays; anything omitted falls back to the accent-tinted neutral set. */
  overlays?: TemplateOverlays;
  /** Merchant-editable slots (designer phase). */
  contentSchema?: EditableSlot[];
}
