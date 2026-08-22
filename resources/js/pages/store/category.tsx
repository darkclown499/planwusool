import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { StoreSite, type CategoryPageData } from '@/builder';
import { TemplateStorefront } from '@/templates/storefront';
import React, { Suspense } from 'react';
import { Head } from '@inertiajs/react';

interface CategoryStoreProps {
    template: string;
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
    isPreview?: boolean;
    userPlanName?: string | null;
    userPlanTier?: 'starter' | 'growth' | 'professional' | null;
    isSuperAdmin?: boolean;
    isLoggedIn?: boolean;
    customer?: any;
    customer_address?: any[];
    action?: string | null;
    categoryPage: CategoryPageData;
}

/**
 * CategoryListing page (/category/{slug}) — the dedicated category view.
 * Same storefront feature stack as the dynamic home (cart, checkout,
 * wishlist, auth) with the store chrome wrapped around the listing body
 * and category-specific SEO tags.
 */
const CategoryStore: React.FC<CategoryStoreProps> = ({
    template,
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
    isPreview = false,
    userPlanName = null,
    userPlanTier = null,
    isSuperAdmin = false,
    isLoggedIn = false,
    customer = null,
    customer_address = [],
    action = null,
    categoryPage,
}) => {
    const { category } = categoryPage;

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

    const seoTitle = `${category.name} — ${config?.storeName || store?.name || ''}`;
    const seoDescription =
        category.description ||
        `تصفح منتجات قسم ${category.name} في ${config?.storeName || store?.name || 'متجرنا'} واطلب مباشرة عبر واتساب.`;

    return (
        <>
            <Head title={seoTitle}>
                <meta name="description" content={seoDescription} />
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDescription} />
                <meta property="og:type" content="website" />
            </Head>
            <CustomCodeInjector
                customCss={store?.custom_css}
                customJavascript={store?.custom_javascript}
                customHeadScripts={store?.custom_head_scripts}
                customBodyScripts={store?.custom_body_scripts}
            />
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
                        <Suspense fallback={null}>
                            <StoreSite
                                template={template}
                                designTokens={designTokens}
                                templateOverrides={templateOverrides}
                                storeData={storeData}
                                userPlanName={userPlanName}
                                userPlanTier={userPlanTier}
                                isSuperAdmin={isSuperAdmin}
                                isPreview={isPreview}
                                mode="category"
                                categoryData={categoryPage}
                            />
                        </Suspense>
                    </TemplateStorefront>
                </StoreBoundary>
            </ThemeProvider>
        </>
    );
};

export default CategoryStore;
