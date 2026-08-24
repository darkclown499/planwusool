import { getDemoCatalog } from './demo-catalogs';
import type { BuilderTemplateConfig } from './types';

export interface StoreBranding {
  name?: string;
  logo?: string | null;
  phone?: string | null;
}

/** Build a realistic preview payload: the merchant's real branding and
 *  actual categories/products when present, filled up with niche demo
 *  content so every template preview always looks fully stocked. */
export const buildPreviewStoreData = (
  tpl: BuilderTemplateConfig,
  store: any,
  branding?: StoreBranding
) => {
  const catalog = getDemoCatalog(tpl.slug);
  const realCategories = (store?.categories || []).filter((c: any) => c?.name);
  const realProducts = (store?.products || []).filter((p: any) => p?.name);
  const logo = branding?.logo || null;
  return {
    id: store?.id ?? 0,
    name: store?.name || `معاينة ${tpl.name}`,
    slug: store?.slug || 'theme-preview',
    logo,
    categories: realCategories.length ? realCategories : catalog.categories,
    products: realProducts.length ? realProducts : catalog.products,
    config: {
      ...(store?.config || {}),
      storeName: store?.name || tpl.name,
      logo,
      phoneNumber: branding?.phone || undefined,
      whatsapp_widget_phone: branding?.phone || undefined,
    },
    content: {},
    offers: [],
    pages: [],
    behavior: {},
  };
};
