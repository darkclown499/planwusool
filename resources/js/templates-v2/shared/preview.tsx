import React from 'react';
import { ProductProvider } from '@/contexts/ProductContext';
import { StoreProvider } from '@/contexts/StoreContext';
import type { TemplateModule } from '../types';
import { buildFashionPreviewStoreData } from '../fashion-atelier/demo-data';
import { buildGroceryPreviewStoreData } from '../grocery-souq/demo-data';
import { buildBakeryPreviewStoreData } from '../bakery-house/demo-data';
import { buildRestaurantPreviewStoreData } from '../restaurant-menu/demo-data';
import { buildElectronicsPreviewStoreData } from '../electronics-hub/demo-data';
import { buildBazaarPreviewStoreData } from '../bazaar-market/demo-data';

/* ===================================================================== */
/* v2 template gallery preview plumbing.                                  */
/*                                                                        */
/* Wraps a template Root with the minimal providers its header/footer     */
/* consume (store config + product catalog) and feeds sector-authentic    */
/* demo data so merchants see "their store already running" the template. */
/* ===================================================================== */

type DemoBuilder = (store: any, branding?: Record<string, any>) => any;

const DEMO_BUILDERS: Record<string, DemoBuilder> = {
  'fashion-atelier': (store, branding) => buildFashionPreviewStoreData(store, branding),
  'grocery-souq': (store, branding) => buildGroceryPreviewStoreData(store, branding),
  'bakery-house': (store, branding) => buildBakeryPreviewStoreData(store, branding),
  'restaurant-menu': (store, branding) => buildRestaurantPreviewStoreData(store, branding),
  'electronics-hub': (store, branding) => buildElectronicsPreviewStoreData(store, branding),
  'bazaar-market': (store, branding) => buildBazaarPreviewStoreData(store, branding),
};

export function buildV2PreviewStoreData(module: TemplateModule, store: any, branding?: Record<string, any>): any {
  const builder = DEMO_BUILDERS[module.meta.slug];
  if (builder) return builder(store, branding);
  // Generic fallback — bazaar is the default template for any store.
  return DEMO_BUILDERS['bazaar-market']!(store, branding);
}

export const V2PreviewProviders: React.FC<{ storeData: any; children: React.ReactNode }> = ({ storeData, children }) => (
  <StoreProvider
    config={storeData.config || {}}
    store={storeData}
    content={storeData.content}
    behavior={storeData.behavior}
  >
    <ProductProvider products={storeData.products || []} categories={storeData.categories || []}>
      {children}
    </ProductProvider>
  </StoreProvider>
);
