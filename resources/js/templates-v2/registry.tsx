import type { TemplateModule, V2TemplateSlug } from './types';
import fashionAtelier from './fashion-atelier';
import grocerySouq from './grocery-souq';
import bakeryHouse from './bakery-house';
import restaurantMenu from './restaurant-menu';
import electronicsHub from './electronics-hub';
import bazaarMarket from './bazaar-market';

/* ===================================================================== */
/* The v2 template registry.                                              */
/*                                                                        */
/* Static imports (not lazy chunks) on purpose: storefront pages are      */
/* server-rendered for SEO, and renderToString needs the real component   */
/* tree synchronously. Bundle splitting per template can be revisited     */
/* once SSR streams Suspense boundaries reliably.                         */
/* ===================================================================== */

const MODULES: Partial<Record<V2TemplateSlug, TemplateModule>> = {
  'fashion-atelier': fashionAtelier,
  'grocery-souq': grocerySouq,
  'bakery-house': bakeryHouse,
  'restaurant-menu': restaurantMenu,
  'electronics-hub': electronicsHub,
  'bazaar-market': bazaarMarket,
};

/** Fallback module used until every launch template ships. */
function fallbackModule(): TemplateModule {
  return MODULES['bazaar-market'] || MODULES['grocery-souq'] || MODULES['fashion-atelier']!;
}

export function getTemplateModule(slug?: string | null): TemplateModule | null {
  if (!slug) return null;
  const normalized = normalizeV2Slug(slug);
  return MODULES[normalized] || null;
}

/** Always resolves to a module — unknown slugs land on the fallback. */
export function requireTemplateModule(slug?: string | null): TemplateModule {
  return getTemplateModule(slug) || fallbackModule();
}

/**
 * Maps any slug (legacy catalog, engine theme or v2) onto the v2 catalog.
 * Legacy slugs route to their closest sector sibling so old stores keep
 * rendering through the new pipeline with zero data migration.
 */
export function normalizeV2Slug(slug?: string | null): V2TemplateSlug {
  const s = String(slug || '').trim().toLowerCase();

  if ((MODULES as any)[s]) return s as V2TemplateSlug;

  // --- Fashion / clothing / boutique ---
  if (
    /fashion|cloth|boutique|abaya|hijab|kids|child|toy|cosmetic|beauty|perfume|jewel|shoe|bag|lingerie|underwear|watch/.test(s)
  ) {
    return 'fashion-atelier';
  }
  // --- Grocery / supermarket / hypermarket ---
  if (/grocery|super-?market|^super$|hyper|mart|minimarket|min-market|souq|spice|attar|nuts/.test(s)) {
    return 'grocery-souq';
  }
  // --- Bakery / sweets ---
  if (/bakery|baker|sweet|dessert|cake|choco|pastry|fresh-produce|organic|farm/.test(s)) {
    return 'bakery-house';
  }
  // --- Restaurant / food service ---
  if (/restaurant|food|grill|burger|pizza|cafe|coffee|kitchen|menu|catering/.test(s)) {
    return 'restaurant-menu';
  }
  // --- Electronics / tech ---
  if (/electro|tech|phone|mobile|computer|gadget|digital|camera|store-?front|auto-garage|garage/.test(s)) {
    return 'electronics-hub';
  }

  // Everything else (classic, e-storefront, mega-store variants...) lands
  // on the general-purpose bazaar template.
  return 'bazaar-market';
}

/** Catalog listing for pickers/onboarding (built modules only). */
export function listTemplateModules(): TemplateModule[] {
  return Object.values(MODULES).filter(Boolean) as TemplateModule[];
}
