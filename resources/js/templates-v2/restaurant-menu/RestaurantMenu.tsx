import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { ChevronLeft, Heart, Menu, Search, ShoppingBag, X, Package, User, LogIn, PackageSearch, Plus, Minus, Star } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
import {
  discountPercent,
  isVariableProduct,
  lowStockRemaining,
  usePriceFormatter,
  useStorefrontCore,
  type V2Product,
} from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import type { TemplateRootProps } from '../types';
import { createSafeHtml } from '@/utils/xss-protection';
import { useResolvedHero, getHeroImageUrl, HERO_HEIGHTS, HERO_BREAKPOINT, HERO_BREAKPOINT_CSS, heroContentForMedia } from '../shared/heroMedia';

// Hayah - light commerce

function cleanWhatsApp(input: string): string {
  return String(input || '').replace(/[^0-9]/g, '');
}
function priceRangeFor(product: any): { min: number; max: number; hasRange: boolean } {
  const combos: any[] = product?.variantCombinations || product?.variant_combinations || [];
  if (Array.isArray(combos) && combos.length > 1) {
    const prices = combos.map((c) => Number(c.price)).filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length > 1) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min !== max) return { min, max, hasRange: true };
    }
  }
  const base = Number(product?.price) || 0;
  return { min: base, max: base, hasRange: false };
}
function variantSummary(product: any): string[] {
  const groups: any[] = product?.variants || [];
  if (!Array.isArray(groups) || !groups.length) return [];
  const first = groups[0];
  const vals: string[] = first?.values || first?.options || [];
  return vals.slice(0, 4);
}
export function HayahHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, order, behavior, content } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const wishCount = wishlist?.count || 0;
  const categories: any[] = product?.categories || [];
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? true) as boolean;
  const handleMyOrders = () => {
    if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); } else { auth.setShowLoginModal(true); }
  };
  const onSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) { ui.setShowSearch(true); try { product.handleSearch?.(q); } catch {} } else { ui.setShowSearch(true); }
  };
  useEffect(() => { if (!drawerOpen) return; const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, [drawerOpen]);
  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100" dir="rtl">
        <div className="mx-auto max-w-[1400px] flex items-center gap-3 px-3 py-2.5 sm:px-6 lg:px-8 lg:py-3">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="القائمة" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-50 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <a href={homeHref} className="flex items-center gap-2 shrink-0">
            {(config?.logo || store?.logo) ? <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-8 w-auto max-w-[120px] object-contain sm:h-9" /> : <><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--store-primary,#2563eb)] text-white text-sm font-black">هـ</span><span className="hidden sm:block text-[15px] font-black text-slate-900 max-w-[160px] truncate">{config?.storeName || store?.name}</span></>}
            <span className="sm:hidden text-[14px] font-black text-slate-900 max-w-[28vw] truncate">{config?.storeName || store?.name}</span>
          </a>
          <form onSubmit={onSearchSubmit} className="hidden lg:flex flex-1 max-w-[560px] mx-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن منتج..." className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pe-4 ps-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--store-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--store-primary)]/20" />
            </div>
          </form>
          <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
            <div className="hidden sm:block"><HeaderLoyaltyBadge /></div>
            <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50"><Search className="h-5 w-5" /></button>
            <button type="button" onClick={() => (wishlist as any)?.setShowWishlistModal ? (wishlist as any).setShowWishlistModal(true) : auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-50"><Heart className="h-5 w-5" strokeWidth={1.7} />{wishCount > 0 && <span className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wishCount > 99 ? '99+' : wishCount}</span>}</button>
            {canShowAuth && <button type="button" onClick={handleMyOrders} aria-label="طلباتي" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-50"><Package className="h-5 w-5" strokeWidth={1.7} /></button>}
            {canShowAuth && <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)))} aria-label="حسابي" className="hidden sm:flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><User className="h-4 w-4" /><span className="hidden xl:inline">حسابي</span></button>}
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative flex h-9 items-center gap-1.5 rounded-full bg-[var(--store-primary,#2563eb)] px-3.5 text-sm font-black text-white shadow-sm hover:brightness-110 active:scale-[0.98]"><ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">السلة</span>{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-[var(--store-primary,#2563eb)]">{count}</span>}</button>
          </div>
        </div>
        <form onSubmit={onSearchSubmit} className="px-3 pb-2.5 lg:hidden" dir="rtl">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن منتج..." className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pe-10 ps-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--store-primary)] focus:bg-white focus:outline-none" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </div>
        </form>
        {showCategoriesBar && categories.length > 0 && (
          <nav className="border-t border-slate-100 bg-white">
            <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
              <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none snap-x scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <a href="/products" className="shrink-0 snap-start rounded-full bg-[var(--store-primary,#2563eb)] px-4 py-1.5 text-xs font-black text-white shadow-sm">الكل</a>
                {categories.slice(0, 30).map((c: any) => <a key={c.id} href={`/category/${c.slug || c.id}`} className="shrink-0 snap-start whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:border-[var(--store-primary)] hover:text-[var(--store-primary)] transition">{c.name}</a>)}
              </div>
            </div>
          </nav>
        )}
      </header>
      {drawerOpen && typeof document !== 'undefined' && createPortal(<HayahDrawer categories={categories} config={config} store={store} content={content} auth={auth} order={order} behavior={behavior} onClose={() => setDrawerOpen(false)} />, document.body)}
    </>
  );
}
export const RestaurantHeader = HayahHeader;
function HayahDrawer({ categories, config, store, content, auth, order, behavior, onClose }: any) {
  const [catsOpen, setCatsOpen] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const isLoggedIn = !!auth?.isLoggedIn;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (isLoggedIn || loginEnabled);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const getCatImg = (c: any) => { const raw = c?.image || c?.image_url || ''; if (!raw) return ''; try { return getImageUrl(String(raw)); } catch { return String(raw); } };
  const waRaw = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || (store as any)?.phone || '');
  const waClean = cleanWhatsApp(waRaw);
  const waHref = waClean.length >= 7 ? `https://wa.me/${waClean}?text=${encodeURIComponent('مرحبا، لدي استفسار')}` : null;
  const socialFromConfig = [{ key: 'facebook', url: config?.socialMedia?.facebook }, { key: 'instagram', url: config?.socialMedia?.instagram }, { key: 'twitter', url: config?.socialMedia?.twitter }, { key: 'youtube', url: config?.socialMedia?.youtube }].filter((s) => s.url && /^https?:\/\//.test(String(s.url)));
  return (
    <div className="fixed inset-0 z-[70]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <nav className="absolute inset-y-0 right-0 flex w-[320px] max-w-[85vw] flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <a href="/" className="flex items-center gap-2" onClick={onClose}>{(config?.logo || store?.logo) ? <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto max-w-[90px] object-contain" /> : <span className="flex items-center gap-1.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--store-primary,#2563eb)] text-white text-xs font-black">هـ</span><span className="text-sm font-black text-slate-900">{config?.storeName || store?.name}</span></span>}</a>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <a href="/" onClick={onClose} className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-3 text-sm font-black text-white"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">🏠</span>الرئيسية<ChevronLeft className="ms-auto h-4 w-4 text-white/60" /></a>
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <button type="button" onClick={() => setCatsOpen((v) => !v)} className="flex h-[56px] w-full items-center gap-3 px-3 text-start"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--store-primary,#2563eb)] ring-1 ring-slate-200">📦</span><span className="flex-1"><span className="block text-[13px] font-black text-slate-900">الأقسام</span><span className="block text-[11px] text-slate-500">{categories.length ? `${categories.length} قسم` : 'استكشف الأقسام'}</span></span><ChevronLeft className={`h-4 w-4 text-slate-400 transition-transform ${catsOpen ? '-rotate-90' : ''}`} /></button>
            {catsOpen && <div className="border-t border-slate-200 bg-white px-2 py-2">{categories.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">لا توجد أقسام</p> : <div className="space-y-1">{categories.slice(0, 30).map((cat: any) => { const img = getCatImg(cat); const subs: any[] = Array.isArray(cat.subcategories) ? cat.subcategories : []; const hasSubs = subs.length > 0; const isExpanded = expandedCat === String(cat.id); return <div key={cat.id}><div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"><a href={`/category/${cat.slug || cat.id}`} onClick={onClose} className="flex flex-1 items-center gap-2.5">{img ? <img src={img} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200" loading="lazy" /> : <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">{String(cat.name).slice(0,2)}</span>}<span className="flex-1 truncate text-[13px] font-bold text-slate-900">{cat.name}</span></a>{hasSubs ? <button type="button" onClick={() => setExpandedCat(isExpanded ? null : String(cat.id))} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><ChevronLeft className={`h-4 w-4 transition-transform ${isExpanded ? '-rotate-90' : ''}`} /></button> : <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />}</div>{hasSubs && isExpanded && <div className="ms-6 mt-1 space-y-0.5 border-s-2 border-slate-100 ps-2">{subs.map((sub: any) => <a key={sub.id} href={`/category/${sub.slug || sub.id}`} onClick={onClose} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">{getCatImg(sub) ? <img src={getCatImg(sub)} alt="" className="h-6 w-6 rounded-md object-cover ring-1 ring-slate-200" /> : <span className="h-6 w-6 rounded-md bg-slate-100" />}<span className="flex-1 truncate text-xs font-semibold text-slate-700">{sub.name}</span><ChevronLeft className="h-3 w-3 text-slate-300" /></a>)}</div>}</div>; })}</div>}</div>}
          </div>
          {canShowAuth && <div className="rounded-xl border border-slate-200 overflow-hidden"><div className="bg-slate-50 px-3 py-3"><p className="text-xs font-black text-slate-900">الحساب</p><p className="text-xs text-slate-500 truncate">{isLoggedIn ? (auth?.customer?.email || auth?.customer?.first_name || 'مرحبا') : 'تسجيل الدخول لمتابعة طلباتك'}</p></div><div className="bg-white p-2 space-y-1">{isLoggedIn ? <><button type="button" onClick={() => { onClose(); auth.setShowProfileModal(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"> <User className="h-4 w-4 text-slate-400" /> حسابي <ChevronLeft className="ms-auto h-4 w-4 text-slate-300" /></button><button type="button" onClick={() => { onClose(); order?.loadUserOrders?.(); auth.setShowOrdersModal(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"> <Package className="h-4 w-4 text-slate-400" /> طلباتي <ChevronLeft className="ms-auto h-4 w-4 text-slate-300" /></button><button type="button" onClick={() => { onClose(); auth.logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"> <LogIn className="h-4 w-4" /> تسجيل خروج </button></> : <><button type="button" onClick={() => { onClose(); auth.setShowLoginModal(true); }} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-black text-white">تسجيل الدخول</button><button type="button" onClick={() => { onClose(); auth.setShowLoginModal(true); }} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-800">إنشاء حساب</button></>}</div></div>}
          {waHref && <a href={waHref} target="_blank" rel="noreferrer" onClick={onClose} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white">💬</span><span className="flex-1"><span className="block text-sm font-bold text-emerald-900">تواصل واتساب</span><span className="block text-xs text-emerald-700">للاستفسار والتواصل</span></span><ChevronLeft className="h-4 w-4 text-emerald-600" /></a>}
          {socialFromConfig.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-black text-slate-700">تابعنا</p><div className="flex flex-wrap gap-2">{socialFromConfig.map((s) => <a key={s.key} href={String(s.url)} target="_blank" rel="noreferrer" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">{s.key}</a>)}</div></div>}
        </div>
      </nav>
    </div>
  );
}
export function HayahHero({ banners }: { banners?: any[] }) {
  const hero = useResolvedHero();
  const hasMobileImages = hero.imagesMobile.length > 0;
  const desktopImages = hero.images;
  const mobileImages = hasMobileImages ? hero.imagesMobile : desktopImages;
  const dynamicSlides = hero.hasDynamicHero && (hero.type === 'image' || hero.type === 'slider' || hero.type === 'image_slider') && desktopImages.length > 0 ? desktopImages.map((img) => ({ title: hero.heading, subtitle: hero.subtitle, image: img, button_text: hero.ctaLabel, button_link: hero.ctaLink })) : hero.hasDynamicHero && (hero.heading || hero.subtitle || hero.ctaLabel) && desktopImages.length === 0 ? [{ title: hero.heading, subtitle: hero.subtitle, image: '', button_text: hero.ctaLabel, button_link: hero.ctaLink }] : null;
  const rawSlides = dynamicSlides ?? (banners && banners.length > 0 ? banners : []);
  const mediaCarousel = (hero as any).media?.length > 1 ? (hero as any).media as any[] : null;
  const isVideo = hero.hasDynamicHero && hero.type === 'video' && hero.videoUrl;
  const isYoutube = hero.hasDynamicHero && hero.type === 'youtube' && hero.youtubeId;
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slides = useMemo(() => {
    if (mediaCarousel && mediaCarousel.length) { return mediaCarousel.map((m: any) => { const c = heroContentForMedia(m, hero as any); return { image: m.type === 'image' ? m.src : (m.poster || ''), imageMobile: m.srcMobile || '', title: c.heading || hero.heading, subtitle: c.subtitle || hero.subtitle, button_text: c.ctaLabel || hero.ctaLabel, button_link: c.ctaLink || hero.ctaLink, hasContent: c.hasContent, isExplicitOff: c.isExplicitOff, type: m.type, src: m.src }; }); }
    return rawSlides;
  }, [mediaCarousel, rawSlides, hero]);
  const totalSlides = slides.length;
  const hasSlides = totalSlides > 0 || isVideo || isYoutube;
  useEffect(() => { if (isVideo || isYoutube || totalSlides <= 1) return; const t = setInterval(() => setIndex((v) => (v + 1) % totalSlides), 5000); return () => clearInterval(t); }, [totalSlides, isVideo, isYoutube]);
  const heightStyle = useMemo(() => { const h = HERO_HEIGHTS['restaurant-menu']; const hasCustom = !!(hero.heightDesktop || hero.heightMobile); if (hasCustom && hero.heightDesktop) return { height: hero.heightDesktop } as any; return { height: h.desktop } as any; }, [hero.heightDesktop, hero.heightMobile]);
  const hasCustomHeight = !!(hero.heightDesktop || hero.heightMobile);
  const h = HERO_HEIGHTS['restaurant-menu'];
  const desktopH = hasCustomHeight && hero.heightDesktop ? hero.heightDesktop : h.desktop;
  const mobileH = hasCustomHeight && hero.heightMobile ? hero.heightMobile : h.mobile;
  if (!hasSlides && !hero.hasDynamicHero) return null;
  const fit = hero.fit === 'contain' ? 'object-contain' : 'object-cover';
  const fitMobile = hero.fitMobile ? (hero.fitMobile === 'contain' ? 'object-contain' : 'object-cover') : fit;
  const pos = hero.position && hero.position !== 'center' ? hero.position : 'center';
  const posMobile = hero.positionMobile || pos;
  if (isVideo) {
    return (<section className="mx-auto max-w-[1400px] px-3 pt-3 sm:px-6 lg:px-8 sm:pt-4" dir="rtl">{!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .hayah-hero-media{ height:${desktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } }`}</style>}<div className="hayah-hero-media hero-clamped relative w-full overflow-hidden rounded-2xl bg-black shadow-sm" style={heightStyle}><video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${fit} ${hero.videoUrlMobile ? 'hidden md:block' : 'block'}`} style={{ objectPosition: pos }} src={getHeroImageUrl(hero.videoUrl)} poster={slides[0]?.image ? getHeroImageUrl(slides[0].image) : undefined} />{hero.videoUrlMobile && <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${fitMobile} block md:hidden`} style={{ objectPosition: posMobile }} src={getHeroImageUrl(hero.videoUrlMobile)} poster={slides[0]?.image ? getHeroImageUrl(slides[0].image) : undefined} />}<div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />{(hero.heading || hero.subtitle || hero.ctaLabel) && <div className="absolute inset-0 flex items-center"><div className="w-full px-5 sm:px-8">{hero.subtitle && <p className="mb-1.5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">{hero.subtitle}</p>}{hero.heading && <h1 className="max-w-xl text-xl font-black leading-snug text-white sm:text-3xl">{hero.heading}</h1>}{hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-3 inline-flex rounded-full bg-white px-5 py-2 text-sm font-black text-slate-900 shadow">{hero.ctaLabel}</a>}</div></div>}</div></section>);
  }
  if (isYoutube) {
    const ytDesktop = hero.youtubeId!;
    const ytMobile = hero.youtubeIdMobile || ytDesktop;
    const hasMobYt = !!hero.youtubeIdMobile;
    return (<section className="mx-auto max-w-[1400px] px-3 pt-3 sm:px-6 lg:px-8 sm:pt-4" dir="rtl">{!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .hayah-hero-media{ height:${desktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } }`}</style>}<div className="hayah-hero-media hero-clamped relative w-full overflow-hidden rounded-2xl bg-black shadow-sm" style={heightStyle}><div className={`absolute inset-0 overflow-hidden bg-black ${hasMobYt ? 'hidden md:block' : 'block'}`}>{hero.fit === 'contain' ? <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytDesktop}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytDesktop}&modestbranding=1&rel=0`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen /> : <div className="absolute inset-0 overflow-hidden bg-black"><iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${ytDesktop}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytDesktop}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width: '177.77777778vh', height: '56.25vw', minWidth: '100%', minHeight: '100%', maxWidth: 'none', maxHeight: 'none' } as any} /></div>}</div>{hasMobYt && <div className="absolute inset-0 overflow-hidden bg-black block md:hidden">{(hero.fitMobile || hero.fit) === 'contain' ? <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytMobile}&modestbranding=1&rel=0`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen /> : <div className="absolute inset-0 overflow-hidden bg-black"><iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${ytMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytMobile}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width: '177.77777778vh', height: '56.25vw', minWidth: '100%', minHeight: '100%', maxWidth: 'none', maxHeight: 'none' } as any} /></div>}</div>}<div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />{(hero.heading || hero.subtitle || hero.ctaLabel) && <div className="absolute inset-0 flex items-center"><div className="w-full px-5 sm:px-8">{hero.subtitle && <p className="mb-1.5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">{hero.subtitle}</p>}{hero.heading && <h1 className="max-w-xl text-xl font-black leading-snug text-white sm:text-3xl">{hero.heading}</h1>}{hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-3 inline-flex rounded-full bg-white px-5 py-2 text-sm font-black text-slate-900 shadow">{hero.ctaLabel}</a>}</div></div>}</div></section>);
  }
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 40) { if (diff < 0) setIndex((v) => (v + 1) % totalSlides); else setIndex((v) => (v - 1 + totalSlides) % totalSlides); }
    touchStart.current = null;
  };
  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-3 sm:px-6 lg:px-8 sm:pt-4" dir="rtl" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .hayah-hero-media{ height:${desktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } }`}</style>}
      <div className="hayah-hero-media hero-clamped relative w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm" style={heightStyle}>
        {slides.map((b: any, idx: number) => {
          const desktopSrc = b.image ? getOptimizedImageUrl(b.image || '', 'medium') : '';
          const mobileSrc = b.imageMobile ? getOptimizedImageUrl(b.imageMobile || '', 'medium') : desktopSrc;
          const hasContent = b.hasContent !== false && !b.isExplicitOff && (b.title || b.subtitle || b.button_text);
          return (
            <div key={idx} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: idx === index ? 1 : 0 }} aria-hidden={idx !== index}>
              {desktopSrc ? <><img src={desktopSrc} alt="" className={`absolute inset-0 h-full w-full ${fit} ${hasMobileImages || b.imageMobile ? 'hidden md:block' : 'block'}`} style={{ objectPosition: pos }} loading={idx === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={idx === 0 ? 'high' : undefined as any} sizes="100vw" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(b.image || ''); }} width={1200} height={400} />{(hasMobileImages || b.imageMobile) && mobileSrc && <img src={mobileSrc} alt="" className={`absolute inset-0 h-full w-full ${fitMobile} block md:hidden`} style={{ objectPosition: posMobile }} loading={idx === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={idx === 0 ? 'high' : undefined as any} sizes="100vw" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(b.imageMobile || b.image || ''); }} width={1200} height={1350} />} </> : <div className="absolute inset-0 bg-gradient-to-l from-slate-200 to-slate-100" />}
              <div className="absolute inset-0 bg-gradient-to-l from-black/35 via-black/10 to-transparent" />
              {hero.hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />}
              {hasContent && <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-2 p-5 sm:p-8 max-w-[60%]">{b.subtitle && <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">{b.subtitle}</p>}{b.title && <h2 className="text-xl font-black leading-snug text-white sm:text-3xl line-clamp-2">{b.title}</h2>}{b.button_text && <a href={b.button_link || '#'} className="mt-1 rounded-full bg-white px-5 py-2 text-sm font-black text-slate-900 shadow hover:bg-slate-50">{b.button_text}</a>}</div>}
            </div>
          );
        })}
        {totalSlides > 1 && <div className="absolute bottom-3 right-1/2 flex translate-x-1/2 gap-1.5">{slides.map((_: any, i: number) => <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`شريحة ${i + 1}`} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />)}</div>}
      </div>
    </section>
  );
}
export const RestaurantHero = HayahHero;
export function HayahProductCard({ product }: { product: V2Product }) {
  const { cart, product: productCtx, wishlist } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product as any);
  const wished = (wishlist as any)?.isInWishlist ? (wishlist as any).isInWishlist(product.id) : false;
  const range = priceRangeFor(product);
  const variants = variantSummary(product);
  const [adding, setAdding] = useState(false);
  const handleAdd = async (e: React.MouseEvent) => { e.stopPropagation(); if (variable) return productCtx.handleProductClick(product); if (out || adding) return; setAdding(true); try { await cart.addToCart(product as any); } finally { setAdding(false); } };
  const handleWishlist = async (e: React.MouseEvent) => { e.stopPropagation(); await (wishlist as any).toggle(product.id); };
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-square w-full overflow-hidden bg-slate-50" aria-label={product.name}>
        <img src={getOptimizedImageUrl(product.image || '', 'small')} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(product.image || ''); }} className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]" width={400} height={400} />
        {discount > 0 && !out && <span className="absolute right-2 top-2 rounded-lg bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white shadow-sm">-{discount}%</span>}
        {!!remaining && !out && <span className="absolute bottom-2 right-2 rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">آخر {remaining}</span>}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-black text-slate-500">نفدت الكمية</span>}
        <span role="button" tabIndex={0} onClick={handleWishlist as any} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (handleWishlist as any)(e); } }} aria-label="المفضلة" className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur transition ${wished ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white/90 text-slate-400 ring-slate-200 hover:text-rose-500'}`}><Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} strokeWidth={1.8} /></span>
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-[40px] text-start text-[13px] font-bold leading-snug text-slate-800 hover:text-[var(--store-primary,#2563eb)]">{product.name}</button>
        {variants.length > 0 && <div className="flex flex-wrap gap-1">{variants.map((v) => <span key={v} className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">{v}</span>)}{(product as any)?.variants?.[0]?.values?.length > 4 && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">+{(product as any).variants[0].values.length - 4}</span>}</div>}
        {(() => { const ls = getLoyaltySettingsFromPage(); if (!ls?.is_enabled) return null; const pts = calcEarnedPoints(Number(range.min) || Number(product.price) || 0, ls); return pts > 0 ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600"><Star className="h-3 w-3" /> كسب {pts} نقطة</span> : null; })()}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="leading-tight">{range.hasRange ? <p className="text-[15px] font-black text-slate-900">{formatPrice(range.min)} - {formatPrice(range.max)}</p> : <p className="text-[15px] font-black text-slate-900">{formatPrice(product.price)}</p>}{discount > 0 && !range.hasRange && !!product.originalPrice && <p className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>}</div>
          {!out && <button type="button" onClick={handleAdd} disabled={adding} aria-label="أضف للسلة" className="flex h-8 items-center gap-1 rounded-full bg-slate-900 px-3 text-xs font-black text-white shadow-sm transition hover:bg-black active:scale-95 disabled:opacity-60"><ShoppingBag className="h-3.5 w-3.5" />{adding ? '...' : variable ? 'خيارات' : 'أضف'}</button>}
        </div>
      </div>
    </div>
  );
}
export const DishRow = HayahProductCard;
export const ChefPicks = () => null;
function SectionHeader({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-black text-slate-900"><span className="h-5 w-1 rounded-full bg-[var(--store-primary,#2563eb)]" />{title}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{count} منتج</span></h2>
      <a href={href} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50">عرض الكل<ChevronLeft className="h-3.5 w-3.5" /></a>
    </div>
  );
}
function HayahFeatured({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8" dir="rtl">
      <SectionHeader title="منتجات مميزة" count={products.length} href="/products" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {products.slice(0, 12).map((p) => <HayahProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
function HayahCategorySections({ storeData }: { storeData: any }) {
  const { product } = useStorefrontCore();
  const categories: any[] = product?.categories || storeData?.categories || [];
  const products: any[] = product?.products || storeData?.products || [];
  const { homepageCategories, productsPerCategory } = useHomepageSettings(storeData);
  const sections = useMemo(() => {
    if (homepageCategories.length > 0) {
      return homepageCategories.map((id) => categories.find((c) => String(c.id) === String(id))).filter(Boolean).map((cat) => { const list = products.filter((p) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory); return { cat, list }; }).filter((s) => s.list.length > 0);
    }
    const groups = new Map<string, any[]>();
    for (const p of products) { const cid = String(p.categoryId ?? p.category_id ?? ''); if (!cid) continue; if (!groups.has(cid)) groups.set(cid, []); groups.get(cid)!.push(p); }
    return Array.from(groups.entries()).map(([cid, list]) => { const cat = categories.find((c) => String(c.id) === cid); if (!cat) return null; return { cat, list: list.slice(0, 6) }; }).filter(Boolean).slice(0, 8) as any[];
  }, [categories, products, homepageCategories, productsPerCategory]);
  if (!sections.length) return null;
  return (
    <div className="space-y-8">
      {sections.map(({ cat, list }: any) => (
        <section key={cat.id} className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8" dir="rtl">
          <SectionHeader title={cat.name} count={products.filter((p) => String(p.categoryId ?? p.category_id) === String(cat.id)).length} href={`/category/${cat.slug || cat.id}`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {list.map((p: any) => <HayahProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
function HayahFooter() {
  const { config, store, content } = useStorefrontCore() as any;
  const year = new Date().getFullYear();
  const social = [{ key: 'whatsapp', url: config?.socialMedia?.whatsapp, label: 'واتساب' }, { key: 'facebook', url: config?.socialMedia?.facebook, label: 'فيسبوك' }, { key: 'instagram', url: config?.socialMedia?.instagram, label: 'إنستغرام' }, { key: 'youtube', url: config?.socialMedia?.youtube, label: 'يوتيوب' }, { key: 'tiktok', url: (config?.socialMedia as any)?.tiktok || (content as any)?.tiktok_url, label: 'تيك توك' }].filter((s) => s.url && String(s.url).trim());
  const pages: any[] = (content as any)?.pages || store?.pages || [];
  return (
    <footer className="mt-10 border-t border-slate-100 bg-white" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="flex items-center gap-2">{(config?.logo || store?.logo) ? <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-8 w-auto object-contain" /> : <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-black">هـ</span>}<span className="text-sm font-black text-slate-900">{config?.storeName || store?.name}</span></div>{config?.description && <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-3">{config.description}</p>}{social.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{social.map((s) => <a key={s.key} href={String(s.url)} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{s.label}</a>)}</div>}</div>
          <div><h4 className="text-sm font-black text-slate-900">روابط المتجر</h4><ul className="mt-3 space-y-2 text-sm"><li><a href="/" className="text-slate-600 hover:text-slate-900">الرئيسية</a></li><li><a href="/products" className="text-slate-600 hover:text-slate-900">جميع المنتجات</a></li>{pages.slice(0, 5).map((p: any) => <li key={p.id || p.slug}><a href={`/page/${p.slug}`} className="text-slate-600 hover:text-slate-900">{p.title}</a></li>)}</ul></div>
          <div><h4 className="text-sm font-black text-slate-900">تواصل معنا</h4><ul className="mt-3 space-y-2 text-sm text-slate-600">{config?.phoneNumber && <li>الهاتف: <a href={`tel:${config.phoneNumber}`} className="font-bold text-slate-900">{config.phoneNumber}</a></li>}{config?.email && <li>البريد: <a href={`mailto:${config.email}`} className="font-bold text-slate-900">{config.email}</a></li>}{(config?.address || config?.city) && <li>{[config.address, config.city].filter(Boolean).join(' - ')}</li>}{!config?.phoneNumber && !config?.email && <li className="text-slate-400">بيانات التواصل من إعدادات المتجر</li>}</ul></div>
          <div><h4 className="text-sm font-black text-slate-900">معلومات</h4><ul className="mt-3 space-y-2 text-sm"><li><a href="/page/policy" className="text-slate-600 hover:text-slate-900">سياسة المتجر</a></li><li><a href="/page/shipping" className="text-slate-600 hover:text-slate-900">الشحن والتوصيل</a></li><li><a href="/page/returns" className="text-slate-600 hover:text-slate-900">الاسترجاع</a></li></ul></div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row"><span>© {year} {config?.storeName || store?.name} — جميع الحقوق محفوظة</span>{config?.copyrightText && <span>{config.copyrightText}</span>}</div>
      </div>
    </footer>
  );
}
const SORTS = [{ value: 'newest', label: 'الأحدث' }, { value: 'price_asc', label: 'السعر تصاعدي' }, { value: 'price_desc', label: 'السعر تنازلي' }, { value: 'name', label: 'أبجدياً' }];
export const RestaurantMenuRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <HayahCategoryMode categoryData={categoryData} storeData={storeData} />;
  if (mode === 'page') { return (<div dir="rtl" className="min-h-screen bg-[#f8fafc]"><HayahHeader /><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><h1 className="mb-6 border-b border-slate-200 pb-3 text-2xl font-black text-slate-900">{page?.title}</h1><article className="prose-custom2" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} /></main><HayahFooter /></div>); }
  return <HayahHome storeData={storeData} />;
};
export const RestaurantTabs = () => null;
const HayahHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const banners: any[] = storeData?.content?.banners || storeData?.banners || [];
  const { showLatest, homepageCategories } = useHomepageSettings(storeData);
  const featured = useMemo(() => { if (!showLatest) return []; return [...products].slice(0, 18); }, [products, showLatest]);
  const hasHomepageCats = homepageCategories.length > 0;
  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased selection:bg-[var(--store-primary,#2563eb)] selection:text-white">
      <HayahHeader />
      <main className="pb-8">
        <HayahHero banners={banners} />
        {featured.length > 0 && <div className="pt-6"><HayahFeatured products={featured} /></div>}
        <div className="pt-6"><HayahCategorySections storeData={storeData} /></div>
        {products.length === 0 && <div className="mx-auto max-w-[1400px] px-4 py-16 text-center sm:px-6 lg:px-8"><PackageSearch className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">لا توجد منتجات حالياً</p><p className="mt-1 text-xs text-slate-400">سيتم عرض منتجاتك هنا بعد إضافتها من لوحة التحكم</p></div>}
        {products.length > 0 && !hasHomepageCats && featured.length === 0 && <section className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8 pt-6" dir="rtl"><SectionHeader title="جميع المنتجات" count={products.length} href="/products" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{products.slice(0, 18).map((p) => <HayahProductCard key={p.id} product={p} />)}</div></section>}
      </main>
      <HayahFooter />
    </div>
  );
};
const HayahCategoryMode: React.FC<{ categoryData?: any | null; storeData?: any }> = ({ categoryData, storeData }) => {
  const { product } = useStorefrontCore();
  const cat = categoryData?.category;
  const allCategories: any[] = product?.categories || storeData?.categories || [];
  const products = useMemo(() => { const list: any[] = [...(product?.products || [])]; switch (categoryData?.sort) { case 'price_asc': return list.sort((a, b) => Number(a.price) - Number(b.price)); case 'price_desc': return list.sort((a, b) => Number(b.price) - Number(a.price)); case 'name': return list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')); default: return list; } }, [product?.products, categoryData?.sort]);
  const navigate = (next: Record<string, any>) => { router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true }); };
  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased">
      <HayahHeader homeHref="/" />
      <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 lg:px-8">
        {allCategories.length > 0 && <div className="mb-4 -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-none lg:mx-0 lg:px-0"><a href="/" className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700">الكل</a>{allCategories.slice(0, 30).map((c: any) => { const active = String(c.id) === String(cat?.id) || String(c.slug) === String(cat?.slug); return <a key={c.id} href={`/category/${c.slug || c.id}`} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{c.name}</a>; })}</div>}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500"><a href="/" className="font-bold hover:text-slate-900">الرئيسية</a><ChevronLeft className="h-4 w-4" /><span className="font-black text-slate-900">{cat?.name}</span><span className="ms-auto rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100">{categoryData?.total ?? products.length} منتج</span></nav>
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-black text-slate-900 lg:text-2xl">{cat?.name}</h1>{!!cat?.description && <p className="mt-1 max-w-xl text-sm text-slate-500">{cat.description}</p>}</div><select value={categoryData?.sort || 'newest'} onChange={(e) => navigate({ sort: e.target.value })} className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus:border-[var(--store-primary)] focus:outline-none">{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></header>
        {products.length === 0 ? <div className="flex flex-col items-center gap-3 py-16 text-center"><PackageSearch className="h-10 w-10 text-slate-300" /><p className="text-sm font-bold text-slate-600">لا توجد منتجات بهذا القسم</p><a href="/" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-black text-white">تصفح المتجر</a></div> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{products.map((p: any) => <HayahProductCard key={p.id} product={p} />)}</div>{categoryData && categoryData.lastPage > 1 && <nav className="mt-8 flex items-center justify-center gap-1.5">{Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => <button key={n} type="button" onClick={() => navigate({ page: n })} className={`h-9 min-w-9 rounded-full px-2 text-sm font-black transition ${n === categoryData.currentPage ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{n}</button>)}</nav>}</>}
      </main>
      <HayahFooter />
    </div>
  );
};
export default HayahHeader;
