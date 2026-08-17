import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { TemplateRenderer } from '@/templates/TemplateRenderer';
import { getTemplateConfig } from '@/templates/registry';
import { TemplateStorefront } from '@/templates/storefront';
import React, { useMemo } from 'react';

interface DynamicStoreProps {
    template: string;
    templateConfig?: any;
    designTokens?: any;
    templateOverrides?: { sections?: any[] } | null;
    store: any;
    categories: any[];
    products: any[];
    config?: any;
    storeSettings?: any;
    storeContent?: any;
    offers?: any[];
    storePages?: any[];
    behavior?: any;
    page?: any;
    isPreview?: boolean;
    userPlanName?: string | null;
    userPlanTier?: 'starter' | 'growth' | 'professional' | null;
    isSuperAdmin?: boolean;
    demoStoreUrl?: string;
    isLoggedIn?: boolean;
    customer?: any;
    customer_address?: any[];
    action?: string | null;
}

/**
 * DynamicStore - renders a store using the new template system.
 * The template config is passed from the controller, or falls back
 * to the static frontend registry. The page is wrapped in the full
 * storefront feature stack (ThemeProvider + TemplateStorefront) so
 * every template gets cart, checkout, login, orders and profile.
 */
const DynamicStore: React.FC<DynamicStoreProps> = ({
    template,
    templateConfig,
    designTokens,
    templateOverrides,
    store,
    categories,
    products,
    config,
    storeSettings,
    storeContent,
    offers = [],
    storePages = [],
    behavior = {},
    page = null,
    isPreview = false,
    userPlanName = null,
    userPlanTier = null,
    isSuperAdmin = false,
    demoStoreUrl = '',
    isLoggedIn = false,
    customer = null,
    customer_address = [],
    action = null,
}) => {
    const resolvedTemplate = useMemo(() => {
        if (templateConfig) {
            return templateConfig;
        }
        return getTemplateConfig(template) || getTemplateConfig('core-minimal');
    }, [template, templateConfig]);

    const storeData = useMemo(
        () => ({
            ...store,
            categories,
            products,
            config,
            storeSettings,
            content: storeContent,
            offers,
            pages: storePages,
            behavior,
        }),
        [store, categories, products, config, storeSettings, storeContent, offers, storePages, behavior],
    );

    // Plan gating on the storefront is based on the store owner's plan (passed
    // from the server), not the viewer. Preview/demo + superadmin bypass gating.
    const effectiveSuperAdmin = isSuperAdmin || isLoggedIn || isPreview;

    return (
        <>
            <CustomCodeInjector
                customCss={store?.custom_css}
                customJavascript={store?.custom_javascript}
            />
            <StoreHead store={store} products={products} defaultTitle={config?.storeName || store?.name || 'متجري'} defaultDescription={config?.description} />
            <ThemeProvider
                config={config ?? {}}
                store={store}
                categories={categories}
                products={products}
                content={storeContent}
                isLoggedIn={isLoggedIn}
                customer={customer}
                customerAddress={customer_address}
                action={action}
                behavior={behavior}
            >
                <StoreBoundary>
                    <TemplateStorefront>
                        <div className="pb-24 md:pb-16" style={{ background: 'var(--twc-background, #ffffff)' }}>
                            {page ? (
                                <TemplateRenderer
                                    template={resolvedTemplate}
                                    storeData={storeData}
                                    designTokens={designTokens}
                                    overrides={templateOverrides}
                                    isPreview={isPreview}
                                    userPlanName={userPlanName}
                                    userPlanTier={userPlanTier}
                                    isSuperAdmin={effectiveSuperAdmin}
                                    demoStoreUrl={demoStoreUrl}
                                    mode="page"
                                    page={page}
                                />
                            ) : (
                                <TemplateRenderer
                                    template={resolvedTemplate}
                                    storeData={storeData}
                                    designTokens={designTokens}
                                    overrides={templateOverrides}
                                    isPreview={isPreview}
                                    userPlanName={userPlanName}
                                    userPlanTier={userPlanTier}
                                    isSuperAdmin={effectiveSuperAdmin}
                                    demoStoreUrl={demoStoreUrl}
                                />
                            )}
                        </div>
                    </TemplateStorefront>
                </StoreBoundary>
            </ThemeProvider>
        </>
    );
};

export default DynamicStore;