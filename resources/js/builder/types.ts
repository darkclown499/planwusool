export type PlanTier = 'starter' | 'growth' | 'professional';

/**
 * The unified section model. Every template — past, present and future —
 * is defined as an ordered list of these sections. The same model drives
 * the live storefront, the visual designer (Phase 3) and the template
 * catalog, so what you see in the editor is exactly what ships.
 */
export type BuilderSectionType =
  | 'announcement'
  | 'header'
  | 'hero'
  | 'categories'
  | 'products'
  | 'products_by_category'
  | 'offers'
  | 'banners'
  | 'features'
  | 'reviews'
  | 'faq'
  | 'video'
  | 'newsletter'
  | 'footer'
  | 'contact'
  | 'custom';

export interface BuilderSectionConfig {
  id: string;
  type: BuilderSectionType;
  enabled: boolean;
  order: number;
  props: Record<string, any>;
}

/**
 * Property schema for a section. The visual editor uses this to build the
 * inspector panel (inputs rendered from `type`) and the section library
 * (group/icon/name). It is the single source of truth for "what is editable"
 * on every section.
 */
export type BuilderPropType =
  | 'text'
  | 'textarea'
  | 'color'
  | 'image'
  | 'select'
  | 'boolean'
  | 'number'
  | 'link'
  | 'video'
  | 'slides'
  /** Multi-select of the store's own categories (checkbox list). */
  | 'category_multiselect'
  /** Repeatable item list edited by a structured editor (see `list`). */
  | 'list';

export interface BuilderPropSchema {
  key: string;
  label: string;
  label_en?: string;
  type: BuilderPropType;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  group?: 'content' | 'style' | 'layout' | 'behavior';
  hint?: string;
  /**
   * Which structured list editor to render when `type === 'list'`.
   * - 'features': Lucide icon picker + title + description rows.
   * - 'reviews': name + text + rating (1-5) + avatar rows.
   */
  list?: 'features' | 'reviews';
}

export interface BuilderSectionMeta {
  type: BuilderSectionType;
  name: string;
  name_en: string;
  group: string;
  group_en: string;
  icon: string;
  description: string;
  props: BuilderPropSchema[];
}

/** Semantic design tokens — every palettes drives these keys. */
export interface BuilderDesignTokens {
  colors: {
    primary?: string;
    primary_foreground?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text_primary?: string;
    text_secondary?: string;
    muted?: string;
    border?: string;
    success?: string;
    danger?: string;
    warning?: string;
    [key: string]: string | undefined;
  };
  typography?: {
    body_font?: string;
    heading_font?: string;
    base_size?: string;
    [key: string]: string | undefined;
  };
  radius?: string;
  spacing?: string;
  shadows?: Record<string, string>;
}

/**
 * A design family is a fully separate component tree (header, hero,
 * categories, product cards, footer, ...) — genuinely different layout,
 * composition and visual hierarchy, not just a recolor. Every template
 * belongs to exactly one family; templates in the same family still read
 * as distinct via tokens/content/section-variant props, but templates in
 * different families never share a component. See resources/js/themes/registry.ts.
 */
export type TemplateFamily =
  | 'modern-minimal'
  | 'dense-marketplace'
  | 'flash-deals'
  | 'editorial-boutique'
  | 'playful-cards'
  | 'food-menu'
  | 'visual-tech';

/**
 * Addressable shopping-flow overlay slots. Unlike `BuilderSectionType` these
 * are fixed singletons (one cart, one checkout, ...) — not a reorderable,
 * toggleable stack — so they're resolved through their own family-aware
 * registry (`getFamilyPageComponent` in resources/js/themes/registry.ts)
 * rather than living in `BuilderSectionConfig`/the Designer's section canvas.
 */
export type BuilderPageSlot =
  | 'product_detail'
  | 'cart'
  | 'checkout'
  | 'order_success'
  | 'profile'
  | 'orders'
  | 'order_detail'
  | 'wishlist'
  | 'search';

export interface BuilderTemplateConfig {
  slug: string;
  name: string;
  name_en: string;
  description: string;
  category: string;
  is_free: boolean;
  plan_required: PlanTier;
  /** Which design system this template renders through. */
  family: TemplateFamily;
  sections: BuilderSectionConfig[];
  tokens: BuilderDesignTokens;
  is_default?: boolean;
  /** CSS gradient used as the thumbnail in the template picker. */
  preview: string;
}

export interface BuilderTemplateSummary {
  slug: string;
  name: string;
  name_en: string;
  description?: string;
  category: string;
  is_free: boolean;
  plan_required: PlanTier;
  preview: string;
}

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  starter: 1,
  growth: 2,
  professional: 3,
};

export function canAccessTemplate(
  template: Pick<BuilderTemplateConfig, 'is_free' | 'plan_required'>,
  userPlanTier: PlanTier = 'starter'
): boolean {
  if (template.is_free) return true;
  return PLAN_HIERARCHY[userPlanTier] >= PLAN_HIERARCHY[template.plan_required];
}

export function getTemplateTierFromPlanName(planName?: string | null): PlanTier {
  const name = (planName || '').toLowerCase();
  // 'pro' covers pro/professional subscribers — they get the full catalog.
  if (name.includes('professional') || name.includes('premium') || name.includes('enterprise') || name.includes('pro')) {
    return 'professional';
  }
  if (name.includes('growth') || name.includes('business')) {
    return 'growth';
  }
  return 'starter';
}