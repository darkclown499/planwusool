import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import type { TemplateCategoryPageData } from '@/templates-v2';
import { requireTemplateModule, TemplateStorefrontV2 } from '@/templates-v2';
import React from 'react';
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
    categoryPage: TemplateCategoryPageData;
}

/**
 * CategoryListing page (/category/{slug}) — the dedicated category view.
 * Same storefront feature stack as the dynamic home (cart, checkout,
 * wishlist, auth) with the store chrome wrapped around the listing body
 * and category-specific SEO tags.
 */
const CategoryStore: React.FC<CategoryStoreProps> = ({
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
    isLoggedIn = false,
    customer = null,
    customer_address = [],
    action = null,
    categoryPage,
}) => {
    const { category } = categoryPage;
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
                    <TemplateStorefrontV2 module={templateModule}>
                        <templateModule.Root
                            storeData={storeData}
                            mode="category"
                            categoryData={categoryPage}
                        />
                    </TemplateStorefrontV2>
                </StoreBoundary>
            </ThemeProvider>
        </>
    );
};

export default CategoryStore;
