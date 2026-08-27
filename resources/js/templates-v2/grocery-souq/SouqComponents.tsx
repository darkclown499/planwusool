import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock3, Gift, Heart, Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
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
import { useResolvedHero, getHeroImageUrl } from '../shared/heroMedia';
import { useServerSearch, submitStorefrontSearch } from '@/hooks/useServerSearch';

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
  const { config, store, cart, auth, ui, wishlist, order, behavior, content } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [q, setQ] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const handleMyOrders = () => {
    if (auth?.isLoggedIn) {
      order?.loadUserOrders?.();
      auth.setShowOrdersModal(true);
    } else {
      auth.setShowLoginModal(true);
    }
  };

  // Design tokens — propagated from Designer via content / designTokens
  const rawContent = (content ?? store?.content ?? {}) as any;
  const designTokens = (store as any)?.design_tokens ?? {};
  const accent = rawContent?.accent_color ?? designTokens?.accent_color ?? (config as any)?.accent_color ?? '#FFC20E';
  const headerBg = rawContent?.header_bg ?? designTokens?.header_bg ?? '#FDF9F1';

  // WhatsApp support — real merchant config only (no hardcoded demo)
  const waPhoneRaw = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || config?.phoneNumber || '').replace(/[^0-9]/g, '');
  const waHref = waPhoneRaw ? `https://wa.me/${waPhoneRaw}` : null;

  // Server-backed search via shared contract (store scope, active only, Arabic/English/SKU, debounce)
  // uses useServerSearch -> api/storefront/search with store_id, debounce 280
  const { results: serverResults, loading: searchLoading } = useServerSearch(q, 7) as any;
  const matches: any[] = useMemo(() => {
    if (Array.isArray(serverResults)) return serverResults.slice(0, 7);
    return [];
  }, [serverResults]);
  const submitHeaderSearch = () => {
    try { submitStorefrontSearch(q); } catch { window.location.assign(`/search?q=${encodeURIComponent(q.trim())}`); }
  };

  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const storeName = config?.storeName || store?.name || 'المتجر';

  const isActive = (href: string) => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 shadow-sm" dir="rtl" style={{ background: headerBg, paddingTop: 'env(safe-area-inset-top)' } as any}>
      {/* CSS variables for propagated design tokens */}
      <style>{`:root{--souq-accent:${accent};--souq-header-bg:${headerBg}}`}</style>

      {/* MOBILE HEADER — 375/390/430 compact */}
      <div className="flex flex-col gap-2 px-3 py-2.5 md:hidden" style={{ background: headerBg }}>
        {/* Mobile top row: logo + wishlist + cart + account/menu */}
        <div className="flex items-center justify-between gap-2">
          <a href="/" className="flex min-w-0 items-center gap-2">
            {(config?.logo || store?.logo) ? (
              <img src={getImageUrl(config.logo || store.logo)} alt={storeName} className="h-8 w-auto object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-black" style={{ background: accent }}>س</span>
            )}
            <span className="truncate text-sm font-black text-stone-900">{storeName}</span>
          </a>
          <div className="flex items-center gap-1.5">
            {/* Wishlist single */}
            <button type="button" onClick={() => (auth as any).setShowWishlistModal ? (auth as any).setShowWishlistModal(true) : window.location.assign('/wishlist')} aria-label="المفضلة" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 text-slate-700">
              <Heart className="h-5 w-5" strokeWidth={1.8} />
              {!!wishlist?.count && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-black" style={{ background: accent }}>{wishlist.count}</span>}
            </button>
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative flex h-9 items-center gap-1 rounded-full px-3 text-sm font-black text-white shadow-sm" style={{ background: '#0F1620' }}>
              <ShoppingBasket className="h-4 w-4" /> {count > 0 && <span className="rounded-full px-1.5 py-0.5 text-xs font-black text-black" style={{ background: accent }}>{count}</span>}
            </button>
            {canShowAuth ? (
              <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : auth.setShowLoginModal(true))} aria-label="حسابي" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 text-stone-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
            ) : null}
            <button type="button" onClick={() => setMobileNav((v) => !v)} aria-label="القائمة" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 text-stone-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </div>
        {/* Mobile second row: prominent search — Enter / button submit -> /search?q= */}
        <div className="relative">
          <form onSubmit={(e) => { e.preventDefault(); submitHeaderSearch(); }} className="relative flex h-11 items-center overflow-hidden rounded-full bg-white px-4 shadow-sm ring-1 ring-black/5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في المتجر"
              enterKeyHint="search"
              className="w-full bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            <button type="submit" aria-label="بحث" className="absolute left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="مسح" className="absolute left-11 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          {q.trim().length >= 2 && (searchLoading || matches.length > 0) && (
            <ul className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white py-2 shadow-2xl ring-1 ring-black/5">
              {searchLoading ? (
                <li className="py-6 text-center text-sm text-stone-500">جارٍ البحث…</li>
              ) : (
                matches.map((p: any) => (
                  <SouqSearchRow key={p.id} product={p} onPick={() => setQ('')} />
                ))
              )}
              {!searchLoading && matches.length === 0 && q.trim().length >= 2 && (
                <li className="py-6 text-center text-sm text-stone-500">لم نجد منتجات مطابقة</li>
              )}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1"><SafeLoyaltyBadge /></div>
        </div>
        {mobileNav && (
          <div className="rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
            <nav className="grid grid-cols-2 gap-2">
              <a href="/" onClick={() => setMobileNav(false)} className="rounded-xl px-4 py-3 text-center text-sm font-black text-black" style={{ background: accent }}>الرئيسية</a>
              <button type="button" onClick={() => { setMobileNav(false); ui.setShowCart(true); }} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white">السلة ({count})</button>
              {canShowAuth && (<button type="button" onClick={() => { setMobileNav(false); handleMyOrders(); }} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-700 ring-1 ring-black/5">طلباتي</button>)}
              {canShowAuth && (<button type="button" onClick={() => { setMobileNav(false); auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)); }} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-700 ring-1 ring-black/5">حسابي</button>)}
              {waHref && <a href={waHref} target="_blank" rel="noreferrer" className="col-span-2 rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-stone-700 ring-1 ring-black/5">الدعم واتساب</a>}
            </nav>
          </div>
        )}
      </div>

      {/* DESKTOP / TABLET HEADER — md+ */}
      <div className="hidden md:block" style={{ background: headerBg }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-2.5 lg:px-6">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2">
              {(config?.logo || store?.logo) ? (
                <img src={getImageUrl(config.logo || store.logo)} alt={storeName} className="h-9 w-auto object-contain lg:h-11" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-black" style={{ background: accent }}>س</span>
                  <span className="text-base font-black text-stone-800">{storeName}</span>
                </div>
              )}
            </a>
            <nav className="hidden items-center gap-1 ms-4 lg:flex">
              <a href="/" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${isActive('/') ? 'text-black shadow-sm' : 'text-stone-600 hover:bg-black/5'}`} style={isActive('/') ? { background: accent } : {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                الرئيسية
              </a>
              {canShowAuth && (
              <button type="button" onClick={handleMyOrders} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                طلباتي
              </button>
              )}
              {canShowAuth && (
              <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                حسابي
              </button>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><SafeLoyaltyBadge /></div>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-black/5 hover:bg-stone-50 lg:inline-flex">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                الدعم
              </a>
            )}
            <button type="button" onClick={() => (auth as any).setShowWishlistModal ? (auth as any).setShowWishlistModal(true) : window.location.assign('/wishlist')} aria-label="المفضلة" className="relative hidden h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 sm:inline-flex text-slate-700 hover:text-emerald-600 transition-colors">
              <Heart className="h-5 w-5" strokeWidth={1.8} />
              {!!wishlist?.count && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-black" style={{ background: accent }}>{wishlist.count}</span>}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 pb-3 lg:px-6 lg:pb-4">
          <div className="relative flex-1">
            <form onSubmit={(e) => { e.preventDefault(); submitHeaderSearch(); }} className="relative flex h-10 items-center overflow-hidden rounded-full bg-white px-4 shadow-sm ring-1 ring-black/5">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في المتجر"
                enterKeyHint="search"
                className="w-full bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
              />
              <button type="submit" aria-label="بحث" className="absolute left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="مسح" className="absolute left-11 text-stone-400 hover:text-stone-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
            {q.trim().length >= 2 && (searchLoading || matches.length > 0) && (
              <ul className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white py-2 shadow-2xl ring-1 ring-black/5">
                {searchLoading ? (
                  <li className="py-6 text-center text-sm text-stone-500">جارٍ البحث…</li>
                ) : matches.length > 0 ? (
                  matches.map((p: any) => (
                    <SouqSearchRow key={p.id} product={p} onPick={() => setQ('')} />
                  ))
                ) : (
                  <li className="py-6 text-center text-sm text-stone-500">لم نجد منتجات مطابقة</li>
                )}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-sm transition hover:bg-black" style={{ background: '#0F1620' }}>
            <ShoppingBasket className="h-4 w-4" /> السلة {count > 0 && <span className="rounded-full px-1.5 py-0.5 text-xs font-black text-black" style={{ background: accent }}>{count}</span>}
          </button>
        </div>
      </div>
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

/* ------------------------------ Hero — Biddi light (hero_banner-aware) ------------------------------ */

export function SouqHero({ banners }: { banners: any[] }) {
  const hero = useResolvedHero();
  const hasVideo = !!(hero.videoUrl || hero.videoUrlMobile);
  const hasYoutube = !!(hero.youtubeId || hero.youtubeIdMobile);
  const isVideo = hero.hasDynamicHero && hero.type === 'video' && hasVideo;
  const isYoutube = hero.hasDynamicHero && hero.type === 'youtube' && hasYoutube;
  const previewMode = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-preview-mode') : null;
  const isMobilePreview = previewMode === 'mobile';
  const safeBanners: any[] = Array.isArray(banners) ? banners : [];
  // Shared media engine: fit/position/height contract — mobile overrides independent so cropped video can be fixed on phone
  const fitClass = hero.fit === 'contain' ? 'object-contain' : 'object-cover';
  const posStyle: any = hero.position && hero.position !== 'center' ? { objectPosition: hero.position } : {};
  const heightStyle: any = (() => {
    if (hero.heightDesktop) return { height: hero.heightDesktop };
    return {};
  })();
  const aspectFallback = 'aspect-[343/96] md:aspect-[704/198] lg:aspect-[960/270] xl:aspect-[1376/388]';
  const mobileHeroStyle = (hero.fitMobile || hero.positionMobile || hero.heightMobile) ? `@media(max-width:767px){ .souq-hero-media video, .souq-hero-media img{ ${hero.fitMobile ? `object-fit:${hero.fitMobile} !important;` : ''} ${hero.positionMobile ? `object-position:${hero.positionMobile} !important;` : ''} } ${hero.heightMobile ? `.souq-hero-media{ height:${hero.heightMobile} !important; }` : ''} }` : '';
  if (isVideo) {
    const effectiveVideo = isMobilePreview && hero.videoUrlMobile ? hero.videoUrlMobile : hero.videoUrl;
    const vidSrc = getHeroImageUrl(effectiveVideo);
    return (
      <section className="mx-auto max-w-[1600px] px-3 pt-2 lg:px-6" dir="rtl">
        {mobileHeroStyle && <style>{mobileHeroStyle}</style>}
        <div className={`souq-hero-media relative w-full overflow-hidden rounded-[18px] bg-black shadow-sm ring-1 ring-black/5 ${hero.heightDesktop ? '' : aspectFallback}`} style={heightStyle}>
          <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${fitClass}`} style={posStyle} src={vidSrc} />
          <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
          {(hero.heading || hero.subtitle || hero.ctaLabel) && (
            <div className="absolute inset-0 flex items-center"><div className="px-4 sm:px-8">
              {hero.subtitle && <p className="mb-1 text-xs font-bold text-white/90 lg:text-sm drop-shadow">{hero.subtitle}</p>}
              {hero.heading && <h1 className="max-w-md text-lg font-black leading-snug text-white sm:text-2xl lg:text-3xl drop-shadow">{hero.heading}</h1>}
              {hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0F1620] px-5 py-2 text-xs font-black text-white shadow hover:bg-black">{hero.ctaLabel} ←</a>}
            </div></div>
          )}
        </div>
      </section>
    );
  }
  if (isYoutube) {
    const ytId = isMobilePreview && hero.youtubeIdMobile ? hero.youtubeIdMobile : hero.youtubeId;
    return (
      <section className="mx-auto max-w-[1600px] px-3 pt-2 lg:px-6" dir="rtl">
        {mobileHeroStyle && <style>{mobileHeroStyle}</style>}
        <div className={`souq-hero-media relative w-full overflow-hidden rounded-[18px] bg-black shadow-sm ring-1 ring-black/5 ${hero.heightDesktop ? '' : aspectFallback}`} style={heightStyle}>
          {hero.fit === 'contain' ? (
            <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytId}&modestbranding=1&rel=0`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
          ) : (
            <div className="absolute inset-0 overflow-hidden bg-black">
              <iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytId}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'177.77777778vh', height:'56.25vw', minWidth:'100%', minHeight:'100%', maxWidth:'none', maxHeight:'none' } as any} />
            </div>
          )}
          <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
          {(hero.heading || hero.subtitle || hero.ctaLabel) && (
            <div className="absolute inset-0 flex items-center"><div className="px-4 sm:px-8">
              {hero.subtitle && <p className="mb-1 text-xs font-bold text-white/90 lg:text-sm drop-shadow">{hero.subtitle}</p>}
              {hero.heading && <h1 className="max-w-md text-lg font-black leading-snug text-white sm:text-2xl lg:text-3xl drop-shadow">{hero.heading}</h1>}
              {hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0F1620] px-5 py-2 text-xs font-black text-white shadow hover:bg-black">{hero.ctaLabel} ←</a>}
            </div></div>
          )}
        </div>
      </section>
    );
  }
  const effectiveImages = isMobilePreview && hero.imagesMobile.length > 0 ? hero.imagesMobile : hero.images;
  const effectiveHasImages = effectiveImages.length > 0;
  const dynamicSlides = hero.hasDynamicHero && (hero.type === 'image' || hero.type === 'slider' || hero.type === 'image_slider') && effectiveHasImages
    ? effectiveImages.map((img) => ({ title: hero.heading, subtitle: hero.subtitle, image: img, button_text: hero.ctaLabel, button_link: hero.ctaLink }))
    : hero.hasDynamicHero && (hero.heading || hero.subtitle || hero.ctaLabel) && !effectiveHasImages
      ? [{ title: hero.heading, subtitle: hero.subtitle, image: '', button_text: hero.ctaLabel, button_link: hero.ctaLink }]
      : null;
  const rawSlides = dynamicSlides ?? (safeBanners.length > 0 ? safeBanners : []);
  if (rawSlides.length === 0) {
    if (!hero.heading && !hero.subtitle && !hero.ctaLabel) return null;
    return (
      <section className="mx-auto max-w-[1600px] px-3 pt-2 lg:px-6" dir="rtl">
        <div className={`souq-hero-media relative w-full overflow-hidden rounded-[18px] bg-gradient-to-l from-[#FFC20E]/20 to-[#FDF9F1] shadow-sm ring-1 ring-black/5 ${hero.heightDesktop ? '' : aspectFallback}`} style={heightStyle}>
          <div className="absolute inset-0 flex items-center"><div className="px-4 sm:px-8">
            {hero.subtitle && <p className="mb-1 text-xs font-bold text-stone-600 lg:text-sm">{hero.subtitle}</p>}
            {hero.heading && <h1 className="max-w-md text-lg font-black leading-snug text-stone-900 sm:text-2xl lg:text-3xl">{hero.heading}</h1>}
            {hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0F1620] px-5 py-2 text-xs font-black text-white shadow hover:bg-black">{hero.ctaLabel} ←</a>}
          </div></div>
        </div>
      </section>
    );
  }
  const slides = rawSlides;
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

  // Image slider also respects shared fit/position/height
  const imgFit = hero.fit === 'contain' ? 'object-contain' : 'object-cover';
  const imgPos: any = posStyle;
  const effectiveMobileImages = hero.imagesMobile.length > 0 ? hero.imagesMobile : null;
  return (
    <section className="mx-auto max-w-[1600px] px-3 pt-2 lg:px-6" dir="rtl">
      {mobileHeroStyle && <style>{mobileHeroStyle}</style>}
      <div className={`souq-hero-media relative w-full overflow-hidden rounded-[18px] bg-[#FDF9F1] shadow-sm ring-1 ring-black/5 ${hero.heightDesktop ? '' : 'aspect-[343/96] md:aspect-[704/198] lg:aspect-[960/270] xl:aspect-[1376/388]'}`} style={heightStyle}>
        {normalized.map((b: any, idx: number) => (
          <div key={idx} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: idx === i ? 1 : 0 }} aria-hidden={idx !== i}>
            <img src={getOptimizedImageUrl(b.image || '', 'medium')} alt={b.title} className={`h-full w-full ${imgFit}`} style={imgPos} loading="eager" decoding="async" fetchPriority="high" sizes="100vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(b.image||''))}} width={1200} height={400} />
            {hero.hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />}
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
  const { cart, product: productCtx, wishlist } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;
  const cartIndex = (cart?.cartItems || []).findIndex((ci: any) => String(ci.id ?? ci.product_id) === String(product.id));
  const inCart = cartIndex !== -1;
  const cartQty = inCart ? Number((cart.cartItems[cartIndex] as any)?.quantity || 0) : 0;

  const quickAdd = async () => {
    if (variable) {
      productCtx.handleProductClick(product);
      return;
    }
    await cart.addToCart(product as any);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[18px] border border-black/5 bg-white shadow-sm transition hover:shadow-md" dir="rtl">
      <div className="relative aspect-square w-full overflow-hidden bg-[#F5F5F4] p-2">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="absolute inset-0 p-2" aria-label={product.name}>
          <img src={getOptimizedImageUrl(product.image || '', 'small')} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, 20vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(product.image||''))}} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" width={400} height={400} />
        </button>
        {discount > 0 && !out && (
          <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 ring-1 ring-red-200">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="pointer-events-none absolute top-2 left-10 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">آخر {remaining}</span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); wishlist?.toggle?.(product.id); }}
          aria-label={wished ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          className={`absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition ${wished ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
        >
          <Heart className={`h-4 w-4 ${wished ? 'fill-red-500' : ''}`} strokeWidth={1.8} />
        </button>
        {out && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-black text-stone-500">نفذت</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 pt-2">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-[40px] text-start text-[13px] font-bold leading-snug text-stone-800 hover:text-black">
          {product.name}
        </button>
        {(() => {
          const ls = getLoyaltySettingsFromPage();
          if (!ls?.is_enabled) return null;
          const pts = calcEarnedPoints(Number(product.price) || 0, ls);
          return pts > 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Gift className="h-3 w-3" /> كسب {pts} نقطة</span> : null;
        })()}
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-[15px] font-black text-[#0F1620]">{formatPrice(product.price)}</span>
          {discount > 0 && !!product.originalPrice && (
            <span className="text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        {!out ? (
          inCart && !variable ? (
            <div className="mt-1 flex w-full items-center justify-between rounded-full border border-black/10 bg-stone-50 px-1 py-1">
              <button type="button" onClick={() => cart.updateQuantity(cartIndex, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-stone-800" aria-label="زيادة"><Plus className="h-4 w-4" /></button>
              <span className="text-sm font-black text-stone-900">{cartQty}</span>
              <button type="button" onClick={() => cart.updateQuantity(cartIndex, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-black/10 hover:bg-stone-100" aria-label="تقليل"><Minus className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={quickAdd}
              aria-label="أضف للسلة"
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0F1620] py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-black active:scale-[0.98] min-h-[44px]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              إضافة للسلة
            </button>
          )
        ) : (
          <span className="mt-1 flex w-full items-center justify-center rounded-full bg-stone-100 py-2.5 text-xs font-bold text-stone-400 min-h-[44px]">نفذت</span>
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
