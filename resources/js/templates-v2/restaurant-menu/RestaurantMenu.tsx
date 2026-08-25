import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, Flame, Minus, PackageSearch, Plus, ShoppingBag, Star, UtensilsCrossed } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
import {
  discountPercent,
  isVariableProduct,
  usePriceFormatter,
  useStorefrontCore,
  type V2Product,
} from '../shared/hooks';
import type { TemplateRootProps } from '../types';

/* ===================================================================== */
/* مطعم — Restaurant Menu                                                 */
/* A dark menu-board storefront: amber-on-charcoal palette, category tab  */
/* rail like a printed menu, dishes listed as elegant rows with dotted    */
/* price leaders, bestseller flames and an order-ticket cart drawer.      */
/* ===================================================================== */

export function RestaurantHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui } = useStorefrontCore();
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100" dir="rtl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <a href={homeHref} className="flex items-center gap-2.5">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-10 w-auto rounded object-contain" />
          ) : (
            <>
              <span className="rounded-lg bg-[#f59e0b] p-1.5 text-[#191410]"><UtensilsCrossed className="h-5 w-5" /></span>
              <span className="font-serif text-xl font-black tracking-wide text-[#f5e7c8]">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث"
            className="rounded-full border border-[#4a3e33] p-2.5 text-[#d8c9a8] transition hover:border-[#f59e0b] hover:text-[#f59e0b]">
            🔍
          </button>
          <div className="hidden sm:block">
            <HeaderLoyaltyBadge />
          </div>
          <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))} aria-label="حسابي"
            className="hidden rounded-full border border-[#4a3e33] px-4 py-2 text-sm font-bold text-[#d8c9a8] transition hover:border-[#f59e0b] hover:text-[#f59e0b] sm:block">
            حسابي
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)}
            className="relative flex items-center gap-2 rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-[#191410] shadow transition hover:bg-[#fbbf24]">
            <ShoppingBag className="h-4 w-4" />
            طلبك
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#191410] px-1 text-[11px] font-black text-[#fbbf24]">{count}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/* --------------------------- Category tabs --------------------------- */

