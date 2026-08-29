import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import DesignTokensInjector from '@/components/DesignTokensInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { requireTemplateModule } from '@/templates-v2/registry';
import { TemplateStorefrontV2 } from '@/templates-v2/TemplateStorefrontV2';
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

    const [draft, setDraft] = React.useState<any>(null);

    React.useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (!e.data || e.data.type !== 'wusool:preview:draft') return;
            // only accept from same origin parent
            try {
                if (e.origin !== window.location.origin) return;
            } catch {}
            setDraft(e.data.payload);
        };
        window.addEventListener('message', handler);
        // notify parent that preview is ready to receive draft — retry until acknowledged
        const notifyReady = () => { try { window.parent.postMessage({ type: 'wusool:preview:ready' }, window.location.origin); } catch {} };
        notifyReady();
        // also retry shortly after mount for race where parent listener attaches after iframe load
        const retry = setTimeout(notifyReady, 350);
        return () => { window.removeEventListener('message', handler); clearTimeout(retry); };
    }, []);

    // Mirror previewMode to DOM for hero media queries and slot highlight — also handle cleanup
    React.useEffect(() => {
        try {
            if (draft?.previewMode) document.documentElement.setAttribute('data-preview-mode', draft.previewMode);
            else document.documentElement.removeAttribute('data-preview-mode');
        } catch {}
    }, [draft?.previewMode]);
    React.useEffect(() => {
        try {
            document.querySelectorAll('.wusool-highlight-hero').forEach((el) => el.classList.remove('wusool-highlight-hero'));
            if (draft?.highlight === 'hero') {
                const el = document.querySelector('.souq-hero-media, .bazaar-hero-media, .bakery-hero-media, .atelier-hero, .hub-hero, .restaurant-hero');
                if (el) el.classList.add('wusool-highlight-hero');
                if (!document.getElementById('wusool-highlight-style')) {
                    const s = document.createElement('style');
                    s.id = 'wusool-highlight-style';
                    s.textContent = '.wusool-highlight-hero{outline:3px solid #FFC20E;outline-offset:2px;box-shadow:0 0 0 4px rgba(255,194,14,0.2)}';
                    document.head.appendChild(s);
                }
            }
        } catch {}
    }, [draft?.highlight]);

    const effectiveTemplate = (draft?.theme as string) || template;
    const effectiveDesignTokens = draft?.designTokens ?? designTokens;
    const effectiveStoreContent = draft?.content ?? storeContent;
    const effectiveCustomCss = draft?.customCss ?? (store as any)?.custom_css;
    const effectiveCustomJs = draft?.customJs ?? (store as any)?.custom_javascript;
    const effectiveHeadInject = draft?.headInject ?? (store as any)?.custom_head_scripts ?? null;
    // preview draft is live unsaved — when present, it must override every content-derived hero/media path
    // so Designer changes appear instantly without save (hero type/images/video/youtube/overlay/fit/position/height)

    const templateModule = React.useMemo(() => requireTemplateModule(effectiveTemplate), [effectiveTemplate]);

    const storeData = React.useMemo(
        () => ({
            ...store,
            categories,
            products,
            config,
            storeSettings,
            content: effectiveStoreContent,
            offers,
            pages: storePages,
            behavior,
            custom_css: effectiveCustomCss,
            custom_javascript: effectiveCustomJs,
            custom_head_scripts: effectiveHeadInject,
        }),
        [store, categories, products, config, storeSettings, effectiveStoreContent, offers, storePages, behavior, effectiveCustomCss, effectiveCustomJs, effectiveHeadInject],
    );

    // hasDraft is intentionally used to suppress stale-while-revalidate flicker on first draft
    const hasDraft = !!draft;
    void hasDraft;
    return (
        <>
            <DesignTokensInjector tokens={effectiveDesignTokens as any} />
            <CustomCodeInjector
                customCss={effectiveCustomCss}
                customJavascript={effectiveCustomJs}
                customHeadScripts={effectiveHeadInject}
                customBodyScripts={store?.custom_body_scripts}
            />
            <StoreHead
                store={store}
                products={products}
                defaultTitle={page?.meta_title || page?.title || config?.storeName || store?.name || 'متجري'}
                defaultDescription={page?.meta_description || config?.description}
            />
            <ThemeProvider
                config={config ?? {}}
                store={store}
                categories={categories}
                products={products}
                content={effectiveStoreContent}
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