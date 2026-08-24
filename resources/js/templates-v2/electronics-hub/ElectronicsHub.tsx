import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { BadgeCheck, ChevronLeft, Cpu, Headphones, Laptop, PackageSearch, Plus, ShieldCheck, ShoppingCart, Smartphone, Truck, Watch, Zap } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import {
  discountPercent,
  isVariableProduct,
  lowStockRemaining,
  useCountdown,
  usePriceFormatter,
  useStorefrontCore,
  type V2Product,
} from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import type { TemplateRootProps } from '../types';

/* ===================================================================== */
/* عالم التقنية — Electronics Hub                                         */
/* A cool tech-dealer storefront: slate surfaces with electric-blue       */
/* accents, spec-first product cards, deal-of-the-day countdown and a     */
/* warranty/trust stack.                                                  */
/* ===================================================================== */

const ACCENT = '#2563eb';
const CATEGORY_ICONS: Array<{ test: RegExp; icon: React.ReactNode }> = [
  { test: /جوال|هاتف|phone/i, icon: <Smartphone className="h-5 w-5" /> },
  { test: /لابتوب|حاسوب|laptop|pc/i, icon: <Laptop className="h-5 w-5" /> },
  { test: /سماعة|صوت|audio/i, icon: <Headphones className="h-5 w-5" /> },
  { test: /ساعة|watch/i, icon: <Watch className="h-5 w-5" /> },
];

function categoryIcon(name: string) {
  return CATEGORY_ICONS.find((c) => c.test.test(name))?.icon ?? <Cpu className="h-5 w-5" />;
}

/* ------------------------------ Header ------------------------------ */

