import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { BadgeCheck, ChevronDown, ChevronLeft, Facebook, Globe, Heart, Home, Instagram, LayoutGrid, LogIn, LogOut, Menu, MessageCircle, Music, Package, PackageSearch, Plus, Search, Send, ShoppingBag, ShoppingCart, Twitter, User, X, Youtube } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { Gift } from 'lucide-react';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
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
import { createSafeHtml } from '@/utils/xss-protection';
import { useResolvedHero, getHeroImageUrl, HERO_HEIGHTS, HERO_BREAKPOINT, HERO_BREAKPOINT_CSS } from '../shared/heroMedia';
import {
  ensureBazaarInteractionsStyle,
  prefersReducedMotion,
  pulseBazaarCartBadge,
  flyToCartBazaar,
  triggerBazaarWishlistPop,
  initBazaarReveals,
  mountBazaarMotion,
} from './bazaarInteractions';
import { BazaarAnnouncementBar } from './BazaarAnnouncementBar';

/* ===================================================================== */
/* البازار — Bazaar Market                                                */
/* The general-purpose marketplace template and the system default.       */
/* Friendly teal-on-white storefront: a centered brand masthead, category */
/* circles, balanced product grid and a trust stack under every section.  */
/* ===================================================================== */

/* -------------------------------------------------------------- */
/*  Bazaar WhatsApp + Social helpers (merchant-scoped)               */
/* -------------------------------------------------------------- */
export function cleanBazaarWhatsAppNumber(input: string): string {
  return String(input || '').replace(/[^0-9]/g, '');
}
export function isSafeExternalUrl(url: string): boolean {
  try { const u = new URL(String(url).trim()); return ['https:','http:'].includes(u.protocol) && u.hostname.includes('.'); } catch { return false; }
}
export function resolveBazaarWhatsAppHref(config: any, content: any, store: any): string | null {
  const rawContent: any = content ?? {};
  const waCfg: any = rawContent.bazaar_whatsapp ?? rawContent.bazaar_wa ?? {};
  const enabledRaw = waCfg.enabled ?? waCfg.show ?? rawContent.bazaar_whatsapp_enabled ?? rawContent.bazaar_wa_enabled;
  let enabled: boolean | null = null;
  if (enabledRaw !== undefined) enabled = !!enabledRaw;
  else {
    if (config?.whatsapp_widget_enabled) enabled = true;
    else enabled = false;
  }
  if (!enabled) return null;
  const rawNumber = String(waCfg.number ?? waCfg.phone ?? rawContent.bazaar_whatsapp_number ?? rawContent.bazaar_wa_number ?? config?.whatsapp_widget_phone ?? config?.socialMedia?.whatsapp ?? (store as any)?.phone ?? '');
  const cleaned = cleanBazaarWhatsAppNumber(rawNumber);
  if (!cleaned || cleaned.length < 7) return null;
  const rawMessage = String(waCfg.message ?? rawContent.bazaar_whatsapp_message ?? config?.whatsapp_widget_message ?? 'مرحباً، لدي استفسار بخصوص المتجر');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(rawMessage)}`;
}
const BAZAAR_SOCIAL_PLATFORMS = [
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
export function getBazaarSocialIcon(platform: string) {
  const f = BAZAAR_SOCIAL_PLATFORMS.find((pl) => pl.value === String(platform).toLowerCase());
  return f ? f.icon : Globe;
}
export function getBazaarSocialSlots(content: any) {
  const base = (content as any)?.bazaar_mobile_nav ?? {};
  return [1,2,3,4,5,6].map((idx) => {
    const enabled = !!base[`social_${idx}_enabled`];
    const platform = String(base[`social_${idx}_platform`] ?? 'instagram').toLowerCase();
    const url = String(base[`social_${idx}_url`] ?? '').trim();
    const altEnabled = (content as any)[`bazaar_social_${idx}_enabled`];
    const altPlatform = (content as any)[`bazaar_social_${idx}_platform`];
    const altUrl = (content as any)[`bazaar_social_${idx}_url`];
    const finalEnabled = altEnabled !== undefined ? !!altEnabled : enabled;
    const finalPlatform = altPlatform ? String(altPlatform).toLowerCase() : platform;
    const finalUrl = altUrl !== undefined ? String(altUrl).trim() : url;
    const safe = finalEnabled && !!finalUrl && isSafeExternalUrl(finalUrl);
    return { idx, platform: finalPlatform, url: finalUrl, safe, enabled: finalEnabled };
  });
}
export function BazaarWhatsAppFloating() {
  const { config, content, store } = useStorefrontCore() as any;
  const href = resolveBazaarWhatsAppHref(config, content, store);
  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل واتساب"
      data-testid="bazaar-floating-whatsapp"
      className="bazaar-wa-entrance bazaar-wa-btn fixed left-4 z-40 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#25D366] text-white ring-1 ring-black/5 md:hidden"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' } as any}
    >
      <MessageCircle className="h-[22px] w-[22px]" fill="white" />
    </a>
  );
}

/* ------------------------------ Header ------------------------------ */

export function BazaarHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, content, order, behavior } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  useEffect(() => { ensureBazaarInteractionsStyle(); mountBazaarMotion(); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const categories = (product?.categories || []).slice(0, 8);
  const handleMyOrders = () => {
    if (auth?.isLoggedIn) {
      order?.loadUserOrders?.();
      auth.setShowOrdersModal(true);
    } else {
      auth.setShowLoginModal(true);
    }
  };
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);
  return (
    <>
    <header className={`bazaar-header sticky top-0 z-50 bg-white/90 backdrop-blur-md ${scrolled ? 'is-scrolled' : ''}`} dir="rtl">
      <div className="flex items-center gap-2 px-2.5 py-2.5 lg:hidden" dir="ltr">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="القائمة"
          data-testid="bazaar-hamburger"
          className="bazaar-header-action flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700"
          style={{ minWidth: 44, minHeight: 44 } as any}
        >
          <span className="transition-transform duration-150" style={{ display: 'inline-flex', transform: mobileNavOpen ? 'rotate(90deg)' : 'none' } as any}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
        <a href={homeHref} className="flex flex-1 items-center justify-center gap-2 overflow-hidden" aria-label={config?.storeName || store?.name}>
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto max-w-[42vw] object-contain" />
          ) : (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-black text-white bazaar-shadow-sm">س</span>
              <span className="max-w-[36vw] truncate text-[15px] font-black text-slate-900">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="bazaar-header-action flex h-11 w-11 items-center justify-center rounded-full text-slate-500" style={{ minWidth: 44, minHeight: 44 } as any}>
            <Search className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" data-bazaar-cart className="bazaar-header-action relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700" style={{ minWidth: 44, minHeight: 44 } as any}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span data-bazaar-cart-badge className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-black text-white">{count > 99 ? '99+' : count}</span>
            )}
          </button>
        </div>
      </div>
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex lg:px-8">
        <a href={homeHref} className="flex items-center gap-2.5">
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-11 w-auto object-contain" />
          ) : (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-black text-white bazaar-shadow-sm">س</span>
              <span className="min-w-0 max-w-[45vw] truncate text-xl font-black text-slate-900 sm:max-w-none">{config?.storeName || store?.name}</span>
            </>
          )}
        </a>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="bazaar-header-action rounded-full p-2.5 text-slate-500">
            🔍
          </button>
          <div className="hidden sm:block">
            <HeaderLoyaltyBadge />
          </div>
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="bazaar-header-action relative rounded-full p-2.5 text-slate-500">
            <Heart className="h-5 w-5" strokeWidth={1.8} />
            {!!wishlist?.count && (
              <span className="absolute top-0 -right-1 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{wishlist.count}</span>
            )}
          </button>
          {canShowAuth && (
          <button type="button" onClick={handleMyOrders} aria-label="طلباتي" className="bazaar-header-action hidden rounded-full p-2.5 text-slate-500 sm:block">
            <Package className="h-5 w-5" strokeWidth={1.8} />
          </button>
          )}
          {canShowAuth && (
          <button
            type="button"
            onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)))}
            aria-label="حسابي"
            className="bazaar-header-action hidden rounded-full p-2.5 text-slate-500 sm:block"
          >
            <User className="h-5 w-5" strokeWidth={1.8} />
          </button>
          )}
          <button type="button" onClick={() => ui.setShowCart(true)} data-bazaar-cart
            className="bazaar-btn relative mr-1 flex items-center gap-2 rounded-full bg-gradient-to-l from-teal-600 to-emerald-600 py-2 pl-4 pr-3 text-sm font-black text-white">
            <ShoppingBag className="h-4 w-4" />
            السلة
            {count > 0 && (
              <span data-bazaar-cart-badge className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-teal-700">{count}</span>
            )}
          </button>
        </div>
      </div>
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
    {typeof document !== 'undefined' && mobileNavOpen && createPortal(
      <BazaarMobileDrawer
        drawerRef={drawerRef as any}
        config={config}
        store={store}
        content={content}
        categories={product?.categories || []}
        auth={auth}
        order={order}
        behavior={behavior}
        ui={ui}
        cartCount={count}
        onClose={() => setMobileNavOpen(false)}
      />,
      document.body
    )}
    </>
  );
}



/* ================================================================== */
/*  Bazaar Mobile Drawer — portal, grouped architecture               */
/* ================================================================== */
function BazaarMobileDrawer({ drawerRef, config, store, content, categories, auth, order, behavior, ui, cartCount, onClose }: any) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { try { closeRef.current?.focus(); } catch {} }, []);
  const isLoggedIn: boolean = !!auth?.isLoggedIn;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAccount = accountsOn && (isLoggedIn || loginEnabled);
  const registrationEnabled = accountsOn && (behavior?.enable_customer_registration ?? behavior?.customer_registration_enabled ?? true) !== false;
  const customerName = [auth?.customer?.first_name, auth?.customer?.last_name].filter(Boolean).join(' ').trim() || auth?.customer?.email || '';
  const customerEmail = auth?.customer?.email || auth?.userProfile?.email || '';
  const customerPhone = auth?.customer?.phone || auth?.userProfile?.phone || '';
  const socialSlots = getBazaarSocialSlots(content);
  const hasSocial = socialSlots.some((s: any) => s.safe);
  const whatsappHref = resolveBazaarWhatsAppHref(config, content, store);
  const handleHome = () => { onClose(); window.location.href = '/'; };
  const handleCategory = (cat: any) => { onClose(); window.location.href = `/category/${cat.slug || cat.id}`; };
  const handleSubCategory = (cat: any) => handleCategory(cat);
  const handleLogin = () => { onClose(); auth?.setShowLoginModal?.(true); };
  const handleProfile = () => { onClose(); auth?.setShowProfileModal?.(true); };
  const handleOrders = () => { onClose(); if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); } else auth.setShowLoginModal(true); };
  const handleLogout = () => { onClose(); auth?.logout?.(); };
  const handleCart = () => { onClose(); ui?.setShowCart?.(true); };
  const handleWishlist = () => { onClose(); auth?.setShowWishlistModal?.(true); };
  const getCatImage = (c: any): string => {
    const raw = c?.image || c?.image_url || c?.cover || '';
    if (!raw) return '';
    try { return getImageUrl(String(raw)); } catch { return String(raw); }
  };
  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  return (
    <div ref={drawerRef} className="fixed inset-0 z-[70]" dir="rtl" role="dialog" aria-modal="true" data-testid="bazaar-drawer" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="bazaar-drawer-backdrop absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} data-testid="bazaar-drawer-backdrop" />
      <nav className="bazaar-drawer-panel absolute inset-y-0 right-0 flex max-h-[100dvh] w-[320px] max-w-[85vw] flex-col overflow-hidden bg-white" data-testid="bazaar-drawer-nav">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-center gap-2">
            {config?.logo || store?.logo ? (
              <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto max-w-[90px] object-contain" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white text-xs font-black">س</span>
                <span className="text-sm font-extrabold text-slate-900">{config?.storeName || store?.name}</span>
              </span>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="إغلاق القائمة" data-testid="bazaar-drawer-close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
          <button type="button" onClick={handleHome} data-testid="bazaar-drawer-home"
            className="flex w-full items-center gap-3 rounded-xl bg-teal-600 px-3 py-3 text-sm font-extrabold text-white bazaar-shadow-sm transition hover:bg-teal-700 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white"><Home className="h-5 w-5" /></span>
            الرئيسية
            <ChevronLeft className="ms-auto h-4 w-4 text-white/60" />
          </button>
          <button type="button" onClick={handleCart} data-testid="bazaar-drawer-cart"
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 bazaar-shadow-sm transition hover:bg-slate-50 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><ShoppingCart className="h-5 w-5" /></span>
            <span className="flex-1 text-start">السلة</span>
            {cartCount > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-black text-white">{cartCount}</span>}
            <ChevronLeft className="h-4 w-4 text-slate-300" />
          </button>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <button type="button" onClick={() => setCategoriesOpen((v) => !v)} aria-expanded={categoriesOpen} aria-controls="bazaar-cats" data-testid="bazaar-drawer-categories-toggle"
              className="flex h-[56px] w-full items-center gap-3 px-3 text-start transition">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600 ring-1 ring-slate-200"><LayoutGrid className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold leading-none text-slate-900">الأقسام</span>
                <span className="mt-1 block text-[11px] font-medium leading-none text-slate-400">{categories.length ? `${categories.length} أقسام` : 'استكشف الأقسام'}</span>
              </span>
              <ChevronDown className={`bazaar-drawer-chevron h-4 w-4 shrink-0 text-slate-400 ${categoriesOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoriesOpen && (
              <div id="bazaar-cats" className="bazaar-drawer-children border-t border-slate-200 bg-white px-2 py-2">
                {categories.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-400">لا توجد أقسام حالياً</p>
                ) : (
                  <div className="space-y-1">
                    {categories.slice(0, 30).map((cat: any) => {
                      const img = getCatImage(cat);
                      const subs: any[] = Array.isArray(cat.subcategories) ? cat.subcategories : [];
                      const hasSubs = subs.length > 0;
                      const isExpanded = expandedCatId === String(cat.id);
                      return (
                        <div key={cat.id} className="rounded-lg">
                          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <button type="button" onClick={() => handleCategory(cat)} className="flex flex-1 items-center gap-2.5 text-start" data-testid={`bazaar-cat-${cat.id}`}>
                              {img ? (
                                <img src={img} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" loading="lazy" />
                              ) : (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-slate-200"><LayoutGrid className="h-4 w-4" /></span>
                              )}
                              <span className="flex-1 truncate text-[13px] font-bold text-slate-900">{cat.name}</span>
                            </button>
                            {hasSubs ? (
                              <button type="button" onClick={() => setExpandedCatId(isExpanded ? null : String(cat.id))} aria-label="عرض الأقسام الفرعية" data-testid={`bazaar-cat-toggle-${cat.id}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                                <ChevronDown className={`bazaar-drawer-chevron h-4 w-4 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            ) : (
                              <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                            )}
                          </div>
                          {hasSubs && isExpanded && (
                            <div className="bazaar-drawer-children ms-6 mt-1 space-y-0.5 border-s-2 border-slate-100 ps-2">
                              {subs.map((sub: any) => {
                                const subImg = getCatImage(sub);
                                return (
                                  <button key={sub.id} type="button" onClick={() => handleSubCategory(sub)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start hover:bg-slate-50" data-testid={`bazaar-subcat-${sub.id}`}>
                                    {subImg ? <img src={subImg} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover ring-1 ring-slate-200" loading="lazy" /> : <span className="h-6 w-6 shrink-0 rounded-md bg-slate-100" />}
                                    <span className="flex-1 truncate text-[12px] font-semibold text-slate-700">{sub.name}</span>
                                    <ChevronLeft className="h-3 w-3 text-slate-300" />
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
          {canShowAccount && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setAccountOpen((v) => !v)} aria-expanded={accountOpen} aria-controls="bazaar-account" data-testid="bazaar-drawer-account-toggle"
                className="flex h-[56px] w-full items-center gap-3 px-3 text-start transition">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white"><User className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold leading-none text-slate-900">الحساب</span>
                  <span className="mt-1 block truncate text-[11px] font-medium leading-none text-slate-400">{isLoggedIn ? (customerName || 'إدارة الحساب') : 'تسجيل الدخول أو إنشاء حساب'}</span>
                </span>
                <ChevronDown className={`bazaar-drawer-chevron h-4 w-4 shrink-0 text-slate-400 ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen && (
                <div id="bazaar-account" className="bazaar-drawer-children border-t border-slate-200 bg-white px-2 py-2">
                  {isLoggedIn ? (
                    <>
                      {(customerName || customerEmail) && (
                        <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white">{(customerName || customerEmail || '؟').trim().charAt(0).toUpperCase()}</span>
                          <span className="min-w-0 flex-1">
                            {customerName && <span className="block truncate text-[12px] font-bold text-slate-900">{customerName}</span>}
                            {(customerEmail || customerPhone) && <span className="block truncate text-[11px] text-slate-500">{customerEmail || customerPhone}</span>}
                          </span>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <button type="button" onClick={handleProfile} data-testid="bazaar-account-profile" className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-slate-900 hover:bg-slate-50"><BadgeCheck className="h-4 w-4 text-slate-400" /> حسابي <ChevronLeft className="ms-auto h-3.5 w-3.5 text-slate-300" /></button>
                        <button type="button" onClick={handleOrders} data-testid="bazaar-account-orders" className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-slate-900 hover:bg-slate-50"><Package className="h-4 w-4 text-slate-400" /> طلباتي <ChevronLeft className="ms-auto h-3.5 w-3.5 text-slate-300" /></button>
                        <button type="button" onClick={handleWishlist} data-testid="bazaar-account-wishlist" className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-slate-900 hover:bg-slate-50"><Heart className="h-4 w-4 text-slate-400" /> المفضلة <ChevronLeft className="ms-auto h-3.5 w-3.5 text-slate-300" /></button>
                        <div className="mx-3 my-1 h-px bg-slate-100" />
                        <button type="button" onClick={handleLogout} data-testid="bazaar-account-logout" className="flex h-[44px] w-full items-center gap-3 rounded-lg px-3 text-start text-[13px] font-bold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
                      </div>
                    </>
                  ) : (
                    <div className="px-1 py-1">
                      <p className="px-2 text-[11px] leading-relaxed text-slate-400">سجّل الدخول لمتابعة حسابك وطلباتك</p>
                      <div className="mt-2 space-y-1.5">
                        <button type="button" onClick={handleLogin} data-testid="bazaar-account-login" className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-extrabold text-white transition hover:bg-slate-800 active:scale-[0.98]"><LogIn className="h-4 w-4" /> تسجيل الدخول</button>
                        {registrationEnabled && <button type="button" onClick={handleLogin} data-testid="bazaar-account-register" className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98]"><User className="h-4 w-4" /> إنشاء حساب</button>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={onClose} data-testid="bazaar-drawer-whatsapp"
              className="flex h-[52px] w-full items-center gap-3 rounded-xl bg-white px-3 bazaar-shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" fill="white" /></span>
              <span className="flex-1 text-start">
                <span className="block text-[13px] font-bold leading-none text-slate-900">تواصل معنا</span>
                <span className="mt-1 block text-[11px] leading-none text-slate-400">تواصل عبر واتساب</span>
              </span>
              <ChevronLeft className="h-4 w-4 text-slate-300" />
            </a>
          )}
          {hasSocial && (
            <>
              <div className="h-px bg-slate-100" />
              <div data-testid="bazaar-drawer-social">
                <p className="mb-2 text-[11px] font-extrabold tracking-wide text-slate-400">تابعنا</p>
                <div className="flex flex-wrap gap-2">
                  {socialSlots.filter((s: any) => s.safe).slice(0,6).map((slot: any) => {
                    const Icon = getBazaarSocialIcon(slot.platform);
                    return (
                      <a key={slot.idx} href={slot.url} target="_blank" rel="noreferrer" aria-label={slot.platform} data-testid={`bazaar-social-${slot.platform}`} className="bazaar-social flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white active:scale-95">
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

/* ------------------------------- Hero — now hero_banner-aware (video/youtube/image) ------------------------------- */

export function BazaarHero({ banners }: { banners: any[] }) {
  const hero = useResolvedHero();
  const hasMobileImages = hero.imagesMobile.length>0;
  const hasMobileVideo = !!hero.videoUrlMobile;
  const hasMobileYoutube = !!hero.youtubeIdMobile;
  // Prefer dynamic hero images when merchant saved them via Designer, fallback to legacy content.banners
  const desktopImages = hero.images;
  const mobileImages = hasMobileImages ? hero.imagesMobile : desktopImages;
  const dynamicSlides = hero.hasDynamicHero && (hero.type === 'image' || hero.type === 'slider' || hero.type === 'image_slider') && desktopImages.length > 0
    ? desktopImages.map((img) => ({ title: hero.heading, subtitle: hero.subtitle, image: img, button_text: hero.ctaLabel, button_link: hero.ctaLink }))
    : hero.hasDynamicHero && (hero.heading || hero.subtitle || hero.ctaLabel) && desktopImages.length === 0
      ? [{ title: hero.heading, subtitle: hero.subtitle, image: '', button_text: hero.ctaLabel, button_link: hero.ctaLink }]
      : null;
  const dynamicSlidesMobile = hero.hasDynamicHero && (hero.type === 'image' || hero.type === 'slider' || hero.type === 'image_slider') && mobileImages.length > 0
    ? mobileImages.map((img) => ({ title: hero.heading, subtitle: hero.subtitle, image: img, button_text: hero.ctaLabel, button_link: hero.ctaLink }))
    : dynamicSlides;
  const rawSlides = dynamicSlides ?? (banners.length > 0 ? banners : []);
  const rawSlidesMobile = dynamicSlidesMobile ?? rawSlides;
  if (rawSlides.length === 0 && !hero.hasDynamicHero) return null;
  const slides = rawSlides.length > 0 ? rawSlides : dynamicSlides ?? [];
  const slidesMobile = rawSlidesMobile.length>0 ? rawSlidesMobile : slides;
  const isVideo = hero.hasDynamicHero && hero.type === 'video' && hero.videoUrl;
  const isYoutube = hero.hasDynamicHero && hero.type === 'youtube' && hero.youtubeId;
  const [i, setI] = useState(0);
  const touchStartX = useRef<number | null>(null);
  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  useEffect(() => {
    if (isVideo || isYoutube || slides.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length, isVideo, isYoutube]);

  const bazaarFit = hero.fit === 'contain' ? 'object-contain' : 'object-cover';
  const bazaarFitMobile = hero.fitMobile ? (hero.fitMobile==='contain' ? 'object-contain':'object-cover') : bazaarFit;
  const bazaarPos = hero.position && hero.position !== 'center' ? hero.position : 'center';
  const bazaarPosMobile = hero.positionMobile || bazaarPos;
  const hasCustomHeight = !!(hero.heightDesktop || hero.heightMobile);
  const h = HERO_HEIGHTS['bazaar-market'];
  const bazaarDesktopH = hasCustomHeight && hero.heightDesktop ? hero.heightDesktop : h.desktop;
  const bazaarMobileH = hasCustomHeight && hero.heightMobile ? hero.heightMobile : h.mobile;
  // Single-media video/youtube heroes — contained marketplace card with clamped height
  if (isVideo) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8" dir="rtl">
        {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .bazaar-hero-media{ height:${bazaarDesktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } }`}</style>}
        <div className="bazaar-hero bazaar-hero-media hero-clamped relative w-full overflow-hidden rounded-3xl bg-black" style={hasCustomHeight ? (hero.heightDesktop ? { height: hero.heightDesktop } as any : {}) : { height: bazaarDesktopH } as any}>
          {/* Desktop video */}
          <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${bazaarFit} ${hasMobileVideo?'hidden md:block':'block'}`} style={{ objectPosition: bazaarPos }} src={getHeroImageUrl(hero.videoUrl)} poster={slides[0]?.image ? getHeroImageUrl(slides[0].image) : undefined} />
          {/* Mobile video */}
          {hasMobileVideo && <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${bazaarFitMobile} block md:hidden`} style={{ objectPosition: bazaarPosMobile }} src={getHeroImageUrl(hero.videoUrlMobile!)} poster={slidesMobile[0]?.image ? getHeroImageUrl(slidesMobile[0].image) : undefined} />}
          <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
          <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-black/10 to-transparent" />
          {(hero.heading || hero.subtitle || hero.ctaLabel) && (
            <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-2 p-7 sm:p-12">
              {hero.subtitle && <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">{hero.subtitle}</p>}
              {hero.heading && <h1 className="max-w-lg text-2xl font-black leading-snug text-white sm:text-4xl">{hero.heading}</h1>}
              {hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 bazaar-shadow-sm transition hover:bg-emerald-50">{hero.ctaLabel} ←</a>}
            </div>
          )}
        </div>
      </section>
    );
  }
  if (isYoutube) {
    const ytDesktop = hero.youtubeId!;
    const ytMobile = hero.youtubeIdMobile || ytDesktop;
    return (
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8" dir="rtl">
        {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .bazaar-hero-media{ height:${bazaarDesktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } }`}</style>}
        <div className="bazaar-hero bazaar-hero-media hero-clamped relative w-full overflow-hidden rounded-3xl bg-black" style={hasCustomHeight ? (hero.heightDesktop ? { height: hero.heightDesktop } as any : {}) : { height: bazaarDesktopH } as any}>
          {/* Desktop youtube */}
          <div className={`absolute inset-0 overflow-hidden bg-black ${hasMobileYoutube?'hidden md:block':'block'}`}>
            {hero.fit === 'contain' ? (
              <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytDesktop}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytDesktop}&modestbranding=1&rel=0`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-black"><iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${ytDesktop}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytDesktop}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'177.77777778vh', height:'56.25vw', minWidth:'100%', minHeight:'100%', maxWidth:'none', maxHeight:'none' } as any} /></div>
            )}
          </div>
          {/* Mobile youtube */}
          {hasMobileYoutube && (
            <div className="absolute inset-0 overflow-hidden bg-black block md:hidden">
              {(hero.fitMobile||hero.fit)==='contain' ? (
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytMobile}&modestbranding=1&rel=0`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <div className="absolute inset-0 overflow-hidden bg-black"><iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${ytMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${ytMobile}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'177.77777778vh', height:'56.25vw', minWidth:'100%', minHeight:'100%', maxWidth:'none', maxHeight:'none' } as any} /></div>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
          {(hero.heading || hero.subtitle || hero.ctaLabel) && (
            <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-2 p-7 sm:p-12">
              {hero.subtitle && <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">{hero.subtitle}</p>}
              {hero.heading && <h1 className="max-w-lg text-2xl font-black leading-snug text-white sm:text-4xl">{hero.heading}</h1>}
              {hero.ctaLabel && <a href={hero.ctaLink || '#'} className="mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 bazaar-shadow-sm transition hover:bg-emerald-50">{hero.ctaLabel} ←</a>}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8" dir="rtl" data-bazaar-reveal>
      {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .bazaar-hero-media{ height:${bazaarDesktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .bazaar-hero-media{ height:${bazaarMobileH} !important; } }`}</style>}
      <div
        className="bazaar-hero bazaar-hero-media hero-clamped relative w-full overflow-hidden rounded-3xl bg-gradient-to-l from-teal-700 to-emerald-800"
        style={hasCustomHeight ? (hero.heightDesktop ? { height: hero.heightDesktop } as any : {}) : { height: bazaarDesktopH } as any}
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || slides.length <= 1) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > 48) {
            if (dx < 0) setI((v) => (v + 1) % slides.length);
            else setI((v) => (v - 1 + slides.length) % slides.length);
          }
          touchStartX.current = null;
        }}
      >
        {slides.map((b: any, idx: number) => {
          const m = (slidesMobile[idx] || b);
          const desktopSrc = b.image ? getOptimizedImageUrl(b.image||'', 'medium') : '';
          const mobileSrc = m.image ? getOptimizedImageUrl(m.image||'', 'medium') : desktopSrc;
          const active = idx === i;
          return (
          <div key={idx} className="bazaar-hero-slide absolute inset-0" style={{ opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(1.01)', pointerEvents: active ? 'auto' : 'none' }} aria-hidden={!active}>
            {desktopSrc ? (
              <>
                <img src={desktopSrc} alt="" className={`absolute inset-0 h-full w-full ${bazaarFit} opacity-75 ${hasMobileImages?'hidden md:block':'block'}`} style={{ objectPosition: bazaarPos }} loading="eager" decoding="async" fetchPriority="high" sizes="100vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(b.image||''))}} width={1200} height={400} />
                {hasMobileImages && mobileSrc && <img src={mobileSrc} alt="" className={`absolute inset-0 h-full w-full ${bazaarFitMobile} opacity-75 block md:hidden`} style={{ objectPosition: bazaarPosMobile }} loading="eager" decoding="async" fetchPriority="high" sizes="100vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(m.image||''))}} width={1200} height={1350} />}
              </>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/80 via-emerald-900/30 to-transparent" />
            {hero.hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />}
            <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-3 p-7 sm:p-12">
              {(b.subtitle || hero.subtitle) && <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">{b.subtitle || hero.subtitle}</p>}
              {(b.title || hero.heading) && <h1 className="max-w-lg text-2xl font-black leading-snug text-white sm:text-4xl">{b.title || hero.heading}</h1>}
              {(b.button_text || hero.ctaLabel) && (
                <a href={b.button_link || hero.ctaLink || '#'} className="mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 bazaar-shadow-sm transition hover:bg-emerald-50">
                  {b.button_text || hero.ctaLabel} ←
                </a>
              )}
            </div>
          </div>
        )})}
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => setI((v) => (v - 1 + slides.length) % slides.length)} aria-label="السابق" className="bazaar-hero-arrow bazaar-shadow-sm absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 backdrop-blur md:flex">‹</button>
            <button type="button" onClick={() => setI((v) => (v + 1) % slides.length)} aria-label="التالي" className="bazaar-hero-arrow bazaar-shadow-sm absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 backdrop-blur md:flex">›</button>
            <div className="absolute bottom-4 right-1/2 flex translate-x-1/2 gap-1.5">
              {slides.map((_, idx: number) => (
                <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`شريحة ${idx + 1}`}
                  className={`bazaar-hero-dot h-2 rounded-full ${idx === i ? 'is-active bg-white' : 'w-2 bg-white/40'}`}
                  style={idx === i ? { width: 22 } as any : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* --------------------------- Product card --------------------------- */

export function BazaarCard({ product, index = 0 }: { product: V2Product; index?: number }) {
  const { cart, product: productCtx, wishlist, auth } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();
  const discount = discountPercent(product);
  const out = product.availability === 'out_of_stock';
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;
  const [added, setAdded] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wishBtnRef = useRef<HTMLButtonElement>(null);

  const add = async (e?: React.MouseEvent) => {
    if (variable) return productCtx.handleProductClick(product);
    const ok = await cart.addToCart(product as any);
    if (!ok) return;
    // success micro-interaction only after REAL success
    setAdded(true);
    pulseBazaarCartBadge();
    try {
      const origin = (e?.currentTarget as HTMLElement) || cardRef.current;
      const imgUrl = getOptimizedImageUrl(product.image || '', 'small') || getImageUrl(product.image || '');
      flyToCartBazaar(imgUrl, origin as HTMLElement);
    } catch {}
    window.setTimeout(() => setAdded(false), 720);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth?.isLoggedIn) {
      // preserve auth gate — do not show fake success
      auth?.setShowLoginModal?.(true);
      return;
    }
    const prev = !!wished;
    const res: 'added' | 'removed' | false = await wishlist.toggle(product.id);
    if (res === false) return;
    const addedNow = res === 'added';
    // only animate after real result
    if (wishBtnRef.current) triggerBazaarWishlistPop(wishBtnRef.current, addedNow);
    // keep prev logic for UI: wishlist state already updated via context refresh
    void prev;
  };

  return (
    <div
      ref={cardRef}
      data-bazaar-reveal
      data-bazaar-stagger
      style={{ ['--bazaar-idx' as any]: Math.min(index % 8, 6) } as any}
      className="bazaar-card group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100"
      dir="rtl"
    >
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-[4/5] w-full overflow-hidden bg-slate-50" aria-label={product.name}>
        <img src={getOptimizedImageUrl(product.image || '', 'small')} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(product.image||''))}} className="bazaar-card-img bazaar-img-fade h-full w-full object-cover" width={400} height={400} />
        {discount > 0 && !out && (
          <span className="absolute top-2.5 right-2.5 rounded-lg bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white">-{discount}%</span>
        )}
        {!!remaining && !out && (
          <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-amber-400/95 px-2 py-0.5 text-[10px] font-black text-amber-950 backdrop-blur">آخر {remaining}</span>
        )}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-black text-slate-500">نفذت الكمية</span>}
        <button
          ref={wishBtnRef}
          type="button"
          onClick={handleWishlist}
          aria-label="المفضلة"
          className={`bazaar-wishlist absolute top-2.5 left-2.5 rounded-full p-2 backdrop-blur ${wished ? 'bg-rose-500 text-white' : 'bg-white/85 text-slate-400 hover:text-rose-500'}`}
        >
          <Heart className="h-3.5 w-3.5" fill={wished ? 'currentColor' : 'none'} />
        </button>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="bazaar-card-title line-clamp-2 min-h-10 text-start text-sm font-bold leading-snug text-slate-800">
          {product.name}
        </button>
        {(() => {
          const ls = getLoyaltySettingsFromPage();
          if (!ls?.is_enabled) return null;
          const pts = calcEarnedPoints(Number(product.price) || 0, ls);
          return pts > 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Gift className="h-3 w-3" /> كسب {pts} نقطة</span> : null;
        })()}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="leading-tight">
            <p className="text-lg font-black text-teal-700">{formatPrice(product.price)}</p>
            {discount > 0 && !!product.originalPrice && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {!out && (
            <button
              ref={addBtnRef}
              type="button"
              onClick={add}
              aria-label={added ? 'تمت الإضافة' : 'أضف للسلة'}
              className={`bazaar-btn flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-black text-white ${added ? 'bazaar-add-success' : 'bg-teal-600'}`}
            >
              {added ? (
                <span className="bazaar-check-pop inline-flex items-center gap-1"><span>✓</span> تمت الإضافة</span>
              ) : (
                <><Plus className="h-3.5 w-3.5" strokeWidth={3} /> أضف</>
              )}
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
      <div dir="rtl" className="min-h-screen bg-slate-50 pb-16 md:pb-0">
        <BazaarHeader />
        <BazaarAnnouncementBar />
        <BazaarWhatsAppFloating />
        <main className="prose-custom2 mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-slate-200 pb-3 text-2xl font-black text-slate-900">{page?.title}</h1>
          <article dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} />
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
  <div className="mb-4 flex items-center justify-between" data-bazaar-reveal>
    <h2 className="bazaar-section-title flex items-center gap-2.5 text-xl font-black text-slate-900">
      <span className="bazaar-section-accent h-6 w-1.5 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" style={{ background: 'var(--store-primary, #0d9488)' } as any} />
      <span className="bazaar-section-title">{children}</span>
    </h2>
    {moreHref && (
      <a href={moreHref} className="bazaar-btn bazaar-btn--no-shadow text-sm font-bold text-teal-700 hover:text-teal-600">عرض الكل ←</a>
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

  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  useEffect(() => { initBazaarReveals(document); }, [products.length, categories.length, showLatest, showBest, homepageCategories.length]);

  return (
    <div dir="rtl" data-bazaar-root className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <BazaarHeader />
      <BazaarAnnouncementBar />
      <BazaarWhatsAppFloating />
      <main className="space-y-12 pb-16">
        <BazaarHero banners={banners} />

        {/* Category circles */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" data-bazaar-reveal>
            <SectionTitle>تسوّق الأقسام</SectionTitle>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {categories.slice(0, 8).map((c: any, idx: number) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} data-bazaar-reveal data-bazaar-stagger className="bazaar-cat group flex flex-col items-center gap-2" style={{ ['--bazaar-idx' as any]: Math.min(idx, 5) } as any}>
                  <span className="bazaar-cat-ring h-16 w-16 overflow-hidden rounded-2xl bg-white p-1 sm:h-20 sm:w-20">
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
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" data-bazaar-reveal>
            <SectionTitle moreHref="#newest">وصل حديثاً</SectionTitle>
            <div id="newest" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {newest.map((p, idx) => (
                <BazaarCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          </section>
        )}

        {/* Promo band — truthful: only shown when real discounted products exist, no fake 40% claim */}
        {(() => { const dealsCount = products.filter((p:any)=> p.originalPrice && Number(p.originalPrice) > Number(p.price)).length; if (dealsCount===0) return null; return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" data-bazaar-reveal>
          <div className="bazaar-promo relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-600 to-teal-700 p-7 text-white sm:p-10">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm font-black tracking-wide text-emerald-100">عروض الأسبوع</p>
            <h2 className="mt-1.5 max-w-md text-2xl font-black leading-snug sm:text-3xl">عروض مميزة على منتجات مختارة</h2>
            <a href="#popular" className="bazaar-btn bazaar-btn--no-shadow mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-50">
              اكتشف العروض
            </a>
          </div>
        </section> ); })()}

        {/* Popular picks — toggle show_best_sellers */}
        {showBest && popular.length > 0 && (
          <section id="popular" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" data-bazaar-reveal>
            <SectionTitle>الأكثر رواجاً</SectionTitle>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {popular.map((p, idx) => (
                <BazaarCard key={p.id} product={p} index={idx} />
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
                <section key={cat.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" data-bazaar-reveal>
                  <SectionTitle moreHref={`/category/${cat.slug || cat.id}`}>{cat.name}</SectionTitle>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {catProducts.map((p: any, idx: number) => (
                      <BazaarCard key={p.id} product={p} index={idx} />
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <a href={`/category/${cat.slug || cat.id}`} className="bazaar-btn inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-5 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
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
  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  useEffect(() => { initBazaarReveals(document); }, [products.length]);

  return (
    <div dir="rtl" data-bazaar-root className="min-h-screen bg-slate-50 text-slate-800 antialiased pb-16 md:pb-0">
      <BazaarHeader homeHref="/" />
      <BazaarAnnouncementBar />
      <BazaarWhatsAppFloating />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="مسار التنقل">
          <a href="/" className="bazaar-btn font-bold hover:text-teal-700">الرئيسية</a>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-black text-slate-900">{cat?.name}</span>
        </nav>

        <header className="mb-6 flex items-end justify-between gap-3" data-bazaar-reveal>
          <div>
            <h1 className="bazaar-section-title text-2xl font-black text-slate-900">{cat?.name}</h1>
            {!!cat?.description && <p className="mt-1 max-w-xl text-sm text-slate-500">{cat.description}</p>}
          </div>
          <select
            value={categoryData?.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="bazaar-search-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus:border-teal-600 focus:outline-none"
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
              {products.map((p: any, idx: number) => (
                <BazaarCard key={p.id} product={p} index={idx} />
              ))}
            </div>
            {categoryData && categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-xl px-2 text-sm font-black ${
                      n === categoryData.currentPage ? 'bazaar-shadow-sm bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-teal-700'
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
