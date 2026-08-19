export type PlanTier = 'starter' | 'growth' | 'professional';

export type TemplateSectionType =
  | 'header'
  | 'hero'
  | 'categories'
  | 'products'
  | 'custom'
  | 'footer'
  | 'featured'
  | 'banner'
  | 'banners'
  | 'offers'
  | 'video'
  | 'reviews'
  | 'sidebar';

/**
 * Explicit Tailwind classes attached to each section from the template JSON.
 * Keeps the template's visual identity self-contained and prevents flat/white gaps.
 */
export interface SectionClasses {
  section?: string;
  container?: string;
  heading?: string;
  subheading?: string;
  grid?: string;
  card?: string;
  header?: string;
  footer?: string;
  aside?: string;
  sidebar?: string;
}

export interface TemplateSectionConfig {
  id: string;
  type: TemplateSectionType;
  enabled: boolean;
  order: number;
  props: Record<string, any>;
  classes?: SectionClasses;
  conditions?: {
    plan_type?: PlanTier[];
    action: 'show' | 'hide' | 'readonly';
  };
}

export interface TemplateHeaderConfig {
  sticky?: boolean;
  show_search?: boolean;
  show_cart?: boolean;
  show_auth?: boolean;
  show_whatsapp?: boolean;
}

export interface TemplateLayoutConfig {
  container: string;
  spacing: 'compact' | 'normal' | 'comfortable';
  dark_mode?: boolean;
  sidebar?: boolean;
  columns?: number;
  gap?: string;
  header?: TemplateHeaderConfig;
}

export interface DesignTokens {
  colors: Record<string, string>;
  typography?: Record<string, string>;
  spacing?: Record<string, string>;
  borders?: Record<string, string | boolean>;
  shadows?: Record<string, string>;
}

export interface TemplateConfig {
  slug: string;
  name: string;
  name_en?: string;
  description?: string;
  category: string;
  is_free: boolean;
  plan_required: PlanTier;
  sections: TemplateSectionConfig[];
  layout: TemplateLayoutConfig;
  design_tokens?: DesignTokens;
  advanced_components?: string[];
}

export interface TemplateSummary {
  slug: string;
  name: string;
  name_en?: string;
  description?: string;
  category: string;
  is_free: boolean;
  plan_required: PlanTier;
  is_accessible?: boolean;
  sort_order?: number;
}

export interface StoreTemplateState {
  template_slug: string;
  design_tokens?: DesignTokens;
  template_overrides?: {
    sections?: TemplateSectionConfig[];
  };
  has_advanced_builder?: boolean;
  is_preview?: boolean;
}

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  starter: 1,
  growth: 2,
  professional: 3,
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  starter: 'starter',
  growth: 'growth',
  professional: 'professional',
};

export function canAccessTemplate(
  template: Pick<TemplateConfig, 'is_free' | 'plan_required'>,
  userPlanTier: PlanTier = 'starter'
): boolean {
  if (template.is_free) return true;
  return PLAN_HIERARCHY[userPlanTier] >= PLAN_HIERARCHY[template.plan_required];
}

export function getTemplateTierFromPlanName(planName?: string | null): PlanTier {
  const name = (planName || '').toLowerCase();
  if (name.includes('professional') || name.includes('premium') || name.includes('enterprise')) {
    return 'professional';
  }
  if (name.includes('growth') || name.includes('business') || name.includes('pro')) {
    return 'growth';
  }
  return 'starter';
}