export function RestaurantTabs({ categories, activeId }: { categories: any[]; activeId?: string | null }) {
  const { store, content } = useStorefrontCore() as any;
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  if (!showCategoriesBar) return null;
  if (!categories.length) return null;
  return (
    <div className="sticky top-[68px] z-30 border-b border-[#3d332b] bg-[#191410]/97 backdrop-blur" dir="rtl">
      <div className="scrollbar-none mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        {categories.map((c: any) => (
          <a key={c.id}
            href={`/category/${c.slug || c.id}`}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition ${
              String(activeId) === String(c.id)
                ? 'bg-[#f59e0b] text-[#191410]'
                : 'border border-[#4a3e33] text-[#d8c9a8] hover:border-[#f59e0b] hover:text-[#fbbf24]'
            }`}>
            {c.name}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

export function RestaurantHero({ banner }: { banner?: any }) {
  return (
    <section className="relative h-72 overflow-hidden bg-[#0f0b09] sm:h-96" dir="rtl">
      <img src={getImageUrl(banner?.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5')} alt="" className="h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#191410] via-transparent to-[#191410]/40" />
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-5xl px-6 text-center sm:px-10">
          <p className="mb-2 text-xs font-black tracking-[0.4em] text-[#f59e0b]">— MENU —</p>
          <h1 className="font-serif text-3xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl">
            {banner?.title || 'من قائمة الشيف'}
          </h1>
          <p className="mt-3 font-serif text-base text-[#e8d9b8]">{banner?.subtitle || 'مشاوي على الفحم • توابل بيتية • خبز التنور'}</p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Menu row card --------------------------- */

export function DishRow({ product }: { product: V2Product }) {
  const { cart, product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const out = product.availability === 'out_of_stock';
  const variable = isVariableProduct(product);
  const [adding, setAdding] = useState(false);

  const quickAdd = async () => {
    if (variable) return productCtx.handleProductClick(product);
    setAdding(true);
    await cart.addToCart(product as any);
    setAdding(false);
  };

  return (
    <div className={`group flex items-center gap-4 rounded-2xl border border-[#2e2620] bg-[#211a15] p-3.5 transition-all hover:border-[#f59e0b]/40 hover:bg-[#282018] ${out ? 'opacity-55' : ''}`} dir="rtl">
      {/* Thumb */}
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#2e2620]" aria-label={product.name}>
        <img src={getImageUrl(product.image || '')} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {discountPercent(product) > 0 && (
          <span className="absolute top-1.5 right-1.5 rounded-md bg-red-700 px-1.5 py-0.5 text-[10px] font-black text-white">-{discountPercent(product)}%</span>
        )}
      </button>

      {/* Name + dotted price leader — the printed menu touch */}
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="min-w-0 flex-1 text-start">
        <p className="truncate text-[15px] font-black text-[#f5e7c8] group-hover:text-[#fbbf24]">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[#a89478]">{product.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="border-b border-dashed border-[#4a3e33]" style={{ width: 'clamp(20px, 12vw, 90px)' }} />
          <span className="text-lg font-black text-[#f59e0b]">{formatPrice(product.price)}</span>
        </div>
      </button>

      {/* Add */}
      {!out && (
        <button
          type="button"
          onClick={quickAdd}
          disabled={adding}
          aria-label="أضف للطلب"
          className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-black transition active:scale-95 ${
            adding ? 'bg-emerald-600 text-white' : 'bg-[#f59e0b] text-[#191410] hover:bg-[#fbbf24]'
          }`}
        >
          {adding ? <Star className="h-4 w-4 fill-current" /> : <Plus className="h-4.5 w-4.5" strokeWidth={2.8} />}
          {adding ? 'أُضيف' : 'أضف'}
        </button>
      )}
    </div>
  );
}

/* ------------------------- Bestseller tiles ------------------------- */

export function ChefPicks({ products }: { products: V2Product[] }) {
  const { product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const picks = products.slice(0, 6);
  if (!picks.length) return null;

  return (
    <section dir="rtl">
      <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-black text-[#f5e7c8]">
        <Flame className="h-6 w-6 text-[#f59e0b]" /> اختيارات الشيف
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((p) => (
          <button key={p.id} type="button" onClick={() => productCtx.handleProductClick(p)}
            className="group relative h-44 overflow-hidden rounded-2xl border border-[#2e2620] text-start shadow-md">
            <img src={getImageUrl(p.image || '')} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#0f0b09]/95 via-[#0f0b09]/25 to-transparent" />
            <span className="absolute right-4 bottom-3.5 left-4 flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-serif text-lg font-black text-white">{p.name}</span>
                {!!p.description && <span className="mt-0.5 block truncate text-xs text-[#cdbb98]">{p.description}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-[#f59e0b] px-3 py-1 text-sm font-black text-[#191410]">{formatPrice(p.price)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ================================ ROOT ================================ */

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر تصاعدي' },
  { value: 'price_desc', label: 'السعر تنازلي' },
];

export const RestaurantMenuRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <RestaurantCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#191410]">
        <RestaurantHeader />
        <main className="prose-custom2 mx-auto max-w-3xl px-4 py-10 sm:px-6 [&_a]:!text-[#fbbf24] [&_h1]:!text-[#f5e7c8] [&_p]:!text-[#c9b896]">
          <h1 className="mb-6 font-serif text-3xl font-black text-[#f5e7c8]">{page?.title}</h1>
          <article dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
        </main>
      </div>
    );
  }
  return <RestaurantHome storeData={storeData} />;
};

const RestaurantHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  // Group the catalog by category for the menu-board listing.
  const sections = useMemo(() => {
    const groups = new Map<string, any[]>();
    const fallbackCat = categories[0];
    for (const p of products) {
      const catId = String(p.categoryId ?? p.category_id ?? fallbackCat?.id ?? 'menu');
      if (!groups.has(catId)) groups.set(catId, []);
      groups.get(catId)!.push(p);
    }
    return Array.from(groups.entries())
      .map(([catId, list]) => ({
        category: categories.find((c) => String(c.id) === catId) || fallbackCat || { id: catId, name: 'القائمة' },
        items: list,
      }))
      .filter((s) => s.items.length > 0)
      .slice(0, 6);
  }, [products, categories]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#191410] text-[#e8d9b8] antialiased selection:bg-[#f59e0b] selection:text-[#191410]">
      <RestaurantHeader />
      <RestaurantTabs categories={categories} />
      <main>
        <RestaurantHero banner={banners[0]} />

        <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
          <ChefPicks products={[...products].sort(() => Math.random() - 0.5).slice(0, 6)} />

          {sections.map(({ category, items }) => (
            <section key={category.id}>
              <h2 className="mb-4 border-b border-[#3d332b] pb-3 font-serif text-2xl font-black text-[#fbbf24]">
                {category.name}
                <span className="mr-3 align-middle text-xs font-bold tracking-widest text-[#6b5c48]">— {items.length} صنف</span>
              </h2>
              <div className="space-y-3">
                {items.map((p) => (
                  <DishRow key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

const RestaurantCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const cat = categoryData?.category;

  const products = useMemo(() => {
    const list: any[] = [...(product?.products || [])];
    switch (categoryData?.sort) {
      case 'price_asc': return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price_desc': return list.sort((a, b) => Number(b.price) - Number(a.price));
      default: return list;
    }
  }, [product?.products, categoryData?.sort]);

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#191410] text-[#e8d9b8] antialiased">
      <RestaurantHeader homeHref="/" />
      <RestaurantTabs categories={(product?.categories || []).slice(0, 8)} activeId={cat ? String(cat.id) : null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-[#a89478]">
          <a href="/" className="font-bold hover:text-[#fbbf24]">القائمة</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-black text-[#f5e7c8]">{cat?.name}</span>
        </nav>

        <header className="mb-6 flex items-end justify-between gap-3">
          <h1 className="font-serif text-3xl font-black text-[#fbbf24]">{cat?.name}</h1>
          <select
            value={categoryData?.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-xl border border-[#4a3e33] bg-[#211a15] px-4 py-2 text-sm font-bold text-[#d8c9a8] focus:border-[#f59e0b] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </header>

        {cat && products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <PackageSearch className="h-12 w-12 text-[#4a3e33]" />
            <p className="font-serif text-xl font-bold text-[#a89478]">هذا القسم ما زال يُحضّر في المطبخ</p>
            <a href="/" className="rounded-full bg-[#f59e0b] px-6 py-2.5 text-sm font-black text-[#191410]">عد للقائمة</a>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {products.map((p: any) => (
                <DishRow key={p.id} product={p} />
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
                      n === categoryData.currentPage ? 'bg-[#f59e0b] text-[#191410]' : 'border border-[#4a3e33] text-[#d8c9a8] hover:border-[#f59e0b]'
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
