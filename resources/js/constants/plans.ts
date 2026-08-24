export type PlanFeature = 'custom_domain' | 'custom_subdomain' | 'pwa' | 'chatgpt' | 'shipping_method' | 'mobile_app' | 'branding' | 'accounting_integration' | 'theme_editor';

export const PLAN_FEATURES: Record<string, Record<PlanFeature, boolean>> = {
  starter: {
    custom_domain: false,
    custom_subdomain: true,
    pwa: false,
    chatgpt: false,
    shipping_method: false,
    mobile_app: false,
    branding: false,
    accounting_integration: false,
    theme_editor: false,
  },
  growth: {
    custom_domain: true,
    custom_subdomain: true,
    pwa: true,
    chatgpt: true,
    shipping_method: true,
    mobile_app: false,
    branding: false,
    accounting_integration: false,
    theme_editor: false,
  },
  professional: {
    custom_domain: true,
    custom_subdomain: true,
    pwa: true,
    chatgpt: true,
    shipping_method: true,
    mobile_app: true,
    branding: true,
    accounting_integration: true,
    theme_editor: true,
  },
};

// Super admin / store owner testing bypass:
// const canAddDomain = store.plan.features?.custom_domain || currentUser.isSuperAdmin;
// See resources/js/pages/stores/components/domains-tab.tsx
