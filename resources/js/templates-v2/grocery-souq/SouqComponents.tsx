import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock3, Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import {
  computeCartTotals,
  discountPercent,
  isVariableProduct,
  lowStockRemaining,
  useCountdown,
  usePriceFormatter,
  useStorefrontCore,
  type V2Product,
} from '../shared/hooks';

/* ===================================================================== */
/* Souq grocery — components.                                             */
/* Dense deal-driven supermarket UI: inline search header, category chip  */
/* rail, flash-deal countdowns, always-visible add buttons with quantity  */
/* steppers, and a sticky mobile cart bar.                                */
/* ===================================================================== */

export const SOUQ_ACCENT = '#16a34a';

/* ------------------------------ Header ------------------------------ */

export function SouqHeader() {
  const { config, store, cart, auth, ui, wishlist, product, content } = useStorefrontCore() as any;
  const [q, setQ] = useState('');
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return (product?.products || [])
      .filter((p: any) => String(p.name || '').toLowerCase().includes(query))
      .slice(0, 7);
  }, [q, product?.products]);

  const categories = (product?.categories || []).slice(0, 10);
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 text-white shadow-md" dir="rtl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <a href="/" className="flex shrink-0 items-center gap-2">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto rounded bg-white/95 object-contain p-1" />
          ) : (
            <>
              <ShoppingBasket className="h-6 w-6" />
              <span className="hidden text-lg font-black sm:block">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>

        {/* Inline search — the supermarket way */}
        <div className="relative min-w-0 flex-1">
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center overflow-hidden rounded-full bg-white shadow-inner">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن منتج… طماطم، حليب، أرز"
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="مسح" className="shrink-0 px-2 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl bg-white py-1 shadow-2xl ring-1 ring-stone-200">
              {matches.map((p: any) => (
                <SouqSearchRow key={p.id} product={p} onPick={() => setQ('')} />
              ))}
            </ul>
          )}
        </div>

        {/* Utilities */}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative rounded-full p-2 transition hover:bg-white/15">
            ♥
            {!!wishlist?.count && (
              <span className="absolute top-0 -right-1 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[9px] font-black">
                {wishlist.count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))}
            aria-label="حسابي"
            className="hidden rounded-full p-2 transition hover:bg-white/15 sm:block"
          >
            👤
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative flex items-center gap-1.5 rounded-full bg-white/15 py-2 pl-3 pr-2 text-sm font-bold transition hover:bg-white/25">
            🛒
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[11px] font-black">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Category chips rail — hidden by default; enable via settings.show_categories_bar */}
      {showCategoriesBar && categories.length > 0 && (
        <div className="border-t border-white/15 bg-[#15803d]">
          <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-1.5 sm:px-6 lg:px-8">
            <a href="/" className="whitespace-nowrap rounded-full bg-white px-3.5 py-1 text-xs font-black text-[#16a34a]">الكل</a>
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`} className="whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold text-white/85 transition hover:bg-white/15 hover:text-white">
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/** One live-search result row inside the header dropdown. */
function SouqSearchRow({ product, onPick }: { product: any; onPick: () => void }) {
  const { product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  return (
    <li>
      <div className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-stone-50">
        <button type="button" onClick={() => { onPick(); productCtx.handleProductClick(product); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
          <img src={getImageUrl(product.image || '')} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" loading="lazy" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-stone-700">{product.name}</span>
        </button>
        <span className="shrink-0 text-sm font-black text-[#16a34a]">{formatPrice(product.price)}</span>
      </div>
    </li>
  );
}

/* ------------------------------ Hero ------------------------------ */

export function SouqHero({ banners }: { banners: any[] }) {
  const slides = (banners.length > 0 ? banners : [{ image: '/images/store/vegetables.jpg', title: 'خضار وفواكه طازجة يومياً', subtitle: 'من السوق لباب بيتك', button_text: 'تسوق الطازج', button_link: '#souq-deals' }]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="relative h-56 w-full overflow-hidden bg-[#14532d] sm:h-72" dir="rtl">
      {slides.map((b: any, idx: number) => (
        <div key={idx} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: idx === i ? 1 : 0 }} aria-hidden={idx !== i}>
          <img src={getImageUrl(b.image || '')} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#14532d]/85 via-[#14532d]/40 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
              {b.subtitle && <p className="mb-1 text-sm font-bold text-[#fbbf24]">{b.subtitle}</p>}
              <h1 className="max-w-lg text-2xl font-black leading-snug text-white sm:text-4xl">{b.title}</h1>
              {b.button_text && (
                <a href={b.button_link || '#'} className="mt-4 inline-block rounded-full bg-[#f59e0b] px-6 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-[#d97706]">
                  {b.button_text} ←
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-1/2 flex translate-x-1/2 gap-1.5">
          {slides.map((_, idx: number) => (
            <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`شريحة ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-[#fbbf24]' : 'w-2 bg-white/50'}`} />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------- Product card --------------------------- */

interface SouqCardProps {
  product: V2Product;
  onOpen?: (p: V2Product) => void;
}

/** Compact supermarket tile: square photo, unit price, big add stepper. */
export function SouqProductCard({ product }: SouqCardProps) {
  const { cart, product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);

  const quickAdd = async () => {
    if (variable) {
      // Variable goods open the detail sheet for proper selection.
      productCtx.handleProductClick(product);
      return;
    }
    await cart.addToCart(product as any);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow hover:shadow-lg" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative aspect-square w-full overflow-hidden bg-stone-50" aria-label={product.name}>
        <img src={getImageUrl(product.image || '')} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {discount > 0 && !out && (
          <span className="absolute top-2 right-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-black text-white">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute top-2 left-2 rounded-md bg-[#f59e0b] px-1.5 py-0.5 text-[10px] font-black text-white">آخر {remaining}</span>
        )}
        {out && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-black text-stone-500">نفذت</span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-9 text-start text-[13px] font-bold leading-snug text-stone-800 hover:text-[#16a34a]">
          {product.name}
        </button>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="leading-tight">
            <p className="text-base font-black text-[#16a34a]">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-[11px] text-stone-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button
              type="button"
              onClick={quickAdd}
              aria-label="أضف للسلة"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16a34a] text-white shadow transition hover:bg-[#15803d] active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Deals strip --------------------------- */

export function SouqDealsRail({ products, title = 'عروض اليوم ⚡' }: { products: V2Product[]; title?: string }) {
  // Rolling deal window: ends 4 hours from first mount.
  const deadline = useMemo(() => new Date(Date.now() + 4 * 3600_000), []);
  const countdown = useCountdown(deadline);
  const deals = useMemo(
    () => products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price)).slice(0, 12),
    [products]
  );
  if (deals.length === 0 || !countdown) return null;

  return (
    <section id="souq-deals" className="bg-white py-8" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-stone-900">
            <span className="rounded-lg bg-red-600 px-2.5 py-1 text-sm text-white">⚡ {title}</span>
          </h2>
          <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-black text-stone-700">
            <Clock3 className="h-4 w-4 text-red-600" />
            <span dir="ltr">{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="scrollbar-none -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {deals.map((p) => (
            <div key={p.id} className="w-[43%] shrink-0 snap-start sm:w-[28%] md:w-[21%] lg:w-[15.5%]">
              <SouqProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Sticky cart bar -------------------------- */

export function SouqStickyCartBar() {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const totals = computeCartTotals(cart.cartItems || []);
  if (totals.count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => ui.setShowCart(true)}
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-2xl bg-[#16a34a] px-4 py-3 text-white shadow-2xl transition active:scale-[0.99] sm:hidden"
      dir="rtl"
    >
      <span className="flex items-center gap-2 text-sm font-black">
        <ChevronLeft className="h-4 w-4" />
        عرض السلة ({totals.count})
      </span>
      <span className="text-base font-black">{formatPrice(totals.total)}</span>
    </button>
  );
}
