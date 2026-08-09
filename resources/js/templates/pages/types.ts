import type { DesignTokens, PlanTier, TemplateConfig } from '@/templates/types';

/**
 * Props passed to every dedicated template page component.
 * Mirrors what TemplateRenderer passes to the section renderer, plus the
 * plan-gating info so pages can degrade gracefully.
 */
export interface TemplatePageProps {
    template: TemplateConfig;
    storeData: any;
    designTokens?: DesignTokens | null;
    isPreview?: boolean;
    userPlanName?: string | null;
    userPlanTier?: PlanTier;
    isSuperAdmin?: boolean;
    demoStoreUrl?: string;
}

/**
 * Build the store identity data used by every page (store name, logo,
 * contact info) from the storefront config with sensible fallbacks.
 */
export function storeIdentity(config: any, storeData: any) {
    const store = storeData?.store || {};
    return {
        name: config?.storeName || store.name || 'متجري',
        logo: config?.logo || store.logo || '',
        phone: config?.whatsapp_widget_phone || config?.phoneNumber || config?.socialMedia?.whatsapp || '',
        currency: config?.currency || store.currency || '₪',
        description: config?.description || store.description || '',
    };
}
