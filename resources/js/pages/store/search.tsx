import StoreBoundary from '@/components/StoreBoundary';
import { CustomCodeInjector } from '@/components/CustomCodeInjector';
import DesignTokensInjector from '@/components/DesignTokensInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { requireTemplateModule } from '@/templates-v2/registry';
import { TemplateStorefrontV2 } from '@/templates-v2/TemplateStorefrontV2';
import { SearchResultsView } from '@/templates-v2/shared/SearchResultsView';
import React from 'react';
import { Head } from '@inertiajs/react';

interface SearchStoreProps {
  template: string;
  designTokens?: any;
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
  isLoggedIn?: boolean;
  customer?: any;
  customer_address?: any[];
  action?: string | null;
  searchPage: {
    query: string;
    rawQuery: string;
    products: any[];
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    sort: string;
    category?: string;
    availability?: string;
    onSale?: boolean;
  };
}

const SearchStore: React.FC<SearchStoreProps> = ({
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
  isLoggedIn = false,
  customer = null,
  customer_address = [],
  action = null,
  searchPage,
}) => {
  const templateModule = React.useMemo(() => requireTemplateModule(template), [template]);
  const accent = (templateModule as any)?.meta?.accent;
  const storeData = React.useMemo(
    () => ({ ...store, categories, products, config, storeSettings, content: storeContent, offers, pages: storePages, behavior }),
    [store, categories, products, config, storeSettings, storeContent, offers, storePages, behavior]
  );
  const seoTitle = searchPage.query
    ? `نتائج البحث عن "${searchPage.query}" — ${config?.storeName || store?.name || ''}`
    : `بحث — ${config?.storeName || store?.name || ''}`;

  return (
    <>
      <DesignTokensInjector tokens={designTokens as any} />
      <Head title={seoTitle}>
        <meta name="robots" content="noindex, follow" />
        <meta name="description" content={`نتائج البحث عن "${searchPage.query}" في ${config?.storeName || store?.name || 'المتجر'}`} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.pathname : ''} />
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
        products={searchPage.products}
        content={storeContent}
        isLoggedIn={isLoggedIn}
        customer={customer}
        customerAddress={customer_address}
        action={action}
        behavior={behavior}
      >
        <StoreBoundary>
          <TemplateStorefrontV2 module={templateModule}>
            {/* Reuse template header for chrome consistency */}
            <div className="min-h-screen bg-stone-50">
              <SearchResultsView searchPage={searchPage} categories={categories} accent={accent} />
            </div>
          </TemplateStorefrontV2>
        </StoreBoundary>
      </ThemeProvider>
    </>
  );
};

export default SearchStore;
