import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, Heart, PackageSearch, Plus, ShoppingBag, User } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import {
  discountPercent,
  isVariableProduct,
  lowStockRemaining,
  usePriceFormatter,
  useStorefrontCore,
  type V2Product,
} from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
import type { TemplateRootProps } from '../types';

/* ===================================================================== */
/* البازار — Bazaar Market                                                */
/* The general-purpose marketplace template and the system default.       */
/* Friendly teal-on-white storefront: a centered brand masthead, category */
/* circles, balanced product grid and a trust stack under every section.  */
/* ===================================================================== */

/* ------------------------------ Header ------------------------------ */

export function BazaarHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, content } = useStorefrontCore() as any;
  const [scrolled, setScrolled] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const categories = (product?.categories || []).slice(0, 8);

  return (
    <header className={`hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-shadow ${scrolled ? 'shadow-lg shadow-teal-950/5' : ''}`} dir="rtl">
      {/* Masthead */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a href={homeHref} className="flex items-center gap-2.5">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-11 w-auto object-contain" />
          ) : (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-black text-white shadow-md">س</span>
              <span className="min-w-0 max-w-[45vw] truncate text-xl font-black text-slate-900 sm:max-w-none">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="rounded-full p-2.5 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700">
            🔍
          </button>
          <div className="hidden sm:block">
            <HeaderLoyaltyBadge />
          </div>
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative rounded-full p-2.5 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700">
            <Heart className="h-5 w-5" strokeWidth={1.8} />
            {!!wishlist?.count && (
              <span className="absolute top-0 -right-1 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{wishlist.count}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))}
            aria-label="حسابي"
            className="hidden rounded-full p-2.5 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700 sm:block"
          >
            <User className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)}
            className="relative mr-1 flex items-center gap-2 rounded-full bg-gradient-to-l from-teal-600 to-emerald-600 py-2 pl-4 pr-3 text-sm font-black text-white shadow-md shadow-teal-600/25 transition hover:brightness-110">
            <ShoppingBag className="h-4 w-4" />
            السلة
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-teal-700">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Category nav — hidden by default; enable via settings.show_categories_bar */}
      {showCategoriesBar && categories.length > 0 && (
        <nav className="border-t border-slate-100">
          <div className="scrollbar-none mx-auto flex max-w-7xl items-center justify-start gap-0.5 overflow-x-auto px-4 sm:px-6 lg:justify-center lg:px-8">
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`}
                className="whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-teal-600 hover:text-teal-700">
                {c.name}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

/* ------------------------------- Hero ------------------------------- */

export function BazaarHero({ banners }: { banners: any[] }) {
  const slides = banners.length > 0 ? banners : [
    { title: 'كل احتياجاتك في مكان واحد', subtitle: 'شحن سريع لجميع المدن', image: '/images/store/banner-store.jpg', button_text: 'ابدأ التسوق' },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8" dir="rtl">
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-l from-teal-700 to-emerald-800 shadow-xl sm:h-72">
        {slides.map((b: any, idx: number) => (
          <div key={idx} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: idx === i ? 1 : 0 }} aria-hidden={idx !== i}>
            {b.image ? (
              <img src={getOptimizedImageUrl(b.image||'', 'medium')} alt="" className="h-full w-full object-cover opacity-75" loading="eager" decoding="async" fetchPriority="high" sizes="100vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(b.image||''))}} width={1200} height={400} />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/80 via-emerald-900/30 to-transparent" />
            <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-3 p-7 sm:p-12">
              {b.subtitle && <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">{b.subtitle}</p>}
              <h1 className="max-w-lg text-2xl font-black leading-snug text-white sm:text-4xl">{b.title}</h1>
              {b.button_text && (
                <a href={b.button_link || '#'} className="mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 shadow-lg transition hover:bg-emerald-50">
                  {b.button_text} ←
                </a>
              )}
            </div>
          </div>
        ))}
        {slides.length > 1 && (
          <div className="absolute bottom-4 right-1/2 flex translate-x-1/2 gap-1.5">
            {slides.map((_, idx: number) => (
              <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`شريحة ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* --------------------------- Product card --------------------------- */

export function BazaarCard({ product }: { product: V2Product }) {
  const { cart, product: productCtx, wishlist } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  const add = async () => {
    if (variable) return productCtx.handleProductClick(product);
    await cart.addToCart(product as any);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-950/5" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-[4/5] w-full overflow-hidden bg-slate-50" aria-label={product.name}>
        <img src={getOptimizedImageUrl(product.image || '', 'small')} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(product.image||''))}} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" width={400} height={400} />
        {discount > 0 && !out && (
          <span className="absolute top-2.5 right-2.5 rounded-lg bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-amber-400/95 px-2 py-0.5 text-[10px] font-black text-amber-950 backdrop-blur">آخر {remaining}</span>
        )}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-black text-slate-500">نفذت الكمية</span>}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          aria-label="المفضلة"
          className={`absolute top-2.5 left-2.5 rounded-full p-2 shadow-sm backdrop-blur transition ${wished ? 'bg-rose-500 text-white' : 'bg-white/85 text-slate-400 hover:text-rose-500'}`}
        >
          <Heart className="h-3.5 w-3.5" fill={wished ? 'currentColor' : 'none'} />
        </button>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-10 text-start text-sm font-bold leading-snug text-slate-800 hover:text-teal-700">
          {product.name}
        </button>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="leading-tight">
            <p className="text-lg font-black text-teal-700">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button type="button" onClick={add} aria-label="أضف للسلة"
              className="flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 text-xs font-black text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-500 active:scale-95">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> أضف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Trust stack ---------------------------- */
// BazaarTrustStrip removed — footer/bottom feature strip hidden across all theme families.

/* ------------------------------ Footer ------------------------------ */
// BazaarFooter removed — footer hidden across all theme families.

/* ================================ ROOT ================================ */

const SORTS = ['newest', 'price_asc', 'price_desc', 'name'];
const SORT_LABELS: Record<string, string> = { newest: 'الأحدث', price_asc: 'الأرخص أولاً', price_desc: 'الأغلى أولاً', name: 'أبجدياً' };

export const BazaarMarketRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <BazaarCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <BazaarHeader />
        <main className="prose-custom2 mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-slate-200 pb-3 text-2xl font-black text-slate-900">{page?.title}</h1>
          <article dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
        </main>
      </div>
    );
  }
  return <BazaarHome storeData={storeData} />;
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

const SectionTitle: React.FC<{ children: React.ReactNode; moreHref?: string }> = ({ children, moreHref }) => (
  <div className="mb-4 flex items-center justify-between">
    <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
      <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" />
      {children}
    </h2>
    {moreHref && (
      <a href={moreHref} className="text-sm font-bold text-teal-700 transition hover:text-teal-600">عرض الكل ←</a>
    )}
  </div>
);

const BazaarHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, showBest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  const newest = useMemo(() => [...products].reverse().slice(0, 12), [products]);
  const popular = useMemo(() => sortList(products, 'price_desc').slice(0, 6), [products]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <BazaarHeader />
      <main className="space-y-12 pb-16">
        <BazaarHero banners={banners} />

        {/* Category circles */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle>تسوّق الأقسام</SectionTitle>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {categories.slice(0, 8).map((c: any) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className="group flex flex-col items-center gap-2">
                  <span className="h-16 w-16 overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 transition group-hover:shadow-md group-hover:ring-teal-200 sm:h-20 sm:w-20">
                    {c.image ? (
                      <img src={getOptimizedImageUrl(c.image||'', 'thumb')} alt="" loading="lazy" decoding="async" sizes="80px" onError={(e)=>{(e.currentTarget.src=getImageUrl(c.image||''))}} className="h-full w-full rounded-xl object-cover" width={80} height={80} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-teal-50 text-xl sm:text-2xl">🛍️</span>
                    )}
                  </span>
                  <span className="max-w-[80px] break-words text-center text-xs font-bold leading-tight text-slate-600 group-hover:text-teal-700 line-clamp-2">{c.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Newest — toggle show_latest_products */}
        {showLatest && newest.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle moreHref="#newest">وصل حديثاً</SectionTitle>
            <div id="newest" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {newest.map((p) => (
                <BazaarCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Promo band */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-600 to-teal-700 p-7 text-white sm:p-10">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm font-black tracking-wide text-emerald-100">عروض الأسبوع</p>
            <h2 className="mt-1.5 max-w-md text-2xl font-black leading-snug sm:text-3xl">خصومات تصل إلى 40% على مختارات مميزة</h2>
            <a href="#popular" className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 shadow-lg transition hover:bg-emerald-50">
              اكتشف العروض
            </a>
          </div>
        </section>

        {/* Popular picks — toggle show_best_sellers */}
        {showBest && popular.length > 0 && (
          <section id="popular" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle>الأكثر رواجاً</SectionTitle>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {popular.map((p) => (
                <BazaarCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Dynamic category sections — driven by homepage_categories */}
        {homepageCategories.length > 0 && (
          <div className="space-y-12">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (catProducts.length === 0) return null;
              return (
                <section key={cat.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <SectionTitle moreHref={`/category/${cat.slug || cat.id}`}>{cat.name}</SectionTitle>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {catProducts.map((p: any) => (
                      <BazaarCard key={p.id} product={p} />
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <a href={`/category/${cat.slug || cat.id}`} className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-5 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
                      عرض الكل ←
                    </a>
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

const BazaarCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const cat = categoryData?.category;
  const products = useMemo(() => sortList(product?.products || [], categoryData?.sort), [product?.products, categoryData?.sort]);
  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <BazaarHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="مسار التنقل">
          <a href="/" className="font-bold hover:text-teal-700">الرئيسية</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-black text-slate-900">{cat?.name}</span>
        </nav>

        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{cat?.name}</h1>
            {!!cat?.description && <p className="mt-1 max-w-xl text-sm text-slate-500">{cat.description}</p>}
          </div>
          <select
            value={categoryData?.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </header>

        {cat && products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-slate-300" />
            <p className="text-lg font-bold text-slate-600">لا توجد منتجات بهذا القسم بعد</p>
            <a href="/" className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-500">تصفح باقي المتجر</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <BazaarCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData && categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-xl px-2 text-sm font-black transition ${
                      n === categoryData.currentPage ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-teal-700'
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
