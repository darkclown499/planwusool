import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Cpu, Gift, Headphones, Laptop, Menu, Package, PackageSearch, Plus, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Smartphone, Truck, Watch, X, Zap } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
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
import { createSafeHtml } from '@/utils/xss-protection';
import { useResolvedHero, HERO_HEIGHTS, HERO_HEIGHT_FALLBACK } from '../shared/heroMedia';
import type { HeroMediaItem } from '../shared/heroMedia';
import { CoverFlow, type CoverMedia } from '../shared/CoverFlow';
import { HubProductStage } from './ElectronicsOverlays';

/* ===================================================================== */
/* عالَم التِقنية — Electronics Hub V2 (presentation rebuilt from zero)   */
/* ===================================================================== */
/* Position one, light-cool surfaces, deep-navy ink, electric-blue used   */
/* as a controlled accent only (CTA / active / focus / hero focal light). */
/* The hero and the flash-deals band are the two "navy stage" moments that */
/* give the store its premium tech identity; everything else stays light. */
/* ===================================================================== */

const ACCENT = '#2563eb';
const INK = '#0a1220';       // deep navy text / stage
const INK_SOFT = '#141d2f';  // slightly lifted stage surface
const PAPER = '#f3f5f8';     // page cool-neutral
const LINE = '#e6ebf1';      // hairline
const GRAPHITE = '#5b6472';  // secondary text

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const DUR = { micro: 140, normal: 200, overlay: 300 };

/* Reduced-motion aware reveal */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
const revealStyle = (v: boolean): React.CSSProperties => ({
  opacity: v ? 1 : 0,
  transform: v ? 'none' : 'translateY(14px)',
  transition: `opacity ${DUR.normal}ms ${EASE}, transform ${DUR.normal}ms ${EASE}`,
});

/* Category icon resolver — technical glyph, no invented imagery */
const CATEGORY_ICONS: Array<{ test: RegExp; icon: React.ReactNode }> = [
  { test: /جوال|هاتف|آيفون|phone|iphone/i, icon: <Smartphone className="h-5 w-5" /> },
  { test: /لابتوب|حاسوب|كمبيوتر|laptop|pc|notebook/i, icon: <Laptop className="h-5 w-5" /> },
  { test: /سماعة|صوت|إذن|أذن|audio|headphone|earbud/i, icon: <Headphones className="h-5 w-5" /> },
  { test: /ساعة|watch/i, icon: <Watch className="h-5 w-5" /> },
];
function categoryIcon(name: string) {
  return CATEGORY_ICONS.find((c) => c.test.test(name || ''))?.icon ?? <Cpu className="h-5 w-5" />;
}

/* ================================================================== */
/*  HEADER — compact, app-like, search as a first-class feature        */
/* ================================================================== */

