import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { ChevronLeft, Heart, Menu, Search, ShoppingBag, X, Package, User, LogIn, PackageSearch, Plus, Minus, Star, Home, Phone, FileText, Truck } from 'lucide-react';
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
import { useResolvedHero, getHeroImageUrl, HERO_HEIGHTS, HERO_BREAKPOINT_CSS, heroContentForMedia } from '../shared/heroMedia';

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
  return vals.slice(0, 3);
}

/* ------------------------- Header ------------------------- */
export function HayahHeader({ homeHref = '/' }: { homeHref?: string }) {
  const { config, store, cart, auth, ui, wishlist, product, order, behavior } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const count = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
  const wishCount = wishlist?.count || 0;
  const handleMyOrders = () => {
    if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); } else { auth.setShowLoginModal(true); }
  };
  const onSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) { ui.setShowSearch(true); try { product.handleSearch?.(q); } catch {} } else { ui.setShowSearch(true); }
  };
  useEffect(() => { if (!drawerOpen) return; const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, [drawerOpen]);
  const waRaw = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '');
  const waClean = cleanWhatsApp(waRaw);
  const waHref = waClean.length >= 7 ? `https://wa.me/${waClean}` : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white" dir="rtl">
        <div className="mx-auto max-w-[1320px] flex items-center gap-3 px-3 py-3 sm:px-4 lg:px-6">
          {/* RIGHT: logo */}
          <a href={homeHref} className="flex items-center gap-2 shrink-0 order-1">
            {(config?.logo || store?.logo) ? <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-9 w-auto max-w-[140px] object-contain sm:h-10" /> : <><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--store-primary,#1a7a4a)] text-white text-sm font-black">هـ</span><span className="hidden sm:block text-[16px] font-black text-slate-900 max-w-[180px] truncate">{config?.storeName || store?.name}</span></>}
            <span className="sm:hidden text-[14px] font-black text-slate-900 max-w-[26vw] truncate">{config?.storeName || store?.name}</span>
          </a>

          {/* CENTER: search */}
          <form onSubmit={onSearchSubmit} className="hidden lg:flex flex-1 max-w-[640px] mx-4 order-2">
            <div className="relative flex-1">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن منتج..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pe-4 ps-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--store-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--store-primary)]/15" />
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <button type="submit" aria-label="بحث" className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200"><Search className="h-4 w-4" /></button>
            </div>
          </form>
          {/* Mobile search hidden here, shown below header */}
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="القائمة" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50 lg:hidden order-3 ms-auto">
            <Menu className="h-5 w-5" />
          </button>

          {/* LEFT: actions */}
          <div className="hidden lg:flex items-center gap-1 order-3 ms-auto">
            {waHref && <a href={waHref} target="_blank" rel="noreferrer" className="hidden xl:flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] text-white hover:brightness-110"><Phone className="h-4 w-4" /></a>}
            <div className="hidden sm:block"><HeaderLoyaltyBadge /></div>
            <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 lg:hidden"><Search className="h-5 w-5" /></button>
            <button type="button" onClick={() => (wishlist as any)?.setShowWishlistModal ? (wishlist as any).setShowWishlistModal(true) : auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50"><Heart className="h-5 w-5" strokeWidth={1.7} />{wishCount > 0 && <span className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wishCount > 99 ? '99+' : wishCount}</span>}</button>
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ShoppingBag className="h-5 w-5" /><span className="hidden xl:inline">السلة</span>{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--store-primary,#1a7a4a)] px-1 text-[11px] font-black text-white">{count}</span>}</button>
            {canShowAuth && <button type="button" onClick={handleMyOrders} aria-label="طلباتي" className="hidden xl:flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"><Package className="h-5 w-5" strokeWidth={1.7} /></button>}
            {canShowAuth && <button type="button" onClick={() => (auth?.isLoggedIn ? auth.setShowProfileModal(true) : (loginEnabled && auth.setShowLoginModal(true)))} aria-label="حسابي" className="hidden xl:flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"><User className="h-5 w-5" /></button>}
          </div>

          {/* Mobile actions left */}
          <div className="flex lg:hidden items-center gap-1 order-4">
            <button type="button" onClick={() => (wishlist as any)?.setShowWishlistModal ? (wishlist as any).setShowWishlistModal(true) : auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50"><Heart className="h-5 w-5" />{wishCount > 0 && <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">{wishCount}</span>}</button>
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="السلة" className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700"><ShoppingBag className="h-5 w-5" />{count > 0 && <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-primary,#1a7a4a)] px-0.5 text-[9px] font-bold text-white">{count}</span>}</button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={onSearchSubmit} className="px-3 pb-3 lg:hidden" dir="rtl">
          <div className="relative">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن منتج..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pe-4 ps-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--store-primary)] focus:outline-none" />
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </form>

        {/* Accent divider */}
        <div className="h-[3px] w-full" style={{ background: 'var(--store-primary, #1a7a4a)' }} />
      </header>
      {drawerOpen && typeof document !== 'undefined' && createPortal(<HayahDrawer categories={(product?.categories || [])} config={config} store={store} content={useStorefrontCore().content} auth={auth} order={order} behavior={behavior} onClose={() => setDrawerOpen(false)} />, document.body)}
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
  return (
    <div className="fixed inset-0 z-[70]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <nav className="absolute inset-y-0 right-0 flex w-[320px] max-w-[85vw] flex-col overflow-hidden bg-[#f1f1f1] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
          <a href="/" className="flex items-center gap-2" onClick={onClose}>{(config?.logo || store?.logo) ? <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto max-w-[90px] object-contain" /> : <span className="flex items-center gap-1.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--store-primary,#1a7a4a)] text-white text-xs font-black">هـ</span><span className="text-sm font-black text-slate-900">{config?.storeName || store?.name}</span></span>}</a>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f1f1f1] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <a href="/" onClick={onClose} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-slate-800 ring-1 ring-slate-200"><Home className="h-4 w-4 text-slate-500" />الرئيسية</a>
          <div className="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden">
            <button type="button" onClick={() => setCatsOpen((v) => !v)} className="flex h-12 w-full items-center gap-2 px-3 text-start"><span className="text-sm font-black text-slate-900">الأقسام</span><span className="ms-auto text-xs text-slate-400">{categories.length} قسم</span><ChevronLeft className={`h-4 w-4 text-slate-400 transition-transform ${catsOpen ? '-rotate-90' : ''}`} /></button>
            {catsOpen && <div className="border-t border-slate-200 divide-y divide-slate-100">{categories.slice(0, 30).map((cat: any) => { const img = getCatImg(cat); const subs: any[] = Array.isArray(cat.subcategories) ? cat.subcategories : []; const hasSubs = subs.length > 0; const isExpanded = expandedCat === String(cat.id); return <div key={cat.id}><div className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50"><a href={`/category/${cat.slug || cat.id}`} onClick={onClose} className="flex flex-1 items-center gap-2.5">{img ? <img src={img} alt="" className="h-7 w-7 rounded object-cover ring-1 ring-slate-200" loading="lazy" /> : <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-600">{String(cat.name).slice(0,2)}</span>}<span className="flex-1 truncate text-[13px] font-medium text-slate-800">{cat.name}</span></a>{hasSubs ? <button type="button" onClick={() => setExpandedCat(isExpanded ? null : String(cat.id))} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><ChevronLeft className={`h-4 w-4 transition-transform ${isExpanded ? '-rotate-90' : ''}`} /></button> : <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />}</div>{hasSubs && isExpanded && <div className="bg-slate-50 border-t border-slate-100">{subs.map((sub: any) => <a key={sub.id} href={`/category/${sub.slug || sub.id}`} onClick={onClose} className="flex items-center gap-2 px-6 py-2 text-start hover:bg-white"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="flex-1 truncate text-xs text-slate-600">{sub.name}</span></a>)}</div>}</div>; })}</div>}
            <a href="/products" onClick={onClose} className="flex items-center justify-center gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white">عرض كل المنتجات<ChevronLeft className="h-3 w-3" /></a>
          </div>
          {canShowAuth && <div className="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden"><div className="px-3 py-3 bg-slate-50 border-b border-slate-200"><p className="text-xs font-black text-slate-800">الحساب</p><p className="text-xs text-slate-500 truncate">{isLoggedIn ? (auth?.customer?.email || 'مرحبا') : 'تسجيل الدخول لمتابعة طلباتك'}</p></div><div className="p-2 space-y-1">{isLoggedIn ? <><button type="button" onClick={() => { onClose(); auth.setShowProfileModal(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><User className="h-4 w-4" />حسابي</button><button type="button" onClick={() => { onClose(); order?.loadUserOrders?.(); auth.setShowOrdersModal(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Package className="h-4 w-4" />طلباتي</button><button type="button" onClick={() => { onClose(); auth.logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogIn className="h-4 w-4" />خروج</button></> : <><button type="button" onClick={() => { onClose(); auth.setShowLoginModal(true); }} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white">تسجيل الدخول</button><button type="button" onClick={() => { onClose(); auth.setShowLoginModal(true); }} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700">إنشاء حساب</button></>}</div></div>}
          {waHref && <a href={waHref} target="_blank" rel="noreferrer" onClick={onClose} className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white text-sm">✆</span><span className="flex-1"><span className="block text-sm font-bold text-slate-800">تواصل واتساب</span><span className="block text-xs text-slate-500">للاستفسار</span></span></a>}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------- Right Sidebar (desktop) ------------------------- */
function HayahSidebar() {
  const { config, store, product } = useStorefrontCore() as any;
  const categories: any[] = product?.categories || [];
  const getCatImg = (c: any) => { const raw = c?.image || c?.image_url || ''; if (!raw) return ''; try { return getImageUrl(String(raw)); } catch { return String(raw); } };
  const waRaw = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || (store as any)?.phone || '');
  const waClean = cleanWhatsApp(waRaw);
  const waHref = waClean.length >= 7 ? `https://wa.me/${waClean}` : null;
  const social = [
    { key: 'facebook', url: config?.socialMedia?.facebook, label: 'فيسبوك', icon: 'f' },
    { key: 'instagram', url: config?.socialMedia?.instagram, label: 'إنستغرام', icon: '◎' },
    { key: 'youtube', url: config?.socialMedia?.youtube, label: 'يوتيوب', icon: '▶' },
    { key: 'tiktok', url: (config?.socialMedia as any)?.tiktok || (useStorefrontCore() as any).content?.tiktok_url, label: 'تيك توك', icon: '♪' },
  ].filter((s) => s.url && String(s.url).trim() && /^https?:\/\//.test(String(s.url)));

  const [catsExpanded, setCatsExpanded] = useState(false);
  const INITIAL_CATS = 18;
  const visibleCats = catsExpanded ? categories : categories.slice(0, INITIAL_CATS);
  const hasMore = categories.length > INITIAL_CATS;

  return (
    <aside className="hidden lg:flex w-[210px] shrink-0 flex-col gap-3 sticky top-[84px] self-start max-h-[calc(100vh-88px)] overflow-y-auto scrollbar-thin" dir="rtl">
      <div className="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden">
        <a href="/" className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 border-b border-slate-100"><Home className="h-4 w-4 text-slate-500" />الرئيسية</a>
        <div className="divide-y divide-slate-100">
          {visibleCats.map((cat: any) => {
            const img = getCatImg(cat);
            const hasSubs = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
            return (
              <a key={cat.id} href={`/category/${cat.slug || cat.id}`} className="group flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                {img ? <img src={img} alt="" className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-slate-200" loading="lazy" /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-600">{String(cat.name).slice(0,2)}</span>}
                <span className="flex-1 truncate text-[13px] font-medium leading-tight text-slate-700 group-hover:text-slate-900">{cat.name}</span>
                {hasSubs && <ChevronLeft className="h-3 w-3 text-slate-300" />}
              </a>
            );
          })}
        </div>
        {hasMore && (
          <button type="button" onClick={() => setCatsExpanded((v) => !v)} className="flex w-full items-center justify-center gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900">
            {catsExpanded ? 'عرض أقل' : `عرض المزيد (${categories.length - INITIAL_CATS})`} <ChevronLeft className={`h-3 w-3 transition-transform ${catsExpanded ? 'rotate-90' : '-rotate-90'}`} />
          </button>
        )}
        <a href="/products" className="flex items-center justify-center gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white">عرض كل المنتجات<ChevronLeft className="h-3 w-3" /></a>
      </div>

      <div className="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100"><p className="text-xs font-black text-slate-800">تواصل معنا</p></div>
        <div className="divide-y divide-slate-100">
          {waHref && <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white text-xs">✆</span><span className="text-sm font-medium text-slate-700">واتساب</span></a>}
          {social.map((s) => <a key={s.key} href={String(s.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-[11px] font-black text-slate-600">{s.icon}</span><span className="text-sm font-medium text-slate-700">{s.label}</span></a>)}
          {config?.phoneNumber && <a href={`tel:${config.phoneNumber}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50"><Phone className="h-4 w-4 text-slate-500" /><span className="text-sm font-medium text-slate-700 dir-ltr">{config.phoneNumber}</span></a>}
          {!waHref && social.length === 0 && !config?.phoneNumber && <p className="px-3 py-3 text-xs text-slate-400">بيانات التواصل من إعدادات المتجر</p>}
        </div>
      </div>
    </aside>
  );
}

/* ------------------------- Utility Row ------------------------- */
function HayahUtilityRow() {
  const { auth, order, behavior, config, store } = useStorefrontCore() as any;
  const storeContent = (useStorefrontCore() as any).content || {};
  const pages: any[] = storeContent?.pages || store?.pages || [];
  const hasPage = (slug: string) => pages.some((p: any) => String(p.slug).toLowerCase() === slug.toLowerCase());
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const canOrders = accountsOn;
  const items: any[] = [];
  if (canOrders) items.push({ key: 'orders', label: 'طلباتي', icon: Package, action: () => { if (auth?.isLoggedIn) { order?.loadUserOrders?.(); auth.setShowOrdersModal(true); } else auth.setShowLoginModal(true); } });
  if (hasPage('policy') || hasPage('سياسة-المتجر')) items.push({ key: 'policy', label: 'سياسة المتجر', icon: FileText, href: '/page/policy' });
  else if (pages[0]) items.push({ key: 'policy', label: pages[0].title || 'سياسة المتجر', icon: FileText, href: `/page/${pages[0].slug}` });
  if (hasPage('shipping') || hasPage('الشحن')) items.push({ key: 'shipping', label: 'الشحن والتوصيل', icon: Truck, href: '/page/shipping' });
  const waRaw = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '');
  const waClean = cleanWhatsApp(waRaw);
  if (waClean.length >= 7) items.push({ key: 'whatsapp', label: 'تواصل واتساب', icon: Phone, href: `https://wa.me/${waClean}`, external: true });
  else if (config?.phoneNumber) items.push({ key: 'phone', label: 'اتصل بنا', icon: Phone, href: `tel:${config.phoneNumber}` });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" dir="rtl">
      {items.slice(0, 6).map((it) => {
        const Icon = it.icon;
        if (it.href) {
          return <a key={it.key} href={it.href} target={it.external ? '_blank' : undefined} rel={it.external ? 'noreferrer' : undefined} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Icon className="h-3.5 w-3.5 text-slate-500" />{it.label}</a>;
        }
        return <button key={it.key} type="button" onClick={it.action} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Icon className="h-3.5 w-3.5 text-slate-500" />{it.label}</button>;
      })}
    </div>
  );
}

/* ------------------------- Hero — canonical media[] wins ------------------------- */
export function HayahHero({ banners }: { banners?: any[] }) {
  const hero = useResolvedHero();
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const slides: Array<{
    id: string;
    type: 'image' | 'video' | 'youtube';
    src: string;
    srcMobile: string | null;
    poster: string | null;
    position: string | null;
    positionMobile: string | null;
    title: string;
    subtitle: string;
    button_text: string;
    button_link: string;
    hasContent: boolean;
    isExplicitOff: boolean;
  }> = useMemo(() => {
    const media: any[] = (hero as any).media || [];
    if (media.length > 0) {
      return media.map((m: any) => {
        const c = heroContentForMedia(m, hero as any);
        return {
          id: m.id,
          type: m.type as 'image' | 'video' | 'youtube',
          src: m.src,
          srcMobile: m.srcMobile || null,
          poster: m.poster || null,
          position: m.position || null,
          positionMobile: m.positionMobile || null,
          title: c.heading || '',
          subtitle: c.subtitle || '',
          button_text: c.ctaLabel || '',
          button_link: c.ctaLink || '',
          hasContent: c.hasContent,
          isExplicitOff: c.isExplicitOff,
        };
      });
    }
    // Legacy fallbacks — preserve old stores (single image/video/youtube or banners)
    const legacy: typeof slides = [];
    if (hero.images.length > 0) {
      hero.images.forEach((src, idx) => {
        const mobileSrc = hero.imagesMobile[idx] || null;
        // Only use global heading for legacy image slides when no per-media content
        legacy.push({
          id: `image-legacy-${idx}`,
          type: 'image',
          src,
          srcMobile: mobileSrc,
          poster: null,
          position: hero.position || null,
          positionMobile: hero.positionMobile || null,
          title: hero.heading || '',
          subtitle: hero.subtitle || '',
          button_text: hero.ctaLabel || '',
          button_link: hero.ctaLink || '',
          hasContent: !!(hero.heading || hero.subtitle || hero.ctaLabel),
          isExplicitOff: false,
        });
      });
      if (legacy.length) return legacy;
    }
    if (hero.videoUrl) {
      legacy.push({
        id: 'video-legacy',
        type: 'video',
        src: hero.videoUrl,
        srcMobile: hero.videoUrlMobile || null,
        poster: hero.images[0] || null,
        position: hero.position || null,
        positionMobile: hero.positionMobile || null,
        title: hero.heading || '',
        subtitle: hero.subtitle || '',
        button_text: hero.ctaLabel || '',
        button_link: hero.ctaLink || '',
        hasContent: !!(hero.heading || hero.subtitle || hero.ctaLabel),
        isExplicitOff: false,
      });
      return legacy;
    }
    if (hero.youtubeId) {
      legacy.push({
        id: 'youtube-legacy',
        type: 'youtube',
        src: hero.youtubeId,
        srcMobile: hero.youtubeIdMobile || null,
        poster: null,
        position: null,
        positionMobile: null,
        title: hero.heading || '',
        subtitle: hero.subtitle || '',
        button_text: hero.ctaLabel || '',
        button_link: hero.ctaLink || '',
        hasContent: !!(hero.heading || hero.subtitle || hero.ctaLabel),
        isExplicitOff: false,
      });
      return legacy;
    }
    if (banners && banners.length > 0) {
      return banners.map((b: any, idx: number) => ({
        id: `banner-${idx}`,
        type: 'image' as const,
        src: b.image || b.src || '',
        srcMobile: b.imageMobile || b.mobile_image || null,
        poster: null,
        position: null,
        positionMobile: null,
        title: b.title || b.heading || '',
        subtitle: b.subtitle || '',
        button_text: b.button_text || b.ctaLabel || '',
        button_link: b.button_link || b.ctaLink || '',
        hasContent: !!(b.title || b.subtitle || b.button_text),
        isExplicitOff: false,
      }));
    }
    return [];
  }, [hero, banners]);

  const totalSlides = slides.length;
  const hasSlides = totalSlides > 0;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setIndex((v) => (v + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(t);
  }, [totalSlides]);

  // Pause hidden videos, play active one — saves CPU/audio and respects autoplay policy (muted required)
  useEffect(() => {
    videoRefs.current.forEach((el, idx) => {
      if (!el) return;
      const slideIdx = idx >= 10000 ? idx - 10000 : idx;
      if (slideIdx === index && el.paused) {
        const p = el.play();
        if (p && typeof (p as any).catch === 'function') (p as any).catch(() => {});
      } else if (slideIdx !== index && !el.paused) {
        el.pause();
        try { el.currentTime = 0; } catch {}
      }
    });
  }, [index, slides]);

  const heightStyle = useMemo(() => {
    const h = HERO_HEIGHTS['restaurant-menu'];
    const hasCustom = !!(hero.heightDesktop || hero.heightMobile);
    if (hasCustom && hero.heightDesktop) return { height: hero.heightDesktop } as any;
    return { height: h.desktop } as any;
  }, [hero.heightDesktop, hero.heightMobile]);
  const hasCustomHeight = !!(hero.heightDesktop || hero.heightMobile);
  const h = HERO_HEIGHTS['restaurant-menu'];
  const desktopH = hasCustomHeight && hero.heightDesktop ? hero.heightDesktop : h.desktop;
  const mobileH = hasCustomHeight && hero.heightMobile ? hero.heightMobile : h.mobile;

  if (!hasSlides && !hero.hasDynamicHero) return null;

  const globalFit = hero.fit === 'contain' ? 'object-contain' : 'object-cover';
  const globalFitMobile = hero.fitMobile ? (hero.fitMobile === 'contain' ? 'object-contain' : 'object-cover') : globalFit;
  const globalPos = hero.position && hero.position !== 'center' ? hero.position : 'center';
  const globalPosMobile = hero.positionMobile || globalPos;

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 40) { if (diff < 0) setIndex((v) => (v + 1) % totalSlides); else setIndex((v) => (v - 1 + totalSlides) % totalSlides); }
    touchStart.current = null;
  };

  const goPrev = () => setIndex((v) => (v - 1 + totalSlides) % totalSlides);
  const goNext = () => setIndex((v) => (v + 1) % totalSlides);

  return (
    <div className="hayah-hero-media hero-clamped relative w-full overflow-hidden rounded-lg bg-slate-100" style={heightStyle} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } } @media (min-width: 768px) { .hayah-hero-media{ height:${desktopH} !important; } }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .hayah-hero-media{ height:${mobileH} !important; } }`}</style>}
      {slides.map((s, idx) => {
        const isActive = idx === index;
        const fit = s.position ? 'object-cover' : globalFit; // keep cover unless per-slide wants contain explicitly via hero.fit — per-slide fit stored in s.position? actually fit per slide is in m.fit but we store position only; use globalFit as fallback, per-slide fit via heroMediaItem has no separate fit, reuse global
        // Per-slide fit: if hero media item had its own fit, it would be encoded via position? For now use global, but per-slide position overrides
        const slidePos = s.position || globalPos;
        const slidePosMobile = s.positionMobile || s.position || globalPosMobile;
        const slideFit = globalFit; // per-slide fit not stored separately in HeroMediaItem beyond position; keep global
        const slideFitMobile = globalFitMobile;
        const hasContent = !s.isExplicitOff && s.hasContent && (s.title || s.subtitle || s.button_text);
        return (
          <div key={s.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }} aria-hidden={!isActive}>
            {s.type === 'video' ? (
              <>
                <video
                  ref={(el) => { if (el) videoRefs.current.set(idx, el); else videoRefs.current.delete(idx); }}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  poster={s.poster ? getHeroImageUrl(s.poster) : undefined}
                  className={`absolute inset-0 h-full w-full ${slideFit} ${s.srcMobile ? 'hidden md:block' : 'block'}`}
                  style={{ objectPosition: slidePos }}
                  src={getHeroImageUrl(s.src)}
                />
                {s.srcMobile && (
                  <video
                    ref={(el) => { if (el) videoRefs.current.set(idx + 10000, el); else videoRefs.current.delete(idx + 10000); }}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    poster={s.poster ? getHeroImageUrl(s.poster) : undefined}
                    className={`absolute inset-0 h-full w-full ${slideFitMobile} block md:hidden`}
                    style={{ objectPosition: slidePosMobile }}
                    src={getHeroImageUrl(s.srcMobile)}
                  />
                )}
              </>
            ) : s.type === 'youtube' ? (
              <div className={`absolute inset-0 overflow-hidden bg-black ${s.srcMobile ? 'hidden md:block' : 'block'}`}>
                <div className="absolute inset-0 overflow-hidden bg-black">
                  <iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${s.src}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&controls=0&playsinline=1&playlist=${s.src}&modestbranding=1&rel=0&enablejsapi=1`} title={`YouTube ${idx}`} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width: '177.77777778vh', height: '56.25vw', minWidth: '100%', minHeight: '100%', maxWidth: 'none', maxHeight: 'none' } as any} />
                </div>
              </div>
            ) : (
              <>
                {s.src ? (
                  <>
                    <img src={getOptimizedImageUrl(s.src, 'medium')} alt="" className={`absolute inset-0 h-full w-full ${slideFit} ${s.srcMobile ? 'hidden md:block' : 'block'}`} style={{ objectPosition: slidePos }} loading={idx === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={idx === 0 ? 'high' : undefined as any} sizes="(max-width:768px) 100vw, 900px" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(s.src); }} width={900} height={300} />
                    {s.srcMobile && <img src={getOptimizedImageUrl(s.srcMobile, 'medium')} alt="" className={`absolute inset-0 h-full w-full ${slideFitMobile} block md:hidden`} style={{ objectPosition: slidePosMobile }} loading={idx === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={idx === 0 ? 'high' : undefined as any} sizes="100vw" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(s.srcMobile); }} width={900} height={500} />}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-l from-slate-200 to-slate-100" />
                )}
              </>
            )}
            {s.srcMobile && s.type === 'youtube' && (
              <div className="absolute inset-0 overflow-hidden bg-black block md:hidden">
                <div className="absolute inset-0 overflow-hidden bg-black">
                  <iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${s.srcMobile}?autoplay=${isActive ? 1 : 0}&mute=1&loop=1&controls=0&playsinline=1&playlist=${s.srcMobile}&modestbranding=1&rel=0&enablejsapi=1`} title={`YouTube mobile ${idx}`} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width: '177.77777778vh', height: '56.25vw', minWidth: '100%', minHeight: '100%', maxWidth: 'none', maxHeight: 'none' } as any} />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
            {hasContent && <div className="absolute inset-y-0 right-0 flex flex-col items-start justify-center gap-1.5 p-4 sm:p-6 max-w-[62%]">{s.subtitle && <p className="rounded bg-white/15 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{s.subtitle}</p>}{s.title && <h2 className="text-base font-black leading-snug text-white sm:text-xl line-clamp-2">{s.title}</h2>}{s.button_text && <a href={s.button_link || '#'} className="mt-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-slate-900 shadow hover:bg-slate-50">{s.button_text}</a>}</div>}
          </div>
        );
      })}
      {totalSlides > 1 && (
        <>
          <div className="absolute bottom-2.5 right-1/2 flex translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`شريحة ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
          {totalSlides > 2 && (
            <>
              <button type="button" onClick={goPrev} aria-label="السابق" className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><ChevronLeft className="h-5 w-5 rotate-180" /></button>
              <button type="button" onClick={goNext} aria-label="التالي" className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><ChevronLeft className="h-5 w-5" /></button>
            </>
          )}
        </>
      )}
    </div>
  );
}
export const RestaurantHero = HayahHero;

/* ------------------------- Product card (dense) ------------------------- */
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
    <div className="group relative flex flex-col overflow-hidden rounded-lg bg-white ring-1 ring-slate-200" dir="rtl">
      <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-square w-full overflow-hidden bg-slate-50" aria-label={product.name}>
        <img src={getOptimizedImageUrl(product.image || '', 'small')} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, 200px" onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(product.image || ''); }} className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" width={300} height={300} />
        {discount > 0 && !out && <span className="absolute right-1.5 top-1.5 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">-{discount}%</span>}
        {!!remaining && !out && <span className="absolute bottom-1.5 right-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-amber-950">آخر {remaining}</span>}
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-xs font-black text-slate-500">نفدت الكمية</span>}
        <span role="button" tabIndex={0} onClick={handleWishlist as any} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (handleWishlist as any)(e); } }} aria-label="المفضلة" className={`absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur transition ${wished ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white/90 text-slate-400 ring-slate-200 hover:text-rose-500'}`}><Heart className="h-3.5 w-3.5" fill={wished ? 'currentColor' : 'none'} strokeWidth={1.7} /></span>
      </button>
      <div className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="line-clamp-2 min-h-[32px] text-start text-xs font-bold leading-tight text-slate-800 hover:text-[var(--store-primary,#1a7a4a)]">{product.name}</button>
        {variants.length > 0 && <div className="flex flex-wrap gap-1">{variants.map((v) => <span key={v} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-100">{v}</span>)}</div>}
        {(() => { const ls = getLoyaltySettingsFromPage(); if (!ls?.is_enabled) return null; const pts = calcEarnedPoints(Number(range.min) || Number(product.price) || 0, ls); return pts > 0 ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><Star className="h-3 w-3" /> كسب {pts}</span> : null; })()}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <div className="leading-tight">{range.hasRange ? <p className="text-[13px] font-black text-slate-900">{formatPrice(range.min)} - {formatPrice(range.max)}</p> : <p className="text-[13px] font-black text-slate-900">{formatPrice(product.price)}</p>}{discount > 0 && !range.hasRange && !!product.originalPrice && <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>}</div>
          {!out && <button type="button" onClick={handleAdd} disabled={adding} aria-label="أضف للسلة" className="flex h-7 items-center gap-1 rounded-full bg-slate-900 px-2.5 text-[11px] font-black text-white hover:bg-black active:scale-95 disabled:opacity-60"><ShoppingBag className="h-3 w-3" />{adding ? '...' : variable ? 'خيارات' : 'أضف'}</button>}
        </div>
      </div>
    </div>
  );
}
export const DishRow = HayahProductCard;
export const ChefPicks = () => null;

function SectionBar({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200" dir="rtl">
      <h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><span className="h-5 w-1 rounded-full bg-[var(--store-primary,#1a7a4a)]" />{title}<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">{count} منتج</span></h2>
      <a href={href} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900">عرض الكل<ChevronLeft className="h-3 w-3" /></a>
    </div>
  );
}
function HayahFeatured({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <section dir="rtl">
      <SectionBar title="منتجات مميزة" count={products.length} href="/products" />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
        {products.slice(0, 10).map((p) => <HayahProductCard key={p.id} product={p} />)}
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
    return Array.from(groups.entries()).map(([cid, list]) => { const cat = categories.find((c) => String(c.id) === cid); if (!cat) return null; return { cat, list: list.slice(0, 10) }; }).filter(Boolean).slice(0, 8) as any[];
  }, [categories, products, homepageCategories, productsPerCategory]);
  if (!sections.length) return null;
  return (
    <div className="space-y-4">
      {sections.map(({ cat, list }: any) => (
        <section key={cat.id} dir="rtl">
          <SectionBar title={cat.name} count={products.filter((p) => String(p.categoryId ?? p.category_id) === String(cat.id)).length} href={`/category/${cat.slug || cat.id}`} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
            {list.map((p: any) => <HayahProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ================================ ROOT ================================ */
const SORTS = [{ value: 'newest', label: 'الأحدث' }, { value: 'price_asc', label: 'السعر تصاعدي' }, { value: 'price_desc', label: 'السعر تنازلي' }, { value: 'name', label: 'أبجدياً' }];
export const RestaurantMenuRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <HayahCategoryMode categoryData={categoryData} storeData={storeData} />;
  if (mode === 'page') { return (<div dir="rtl" className="min-h-screen bg-[#f1f1f1]"><HayahHeader /><main className="mx-auto max-w-[1320px] px-3 py-6 sm:px-4 lg:px-6"><h1 className="mb-4 rounded-lg bg-white px-4 py-3 text-lg font-black text-slate-900 ring-1 ring-slate-200">{page?.title}</h1><article className="prose-custom2 rounded-lg bg-white p-4 ring-1 ring-slate-200" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} /></main></div>); }
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
    <div dir="rtl" className="min-h-screen bg-[#f1f1f1] text-slate-800 antialiased selection:bg-[var(--store-primary,#1a7a4a)] selection:text-white">
      <HayahHeader />
      <div className="mx-auto max-w-[1320px] flex gap-4 px-3 py-4 sm:px-4 lg:px-6 items-start">
        <HayahSidebar />
        <main className="min-w-0 flex-1 space-y-4">
          <HayahUtilityRow />
          <HayahHero banners={banners} />
          {featured.length > 0 && <HayahFeatured products={featured} />}
          <HayahCategorySections storeData={storeData} />
          {products.length === 0 && <div className="rounded-lg bg-white p-8 text-center ring-1 ring-slate-200"><PackageSearch className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">لا توجد منتجات حالياً</p><p className="mt-1 text-xs text-slate-400">سيتم عرض منتجاتك هنا بعد إضافتها</p></div>}
          {products.length > 0 && !hasHomepageCats && featured.length === 0 && <section dir="rtl"><SectionBar title="جميع المنتجات" count={products.length} href="/products" /><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">{products.slice(0, 15).map((p) => <HayahProductCard key={p.id} product={p} />)}</div></section>}
        </main>
      </div>
      {/* Mobile bottom spacing for drawer */}
      <div className="h-4 lg:hidden" />
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
    <div dir="rtl" className="min-h-screen bg-[#f1f1f1] text-slate-800 antialiased">
      <HayahHeader homeHref="/" />
      <div className="mx-auto max-w-[1320px] flex gap-4 px-3 py-4 sm:px-4 lg:px-6 items-start">
        <HayahSidebar />
        <main className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 bg-white rounded-lg px-3 py-2 ring-1 ring-slate-200"><a href="/" className="font-bold hover:text-slate-900">الرئيسية</a><ChevronLeft className="h-4 w-4" /><span className="font-black text-slate-900">{cat?.name}</span><span className="ms-auto rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{categoryData?.total ?? products.length} منتج</span></div>
          <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200 mb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-lg font-black text-slate-900">{cat?.name}</h1>{!!cat?.description && <p className="mt-1 max-w-xl text-sm text-slate-500">{cat.description}</p>}</div><select value={categoryData?.sort || 'newest'} onChange={(e) => navigate({ sort: e.target.value })} className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 focus:border-[var(--store-primary)] focus:outline-none">{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          </div>
          {products.length === 0 ? <div className="rounded-lg bg-white p-8 text-center ring-1 ring-slate-200"><PackageSearch className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">لا توجد منتجات بهذا القسم</p><a href="/" className="mt-3 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">تصفح المتجر</a></div> : <><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">{products.map((p: any) => <HayahProductCard key={p.id} product={p} />)}</div>{categoryData && categoryData.lastPage > 1 && <nav className="mt-6 flex items-center justify-center gap-1.5">{Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => <button key={n} type="button" onClick={() => navigate({ page: n })} className={`h-8 min-w-8 rounded-full px-2 text-sm font-bold transition ${n === categoryData.currentPage ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{n}</button>)}</nav>}</>}
        </main>
      </div>
    </div>
  );
};
export default HayahHeader;
