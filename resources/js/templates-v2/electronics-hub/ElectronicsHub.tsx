import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Cpu, Facebook, Gift, Globe, Headphones, Heart, Home, Instagram, Laptop, LogIn, LogOut, MapPin, Menu, MessageCircle, Music, Package, PackageSearch, Plus, Search, Send, ShieldCheck, ShoppingCart, SlidersHorizontal, Smartphone, Truck, Twitter, User, Watch, X, Youtube, Zap } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';
import { flyToCartHub, pulseHubCartBadge } from './hubInteractions';
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
import { useResolvedHero, HERO_HEIGHTS, HERO_HEIGHT_FALLBACK, heroContentForMedia } from '../shared/heroMedia';
import type { HeroMediaItem } from '../shared/heroMedia';
import { CoverFlow, type CoverMedia } from '../shared/CoverFlow';
import { HubProductStage } from './ElectronicsOverlays';

/* ===================================================================== */
/* عالَم التِقنية — Electronics Hub V2 (presentation rebuilt from zero)   */
/* ===================================================================== */
/* Position one, light-cool surfaces, deep-navy ink, electric-blue used   */
/* as a controlled accent only (CTA / active / focus / hero focal light). */
/* The hero is the "navy stage" moment that gives the store its premium   */
/* tech identity; everything else stays light.                             */
/* ===================================================================== */

const ACCENT = '#2563eb';
const INK = '#0a1220';       // deep navy text / stage
const INK_SOFT = '#141d2f';  // slightly lifted stage surface
const PAPER = '#f3f5f8';     // page cool-neutral
const LINE = '#e6ebf1';      // hairline
const GRAPHITE = '#5b6472';  // secondary text

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const DUR = { micro: 140, normal: 200, overlay: 300 };

