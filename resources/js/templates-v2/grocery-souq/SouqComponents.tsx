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
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
import { AuthContext } from '@/contexts/AuthContext';

/* ===================================================================== */
/* Souq grocery — components.                                             */
/* Dense deal-driven supermarket UI: inline search header, category chip  */
/* rail, flash-deal countdowns, always-visible add buttons with quantity  */
/* steppers, and a sticky mobile cart bar.                                */
/* ===================================================================== */

export const SOUQ_ACCENT = '#FFC20E';
export const BIDDI_YELLOW = '#FFC20E';
export const BIDDI_CREAM = '#FDF9F1';
export const BIDDI_BLACK = '#0F1620';

function SafeLoyaltyBadge() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) return null;
  return <HeaderLoyaltyBadge />;
}

/* ------------------------------ Header — Biddi exact ------------------------------ */

export function SouqHeader() {
  const { config, store, cart, auth, ui, wishlist, product } = useStorefrontCore() as any;
  const [q, setQ] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return (product?.products || [])
      .filter((p: any) => String(p.name || '').toLowerCase().includes(query))
      .slice(0, 7);
  }, [q, product?.products]);

  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const storeName = config?.storeName || store?.name || 'المتجر';

  // Active pill helper - simple path check
  const isActive = (href: string) => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-[#FDFCF9] to-[#FDF9F1] shadow-sm" dir="rtl">
      {/* Top row: logo + hamburger + desktop nav pills + support/address */}
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-2.5 lg:px-6">
        <div className="flex items-center gap-2">
          {/* Hamburger mobile */}
          <button type="button" onClick={() => setMobileNav((v) => !v)} aria-label="القائمة" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-700"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            {(config?.logo || store?.logo) ? (
              <img src={getImageUrl(config.logo || store.logo)} alt={storeName} className="h-9 w-auto object-contain lg:h-11" />
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFC20E] text-sm font-black text-black">س</span>
                <span className="hidden text-base font-black text-stone-800 sm:block">{storeName}</span>
              </div>
            )}
          </a>
          {/* Desktop nav pills */}
          <nav className="hidden items-center gap-1 ms-4 lg:flex">
            <a href="/" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${isActive('/') ? 'bg-[#FFC20E] text-black shadow-sm' : 'text-stone-600 hover:bg-black/5'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              الرئيسية
            </a>
            <button type="button" onClick={() => ui.setShowCart(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/5">
              <ShoppingBasket className="h-3.5 w-3.5" /> السلة {count > 0 && <span className="rounded-full bg-black px-1.5 text-[10px] text-white">{count}</span>}
            </button>
            <a href="/orders" onClick={(e) => { e.preventDefault(); ui.setShowCart(true); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              طلباتي
            </a>
            <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              حسابي
            </button>
          </nav>
        </div>

        {/* Right: support + address */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><SafeLoyaltyBadge /></div>
          <a href="https://wa.me/970599000000" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-black/5 hover:bg-stone-50 lg:inline-flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            الدعم
          </a>
          <a href="#address" className="hidden items-center gap-1 text-xs font-semibold text-stone-500 underline decoration-dotted underline-offset-4 hover:text-stone-700 lg:inline-flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ادخل عنوانك
          </a>
          {/* Wishlist */}
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative hidden h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 sm:inline-flex">
            <span className="text-sm">♥</span>
            {!!wishlist?.count && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFC20E] px-1 text-[9px] font-black text-black">{wishlist.count}</span>}
          </button>
        </div>
      </div>

      {/* Search row + cart pill — Biddi's second row */}
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 pb-3 lg:px-6 lg:pb-4">
        <div className="relative flex-1">
          <form onSubmit={(e) => e.preventDefault()} className="relative flex h-10 items-center overflow-hidden rounded-full bg-white px-4 shadow-sm ring-1 ring-black/5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في 5000 منتج"
              className="w-full bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            <span className="pointer-events-none absolute left-3 text-stone-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="مسح" className="absolute left-9 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white py-2 shadow-2xl ring-1 ring-black/5">
              {matches.map((p: any) => (
                <SouqSearchRow key={p.id} product={p} onPick={() => setQ('')} />
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0F1620] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-black">
          <ShoppingBasket className="h-4 w-4" /> السلة {count > 0 && <span className="rounded-full bg-[#FFC20E] px-1.5 py-0.5 text-xs font-black text-black">{count}</span>}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileNav && (
        <div className="border-t border-black/5 bg-white px-3 py-3 lg:hidden">
          <nav className="grid grid-cols-2 gap-2">
            <a href="/" onClick={() => setMobileNav(false)} className="rounded-xl bg-[#FFC20E] px-4 py-3 text-center text-sm font-black text-black">الرئيسية</a>
            <button type="button" onClick={() => { setMobileNav(false); ui.setShowCart(true); }} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white">السلة ({count})</button>
            <button type="button" onClick={() => { setMobileNav(false); auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true); }} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-700 ring-1 ring-black/5">حسابي</button>
            <a href="https://wa.me/970599000000" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-stone-700 ring-1 ring-black/5">الدعم</a>
          </nav>
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
      <div className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-[#FFC20E]/10">
        <button type="button" onClick={() => { onPick(); productCtx.handleProductClick(product); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
          <img src={getImageUrl(product.image || '')} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-black/5" loading="lazy" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-stone-800">{product.name}</span>
        </button>
        <span className="shrink-0 text-sm font-black text-[#0F1620]">{formatPrice(product.price)}</span>
      </div>
    </li>
  );
}

/* ------------------------------ Hero — Biddi light ------------------------------ */

export function SouqHero({ banners }: { banners: any[] }) {
  const fallback = [
    { image: 'https://storage.googleapis.com/biddimarket-assets/اول-طلب.jpg', title: 'أول طلب', subtitle: '' },
    { image: 'https://storage.googleapis.com/biddimarket-assets/كل-اغراض.jpg', title: 'كل أغراض البيت', subtitle: '' },
  ];
  const slides = (banners.length > 0 ? banners : fallback);
  const normalized = slides.map((b: any) => ({
    image: b.image || b.src || '/images/store/vegetables.jpg',
    title: b.title || b.heading || '',
    subtitle: b.subtitle || b.sub_title || '',
    button_text: b.button_text || b.cta || '',
    button_link: b.button_link || b.link || '#',
  }));
  const [i, setI] = useState(0);
  useEffect(() => {
    if (normalized.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % normalized.length), 4500);
    return () => clearInterval(t);
  }, [normalized.length]);

  return (
    <section className="mx-auto max-w-[1600px] px-3 pt-2 lg:px-6" dir="rtl">
      <div className="relative aspect-[343/96] w-full overflow-hidden rounded-[18px] bg-[#FDF9F1] shadow-sm ring-1 ring-black/5 md:aspect-[704/198] lg:aspect-[960/270] xl:aspect-[1376/388]">
        {normalized.map((b: any, idx: number) => (
          <div key={idx} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: idx === i ? 1 : 0 }} aria-hidden={idx !== i}>
            <img src={getImageUrl(b.image || '')} alt={b.title} className="h-full w-full object-cover" />
            {(b.title || b.subtitle || b.button_text) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-l from-white/85 via-white/30 to-transparent lg:from-white/90 lg:via-white/40" />
                <div className="absolute inset-0 flex items-center">
                  <div className="px-4 sm:px-8">
                    {b.subtitle && <p className="mb-1 text-xs font-bold text-stone-600 lg:text-sm">{b.subtitle}</p>}
                    {b.title && <h1 className="max-w-md text-lg font-black leading-snug text-stone-900 sm:text-2xl lg:text-3xl">{b.title}</h1>}
                    {b.button_text && (
                      <a href={b.button_link || '#'} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0F1620] px-5 py-2 text-xs font-black text-white shadow hover:bg-black">
                        {b.button_text} ←
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {normalized.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {normalized.map((_, idx: number) => (
              <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`شريحة ${idx + 1}`} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[#FFC20E]' : 'w-1.5 bg-black/20'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* --------------------------- Product card — Biddi pill --------------------------- */

interface SouqCardProps {
  product: V2Product;
  onOpen?: (p: V2Product) => void;
}

/** Biddi-style tile: rounded-[18px], image contain, price + strikethrough inline, full-width pill button. */
export function SouqProductCard({ product }: SouqCardProps) {
  const { cart, product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);

  const quickAdd = async () => {
    if (variable) {
      productCtx.handleProductClick(product);
      return;
    }
    await cart.addToCart(product as any);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[18px] border border-black/5 bg-white shadow-sm transition hover:shadow-md" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative aspect-square w-full overflow-hidden bg-white p-2" aria-label={product.name}>
        <img src={getImageUrl(product.image || '')} alt={product.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
        {discount > 0 && !out && (
          <span className="absolute top-2 right-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 ring-1 ring-red-200">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute top-2 left-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">آخر {remaining}</span>
        )}
        {out && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-black text-stone-500">نفذت</span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-[36px] text-start text-[13px] font-bold leading-snug text-stone-800 hover:text-black">
          {product.name}
        </button>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-[15px] font-black text-[#0F1620]">{formatPrice(product.price)}</span>
          {discount > 0 && !!product.originalPrice && (
            <span className="text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        {!out ? (
          <button
            type="button"
            onClick={quickAdd}
            aria-label="أضف للسلة"
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0F1620] py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            إضافة للسلة
          </button>
        ) : (
          <span className="mt-1 flex w-full items-center justify-center rounded-full bg-stone-100 py-2.5 text-xs font-bold text-stone-400">نفذت</span>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Deals strip — Biddi static (no countdown) --------------------------- */

export function SouqDealsRail({ products, title = 'عروض اليوم ⚡' }: { products: V2Product[]; title?: string }) {
  const deals = useMemo(
    () => products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price)).slice(0, 12),
    [products]
  );
  if (deals.length === 0) return null;

  return (
    <section id="souq-deals" className="bg-[#FDF9F1] py-6" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 lg:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black text-stone-900">
            <span className="rounded-full bg-[#FFC20E] px-3 py-1 text-sm font-black text-black shadow-sm">{title}</span>
            <span className="hidden text-sm font-bold text-stone-500 sm:inline">{deals.length} منتج</span>
          </h2>
          <a href="/category/عروض" className="text-xs font-bold text-stone-600 underline decoration-dotted hover:text-black">عرض الكل ←</a>
        </div>
        <div className="scrollbar-none -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {deals.map((p) => (
            <div key={p.id} className="w-[48%] shrink-0 snap-start sm:w-[32%] md:w-[24%] lg:w-[18%] xl:w-[15%]">
              <SouqProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Sticky cart bar — Biddi black -------------------------- */

export function SouqStickyCartBar() {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const totals = computeCartTotals(cart.cartItems || []);
  if (totals.count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => ui.setShowCart(true)}
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-full bg-[#0F1620] px-5 py-3.5 text-white shadow-2xl ring-1 ring-white/10 transition active:scale-[0.99] sm:hidden"
      dir="rtl"
    >
      <span className="flex items-center gap-2 text-sm font-black">
        <ChevronLeft className="h-4 w-4" />
        عرض السلة ({totals.count})
      </span>
      <span className="flex items-center gap-2 text-sm font-black">
        <span className="rounded-full bg-[#FFC20E] px-2 py-0.5 text-xs font-black text-black">{formatPrice(totals.total)}</span>
      </span>
    </button>
  );
}