export function HubHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, content } = useStorefrontCore() as any;
  const [q, setQ] = useState('');
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const categories = (product?.categories || []).slice(0, 8);

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return (product?.products || []).filter((p: any) => String(p.name || '').toLowerCase().includes(query)).slice(0, 7);
  }, [q, product?.products]);

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100" dir="rtl">
      {/* Trust strip */}
      <div className="border-b border-slate-800/70 bg-[#0e1729]">
        <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-1.5 text-[11px] font-semibold text-slate-400 sm:px-6 lg:px-8">
          <span className="flex items-center gap-1 whitespace-nowrap"><ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> ضمان رسمي سنة</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><Truck className="h-3.5 w-3.5 text-blue-400" /> توصيل 24 ساعة داخل المدينة</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><BadgeCheck className="h-3.5 w-3.5 text-blue-400" /> أجهزة أصلية 100%</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a href={homeHref} className="flex shrink-0 items-center gap-2">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto rounded bg-white object-contain p-0.5" />
          ) : (
            <>
              <span className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 p-1.5 text-white shadow-lg shadow-blue-500/25"><Zap className="h-5 w-5" /></span>
              <span className="hidden text-lg font-black tracking-tight text-white sm:block">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>

        {/* Search-first */}
        <div className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن جهاز… آيفون، لابتوب، سماعات"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl">
              {matches.map((p: any) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setQ(''); product.handleProductClick(p); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start transition hover:bg-slate-800">
                    <img src={getImageUrl(p.image || '')} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-200">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))}
            aria-label="حسابي"
            className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white sm:block"
          >
            دخول
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة"
            className="relative flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-black text-white transition hover:bg-blue-500">
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-blue-700">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Category bar — hidden by default; enable via settings.show_categories_bar */}
      {showCategoriesBar && categories.length > 0 && (
        <div className="border-t border-slate-800/60">
          <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 lg:px-8">
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-blue-300">
                <span className="text-blue-400">{categoryIcon(c.name)}</span>
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------- Hero ------------------------------- */

export function HubHero({ banner }: { banner?: any }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-l from-[#0b1220] via-[#12203d] to-[#0b1220]" dir="rtl">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:py-16 lg:px-8">
        <div>
          <p className="mb-2 inline-block rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-black tracking-wide text-blue-300 ring-1 ring-blue-500/30">
            {banner?.subtitle || 'إصدارات 2026 وصلت'}
          </p>
          <h1 className="text-3xl font-black leading-snug text-white sm:text-5xl">{banner?.title || 'تقنية تليق بك'}</h1>
          <p className="mt-3 max-w-md leading-relaxed text-slate-400">أحدث الأجهزة بأسعار منافسة، ضمان رسمي معتمد، وتوصيل سريع لباب بيتك.</p>
          <a href="#hub-deals" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-500">
            <Zap className="h-4 w-4" /> {banner?.button_text || 'تصفح عروض اليوم'}
          </a>
        </div>
        <div className="relative hidden justify-self-end sm:block">
          <img src={getImageUrl(banner?.image || '/images/store/electronics.jpg')} alt="" className="max-h-64 rounded-2xl border border-slate-700/60 shadow-2xl shadow-blue-900/40" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Product card --------------------------- */

export function HubCard({ product }: { product: V2Product }) {
  const { cart, product: productCtx, wishlist, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  // Spec teaser: the first meaningful description line.
  const specLine = useMemo(() => {
    const line = String(product.description || '').split('\n').map((s) => s.trim()).find(Boolean);
    return line ? line.slice(0, 64) : '';
  }, [product.description]);

  const add = async () => {
    if (variable) return productCtx.handleProductClick(product);
    await cart.addToCart(product as any);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#101a2e] transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-950/50" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-square w-full overflow-hidden bg-[#0b1220]" aria-label={product.name}>
        <img src={getImageUrl(product.image || '')} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {discount > 0 && !out && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-black text-white">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-black text-slate-900">آخر {remaining} قطع</span>
        )}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-black text-slate-400">غير متوفر</span>}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          aria-label="مقارنة/مفضلة"
          className={`absolute top-2.5 left-2.5 rounded-lg p-1.5 backdrop-blur transition ${wished ? 'bg-blue-600 text-white' : 'bg-slate-900/70 text-slate-300'}`}
        >
          ♥
        </button>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-11 text-start text-[13.5px] font-bold leading-snug text-slate-100 hover:text-blue-300">
          {product.name}
        </button>
        {specLine && (
          <p className="line-clamp-1 min-h-4 text-[11px] text-slate-500" title={specLine}>{specLine}</p>
        )}
        <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
          <ShieldCheck className="h-3 w-3" /> ضمان سنة • أصلي
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="leading-tight">
            <p className="text-lg font-black text-white">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-xs text-slate-500 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button type="button" onClick={add} aria-label="أضف للسلة"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500 active:scale-90">
              <Plus className="h-4 w-4" strokeWidth={2.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Deals section --------------------------- */

export function HubDealOfTheDay({ products }: { products: V2Product[] }) {
  const deadline = useMemo(() => new Date(Date.now() + 26 * 3600_000), []);
  const cd = useCountdown(deadline);
  const deals = useMemo(
    () => products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price)).slice(0, 8),
    [products]
  );
  if (!deals.length || !cd) return null;

  return (
    <section id="hub-deals" className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="rounded-3xl border border-blue-900/50 bg-gradient-to-l from-[#0e1a33] to-[#101a2e] p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-white">
            <span className="rounded-lg bg-red-600 px-2.5 py-1 text-sm">⚡ صفقات النهار</span>
          </h2>
          <div className="flex items-center gap-1.5 font-black text-white" dir="ltr">
            {[
              { v: String(cd.hours).padStart(2, '0'), l: 'H' },
              { v: String(cd.minutes).padStart(2, '0'), l: 'M' },
              { v: String(cd.seconds).padStart(2, '0'), l: 'S' },
            ].map(({ v, l }) => (
              <span key={l} className="flex flex-col items-center">
                <span className="min-w-11 rounded-lg bg-slate-800 px-2 py-1.5 text-center text-lg tabular-nums ring-1 ring-slate-700">{v}</span>
                <span className="mt-0.5 text-[9px] font-bold text-slate-500">{l}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {deals.slice(0, 4).map((p) => (
            <HubCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Footer ------------------------------ */
// HubFooter removed — footer hidden across all theme families.

/* ================================ ROOT ================================ */

const SORTS = ['newest', 'price_asc', 'price_desc', 'name'];
const SORT_LABELS: Record<string, string> = { newest: 'الأحدث', price_asc: 'الأرخص', price_desc: 'الأغلى', name: 'أبجدياً' };

export const ElectronicsHubRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <HubCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0b1220]">
        <HubHeader />
        <main className="prose-custom2 mx-auto max-w-4xl px-4 py-10 sm:px-6 [&_a]:!text-blue-300 [&_h1]:!text-white [&_p]:!text-slate-300 [&_strong]:!text-white">
          <h1 className="mb-6 border-b border-slate-800 pb-3 text-2xl font-black text-white">{page?.title}</h1>
          <article dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
        </main>
      </div>
    );
  }
  return <HubHome storeData={storeData} />;
};

const sortList = (list: any[], sort?: string) => {
  const arr = [...list];
  switch (sort) {
    case 'price_asc': return arr.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price_desc': return arr.sort((a, b) => Number(b.price) - Number(a.price));
    case 'name': return arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
    default: return arr;
  }
};

const HubHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  const newest = useMemo(() => [...products].reverse().slice(0, 12), [products]);
  const brands = useMemo(() => {
    // Unique first tokens of product names — a light-weight brand rail.
    const seen = new Set<string>();
    for (const p of products) {
      const token = String(p.name || '').split(' ')[0];
      if (token && token.length > 1) seen.add(token);
      if (seen.size >= 10) break;
    }
    return Array.from(seen);
  }, [products]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0b1220] text-slate-200 antialiased selection:bg-blue-600 selection:text-white">
      <HubHeader />
      <main className="pb-16">
        <HubHero banner={banners[0]} />

        {/* Brand rail */}
        {brands.length > 1 && (
          <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-500">علامات نثق بها:</span>
              {brands.map((b) => (
                <span key={b} className="rounded-full border border-slate-700 bg-slate-900 px-3.5 py-1 text-xs font-bold text-slate-300">{b}</span>
              ))}
            </div>
          </section>
        )}

        <HubDealOfTheDay products={products} />

        {/* Category tiles */}
        {categories.length > 0 && (
          <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 text-xl font-black text-white">تسوّق حسب القسم</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {categories.slice(0, 12).map((c: any) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className="group flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-[#101a2e] p-2.5 transition hover:border-blue-500/50 hover:bg-[#12203d] sm:gap-2 sm:p-4">
                  <span className="text-blue-400">{categoryIcon(c.name)}</span>
                  <span className="max-w-[80px] break-words text-center text-xs font-bold leading-tight text-slate-300 group-hover:text-blue-300 line-clamp-2">{c.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Newest arrivals — toggle show_latest_products */}
        {showLatest && (
          <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white">
              وصل حديثاً <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs text-blue-300">NEW</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              {newest.map((p) => (
                <HubCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Best sellers block hidden for electronics — still respects show_best_sellers */}
        {/* Dynamic category sections */}
        {homepageCategories.length > 0 && (
          <div className="space-y-12 pt-12">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              return (
                <section key={cat.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-black text-white">{cat.name}</h2>
                    <a href={`/category/${cat.slug || cat.id}`} className="text-sm font-bold text-blue-300 hover:text-white">عرض الكل ←</a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                    {catProducts.map((p: any) => (
                      <HubCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
};

const HubCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const cat = categoryData?.category;
  const products = useMemo(() => sortList(product?.products || [], categoryData?.sort), [product?.products, categoryData?.sort]);
  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0b1220] text-slate-200 antialiased">
      <HubHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
          <a href="/" className="font-bold hover:text-blue-300">الرئيسية</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-black text-white">{cat?.name}</span>
        </nav>
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black text-white">
              <span className="text-blue-400">{cat ? categoryIcon(cat.name) : null}</span> {cat?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{categoryData?.total ?? 0} جهاز</p>
          </div>
          <div className="flex items-center gap-1.5">
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => navigate({ sort: s })}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  categoryData?.sort === s ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 ring-1 ring-slate-800 hover:text-blue-300'
                }`}
              >
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        </header>

        {cat && products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-slate-700" />
            <p className="text-lg font-bold text-slate-400">لا توجد أجهزة بهذا القسم حالياً</p>
            <a href="/" className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-500">تصفح بقية الأقسام</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <HubCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData && categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm font-black transition ${
                      n === categoryData.currentPage ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 ring-1 ring-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
};