/* -------------------------------------------------------------- */
/*  WhatsApp helper — reuse canonical normalization                 */
/* -------------------------------------------------------------- */
function cleanWhatsAppNumber(input: string): string {
  return String(input || '').replace(/[^0-9]/g, '');
}
function resolveElectronicsWhatsAppHref(config: any, content: any, store: any): string | null {
  const rawContent: any = content ?? {};
  const waCfg: any = rawContent.electronics_whatsapp ?? rawContent.electronics_wa ?? {};
  const enabledRaw = waCfg.enabled ?? waCfg.show ?? rawContent.electronics_whatsapp_enabled;
  // If merchant has explicitly configured electronics whatsapp, respect it; otherwise fallback to generic widget if enabled
  let enabled: boolean | null = null;
  if (enabledRaw !== undefined) enabled = !!enabledRaw;
  else {
    // No electronics-specific setting: check generic widget enabled — but only if merchant hasn't disabled electronics explicitly
    // If generic widget is enabled, we still require a number; fallback maintains per-store isolation via store's own number
    if (config?.whatsapp_widget_enabled) enabled = true;
    else enabled = false;
  }
  if (!enabled) return null;
  const rawNumber = String(waCfg.number ?? waCfg.phone ?? rawContent.electronics_whatsapp_number ?? rawContent.electronics_wa_number ?? config?.whatsapp_widget_phone ?? config?.socialMedia?.whatsapp ?? (store as any)?.phone ?? '');
  const cleaned = cleanWhatsAppNumber(rawNumber);
  if (!cleaned || cleaned.length < 7) return null;
  const rawMessage = String(waCfg.message ?? rawContent.electronics_whatsapp_message ?? config?.whatsapp_widget_message ?? 'مرحباً، لدي استفسار عن أحد المنتجات');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(rawMessage)}`;
}

/* -------------------------------------------------------------- */
/*  Social helpers — up to 6 slots, reuse canonical contract        */
/* -------------------------------------------------------------- */
const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'tiktok', label: 'TikTok', icon: Music },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'snapchat', label: 'Snapchat', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'x', label: 'X / Twitter', icon: Twitter },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'website', label: 'Website', icon: Globe },
] as const;
function getSocialIcon(platform: string) {
  const f = SOCIAL_PLATFORMS.find((p) => p.value === String(platform).toLowerCase());
  return f ? f.icon : Globe;
}
function isSafeUrl(url: string): boolean {
  try { const u = new URL(String(url).trim()); return ['https:', 'http:'].includes(u.protocol) && u.hostname.includes('.'); } catch { return false; }
}
function getElectronicsSocialSlots(content: any) {
  const base = (content as any)?.electronics_mobile_nav ?? {};
  // Also support legacy flat keys for forward compat (electronics_social_...)
  return [1,2,3,4,5,6].map((idx) => {
    const enabled = !!base[`social_${idx}_enabled`];
    const platform = String(base[`social_${idx}_platform`] ?? 'instagram').toLowerCase();
    const url = String(base[`social_${idx}_url`] ?? '').trim();
    // Also check alternative flat dorm: content.electronics_social_{idx}_*
    const altEnabled = (content as any)[`electronics_social_${idx}_enabled`];
    const altPlatform = (content as any)[`electronics_social_${idx}_platform`];
    const altUrl = (content as any)[`electronics_social_${idx}_url`];
    const finalEnabled = altEnabled !== undefined ? !!altEnabled : enabled;
    const finalPlatform = altPlatform ? String(altPlatform).toLowerCase() : platform;
    const finalUrl = altUrl !== undefined ? String(altUrl).trim() : url;
    const safe = finalEnabled && !!finalUrl && isSafeUrl(finalUrl);
    return { idx, platform: finalPlatform, url: finalUrl, safe, enabled: finalEnabled };
  });
}

/* Floating WhatsApp — bottom-left, compact, natural bottom margin, safe-area aware (no bottom-nav offset) */
export function ElectronicsWhatsAppFloating() {
  const { config, content, store } = useStorefrontCore() as any;
  const href = resolveElectronicsWhatsAppHref(config, content, store);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل واتساب"
      className="fixed left-4 z-40 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_2px_10px_rgba(0,0,0,0.12),0_6px_18px_rgba(0,0,0,0.10)] ring-1 ring-black/5 transition hover:scale-[1.04] active:scale-[0.97] md:hidden"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' } as any}
    >
      <MessageCircle className="h-[22px] w-[22px]" fill="white" />
    </a>
  );
}

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
  const prevCountRef = useRef<number>(count);
  useEffect(() => {
    if (count > prevCountRef.current) pulseHubCartBadge();
    prevCountRef.current = count;
  }, [count]);

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

      {/* Mobile header — TRUE centered logo via grid-cols-[1fr_auto_1fr] */}
      <div className="grid h-14 max-w-full grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[#eef1f5] px-2.5 lg:hidden" dir="rtl">
        {/* RIGHT: hamburger (justify-self-start = right in RTL) */}
        <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="القائمة"
          className="flex h-11 w-11 shrink-0 items-center justify-center justify-self-start rounded-xl text-[#0a1220] transition-colors hover:bg-[#f0f3f7]">
          <Menu className="h-5 w-5" />
        </button>

        {/* CENTER: logo truly centered in header/viewport */}
        <a href={homeHref} className="flex max-w-[42vw] items-center justify-center justify-self-center" aria-label={config?.storeName || store?.name}>
          {config?.logo || store?.logo ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="max-h-7 w-auto max-w-full object-contain" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--store-primary,#0a1220)] text-white"><Zap className="h-3.5 w-3.5" /></span>
              <span className="truncate text-[13px] font-extrabold text-[#0a1220]">{config?.storeName || store?.name}</span>
            </span>
          )}
        </a>

        {/* LEFT: cart + orders (justify-self-end = left in RTL) */}
        <div className="flex items-center justify-self-end gap-0.5">
          {canShowAuth && (
            <button type="button" onClick={handleMyOrders} aria-label="طلباتي"
              className="flex h-11 w-10 items-center justify-center rounded-xl text-[#5b6472] transition-colors hover:bg-[#f0f3f7]">
              <Package className="h-5 w-5" strokeWidth={1.8} />
            </button>
          )}
          <button type="button" data-hub-cart="true" onClick={() => ui.setShowCart(true)} aria-label="السلة"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#0a1220] transition-colors hover:bg-[#f0f3f7]"
            style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span data-hub-cart-badge="true" className="absolute right-0.5 top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-extrabold text-white">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop: premium coherent bar — centered container matching storefront max-w-7xl */}
      <div className="hidden border-b border-[#eef1f5] lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-2.5 sm:px-6 lg:px-8">
          <a href={homeHref} className="flex shrink-0 items-center gap-2">
            {config?.logo || store?.logo ? (
              <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto max-w-[148px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--store-primary,#0a1220)] text-white"><Zap className="h-4.5 w-4.5" /></span>
                <span className="max-w-[160px] truncate text-[15px] font-extrabold leading-none text-[#0a1220]">{config?.storeName || store?.name}</span>
              </>
            )}
          </a>
          <div className="mx-6 flex flex-1 justify-center lg:mx-8 xl:mx-10">
            <div className="w-full max-w-[640px]">
              <SearchField value={q} setValue={setQ} matches={matches} select={select} focused={focused} setFocused={setFocused} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden xl:block"><HeaderLoyaltyBadge /></div>
            {canShowAuth && (
              <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)))} aria-label="حسابي"
                className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-[#5b6472] transition-colors hover:bg-[#f0f3f7] hover:text-[#0a1220]">
                <User className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="hidden xl:inline">حسابي</span>
              </button>
            )}
            {canShowAuth && (
              <button type="button" onClick={handleMyOrders} aria-label="طلباتي"
                className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold text-[#5b6472] transition-colors hover:bg-[#f0f3f7] hover:text-[#0a1220]">
                <Package className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="hidden xl:inline">طلباتي</span>
              </button>
            )}
            <button type="button" data-hub-cart="true" onClick={() => ui.setShowCart(true)} aria-label="السلة"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3.5 text-[13px] font-bold text-white transition-all hover:bg-[#1d4ed8] active:scale-[0.97]"
              style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
              <ShoppingCart className="h-[18px] w-[18px]" />
              <span>السلة</span>
              {count > 0 && <span data-hub-cart-badge="true" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#2563eb]">{count}</span>}
            </button>
          </div>
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
      <HubMobileDrawer
        mobileNavRef={mobileNavRef as any}
        config={config}
        store={store}
        content={content}
        categories={product?.categories || []}
        auth={auth}
        order={order}
        behavior={behavior}
        onClose={() => setMobileNavOpen(false)}
      />,
      document.body
    )}
  </>
  );
}

/* ================================================================== */
/*  MOBILE DRAWER — portal, grouped architecture                        */
/* ================================================================== */
function HubMobileDrawer({ mobileNavRef, config, store, content, categories, auth, order, behavior, onClose }: any) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Body already locked by parent, but ensure focus on close button
  useEffect(() => {
    try { closeRef.current?.focus(); } catch {}
  }, []);

  const isLoggedIn: boolean = !!auth?.isLoggedIn;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAccount = accountsOn && (isLoggedIn || loginEnabled);
  const registrationEnabled = accountsOn && (behavior?.enable_customer_registration ?? behavior?.customer_registration_enabled ?? true) !== false;

  const customerName = [auth?.customer?.first_name, auth?.customer?.last_name].filter(Boolean).join(' ').trim() || auth?.customer?.email || '';
  const customerEmail = auth?.customer?.email || auth?.userProfile?.email || '';
  const customerPhone = auth?.customer?.phone || auth?.userProfile?.phone || '';

  const socialSlots = getElectronicsSocialSlots(content);
  const hasSocial = socialSlots.some((s: any) => s.safe);
  const whatsappHref = resolveElectronicsWhatsAppHref(config, content, store);

  const handleMyOrders = () => {
    onClose();
    if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); }
    else auth.setShowLoginModal(true);
  };
  const handleLogin = () => { onClose(); auth?.setShowLoginModal?.(true); };
  const handleProfile = () => { onClose(); auth?.setShowProfileModal?.(true); };
  const handleLogout = () => { onClose(); auth?.logout?.(); };
  const handleHome = () => { onClose(); window.location.href = '/'; };
  const handleCategory = (cat: any) => { onClose(); window.location.href = `/category/${cat.slug || cat.id}`; };
  const handleSubCategory = (cat: any) => handleCategory(cat);

  const getCatImage = (c: any): string => {
    const raw = c?.image || c?.image_url || c?.cover || '';
    if (!raw) return '';
    try { return getImageUrl(String(raw)); } catch { return String(raw); }
  };

  return (
    <div ref={mobileNavRef} className="fixed inset-0 z-[70]" dir="rtl" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="absolute inset-0 bg-[#0a1220]/45 backdrop-blur-[2px]" onClick={onClose} />
      <nav className="absolute inset-y-0 right-0 flex max-h-[100dvh] w-[300px] max-w-[85vw] flex-col overflow-hidden bg-white shadow-2xl" style={{ animation: `hubSlideLeft ${DUR.overlay}ms ${EASE} both` }}>
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#eef1f5] px-4 py-3.5">
          <div className="flex items-center gap-2">
            {config?.logo || store?.logo ? (
              <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto max-w-[90px] object-contain" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--store-primary,#0a1220)] text-white"><Zap className="h-3.5 w-3.5" /></span>
                <span className="text-sm font-extrabold text-[#0a1220]">{config?.storeName || store?.name}</span>
              </span>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="إغلاق القائمة"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5b6472] transition-colors hover:bg-[#f0f3f7]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
          {/* HOME — distinct primary navigation action */}
          <button type="button" onClick={handleHome}
            className="flex w-full items-center gap-3 rounded-xl bg-[var(--store-primary,#0a1220)] px-3 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-90 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"><Home className="h-5 w-5" /></span>
            الرئيسية
            <ChevronLeft className="ms-auto h-4 w-4 text-white/60" />
          </button>

          {/* الأقسام — expandable/collapsible */}
          <div className="rounded-xl border border-[#e6ebf1] bg-[#f8fafc] overflow-hidden">
            <button
              type="button"
              onClick={() => setCategoriesOpen((v) => !v)}
              aria-expanded={categoriesOpen}
              aria-controls="hub-cats"
              className="flex h-[56px] w-full items-center gap-3 px-3 text-start transition"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#2563eb] ring-1 ring-[#e6ebf1]"><Cpu className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold leading-none text-[#0a1220]">الأقسام</span>
                <span className="mt-1 block text-[11px] font-medium leading-none text-[#8a93a2]">{categories.length ? `${categories.length} أقسام` : 'استكشف الأقسام'}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[#8a93a2] transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoriesOpen && (
              <div id="hub-cats" className="border-t border-[#e6ebf1] bg-white px-2 py-2">
                {categories.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-[#8a93a2]">لا توجد أقسام حالياً</p>
                ) : (
                  <div className="space-y-1">
                    {categories.slice(0, 30).map((cat: any) => {
                      const img = getCatImage(cat);
                      const subs: any[] = Array.isArray(cat.subcategories) ? cat.subcategories : [];
                      const hasSubs = subs.length > 0;
                      const isExpanded = expandedCatId === String(cat.id);
                      return (
                        <div key={cat.id} className="rounded-lg">
                          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f4f6f9]">
                            <button type="button" onClick={() => handleCategory(cat)} className="flex flex-1 items-center gap-2.5 text-start">
                              {img ? (
                                <img src={img} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-[#e6ebf1]" loading="lazy" />
                              ) : (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef2f8] text-[#2563eb] ring-1 ring-[#e6ebf1]">{categoryIcon(cat.name)}</span>
                              )}
                              <span className="flex-1 truncate text-[13px] font-bold text-[#0a1220]">{cat.name}</span>
                            </button>
                            {hasSubs ? (
                              <button type="button" onClick={() => setExpandedCatId(isExpanded ? null : String(cat.id))} aria-label="عرض الأقسام الفرعية" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8a93a2] hover:bg-[#eef2f8]">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            ) : (
                              <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-[#cbd5e1]" />
                            )}
                          </div>
                          {hasSubs && isExpanded && (
                            <div className="ms-6 mt-1 space-y-0.5 border-s-2 border-[#eef2f8] ps-2">
                              {subs.map((sub: any) => {
                                const subImg = getCatImage(sub);
                                return (
                                  <button key={sub.id} type="button" onClick={() => handleSubCategory(sub)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start hover:bg-[#f4f6f9]">
                                    {subImg ? <img src={subImg} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover ring-1 ring-[#e6ebf1]" loading="lazy" /> : <span className="h-6 w-6 shrink-0 rounded-md bg-[#eef2f8]" />}
                                    <span className="flex-1 truncate text-[12px] font-semibold text-[#334155]">{sub.name}</span>
                                    <ChevronLeft className="h-3 w-3 text-[#cbd5e1]" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* الحساب — separate group, auth-aware, real actions only */}
          {canShowAccount && (
            <div className="rounded-xl border border-[#e6ebf1] bg-[#f8fafc] overflow-hidden">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-controls="hub-account"
                className="flex h-[56px] w-full items-center gap-3 px-3 text-start transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--store-primary,#0a1220)] text-white"><User className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold leading-none text-[#0a1220]">الحساب</span>
                  <span className="mt-1 block truncate text-[11px] font-medium leading-none text-[#8a93a2]">{isLoggedIn ? (customerName || 'إدارة الحساب') : 'تسجيل الدخول أو إنشاء حساب'}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[#8a93a2] transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen && (
                <div id="hub-account" className="border-t border-[#e6ebf1] bg-white px-2 py-2">
                  {isLoggedIn ? (
                    <>
                      {(customerName || customerEmail) && (
                        <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl bg-[#f1f4f8] px-3 py-2.5 ring-1 ring-[#e6ebf1]">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--store-primary,#0a1220)] text-[12px] font-bold text-white">{(customerName || customerEmail || '؟').trim().charAt(0).toUpperCase()}</span>
                          <span className="min-w-0 flex-1">
                            {customerName && <span className="block truncate text-[12px] font-bold text-[#0a1220]">{customerName}</span>}
                            {(customerEmail || customerPhone) && <span className="block truncate text-[11px] text-[#64748b]">{customerEmail || customerPhone}</span>}
                          </span>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <button type="button" onClick={handleProfile} className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-[#0a1220] hover:bg-[#f4f6f9]"><BadgeCheck className="h-4 w-4 text-[#8a93a2]" /> حسابي <ChevronLeft className="ms-auto h-3.5 w-3.5 text-[#cbd5e1]" /></button>
                        <button type="button" onClick={handleMyOrders} className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-[#0a1220] hover:bg-[#f4f6f9]"><Package className="h-4 w-4 text-[#8a93a2]" /> طلباتي <ChevronLeft className="ms-auto h-3.5 w-3.5 text-[#cbd5e1]" /></button>
                        <div className="mx-3 my-1 h-px bg-[#eef1f5]" />
                        <button type="button" onClick={handleLogout} className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-[#dc2626] hover:bg-red-50"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
                      </div>
                    </>
                  ) : (
                    <div className="px-1 py-1">
                      <p className="px-2 text-[11px] leading-relaxed text-[#8a93a2]">سجّل الدخول لمتابعة حسابك وطلباتك</p>
                      <div className="mt-2 space-y-1.5">
                        <button type="button" onClick={handleLogin} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--store-primary,#0a1220)] px-4 text-[13px] font-extrabold text-white transition hover:brightness-90 active:scale-[0.98]"><LogIn className="h-4 w-4" /> تسجيل الدخول</button>
                        {registrationEnabled && <button type="button" onClick={handleLogin} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-[#0a1220] ring-1 ring-[#e6ebf1] transition hover:bg-[#f8fafc] active:scale-[0.98]"><User className="h-4 w-4" /> إنشاء حساب</button>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* WhatsApp in drawer — connected to contact area */}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={onClose} className="flex h-[52px] w-full items-center gap-3 rounded-xl bg-white px-3 shadow-sm ring-1 ring-[#e6ebf1] transition hover:bg-[#f8fafc] active:scale-[0.98]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" fill="white" /></span>
              <span className="flex-1 text-start">
                <span className="block text-[13px] font-bold leading-none text-[#0a1220]">تواصل عبر واتساب</span>
                <span className="mt-1 block text-[11px] leading-none text-[#8a93a2]">للاستفسار والتواصل</span>
              </span>
              <ChevronLeft className="h-4 w-4 text-[#cbd5e1]" />
            </a>
          )}

          {/* Social — compact circular icon buttons near bottom, up to 6 */}
          {hasSocial && (
            <>
              <div className="h-px bg-[#eef1f5]" />
              <div>
                <p className="mb-2 text-[11px] font-extrabold tracking-wide text-[#8a93a2]">تابعنا</p>
                <div className="flex flex-wrap gap-2">
                  {socialSlots.filter((s: any) => s.safe).slice(0,6).map((slot: any) => {
                    const Icon = getSocialIcon(slot.platform);
                    return (
                      <a key={slot.idx} href={slot.url} target="_blank" rel="noreferrer" aria-label={slot.platform} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--store-primary,#0a1220)] text-white shadow-sm transition hover:brightness-90 active:scale-95">
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </nav>
    </div>
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
    button_link: hero.ctaLink || banner?.button_link || '',
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
          <div className="relative overflow-hidden rounded-2xl bg-[var(--store-primary,#0a1220)] text-white sm:rounded-3xl">
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

  const coverMedia = useMemo<CoverMedia[]>(() => media.map((m) => {
    const c = heroContentForMedia(m as any, hero as any);
    if (c.isExplicitOff) {
      return { id: m.id, type: m.type, src: m.src, srcMobile: m.srcMobile || undefined, poster: m.poster || undefined, position: m.position || undefined, positionMobile: m.positionMobile || undefined, showContent: false as any };
    }
    if (c.isPerMedia) {
      return {
        id: m.id, type: m.type, src: m.src, srcMobile: m.srcMobile || undefined, poster: m.poster || undefined, position: m.position || undefined, positionMobile: m.positionMobile || undefined,
        title: c.heading || undefined, subtitle: c.subtitle || undefined, ctaLabel: c.ctaLabel || undefined, ctaLink: c.ctaLink || undefined, showContent: c.hasContent ? true : undefined,
      };
    }
    // legacy fallback — global heading shared across all media
    return {
      id: m.id, type: m.type, src: m.src, srcMobile: m.srcMobile || undefined, poster: m.poster || undefined, position: m.position || undefined, positionMobile: m.positionMobile || undefined,
      title: eff.title || undefined, subtitle: eff.subtitle || promise || undefined, ctaLabel: eff.button_text || undefined, ctaLink: eff.button_link || undefined,
    };
  }), [media, eff, promise, hero]);

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
  const { cart, product: productCtx, wishlist, auth } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  const specLine = useMemo(() => {
    const raw = String(product.description || '');
    const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const line = stripped.split('\n').map((s) => s.trim()).find(Boolean) || stripped;
    return line ? line.slice(0, 60) : '';
  }, [product.description]);

  // per-card transient interaction state — never global, never blocks scroll
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const addedTimerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [heartAnim, setHeartAnim] = useState<'idle' | 'pop' | 'shrink'>('idle');

  const open = () => productCtx.handleProductClick(product);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (variable) return productCtx.handleProductClick(product);
    if (adding || added) return;
    const originEl = (e.currentTarget as HTMLElement)?.closest?.('[data-hub-card]') as HTMLElement | null;
    // Use image element for fly origin when possible
    const imgOrigin = cardRef.current?.querySelector('img') as HTMLElement | null;
    const flyOrigin = originEl || imgOrigin || (e.currentTarget as HTMLElement);
    setAdding(true);
    try {
      const ok: boolean = await (cart.addToCart as (p: any) => Promise<boolean>)(product as any);
      if (!ok) return;
      // SUCCESS only — then visual feedback
      setAdded(true);
      // fly cue — uses real image url, measured once, transform-only
      const src = getImageUrl(product.image || (product as any).images?.[0] || '');
      try { flyToCartHub(src || product.image || null, flyOrigin); } catch {}
      if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current);
      addedTimerRef.current = window.setTimeout(() => setAdded(false), 1050) as unknown as number;
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => () => {
    if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current);
  }, []);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasWished = !!wished;
    // Preserve auth-required behavior: if wishlist requires auth, backend will 401 and we return false
    // Do not bypass; only animate on canonical success
    const result = await (wishlist.toggle as (id: any) => Promise<'added' | 'removed' | false>)(product.id);
    if (result === 'added' && !wasWished) {
      setHeartAnim('pop');
      window.setTimeout(() => setHeartAnim('idle'), 340);
    } else if (result === 'removed' && wasWished) {
      setHeartAnim('shrink');
      window.setTimeout(() => setHeartAnim('idle'), 220);
    } else if (result === false) {
      // failure or auth-required — no success animation; ensure UI reflects canonical state (no optimistic change)
      // briefly pulse back to indicate no-op without success styling
      if (!wasWished) {
        // auth failure: ensure login flow preserved if existing code expects it — check legacy auth gate
        // WishlistButton used to trigger login modal; preserve by not adding new trigger here (caller preserves existing).
        // If auth is required and user is guest, optionally trigger login if prior behavior did — but ElectronicsHub previously did not.
        // We keep as-is to avoid bypassing.
      }
    }
  };

  const reducedMotionStyle: React.CSSProperties = added && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? { transform: 'none' }
    : {};

  return (
    <div
      ref={cardRef}
      data-hub-card="true"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e6ebf1] bg-white transition-all hover:-translate-y-0.5 hover:border-[#cdd7e6] hover:shadow-[0_10px_30px_-12px_rgba(10,18,32,0.18)]"
      dir="rtl"
      style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
      {/* Media */}
      <div className="relative">
        <button type="button" onClick={open} className="relative block aspect-square w-full overflow-hidden bg-[#f1f4f8]" aria-label={product.name}>
          <HubProductStage src={product.image} alt={product.name} className="aspect-square p-3 transition-transform duration-300 group-hover:scale-[1.04]" fit="contain" />
          {discount > 0 && !out && (
            <span className="absolute right-2 top-2 rounded-md bg-[#e11d48] px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">-{discount}%</span>
          )}
          {!!remaining && !out && (
            <span className="absolute bottom-2 right-2 rounded-md bg-[#d97706] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">آخر {remaining} قطع</span>
          )}
          {out && <span className="absolute inset-0 flex items-center justify-center bg-[#0a1220]/55 text-sm font-bold text-white">غير متوفر</span>}
        </button>
        <button type="button"
          onClick={handleWishlist}
          aria-label={wished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-pressed={wished}
          className={`absolute left-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors ${
            wished ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#e3e8ee] bg-white/95 text-[#5b6472] hover:border-[#2563eb] hover:text-[#2563eb]'
          } ${heartAnim === 'pop' ? 'hub-heart-pop hub-heart-ring relative' : ''} ${heartAnim === 'shrink' ? 'scale-[0.88] opacity-90' : ''}`}
          style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
          <svg className={`h-4 w-4 ${heartAnim === 'pop' ? '' : ''}`} fill={wished ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
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
            <button type="button" onClick={handleAdd} aria-label={added ? 'تمت الإضافة' : 'أضف للسلة'} disabled={adding}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md transition-all active:scale-[0.92] disabled:opacity-60 ${
                added ? 'bg-[#2563eb] text-white' : 'bg-[var(--store-primary,#0a1220)] text-white hover:brightness-90'
              }`}
              style={{ transitionDuration: `200ms`, transitionTimingFunction: EASE, ...reducedMotionStyle }}>
              <span className="relative flex items-center justify-center">
                <Plus className={`h-5 w-5 absolute transition-all duration-200 ${added ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`} strokeWidth={2.6} />
                <Check className={`h-5 w-5 absolute transition-all duration-200 ${added ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} strokeWidth={2.6} style={added ? { animation: 'hubAddSuccessPop 280ms cubic-bezier(0.34,1.56,0.64,1)' } as any : undefined} />
              </span>
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

  const getCatImage = (c: any): string => {
    const raw = c?.image || c?.image_url || c?.cover || '';
    if (!raw) return '';
    try { return getImageUrl(String(raw)); } catch { return String(raw); }
  };

  const CardWithImage = ({ c, variant }: { c: any; variant: 'single' | 'few' | 'many' }) => {
    const src = getCatImage(c);
    const hasImage = !!src;
    const href = `/category/${c.slug || c.id}`;
    // Keep outer footprint approx same as before; image fills card with subtle bottom scrim for readable name
    if (variant === 'many') {
      return (
        <a key={c.id} href={href}
          className="group relative isolate flex min-w-[104px] max-w-[120px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#e8edf3] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9d4e3] hover:shadow-md active:scale-[0.98] sm:min-w-0 sm:max-w-none"
          style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
          <div className="relative aspect-square w-full overflow-hidden bg-[#f6f8fa] sm:aspect-[16/10]">
            {hasImage ? (
              <img src={src} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#eef2f8] text-[#2563eb]">{categoryIcon(c.name)}</div>
            )}
            {/* subtle bottom scrim — no excessive gradient/gaming effect */}
            <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-6 text-center text-[11px] font-extrabold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.65)] sm:px-2.5 sm:text-xs line-clamp-2">{c.name}</span>
          </div>
        </a>
      );
    }
    if (variant === 'few') {
      return (
        <a key={c.id} href={href}
          className="group relative isolate flex overflow-hidden rounded-2xl border border-[#e8edf3] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9d4e3] hover:shadow-md active:scale-[0.98]"
          style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
          <div className="relative h-[84px] w-full overflow-hidden bg-[#f6f8fa] sm:h-[108px]">
            {hasImage ? (
              <img src={src} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#eef2f8] text-[#2563eb]">{categoryIcon(c.name)}</div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-start text-[13px] font-extrabold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.65)] line-clamp-2">{c.name}</span>
          </div>
        </a>
      );
    }
    // single
    return (
      <a key={c.id} href={href}
        className="group relative isolate flex w-full max-w-md overflow-hidden rounded-2xl border border-[#e8edf3] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9d4e3] hover:shadow-md active:scale-[0.98]"
        style={{ transitionDuration: `${DUR.normal}ms`, transitionTimingFunction: EASE }}>
        <div className="relative h-[72px] w-full overflow-hidden bg-[#f6f8fa] sm:h-[84px]">
          {hasImage ? (
            <img src={src} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center gap-3 bg-[#eef2f8] px-3 text-[#2563eb]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563eb] shadow-sm">{categoryIcon(c.name)}</span>
              <span className="text-sm font-extrabold text-[#0a1220]">{c.name}</span>
            </div>
          )}
          {hasImage && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="line-clamp-1 text-sm font-extrabold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.65)]">{c.name}</span>
                <span className="hidden shrink-0 text-xs font-medium text-white/80 sm:block">تصفح الأجهزة والإكسسوارات</span>
              </div>
            </>
          )}
        </div>
      </a>
    );
  };

  /* Single category — compact intentional discovery card, now image-fill */
  if (categories.length === 1) {
    return <CardWithImage c={categories[0]} variant="single" />;
  }

  /* 2–4 categories — generous tiles, now image-fill with same footprint */
  if (categories.length <= 4) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {categories.map((c: any) => (
          <CardWithImage key={c.id} c={c} variant="few" />
        ))}
      </div>
    );
  }

  /* Many — horizontal touch rail (mobile) → grid (desktop), image-fill */
  return (
    <div className="scrollbar-none -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-5 xl:grid-cols-6">
      {categories.map((c: any) => (
        <CardWithImage key={c.id} c={c} variant="many" />
      ))}
    </div>
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
      <div dir="rtl" className="min-h-screen bg-[#f3f5f8]">
        <HubHeader />
        <ElectronicsWhatsAppFloating />
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
      <ElectronicsWhatsAppFloating />
      <main>
        <HubHero banner={banners[0]} />

        {/* Categories — improved vertical rhythm (breathing room after Hero/CoverFlow) */}
        {categories.length > 0 && (
          <section ref={catReveal.ref} className="mx-auto mt-7 max-w-7xl px-3 sm:mt-8 sm:px-6 lg:px-8" style={revealStyle(catReveal.visible)}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[#2563eb]" />
              <h2 className="text-base font-extrabold text-[#0a1220] sm:text-lg">تسوّق حسب القسم</h2>
            </div>
            <HubCategoryRail categories={categories} />
          </section>
        )}

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
    <div dir="rtl" className="min-h-screen bg-[#f3f5f8] text-[#0a1220] antialiased">
      <HubHeader homeHref="/" />
      <ElectronicsWhatsAppFloating />
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
                  categoryData?.sort === s ? 'bg-[var(--store-primary,#0a1220)] text-white shadow-sm' : 'bg-white text-[#5b6472] ring-1 ring-[#e3e8ee] hover:text-[#2563eb] hover:ring-[#2563eb]/40'
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
                      n === categoryData.currentPage ? 'bg-[var(--store-primary,#0a1220)] text-white shadow-sm' : 'bg-white text-[#5b6472] ring-1 ring-[#e3e8ee] hover:text-[#2563eb]'
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
