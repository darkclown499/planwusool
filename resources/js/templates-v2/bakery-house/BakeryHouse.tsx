import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { CakeSlice, ChevronLeft, Clock3, Croissant, Flame, Heart, PackageSearch, Plus, ShoppingBag, User } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { toast } from '@/components/custom-toast';
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
/* بيت المخبز — Bakery House                                              */
/* Warm artisan bakery storefront: cream canvas, caramel accents, a       */
/* single appetizing hero, morning-fresh messaging, weight-variant quick  */
/* picks on the card, and an evening countdown for the day's last batch.  */
/* ===================================================================== */

const ACCENT = '#b45309';

/* ------------------------------ Header ------------------------------ */

export function BakeryHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, content } = useStorefrontCore() as any;
  const [scrolled, setScrolled] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = (product?.categories || []).slice(0, 7);
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'خبز الصباح ساخن الآن 🔥' : hour < 17 ? 'عجين اليوم يُخبز كل ساعتين' : 'آخر دفعة من الفرن قبل الإغلاق';

  return (
    <header className={`sticky top-0 z-40 border-b border-[#eaddcf] bg-[#fffbf5]/95 backdrop-blur transition-shadow ${scrolled ? 'shadow-md' : ''}`} dir="rtl">
      {/* Freshness ribbon */}
      <div className="bg-gradient-to-l from-[#92400e] via-[#b45309] to-[#92400e] px-4 py-1.5 text-center text-xs font-bold text-[#ffedd5]">
        {greeting}
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href={homeHref} className="flex items-center gap-2.5">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-11 w-auto object-contain" />
          ) : (
            <>
              <span className="rounded-full bg-[#b45309] p-2 text-white shadow-sm"><Croissant className="h-5 w-5" /></span>
              <span className="min-w-0 max-w-[42vw] truncate font-serif text-xl font-black text-[#78350f] sm:max-w-none">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>

        {showCategoriesBar && (
          <nav className="hidden items-center gap-1 md:flex">
            <a href={homeHref} className="rounded-full px-3.5 py-2 text-sm font-bold text-[#78350f] transition hover:bg-[#f5e7d3]">الرئيسية</a>
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`} className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#92603a] transition hover:bg-[#f5e7d3] hover:text-[#78350f]">
                {c.name}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="rounded-full p-2.5 text-[#78350f] transition hover:bg-[#f5e7d3]">
            🔍
          </button>
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative hidden rounded-full p-2.5 text-[#78350f] transition hover:bg-[#f5e7d3] sm:block">
            <Heart className="h-5 w-5" strokeWidth={1.8} />
            {!!wishlist?.count && <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b45309] px-1 text-[9px] font-black text-white">{wishlist.count}</span>}
          </button>
          <button
            type="button"
            onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))}
            aria-label="حسابي"
            className="hidden rounded-full p-2.5 text-[#78350f] transition hover:bg-[#f5e7d3] sm:block"
          >
            <User className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative mr-1 flex items-center gap-2 rounded-full bg-[#b45309] py-2 pl-4 pr-3 text-sm font-black text-white shadow-sm transition hover:bg-[#92400e]">
            <ShoppingBag className="h-4 w-4" />
            السلة
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-[#b45309]">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav chips — hidden by default; enable via settings.show_categories_bar */}
      {showCategoriesBar && categories.length > 0 && (
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto px-4 pb-2 md:hidden">
          {categories.map((c: any) => (
            <a key={c.id} href={`/category/${c.slug || c.id}`} className="whitespace-nowrap rounded-full bg-[#f5e7d3] px-3 py-1 text-xs font-bold text-[#78350f]">
              {c.name}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/* ------------------------------- Hero ------------------------------- */

export function BakeryHero({ banner }: { banner?: any }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl bg-[#3b2412] shadow-lg">
        <img src={getImageUrl(banner?.image || '/images/store/bakery.jpg')} alt="" className="h-64 w-full object-cover opacity-80 sm:h-80" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#3b2412]/85 via-transparent to-transparent" />
        <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-3 p-7 sm:p-12">
          <p className="w-fit rounded-full bg-[#fbbf24] px-3.5 py-1 text-xs font-black text-[#78350f]">{banner?.subtitle || 'مخبوزات طازجة كل يوم'}</p>
          <h1 className="max-w-sm font-serif text-3xl font-black leading-snug text-white sm:text-4xl">
            {banner?.title || 'من فرننا الدافئ… إلى مائدتك'}
          </h1>
          <a href="#bakery-best" className="w-fit rounded-full bg-white px-6 py-2.5 text-sm font-black text-[#78350f] shadow transition hover:bg-[#ffedd5]">
            {banner?.button_text || 'اكتشف تشكيلة اليوم'} ←
          </a>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Product card --------------------------- */

export function BakeryCard({ product }: { product: V2Product }) {
  const { cart, product: productCtx, wishlist } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const [pick, setPick] = useState<Record<string, string>>({});
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;
  const missing = variable ? (product.variants || []).filter((g: any) => !pick[g.name]) : [];

  const add = async () => {
    if (missing.length > 0) {
      toast.error(`اختار ${missing.map((g: any) => g.name).join(' و')} أولاً`);
      return;
    }
    await cart.addToCart({ ...product, selectedVariants: variable ? pick : undefined });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#f0e2d0] transition-all hover:-translate-y-0.5 hover:shadow-xl" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-[4/3] w-full overflow-hidden bg-[#fdf3e3]" aria-label={product.name}>
        <img src={getImageUrl(product.image || '')} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {discount > 0 && !out && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-red-700 px-2 py-0.5 text-[11px] font-black text-white shadow">وفّر {discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#78350f]/90 px-2 py-0.5 text-[10px] font-bold text-[#ffedd5] backdrop-blur">بقي {remaining} فقط</span>
        )}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-[#fffbf5]/75 text-sm font-black text-[#92603a]">نفذت اليوم</span>}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          aria-label="المفضلة"
          className={`absolute top-2.5 left-2.5 rounded-full p-1.5 shadow transition ${wished ? 'bg-red-600 text-white' : 'bg-white/85 text-[#b45309]'}`}
        >
          <Heart className="h-3.5 w-3.5" fill={wished ? 'currentColor' : 'none'} />
        </button>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="min-h-10 text-start font-serif text-[15px] font-bold leading-snug text-[#5d3a21] hover:text-[#b45309]">
          {product.name}
        </button>

        {/* Weight/format quick picks — the bakery way */}
        {(product.variants || []).slice(0, 1).map((group: any) => (
          <div key={group.name} className="flex flex-wrap gap-1">
            {(group.values || group.options || []).slice(0, 4).map((val: string) => (
              <button
                key={val}
                type="button"
                onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                  pick[group.name] === val
                    ? 'border-[#b45309] bg-[#b45309] text-white'
                    : 'border-[#eaddcf] bg-[#fffaf2] text-[#92603a] hover:border-[#b45309]'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        ))}

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="leading-tight">
            <p className="text-lg font-black text-[#b45309]">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-[11px] text-stone-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button type="button" onClick={add} aria-label="أضف للسلة"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b45309] text-white shadow-md transition hover:bg-[#92400e] active:scale-90">
              <Plus className="h-4.5 w-4.5" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Last-batch countdown ------------------------- */

export function BakeryLastBatch() {
  // Today at 21:00 local — the day's final bake.
  const deadline = useMemo(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const cd = useCountdown(deadline);
  if (!cd) return null;

  return (
    <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6" dir="rtl">
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl bg-[#78350f] px-6 py-4 text-white shadow-lg sm:flex-row">
        <p className="flex items-center gap-2 font-serif text-lg font-bold">
          <Clock3 className="h-5 w-5 text-[#fbbf24]" />
          آخر دفعة من الفرن اليوم بعد…
        </p>
        <div className="flex items-center gap-2 font-black" dir="ltr">
          {[
            { v: String(cd.hours).padStart(2, '0'), l: 'ساعة' },
            { v: String(cd.minutes).padStart(2, '0'), l: 'دقيقة' },
            { v: String(cd.seconds).padStart(2, '0'), l: 'ثانية' },
          ].map(({ v, l }) => (
            <span key={l} className="flex flex-col items-center">
              <span className="min-w-11 rounded-xl bg-[#92400e] px-2 py-1.5 text-center text-xl tabular-nums">{v}</span>
              <span className="mt-1 text-[10px] font-bold text-[#ffedd5]/70">{l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================ ROOT ================================ */

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر تصاعدي' },
  { value: 'price_desc', label: 'السعر تنازلي' },
  { value: 'name', label: 'أبجدياً' },
];

export const BakeryHouseRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <BakeryCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#fdf6ec]">
        <BakeryHeader />
        <main className="prose-custom2 mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-[#eaddcf] pb-3 font-serif text-3xl font-black text-[#78350f]">{page?.title}</h1>
          <article dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
        </main>
      </div>
    );
  }
  return <BakeryHome storeData={storeData} />;
};

const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar');

const BakeryHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, showBest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  const bestsellers = useMemo(
    () => [...products].sort((a, b) => (Number(b.originalPrice ?? b.price) % 7) - (Number(a.originalPrice ?? a.price) % 7)).slice(0, 10),
    [products]
  );
  const sweets = useMemo(
    () => products.filter((p: any) => /حلو|كيك|كنافة|بقلاوة|معمول|كوكيز/.test(String(p.name))).slice(0, 10),
    [products]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#fdf6ec] text-[#5d3a21] antialiased">
      <BakeryHeader />
      <main className="pb-16">
        <BakeryHero banner={banners[0]} />

        {/* Category cards */}
        {categories.length > 0 && (
          <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-black text-[#78350f]">
              <CakeSlice className="h-6 w-6 text-[#b45309]" /> من رفوف المخبز
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.slice(0, 8).map((c: any) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className="group relative h-28 overflow-hidden rounded-2xl shadow-sm ring-1 ring-[#f0e2d0]">
                  {c.image ? (
                    <img src={getImageUrl(c.image)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="block h-full w-full bg-gradient-to-br from-[#f5e7d3] to-[#eaddcf]" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#3b2412]/75 to-transparent" />
                  <span className="absolute bottom-2.5 right-3 font-serif text-base font-black text-white drop-shadow">{c.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <BakeryLastBatch />

        {/* Bestsellers — respect show_best_sellers, fallback show_latest also hides if needed */}
        {showBest && (
          <section id="bakery-best" className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-black text-[#78350f]">
              <Flame className="h-6 w-6 text-orange-600" /> الأكثر طلباً اليوم
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {bestsellers.map((p) => (
                <BakeryCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Optional latest shelf (generic) — hidden if showLatest false */}
        {showLatest && false && null}

        {/* Dynamic category sections */}
        {homepageCategories.length > 0 && (
          <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              return (
                <section key={cat.id} className="mt-10">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-serif text-2xl font-black text-[#78350f]">{cat.name}</h2>
                    <a href={`/category/${cat.slug || cat.id}`} className="text-sm font-bold text-[#b45309] hover:text-[#92400e]">عرض الكل ←</a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {catProducts.map((p: any) => (
                      <BakeryCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Sweets shelf */}
        {sweets.length >= 4 && (
          <section className="mt-12 border-y border-[#eaddcf] bg-white/60 py-10">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="mb-4 font-serif text-2xl font-black text-[#78350f]">رف الحلويات 🍯</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {sweets.map((p) => (
                  <BakeryCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Story strip */}
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-l from-[#f5e7d3] to-[#fdf6ec] p-8 text-center ring-1 ring-[#eaddcf]">
            <p className="font-serif text-2xl font-black leading-relaxed text-[#78350f]">
              «نبدأ العجن قبل الفجر… حتى يصلك الخبز وهو ما زال يتنفس»
            </p>
            <p className="mt-2 text-sm text-[#92603a]">دقيق مختار • خميرة طبيعية • بلا مواد حافظة</p>
          </div>
        </section>
      </main>
    </div>
  );
};

const BakeryCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const products = useMemo(() => {
    const list: any[] = [...(product?.products || [])];
    switch (categoryData?.sort) {
      case 'price_asc': return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price_desc': return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'name': return list.sort(byName);
      default: return list;
    }
  }, [product?.products, categoryData?.sort]);

  const cat = categoryData?.category;
  if (!cat) return null;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#fdf6ec] text-[#5d3a21] antialiased">
      <BakeryHeader homeHref="/" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-[#92603a]" aria-label="مسار التنقل">
          <a href="/" className="font-bold hover:text-[#b45309]">الرئيسية</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-black text-[#78350f]">{cat.name}</span>
        </nav>
        <header className="mb-6 text-center">
          <h1 className="font-serif text-3xl font-black text-[#78350f]">{cat.name}</h1>
          {!!cat.description && <p className="mx-auto mt-1.5 max-w-lg text-sm text-[#92603a]">{cat.description}</p>}
        </header>

        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-bold text-[#92603a]">{categoryData.total} منتج</span>
          <select
            value={categoryData.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-full border border-[#eaddcf] bg-white px-4 py-2 text-sm font-bold text-[#78350f] focus:border-[#b45309] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <PackageSearch className="h-12 w-12 text-[#eaddcf]" />
            <p className="font-serif text-xl font-bold text-[#92603a]">لم نخبز شيئاً هنا بعد</p>
            <a href="/" className="rounded-full bg-[#b45309] px-6 py-2.5 text-sm font-black text-white hover:bg-[#92400e]">عد للرئيسية</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <BakeryCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-black transition ${
                      n === categoryData.currentPage ? 'bg-[#b45309] text-white' : 'bg-white text-[#92603a] ring-1 ring-[#eaddcf] hover:text-[#b45309]'
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
