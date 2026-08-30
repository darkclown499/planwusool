import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronDown, ChevronUp, MessageCircle, PackageSearch, Search, User, X, Home, Package, Heart, MapPin, LogOut, LogIn, UserPlus, Store } from 'lucide-react';
import { Facebook, Globe, Instagram, Music, Send, Youtube, Twitter } from 'lucide-react';
import type { TemplateRootProps } from '../types';
import { createSafeHtml } from '@/utils/xss-protection';
import { useStorefrontCore } from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import { getImageUrl } from '@/utils/image-helper';
import { AnnouncementBar } from './components/AnnouncementBar';
import { AtelierHeader } from './components/AtelierHeader';
import { AtelierHero } from './components/AtelierHero';
import { AtelierRail } from './components/AtelierRail';
import { AtelierProductCard } from './components/AtelierProductCard';
import { AtelierCategoryCircles } from './components/AtelierSections';

/* ===================================================================== */
/* Fashion Atelier — أتيليه الموضة                                        */
/*                                                                        */
/* An editorial boutique storefront for fashion/hijab/clothing stores.    */
/* Warm ivory palette, serif display type, portrait photography with      */
/* hover angle-swap and April-style inline quick-add. Every pixel here is */
/* owned by this template — nothing renders through a generic pipeline.   */
/* ===================================================================== */

const AtelierMobileSearch: React.FC = () => {
  const { ui } = useStorefrontCore() as any;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 pb-1 md:hidden" dir="rtl">
      <button
        type="button"
        onClick={() => ui.setShowSearch(true)}
        className="flex w-full items-center gap-2.5 rounded-full border border-stone-200 bg-white px-4 py-3 text-start shadow-sm transition hover:bg-stone-50"
      >
        <Search className="h-4 w-4 text-stone-400" />
        <span className="text-sm text-stone-500">ابحث عن منتج...</span>
      </button>
    </div>
  );
};

/** Back-to-top — mobile only, bottom-right, fades in after meaningful scroll. */
const AtelierBackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="العودة للأعلى"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-white shadow-[0_6px_20px_rgba(40,30,20,0.28)] ring-1 ring-white/10 transition hover:bg-[#9d7463] active:scale-95 md:hidden"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' } as any}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
};

function resolveWhatsAppHref(config: any, content: any, store: any): string | null {
  const rawContent: any = content ?? {};
  const waCfg: any = rawContent.fashion_whatsapp ?? rawContent.fashion_wa ?? {};
  const enabled = waCfg.enabled ?? waCfg.show ?? rawContent.fashion_whatsapp_enabled ?? false;
  if (!enabled) return null;
  const rawNumber = String(waCfg.number ?? waCfg.phone ?? rawContent.fashion_whatsapp_number ?? config?.socialMedia?.whatsapp ?? config?.whatsapp_widget_phone ?? (store as any)?.phone ?? '').replace(/[^0-9]/g, '');
  if (!rawNumber) return null;
  const rawMessage = String(waCfg.message ?? rawContent.fashion_whatsapp_message ?? 'مرحباً، أريد الاستفسار عن أحد المنتجات');
  return `https://wa.me/${rawNumber}?text=${encodeURIComponent(rawMessage)}`;
}

