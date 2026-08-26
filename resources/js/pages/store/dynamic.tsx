import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import DesignTokensInjector from '@/components/DesignTokensInjector';
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
    isOwnerPreview?: boolean;
    previewBanner?: string | null;
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
    designTokens,
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
    isOwnerPreview = false,
    previewBanner = null,
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
            <DesignTokensInjector tokens={designTokens as any} />
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
                        {/* Owner preview banner for unpublished stores — Arabic, non-intrusive */}
                        {isOwnerPreview && (
                            <div className="sticky top-0 z-50 w-full bg-slate-900/95 text-white backdrop-blur border-b border-slate-700">
                                <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="font-medium">{previewBanner || 'وضع المعاينة — المتجر غير منشور'}</span>
                                    <span className="hidden sm:inline text-slate-300">· الطلبات معطّلة في المعاينة</span>
                                </div>
                            </div>
                        )}
                        {/* Template Preview Mode banner */}
                        {isPreview && !isOwnerPreview && (
                            <div className="sticky top-0 z-50 w-full bg-amber-500/90 text-white opacity-80 backdrop-blur border-b border-amber-600">
                                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                                        <span className="font-medium">{t('Preview Mode')}</span>
                                        <span className="hidden sm:inline opacity-90">
                                            {t('You are viewing a live template preview. Changes are not saved.')}
                                        </span>
                                    </div>
                                    <a
                                        href={window.location.pathname}
                                        className="inline-flex shrink-0 items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                    >
                                        <X className="h-3 w-3" />
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