export function HubHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, content, order, behavior } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showCategoriesBar = (store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false;
  const count = (cart.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const categories = (product?.categories || []).slice(0, 8);

  const handleMyOrders = () => {
    if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); }
    else auth.setShowLoginModal(true);
  };

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return (product?.products || []).filter((p: any) => String(p.name || '').toLowerCase().includes(query)).slice(0, 6);
  }, [q, product?.products]);
  const select = (p: any) => { setQ(''); product.handleProductClick(p); };

  /* ---- Body scroll lock for mobile drawer ---- */
  const mobileNavRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);
  /* ESC to close mobile nav */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md" dir="rtl">
      {/* Trust strip — desktop only, compact */}
      <div className="hidden border-b border-[#eef1f5] bg-[#fafbfc] lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-8 gap-y-0 px-4 py-1 text-[11px] font-semibold text-[#5b6472] sm:px-6 lg:px-8">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#2563eb]" /> منتجات مضمونة</span>
          <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#2563eb]" /> توصيل سريع</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#2563eb]" /> أجهزة أصلية</span>
        </div>
      </div>

      {/* Main row */}
      <div className="flex items-center gap-1.5 border-b border-[#eef1f5] px-2.5 py-1.5 sm:px-4 sm:py-2 lg:px-8">
        {/* Mobile: hamburger — absolute left for centering logo */}
        <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="القائمة"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0a1220] transition-colors hover:bg-[#f0f3f7] lg:hidden">
          <Menu className="h-5.5 w-5.5" />
        </button>

        {/* Mobile: centered logo (absolute centering, aspect preserved) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center lg:hidden">
          <a href={homeHref} className="pointer-events-auto flex max-w-[42%] items-center">
            {config?.logo || store?.logo ? (
              <img src={getImageUrl(config.logo || store.logo)} alt="" className="max-h-7 w-auto max-w-full object-contain" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0a1220] text-white"><Zap className="h-3.5 w-3.5" /></span>
                <span className="truncate text-[13px] font-extrabold text-[#0a1220]">{config?.storeName || store?.name}</span>
              </span>
            )}
          </a>
        </div>

        {/* Desktop: logo + search in controlled layout */}
        <div className="hidden items-center gap-4 lg:flex lg:flex-1 lg:justify-between">
          {/* Logo — intentional max size */}
          <a href={homeHref} className="flex shrink-0 items-center gap-2">
            {config?.logo || store?.logo ? (
              <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a1220] text-white"><Zap className="h-4.5 w-4.5" /></span>
                <span className="text-base font-extrabold text-[#0a1220]">{config?.storeName || store?.name}</span>
              </>
            )}
          </a>

          {/* Search — first-class desktop */}
          <div className="relative mx-4 max-w-[480px] flex-1">
            <SearchField value={q} setValue={setQ} matches={matches} select={select} focused={focused} setFocused={setFocused} />
          </div>

          {/* Right cluster: loyalty + orders + cart */}
          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden xl:block"><HeaderLoyaltyBadge /></div>
            {canShowAuth && (
              <button type="button" onClick={handleMyOrders} aria-label="طلباتي"
                className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] font-bold text-[#5b6472] transition-colors hover:bg-[#f0f3f7] hover:text-[#0a1220]">
                <Package className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="hidden xl:inline">طلباتي</span>
              </button>
            )}
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3.5 text-[13px] font-bold text-white transition-all hover:bg-[#1d4ed8] active:scale-[0.97]"
              style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
              <ShoppingCart className="h-[18px] w-[18px]" />
              <span>السلة</span>
              {count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#2563eb]">{count}</span>}
            </button>
          </div>
        </div>

        {/* Mobile: right-side controls (cart + optionally orders) — placed naturally */}
        <div className="flex items-center gap-0.5 lg:hidden">
          {canShowAuth && (
            <button type="button" onClick={handleMyOrders} aria-label="طلباتي"
              className="flex h-11 w-10 items-center justify-center rounded-xl text-[#5b6472] transition-colors hover:bg-[#f0f3f7]">
              <Package className="h-5 w-5" strokeWidth={1.8} />
            </button>
          )}
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#0a1220] transition-colors hover:bg-[#f0f3f7]"
            style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-extrabold text-white">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile prominent search row — ROW2, app-like but slim */}
      <div className="border-b border-[#eef1f5] px-2.5 pb-2 pt-1 lg:hidden">
        <SearchField value={q} setValue={setQ} matches={matches} select={select} focused={focused} setFocused={setFocused} />
      </div>

      {/* Category bar (desktop) */}
      {showCategoriesBar && categories.length > 0 && (
        <div className="hidden border-b border-[#eef1f5] lg:block">
          <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1 sm:px-6 lg:px-8">
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-[#5b6472] transition-colors hover:bg-[#f0f3f7] hover:text-[#2563eb]">
                <span className="text-[#2563eb]">{categoryIcon(c.name)}</span>
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
    {typeof document !== 'undefined' && mobileNavOpen && createPortal(
      /* Mobile nav drawer — proper overlay via portal to body so it covers the full
         viewport (header backdrop-blur would otherwise clip a fixed descendant). */
      <div ref={mobileNavRef} className="fixed inset-0 z-[70]" dir="rtl"
        onKeyDown={(e) => { if (e.key === 'Escape') setMobileNavOpen(false); }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[#0a1220]/45 backdrop-blur-[2px] transition-opacity"
          onClick={() => setMobileNavOpen(false)} />
        {/* Drawer — RTL: slides from right */}
        <nav className="absolute inset-y-0 right-0 flex max-h-full w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl"
          style={{ animation: `hubSlideLeft ${DUR.overlay}ms ${EASE} both` }}>
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-[#eef1f5] px-4 py-3.5">
            <div className="flex items-center gap-2">
              {config?.logo || store?.logo ? (
                <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto max-w-[90px] object-contain" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0a1220] text-white"><Zap className="h-3.5 w-3.5" /></span>
                  <span className="text-sm font-extrabold text-[#0a1220]">{config?.storeName || store?.name}</span>
                </span>
              )}
            </div>
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="إغلاق القائمة"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5b6472] transition-colors hover:bg-[#f0f3f7]">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-2.5">
            {/* Home link */}
            <a href="/" onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#0a1220] transition-colors hover:bg-[#f4f6f9]">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f8] text-[#2563eb]"><Zap className="h-5 w-5" /></span>
              الرئيسية
            </a>
            {/* Categories */}
            {categories.map((c: any) => (
              <a key={c.id} href={`/category/${c.slug || c.id}`} onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#0a1220] transition-colors hover:bg-[#f4f6f9]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f8] text-[#2563eb]">{categoryIcon(c.name)}</span>
                {c.name}
              </a>
            ))}
            {categories.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-[#8a93a2]">لا توجد أقسام حالياً</p>
            )}
          </div>
          {/* Bottom account/orders section */}
          {canShowAuth && (
            <div className="border-t border-[#eef1f5] p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => { setMobileNavOpen(false); handleMyOrders(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#0a1220] transition-colors hover:bg-[#f4f6f9]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f8] text-[#8a93a2]"><Package className="h-5 w-5" /></span>
                طلباتي
              </button>
              <button type="button" onClick={() => { setMobileNavOpen(false); (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true))); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#0a1220] transition-colors hover:bg-[#f4f6f9]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f8] text-[#8a93a2]">
                  {auth?.isLoggedIn ? <BadgeCheck className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                </span>
                {auth?.isLoggedIn ? 'حسابي' : 'تسجيل الدخول'}
              </button>
            </div>
          )}
        </nav>
      </div>,
      document.body
    )}
  </>
  );
}

function SearchField({ value, setValue, matches, select, focused, setFocused }: any) {
  return (
    <div className="relative">
      <div className={`flex h-10 items-center overflow-hidden rounded-xl border bg-[#f4f6f9] transition-all sm:h-11 ${focused ? 'border-[#2563eb] bg-white ring-2 ring-[#2563eb]/20' : 'border-[#e3e9f0]'}`}>
        <Search className="pointer-events-none ms-3 h-4 w-4 shrink-0 text-[#8a93a2]" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="ابحث عن جهاز… آيفون، لابتوب، سماعات"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#0a1220] placeholder:text-[#9aa3b0] focus:outline-none"
        />
        {value && (
          <button type="button" onClick={() => { setValue(''); setFocused(false); }}
            className="me-2 flex h-6 w-6 items-center justify-center rounded-full text-[#8a93a2] hover:bg-[#e3e9f0] hover:text-[#0a1220]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-[#e6ebf1] bg-white py-1 shadow-lg shadow-[#0a1220]/8">
          {matches.map((p: any) => (
            <li key={p.id}>
              <button type="button" onMouseDown={() => select(p)}
                className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-[#f4f6f9]">
                <img src={getImageUrl(p.image || '')} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-[#f4f6f9] object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#0a1220]">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================== */
/*  HERO — premium navy product-showcase stage                         */
/* ================================================================== */

function HubHero({ banner }: { banner?: any }) {
  const hero = useResolvedHero();
  const heroCore = useStorefrontCore() as any;
  const hasBanner = !!(banner?.image || banner?.title || banner?.subtitle);
  const hasDynamic = hero.hasDynamicHero;

  /* ---- Build the ordered cover-flow media sequence (Electronics' own canonical hero data) ---- */
  const media = useMemo<HeroMediaItem[]>(() => {
    const list = (hero as any).media;
    if (Array.isArray(list) && list.length) return list as HeroMediaItem[];
    const out: HeroMediaItem[] = [];
    if (hero.images[0]) {
      out.push({
        id: 'img-0', type: 'image', src: hero.images[0], srcMobile: hero.imagesMobile[0] || null,
        poster: null, position: hero.position || null, positionMobile: hero.positionMobile || null,
      });
    }
    if (hero.videoUrl) {
      out.push({
        id: 'vid-0', type: 'video', src: hero.videoUrl as string, srcMobile: (hero as any).videoUrlMobile || null,
        poster: out.length ? (out[0] as any).src : (hero.images[0] || ''), position: hero.position || null, positionMobile: hero.positionMobile || null,
      } as any);
    }
    if (hero.youtubeId) {
      out.push({ id: 'yt-0', type: 'youtube', src: hero.youtubeId as string, srcMobile: (hero as any).youtubeIdMobile || null, poster: null, position: null, positionMobile: null });
    }
    return out;
  }, [hero]);

  /* ---- Hero text - merchant controlled, NO hardcoded fallback for empty/hidden ---- */
  const eff = useMemo(() => ({
    title: hero.heading || banner?.title || '',
    subtitle: hero.subtitle || banner?.subtitle || '',
    button_text: hero.ctaLabel || banner?.button_text || '',
    button_link: hero.ctaLink || banner?.button_link || '#hub-deals',
  }), [hero.heading, hero.subtitle, hero.ctaLabel, hero.ctaLink, banner]);

  /* ---- Promise / subtitle line - only when merchant has set content ---- */
  const promise = (() => {
    try {
      const c = heroCore?.content;
      const v = c?.electronics_promise ?? c?.electronics?.promise ?? c?.electronicsPromise;
      if (typeof v === 'string' && v.trim()) return v.trim();
    } catch {}
    return '';
  })();

  const overlayOpacity = typeof hero.overlayOpacity === 'number' ? hero.overlayOpacity : 0;

  /* ---- No media at all: compact premium navy text stage (merchant text only) ---- */
  if (!hasDynamic && !hasBanner) return null;

  /* ---- NO MEDIA: compact premium navy text stage (only when merchant has text) ------ */
  if (!media.length) {
    if (!eff.title && !eff.subtitle && !eff.button_text && !promise) return null;
    return (
      <section className="bg-[#f3f5f8]" dir="rtl" data-hero>
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="relative overflow-hidden rounded-2xl bg-[#0a1220] text-white sm:rounded-3xl">
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
            <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-[90px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-[#2563eb] to-transparent" />
            <div className="relative flex min-h-[220px] flex-col items-start justify-center gap-3 p-5 sm:min-h-[280px] sm:p-8 lg:p-10">
              {eff.subtitle && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold tracking-wide text-[#8ec5ff]">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> {eff.subtitle}
                </span>
              )}
              {eff.title && <h1 className="max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">{eff.title}</h1>}
              {promise && <p className="max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">{promise}</p>}
              {eff.button_text && (
                <a href={eff.button_link}
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563eb]/30 transition-all hover:bg-[#1d4ed8] active:scale-[0.97]"
                  style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
                  {eff.button_text} <ArrowLeft className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---- Cover Flow (shared, exact Fashion reuse) driven by Electronics' own hero data ----
     Single media => single-brand full-bleed hero using Electronics' heights.
     Multiple    => circular cover-flow stage (height derived from width, Fashion mechanics). */
  const heights = HERO_HEIGHTS['electronics-hub'] ?? HERO_HEIGHT_FALLBACK;

  const coverMedia = useMemo<CoverMedia[]>(() => media.map((m) => ({
    id: m.id,
    type: m.type,
    src: m.src,
    srcMobile: m.srcMobile || undefined,
    poster: m.poster || undefined,
    position: m.position || undefined,
    positionMobile: m.positionMobile || undefined,
    title: eff.title || undefined,
    subtitle: eff.subtitle || promise || undefined,
    ctaLabel: eff.button_text || undefined,
    ctaLink: eff.button_link || undefined,
  })), [media, eff, promise]);

  return (
    <CoverFlow
      media={coverMedia}
      heights={heights}
      overlayOpacity={overlayOpacity}
    />
  );
}

/* ================================================================== */
/*  PRODUCT CARD — image-first technical tile                          */
/* ================================================================== */

export function HubCard({ product }: { product: V2Product }) {
  const { cart, product: productCtx, wishlist } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  const specLine = useMemo(() => {
    const line = String(product.description || '').split('\n').map((s) => s.trim()).find(Boolean);
    return line ? line.slice(0, 60) : '';
  }, [product.description]);

  const add = async () => {
    if (variable) return productCtx.handleProductClick(product);
    await cart.addToCart(product as any);
  };
  const open = () => productCtx.handleProductClick(product);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e8edf3] bg-white transition-all hover:-translate-y-0.5 hover:border-[#c9d4e3] hover:shadow-[0_10px_30px_-12px_rgba(10,18,32,0.18)]"
      dir="rtl"
      style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
      {/* Media */}
      <div className="relative">
        <button type="button" onClick={open} className="relative block aspect-square w-full overflow-hidden bg-[#f6f8fa]" aria-label={product.name}>
          <HubProductStage src={product.image} alt={product.name} className="aspect-square transition-transform duration-300 group-hover:scale-[1.04]" fit="cover" />
          {discount > 0 && !out && (
            <span className="absolute right-2 top-2 rounded-md bg-[#e11d48] px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">-{discount}%</span>
          )}
          {!!remaining && !out && (
            <span className="absolute bottom-2 right-2 rounded-md bg-[#d97706] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">آخر {remaining} قطع</span>
          )}
          {out && <span className="absolute inset-0 flex items-center justify-center bg-[#0a1220]/55 text-sm font-bold text-white">غير متوفر</span>}
        </button>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          aria-label={wished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          className={`absolute left-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all ${
            wished ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#e3e8ee] bg-white/95 text-[#5b6472] hover:border-[#2563eb] hover:text-[#2563eb]'
          }`}
          style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
          <svg className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </button>
        {!out && !remaining && (
          <span className="absolute bottom-2 left-2 z-10 hidden rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#059669] shadow-sm ring-1 ring-[#059669]/20 sm:block">متوفر</span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3 pt-2.5 sm:p-3.5 sm:pt-3">
        <button type="button" onClick={open} className="line-clamp-2 min-h-[2.4rem] text-start text-[13px] font-bold leading-snug text-[#0a1220] transition-colors hover:text-[#2563eb]" style={{ transitionDuration: `${DUR.micro}ms` }}>
          {product.name}
        </button>
        {specLine && <p className="line-clamp-1 text-[11px] font-medium text-[#8a93a2]">{specLine}</p>}
        {(() => {
          const ls = getLoyaltySettingsFromPage();
          if (!ls?.is_enabled) return null;
          const pts = calcEarnedPoints(Number(product.price) || 0, ls);
          return pts > 0 ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b45309]"><Gift className="h-3 w-3" /> +{pts} نقطة</span> : null;
        })()}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tabular-nums text-[#0a1220] sm:text-lg">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-[11px] font-semibold text-[#8a93a2] line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button type="button" onClick={add} aria-label="أضف للسلة"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0a1220] text-white shadow-md transition-all hover:bg-[#2563eb] active:scale-90"
              style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  CATEGORIES — electronics discovery rail / grid                     */
/* ================================================================== */

function HubCategoryRail({ categories }: { categories: any[] }) {
  if (!categories.length) return null;

  /* Single category — compact intentional discovery card */
  if (categories.length === 1) {
    const c = categories[0];
    return (
      <a href={`/category/${c.slug || c.id}`}
        className="group inline-flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#e8edf3] bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2563eb]/40 hover:shadow-md active:scale-[0.98]"
        style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2f8] text-[#2563eb] transition-colors group-hover:bg-[#0a1220] group-hover:text-white">{categoryIcon(c.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-[#0a1220]">{c.name}</span>
          <span className="block text-xs font-medium text-[#8a93a2]">تصفح الأجهزة والإكسسوارات</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e3e8ee] text-[#2563eb] transition-colors group-hover:border-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white">←</span>
      </a>
    );
  }

  /* 2–4 categories — generous tiles */
  if (categories.length <= 4) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {categories.map((c: any) => (
          <a key={c.id} href={`/category/${c.slug || c.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-[#e8edf3] bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2563eb]/40 hover:shadow-md active:scale-[0.98]"
            style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2f8] text-[#2563eb] transition-colors group-hover:bg-[#0a1220] group-hover:text-white">{categoryIcon(c.name)}</span>
            <span className="line-clamp-2 text-[13px] font-bold text-[#0a1220]">{c.name}</span>
          </a>
        ))}
      </div>
    );
  }

  /* Many — horizontal touch rail (mobile) → grid (desktop) */
  return (
    <div className="scrollbar-none -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-5 xl:grid-cols-6">
      {categories.map((c: any) => (
        <a key={c.id} href={`/category/${c.slug || c.id}`}
          className="group flex min-w-[104px] max-w-[120px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-[#e8edf3] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2563eb]/40 hover:shadow-md active:scale-[0.98] sm:min-w-0 sm:max-w-none sm:p-4"
          style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eef2f8] text-[#2563eb] transition-colors group-hover:bg-[#0a1220] group-hover:text-white">{categoryIcon(c.name)}</span>
          <span className="line-clamp-2 max-w-[80px] text-center text-xs font-bold leading-tight text-[#0a1220] sm:max-w-[100px] sm:text-[13px]">{c.name}</span>
        </a>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  FLASH DEALS — integrated navy promo band                          */
/* ================================================================== */

function HubDealOfTheDay({ products }: { products: V2Product[] }) {
  const deadline = useMemo(() => new Date(Date.now() + 26 * 3600_000), []);
  const cd = useCountdown(deadline);
  const deals = useMemo(
    () => products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price)).slice(0, 8),
    [products]
  );
  if (!deals.length || !cd) return null;

  const reveal = useReveal();
  const units = [
    { v: String(cd.hours).padStart(2, '0'), l: 'ساعة' },
    { v: String(cd.minutes).padStart(2, '0'), l: 'دقيقة' },
    { v: String(cd.seconds).padStart(2, '0'), l: 'ثانية' },
  ];

  return (
    <section id="hub-deals" ref={reveal.ref} className="mx-auto mt-6 max-w-7xl px-3 sm:px-6 lg:px-8" dir="rtl" style={revealStyle(reveal.visible)}>
      <div className="overflow-hidden rounded-2xl border border-[#1c2740]">
        {/* Slim navy header bar — title + countdown, contained height (no empty dark stage) */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a1220] px-3.5 py-3 sm:px-5 sm:py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-white sm:text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563eb] text-white"><Zap className="h-4 w-4" /></span>
            عروض اليوم
          </h2>
          <div className="flex items-center gap-1.5" dir="ltr">
            {units.map((u, i) => (
              <React.Fragment key={u.l}>
                {i > 0 && <span className="text-white/20">:</span>}
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs tabular-nums text-white sm:text-sm">
                  <span className="font-extrabold">{u.v}</span>
                  <span className="ms-1 text-[9px] font-bold text-[#8ec5ff]">{u.l}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Content-driven light body — cards sized to content, no huge empty dark region */}
        <div className="border-t border-[#1c2740] bg-white p-3 sm:p-4">
          <div className="relative flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-4">
            {deals.slice(0, 4).map((p) => (
              <div key={p.id} className="min-w-[150px] shrink-0 snap-start sm:min-w-0">
                <HubCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  ROOT                                                               */
/* ================================================================== */

const SORTS = ['newest', 'price_asc', 'price_desc', 'name'];
const SORT_LABELS: Record<string, string> = { newest: 'الأحدث', price_asc: 'الأرخص', price_desc: 'الأغلى', name: 'أبجدياً' };

export const ElectronicsHubRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <HubCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f3f5f8] pb-16 md:pb-0">
        <HubHeader />
        <main className="prose-custom2 mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-[#e8edf3] pb-3 text-2xl font-extrabold text-[#0a1220]">{page?.title}</h1>
          <article className="text-[#5b6472] [&_a]:!text-[#2563eb] [&_h1]:!text-[#0a1220] [&_h2]:!text-[#0a1220] [&_h3]:!text-[#0a1220] [&_p]:!text-[#5b6472] [&_strong]:!text-[#0a1220]" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} />
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

/* ================================================================== */
/*  HOME                                                               */
/* ================================================================== */

const HubHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);
  const newest = useMemo(() => [...products].reverse().slice(0, 12), [products]);

  const catReveal = useReveal();
  const latestReveal = useReveal();
  const catSectionsReveal = useReveal();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f5f8] text-[#0a1220] antialiased selection:bg-[#2563eb] selection:text-white">
      <HubHeader />
      <main className="pb-16 md:pb-0">
        <HubHero banner={banners[0]} />

        {/* Categories */}
        {categories.length > 0 && (
          <section ref={catReveal.ref} className="mx-auto mt-4 max-w-7xl px-3 sm:px-6 lg:px-8" style={revealStyle(catReveal.visible)}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[#2563eb]" />
              <h2 className="text-base font-extrabold text-[#0a1220] sm:text-lg">تسوّق حسب القسم</h2>
            </div>
            <HubCategoryRail categories={categories} />
          </section>
        )}

        <HubDealOfTheDay products={products} />

        {/* Latest products */}
        {showLatest && (
          <section ref={latestReveal.ref} className="mx-auto mt-8 max-w-7xl px-3 sm:px-6 lg:px-8" style={revealStyle(latestReveal.visible)}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[#2563eb]" />
                <h2 className="text-base font-extrabold text-[#0a1220] sm:text-lg">وصل حديثاً</h2>
                <span className="rounded-md bg-[#2563eb]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#2563eb]">NEW</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
              {newest.map((p) => (
                <HubCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Dynamic category sections */}
        {homepageCategories.length > 0 && (
          <div ref={catSectionsReveal.ref} className="mt-8 space-y-8 sm:mt-12 sm:space-y-12" style={revealStyle(catSectionsReveal.visible)}>
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              return (
                <section key={cat.id} className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-[#2563eb]" />
                      <h2 className="text-base font-extrabold text-[#0a1220] sm:text-lg">{cat.name}</h2>
                    </div>
                    <a href={`/category/${cat.slug || cat.id}`} className="text-sm font-bold text-[#2563eb] transition-colors hover:text-[#1d4ed8]">عرض الكل ←</a>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
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

/* ================================================================== */
/*  CATEGORY MODE                                                      */
/* ================================================================== */

const HubCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const cat = categoryData?.category;
  const products = useMemo(() => sortList(product?.products || [], categoryData?.sort), [product?.products, categoryData?.sort]);
  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f5f8] text-[#0a1220] antialiased pb-16 md:pb-0">
      <HubHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-[#8a93a2]">
          <a href="/" className="font-bold text-[#5b6472] transition-colors hover:text-[#2563eb]">الرئيسية</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-extrabold text-[#0a1220]">{cat?.name}</span>
        </nav>
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#0a1220]">
              <span className="text-[#2563eb]">{cat ? categoryIcon(cat.name) : null}</span> {cat?.name}
            </h1>
            <p className="mt-1 text-sm text-[#8a93a2]">{categoryData?.total ?? 0} جهاز</p>
          </div>
          <div className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            {SORTS.map((s) => (
              <button key={s} type="button" onClick={() => navigate({ sort: s })}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  categoryData?.sort === s ? 'bg-[#0a1220] text-white shadow-sm' : 'bg-white text-[#5b6472] ring-1 ring-[#e3e8ee] hover:text-[#2563eb] hover:ring-[#2563eb]/40'
                }`}
                style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        </header>

        {cat && products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-[#b6bfcc]" />
            <p className="text-lg font-bold text-[#8a93a2]">لا توجد أجهزة بهذا القسم حالياً</p>
            <a href="/" className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1d4ed8] active:scale-[0.97]">تصفح بقية الأقسام</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((p: any) => (
                <HubCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData && categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold transition-all ${
                      n === categoryData.currentPage ? 'bg-[#0a1220] text-white shadow-sm' : 'bg-white text-[#5b6472] ring-1 ring-[#e3e8ee] hover:text-[#2563eb]'
                    }`}
                    style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
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