const AtelierWhatsAppFloating: React.FC = () => {
  const { config, content, store } = useStorefrontCore() as any;
  const href = resolveWhatsAppHref(config, content, store);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل واتساب"
      className="fixed bottom-4 left-4 z-40 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_2px_10px_rgba(0,0,0,0.12),0_6px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:scale-[1.04] active:scale-[0.97] md:hidden"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' } as any}
    >
      <MessageCircle className="h-[22px] w-[22px]" fill="white" />
    </a>
  );
};

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
function LayoutGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
const AtelierMobileMenuView: React.FC<{ onClose: () => void; closeButtonRef?: React.Ref<HTMLButtonElement> }> = ({ onClose, closeButtonRef }) => {
  const { config, store, content, product, auth } = useStorefrontCore() as any;
  const categories: any[] = product?.categories || [];
  const isLoggedIn: boolean = !!auth?.isLoggedIn;
  const [activeSection, setActiveSection] = useState<'categories' | 'account' | null>(null);

  const socialSlots = [1, 2, 3].map((idx) => {
    const base = (content as any)?.fashion_mobile_nav ?? {};
    const enabled = !!base[`social_${idx}_enabled`];
    const platform = String(base[`social_${idx}_platform`] ?? 'instagram').toLowerCase();
    const url = String(base[`social_${idx}_url`] ?? '').trim();
    const safe = enabled && url && isSafeUrl(url);
    return { idx, platform, url, safe };
  });
  const hasSocial = socialSlots.some((s) => s.safe);
  const whatsappHref = resolveWhatsAppHref(config, content, store);

  const customerName = [auth?.customer?.first_name, auth?.customer?.last_name].filter(Boolean).join(' ').trim() || auth?.customer?.email || '';
  const customerEmail = auth?.customer?.email || auth?.userProfile?.email || '';
  const customerPhone = auth?.customer?.phone || auth?.userProfile?.phone || '';

  const toggleSection = (key: 'categories' | 'account') => setActiveSection((prev) => (prev === key ? null : key));

  const handleHome = () => {
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // also ensure hash nav if needed
    try { window.history.pushState(null, '', '/'); } catch {}
  };
  const handleAllProducts = () => {
    onClose();
    requestAnimationFrame(() => {
      const el = document.getElementById('atelier-new') || document.getElementById('atelier-categories');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 600, behavior: 'smooth' });
    });
  };
  const handleCategoryClick = (cat: any) => {
    onClose();
    const href = `/category/${cat.slug || cat.id}`;
    try { window.location.href = href; } catch { window.location.assign(href); }
  };
  const handleGuestLogin = () => {
    onClose();
    auth?.setShowLoginModal?.(true);
  };
  const handleProfileAction = (action: 'profile' | 'orders' | 'addresses' | 'wishlist') => {
    onClose();
    if (action === 'profile') auth?.setShowProfileModal?.(true);
    if (action === 'orders') { auth?.setShowOrdersModal?.(true); try { auth?.order?.loadUserOrders?.(); } catch {} }
    if (action === 'addresses') auth?.setShowAddressesModal?.(true);
    if (action === 'wishlist') auth?.setShowWishlistModal?.(true);
  };
  const handleLogout = () => {
    onClose();
    auth?.logout?.();
  };

  const storeName = config?.storeName || store?.name || 'المتجر';
  const storeDesc: string = (() => {
    const raw = (store as any)?.description || config?.description || (content as any)?.store_description || '';
    const t = String(raw).trim();
    if (t && t.length > 6 && t.length < 120) return t;
    return 'كل ما تحتاجه في مكان واحد';
  })();
  const storeLogo = config?.logo || store?.logo;

  return (
    <div className="flex h-full w-full flex-col bg-[#faf7f2]" dir="rtl">
      {/* Header: [X] [centered logo] [spacer] */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200/70 bg-white px-4 py-3.5">
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="إغلاق القائمة" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 ring-1 ring-stone-200/60 transition hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30 active:scale-95">
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <a href="/" className="flex min-w-0 flex-1 items-center justify-center gap-2" onClick={() => onClose()}>
          {storeLogo ? (
            <img src={getImageUrl(storeLogo)} alt={storeName} className="h-7 w-auto object-contain" />
          ) : (
            <span className="font-serif text-[17px] font-bold tracking-wide text-stone-900">{storeName}</span>
          )}
        </a>
        <span className="h-11 w-11 shrink-0" aria-hidden />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {/* Store identity */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3.5 shadow-[0_1px_10px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#faf7f2] ring-1 ring-stone-200">
            {storeLogo ? <img src={getImageUrl(storeLogo)} alt="" className="h-full w-full object-contain p-1.5" /> : <Store className="h-5 w-5 text-stone-500" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold leading-none text-stone-900">{storeName}</span>
            <span className="mt-1 block truncate text-[11px] leading-none text-stone-500">{storeDesc}</span>
          </span>
        </div>

        <h1 className="mt-4 font-serif text-[11px] font-bold tracking-[0.14em] text-stone-400">القائمة</h1>

        <nav className="mt-3">
          {/* Quick actions: two compact side-by-side */}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={handleHome} className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/80 px-3 text-center shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60 transition hover:bg-white active:scale-[0.98]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white"><Home className="h-4 w-4" /></span>
              <span className="text-[12px] font-bold leading-none text-stone-800">الرئيسية</span>
            </button>
            <button type="button" onClick={handleAllProducts} className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/80 px-3 text-center shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60 transition hover:bg-white active:scale-[0.98]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9d7463] text-white"><Package className="h-4 w-4" /></span>
              <span className="text-[12px] font-bold leading-none text-stone-800">جميع المنتجات</span>
            </button>
          </div>

          <div className="mt-2.5 space-y-2.5">
          {/* الأقسام accordion */}
          <div className="rounded-2xl bg-white/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60">
            <button
              type="button"
              onClick={() => toggleSection('categories')}
              aria-expanded={activeSection === 'categories'}
              aria-controls="atelier-menu-categories"
              className="flex h-[60px] w-full items-center gap-3 px-4 text-start transition active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 ring-1 ring-stone-200"><LayoutGridIcon /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-none text-stone-800">الأقسام</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-none text-stone-400">{categories.length > 0 ? `${categories.length} أقسام` : 'استكشف الأقسام'}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${activeSection === 'categories' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'categories' && (
              <div id="atelier-menu-categories" className="border-t border-stone-100 px-2 pb-2">
                {categories.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-stone-400">لا توجد أقسام متاحة حالياً</p>
                ) : (
                  <div className="pt-1">
                    {categories.slice(0, 30).map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className="flex h-[48px] w-full items-center gap-3 rounded-xl px-3 text-start transition hover:bg-stone-50 active:scale-[0.99]"
                      >
                        {cat.image ? (
                          <img src={getImageUrl(cat.image)} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-stone-200" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 ring-1 ring-stone-200"><LayoutGridIcon /></span>
                        )}
                        <span className="flex-1 truncate text-[13px] font-medium text-stone-700">{cat.name}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-stone-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* حسابي accordion */}
          <div className="rounded-2xl bg-white/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60">
            <button
              type="button"
              onClick={() => toggleSection('account')}
              aria-expanded={activeSection === 'account'}
              aria-controls="atelier-menu-account"
              className="flex h-[60px] w-full items-center gap-3 px-4 text-start transition active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white"><User className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-none text-stone-800">حسابي</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium leading-none text-stone-400">{isLoggedIn ? (customerName ? customerName : 'إدارة الحساب') : 'تسجيل الدخول أو إنشاء حساب'}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${activeSection === 'account' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'account' && (
              <div id="atelier-menu-account" className="border-t border-stone-100 px-2 pb-2">
                {isLoggedIn ? (
                  <>
                    {(customerName || customerEmail) && (
                      <div className="mx-1 mt-2 flex items-center gap-3 rounded-xl bg-[#faf7f2] px-3 py-2.5 ring-1 ring-stone-200/50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[12px] font-bold text-white">{(customerName || customerEmail || '؟').trim().charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          {customerName && <span className="block truncate text-[12px] font-bold text-stone-800">{customerName}</span>}
                          {(customerEmail || customerPhone) && <span className="block truncate text-[11px] text-stone-500">{customerEmail || customerPhone}</span>}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5">
                      <button type="button" onClick={() => handleProfileAction('profile')} className="flex h-[46px] w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-stone-700 hover:bg-stone-50"><User className="h-4 w-4 text-stone-400" /> بيانات الحساب <ChevronLeft className="ms-auto h-3.5 w-3.5 text-stone-300" /></button>
                      <button type="button" onClick={() => handleProfileAction('orders')} className="flex h-[46px] w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-stone-700 hover:bg-stone-50"><Package className="h-4 w-4 text-stone-400" /> طلباتي <ChevronLeft className="ms-auto h-3.5 w-3.5 text-stone-300" /></button>
                      <button type="button" onClick={() => handleProfileAction('addresses')} className="flex h-[46px] w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-stone-700 hover:bg-stone-50"><MapPin className="h-4 w-4 text-stone-400" /> العناوين <ChevronLeft className="ms-auto h-3.5 w-3.5 text-stone-300" /></button>
                      <button type="button" onClick={() => handleProfileAction('wishlist')} className="flex h-[46px] w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-stone-700 hover:bg-stone-50"><Heart className="h-4 w-4 text-stone-400" /> المفضلة <ChevronLeft className="ms-auto h-3.5 w-3.5 text-stone-300" /></button>
                      <div className="mx-3 my-1 h-px bg-stone-100" />
                      <button type="button" onClick={handleLogout} className="flex h-[46px] w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
                    </div>
                  </>
                ) : (
                  <div className="px-1 pt-2 pb-1">
                    <p className="px-2 text-[11px] leading-relaxed text-stone-500">سجّل الدخول لمتابعة حسابك وطلباتك</p>
                    <div className="mt-2 space-y-1.5">
                      <button type="button" onClick={handleGuestLogin} className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-[13px] font-bold text-white transition hover:bg-stone-800 active:scale-[0.98]"><LogIn className="h-4 w-4" /> تسجيل الدخول</button>
                      <button type="button" onClick={handleGuestLogin} className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-[0.98]"><UserPlus className="h-4 w-4" /> إنشاء حساب</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </nav>

        {/* WhatsApp — connected to contact area */}
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => onClose()} className="mt-3 flex h-[52px] w-full items-center gap-3 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" fill="white" /></span>
            <span className="flex-1 text-start">
              <span className="block text-[13px] font-bold leading-none text-stone-800">تواصل معنا عبر واتساب</span>
              <span className="mt-1 block text-[11px] leading-none text-stone-500">للاستفسار والتواصل</span>
            </span>
            <ChevronLeft className="h-4 w-4 text-stone-300" />
          </a>
        )}

        {hasSocial && (
          <>
            <div className="mt-4 h-px bg-stone-200/60" />
            <p className="mt-3 mb-3 text-[11px] font-bold tracking-[0.14em] text-stone-500">تابعنا</p>
            <div className="flex items-start justify-start gap-5">
              {socialSlots.filter((s) => s.safe).map((slot) => {
                const Icon = getSocialIcon(slot.platform);
                return (
                  <a key={slot.idx} href={slot.url} target="_blank" rel="noreferrer" aria-label={slot.platform} className="flex flex-col items-center gap-1.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-95"><Icon className="h-5 w-5" /></span>
                    <span className="max-w-[64px] truncate text-[11px] font-medium capitalize text-stone-600">{slot.platform}</span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const AtelierMobileDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock + initial focus while drawer is open (restores on close)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    try { closeRef.current?.focus(); } catch {}
    return () => {
      document.body.style.overflow = prev;
      try { prevFocus?.focus?.(); } catch {}
    };
  }, [open]);

  // Escape closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="fixed inset-0 z-[70] md:hidden" dir="rtl" role="presentation">
      {/* Reduced motion: keep menu functional, just shorten the slide */}
      <style>{`@media(prefers-reduced-motion:reduce){.atelier-drawer-panel,.atelier-drawer-backdrop{transition-duration:1ms!important}}`}</style>

      {/* Backdrop — click closes; keep storefront recognizable. Opening eases
          in slightly longer (420ms) than closing (340ms) for a calmer reveal;
          the close transition and easing curve stay untouched. */}
      <div
        aria-hidden="true"
        className={`atelier-drawer-backdrop absolute inset-0 bg-black transition-[opacity] ease-[cubic-bezier(0.22,0.9,0.3,1)] ${open ? 'duration-[420ms]' : 'duration-[340ms]'}`}
        style={{ opacity: open ? 0.24 : 0 }}
        onClick={onClose}
      />

      {/* Drawer panel — slides from the right, ~78vw not full screen */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="قائمة المتجر"
        className={`atelier-drawer-panel absolute inset-y-0 right-0 w-[clamp(280px,78vw,340px)] bg-[#faf7f2] shadow-[-12px_0_30px_rgba(0,0,0,0.08)] transition-[transform] ease-[cubic-bezier(0.22,0.9,0.3,1)] ${open ? 'duration-[420ms]' : 'duration-[340ms]'}`}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <AtelierMobileMenuView onClose={onClose} closeButtonRef={closeRef} />
      </div>
    </div>
  );
};

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'أبجدياً' },
];

const byNewest = (a: any, b: any) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
const byPriceAsc = (a: any, b: any) => Number(a.price) - Number(b.price);
const byPriceDesc = (a: any, b: any) => Number(b.price) - Number(a.price);
const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar');

export const FashionAtelierRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') {
    return <AtelierCategoryMode storeData={storeData} categoryData={categoryData} />;
  }
  if (mode === 'page') {
    return <AtelierPageMode storeData={storeData} page={page} />;
  }
  return <AtelierHome storeData={storeData} />;
};

/* ------------------------------ Home ------------------------------ */

const AtelierHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product, auth } = useStorefrontCore() as any;
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, showBest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  const newest = useMemo(() => [...products].sort(byNewest).slice(0, 14), [products]);
  const bestsellers = useMemo(() => {
    const discounted = products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price));
    return (discounted.length >= 4 ? discounted : [...products].sort(byNewest).reverse()).slice(0, 10);
  }, [products]);

  // Mobile drawer — slides from the right over the visible storefront (desktop untouched)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuExiting, setMenuExiting] = useState(false);
  useEffect(() => {
    if (!menuMounted || mobileMenuOpen) return;
    const t = setTimeout(() => { setMenuMounted(false); setMenuExiting(false); }, 380);
    return () => clearTimeout(t);
  }, [mobileMenuOpen, menuMounted]);
  const openMobileMenu = () => {
    setMenuExiting(false);
    setMobileMenuOpen(true);
    setMenuMounted(true);
  };
  const handleMenuClose = () => {
    if (!menuMounted) return;
    setMenuExiting(true);
    setMobileMenuOpen(false);
  };
  const bestRef = useRef<HTMLDivElement>(null);
  const [bestRevealed, setBestRevealed] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);
  const [catsRevealed, setCatsRevealed] = useState(false);
  useEffect(() => {
    const els: Array<[React.RefObject<any>, React.Dispatch<React.SetStateAction<boolean>>]> = [[bestRef, setBestRevealed], [catsRef, setCatsRevealed]];
    const obs: IntersectionObserver[] = [];
    els.forEach(([ref, set]) => {
      const el = (ref as any).current as HTMLElement | null;
      if (!el) return;
      const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); o.disconnect(); } }, { threshold: 0.12 });
      o.observe(el);
      obs.push(o);
    });
    return () => obs.forEach((o) => o.disconnect());
  }, [showBest, homepageCategories.length]);

  const normalMain = (
    <main className="pb-[72px] sm:pb-0">
      <AtelierMobileSearch />

      <AtelierHero
        slides={(banners.length > 0 ? banners : []).map((b) => ({
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          button_text: b.button_text,
          button_link: b.button_link,
        }))}
      />

      <div id="atelier-categories">
        <AtelierCategoryCircles categories={categories} />
      </div>

      {showLatest && (
        <div id="atelier-new">
          <AtelierRail title="أحدث المنتجات" subtitle="تشكيلة مختارة وصلت حديثاً" products={newest} viewAllHref="/products" />
        </div>
      )}
      {/* spacing anchor: ensure product discovery starts quickly after categories */}

      {showBest && (
        <div id="atelier-best" ref={bestRef} className={`transition-all duration-500 motion-reduce:transition-none ${bestRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:pt-6 sm:pb-10 lg:px-8">
            <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
              <div>
                <span className="mb-2 block h-px w-10 bg-[#b08d57]" />
                <h2 className="font-serif text-xl font-semibold text-stone-900 sm:text-2xl">الأكثر مبيعاً</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-5 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-5">
              {bestsellers.map((p) => (
                <AtelierProductCard key={p.id} product={p} className="h-full" />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Dynamic category sections */}
      {homepageCategories.length > 0 && (
        <div ref={catsRef} className={`transition-all duration-500 motion-reduce:transition-none ${catsRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              return (
                <section key={cat.id}>
                  <div className="mb-4 flex items-center justify-between gap-2 min-w-0">
                    <h2 className="min-w-0 truncate font-serif text-xl font-semibold text-stone-900 sm:text-2xl">{cat.name}</h2>
                    <a href={`/category/${cat.slug || cat.id}`} className="shrink-0 text-sm font-bold text-[#9d7463] hover:text-[#85604f]">عرض الكل ←</a>
                  </div>
                  <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                    {catProducts.map((p: any) => (
                      <AtelierProductCard key={p.id} product={p} className="h-full" />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader onOpenMobileMenu={openMobileMenu} />
      {normalMain}
      <AtelierWhatsAppFloating />
      <AtelierBackToTop />
      {menuMounted && <AtelierMobileDrawer open={!menuExiting} onClose={handleMenuClose} />}
    </div>
  );
};

/* ---------------------------- Category ---------------------------- */

const AtelierCategoryMode: React.FC<{ storeData: any; categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const products = useMemo(() => {
    const list: any[] = product?.products || [];
    return categoryData ? [...list].sort(sortFor(categoryData.sort)) : list;
  }, [product?.products, categoryData?.sort]);

  const cat = categoryData?.category;
  if (!cat) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`شاهد قسم "${cat.name}" في المتجر: ${shareUrl}`)}`;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-stone-500" aria-label="مسار التنقل">
          <a href="/" className="transition hover:text-[#9d7463]">الرئيسية</a>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-semibold text-stone-800">{cat.name}</span>
        </nav>

        {/* Heading */}
        <header className="mb-8 border-b border-stone-200 pb-6 text-center">
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">{cat.name}</h1>
          {!!cat.description && <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{cat.description}</p>}
          <p className="mt-2 text-xs tracking-wide text-stone-400">
            {categoryData.total} قطعة متوفرة ·{' '}
            <a href={whatsappShare} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[#9d7463]">
              شارك القسم عبر واتساب
            </a>
          </p>
        </header>

        {/* Sort */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-stone-700">ترتيب حسب:</span>
          <select
            value={categoryData.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 focus:border-[#9d7463] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-stone-300" />
            <p className="text-lg font-semibold text-stone-600">لا توجد منتجات في هذا القسم بعد</p>
            <a href="/" className="rounded-full bg-[#9d7463] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#85604f]">
              تصفح بقية المتجر
            </a>
          </div>
        ) : (
          <>
            <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <AtelierProductCard key={p.id} product={p} className="h-full" />
              ))}
            </div>

            {categoryData.lastPage > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="ترقيم الصفحات">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    aria-current={n === categoryData.currentPage ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-semibold transition ${
                      n === categoryData.currentPage
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-300 text-stone-600 hover:border-[#9d7463] hover:text-[#9d7463]'
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
      <AtelierWhatsAppFloating />
      <AtelierBackToTop />
    </div>
  );
};

function sortFor(sort: string): (a: any, b: any) => number {
  switch (sort) {
    case 'price_asc': return byPriceAsc;
    case 'price_desc': return byPriceDesc;
    case 'name': return byName;
    default: return (a, b) => 0; // server order (newest/paginated)
  }
}

/* --------------------------- Custom page --------------------------- */

const AtelierPageMode: React.FC<{ storeData: any; page?: any | null }> = ({ page }) => (
  <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
    <AnnouncementBar />
    <AtelierHeader homeHref="/" />
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {page?.title && (
        <h1 className="mb-6 border-b border-stone-200 pb-4 font-serif text-3xl font-bold text-stone-900">{page.title}</h1>
      )}
      <article className="prose-custom2" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} />
    </main>
    <AtelierWhatsAppFloating />
    <AtelierBackToTop />
  </div>
);

export default FashionAtelierRoot;
