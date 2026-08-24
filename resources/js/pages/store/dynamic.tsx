import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { requireTemplateModule, TemplateStorefrontV2 } from '@/templates-v2';
import React, { Suspense } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DynamicStoreProps {
    template: string;
    templateConfig?: any;
    designTokens?: any;
    themeConfig?: any;
    bannerSlides?: any[];
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
 * DynamicStore — the single storefront entry of the Wusool template system
 * v2. Every store (legacy slug included) resolves through normalizeV2Slug to
 * one fully bespoke template module; the module's own Root renders every
 * pixel while TemplateStorefrontV2 hosts its overlays on top of the shared
 * headless feature stack (cart, checkout, login, orders and payments).
 */
const DynamicStore: React.FC<DynamicStoreProps> = ({
    template,
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
    isLoggedIn = false,
    customer = null,
    customer_address = [],
    action = null,
}) => {
    const { t } = useTranslation();

    const templateModule = React.useMemo(() => requireTemplateModule(template), [template]);

    const storeData = React.useMemo(
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

    return (
        <>
            <CustomCodeInjector
                customCss={store?.custom_css}
                customJavascript={store?.custom_javascript}
                customHeadScripts={store?.custom_head_scripts}
                customBodyScripts={store?.custom_body_scripts}
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
                    <TemplateStorefrontV2 module={templateModule}>
                        {/* Exit Preview Toolbar */}
                        {isPreview && (
                            <div className="sticky top-0 z-50 w-full bg-amber-600 text-white shadow-md border-b border-amber-700">
                                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                                        <span className="text-sm font-medium">{t('Preview Mode')}</span>
                                        <span className="hidden sm:inline text-xs opacity-90">
                                            {t('You are viewing a live template preview. Changes are not saved.')}
                                        </span>
                                    </div>
                                    <a
                                        href={window.location.pathname}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                    >
                                        <X className="h-4 w-4" />
                                        {t('Exit Preview')}
                                    </a>
                                </div>
                            </div>
                        )}
                        <Suspense fallback={null}>
                            <templateModule.Root
                                storeData={storeData}
                                mode={page ? 'page' : 'home'}
                                page={page}
                            />
                        </Suspense>
                    </TemplateStorefrontV2>
                </StoreBoundary>
            </ThemeProvider>
        </>
    );
};

export default DynamicStore;