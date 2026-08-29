import React, { useEffect, useState } from 'react';
import { Facebook, Globe, Heart, Instagram, MapPin, Menu, MessageCircle, Music, Package, Search, Send, ShoppingBag, User, X, Youtube, Twitter } from 'lucide-react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { Sheet } from '@/components/ui/sheet';
import { useStorefrontCore } from '../../shared/hooks';
import { getImageUrl } from '@/utils/image-helper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { POLICY_LINKS, getPolicyContent } from './PolicyContent';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';

interface AtelierHeaderProps {
  homeHref?: string;
}

// Social platform config for drawer
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
  const found = SOCIAL_PLATFORMS.find((p) => p.value === String(platform).toLowerCase());
  return found ? found.icon : Globe;
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(String(url).trim());
    return ['https:', 'http:'].includes(u.protocol) && u.hostname.includes('.');
  } catch { return false; }
}

export const AtelierHeader: React.FC<AtelierHeaderProps> = ({ homeHref = '/' }) => {
  const { config, store, cart, auth, ui, wishlist, product, content, order, behavior } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [scrolled, setScrolled] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  const [policyOpen, setPolicyOpen] = useState<null | 'about' | 'shipping' | 'privacy'>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = (product?.categories || []).slice(0, 8);
  const cartCount = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);

  const openAccount = () => {
    setDrawerOpen(false);
    if (auth?.isLoggedIn) auth.setShowProfileModal(true);
    else if (auth?.setShowLoginModal) auth.setShowLoginModal(true);
  };

  const handleMyOrders = () => {
    if (auth?.isLoggedIn) {
      order?.loadUserOrders?.();
      auth.setShowOrdersModal(true);
    } else {
      auth.setShowLoginModal(true);
    }
  };

  const handleMyOrdersMobile = () => {
    setDrawerOpen(false);
    handleMyOrders();
  };

  const handleCartMobile = () => {
    setDrawerOpen(false);
    ui.setShowCart(true);
  };

  const navLink = 'relative shrink-0 whitespace-nowrap px-3 py-2 text-[13px] font-medium tracking-wide text-stone-700 transition-colors hover:text-[#9d7463]';

  const policyVars = {
    STORE_NAME: String(config?.storeName || store?.name || 'متجرنا'),
    STORE_PHONE: String((config as any)?.phoneNumber || (config as any)?.phone || (store as any)?.phone || ''),
    STORE_CITY: String((config as any)?.city || (config as any)?.address || (store as any)?.city || ''),
  };
  const merchantPages: any[] = (() => {
    try {
      const w: any = typeof window !== 'undefined' ? (window as any) : null;
      const p = w?.page?.props?.storePages || w?.page?.props?.storeContent?.pages || (content as any)?.pages || [];
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();
  const merchantContent: any = content ?? {};
  const activePolicy = policyOpen ? getPolicyContent(policyOpen, policyVars, merchantPages, merchantContent) : null;

  // Social slots from Designer persistence
  const socialSlots = [1, 2, 3].map((idx) => {
    const base = (content as any)?.fashion_mobile_nav ?? (content as any)?.fashion_mobile_drawer ?? {};
    const enabledRaw = base[`social_${idx}_enabled`] ?? base[`social${idx}_enabled`] ?? false;
    const platformRaw = base[`social_${idx}_platform`] ?? base[`social${idx}_platform`] ?? 'instagram';
    const urlRaw = base[`social_${idx}_url`] ?? base[`social${idx}_url`] ?? '';
    const enabled = !!enabledRaw;
    const platform = String(platformRaw || 'instagram').toLowerCase();
    const url = String(urlRaw || '').trim();
    const safe = enabled && url && isSafeUrl(url);
    return { idx, enabled, platform, url, safe };
  });

  return (
    <>
      <header
        data-atelier-header="true"
        className={`sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 transition-shadow ${
          scrolled ? 'shadow-[0_8px_30px_rgba(60,45,35,0.08)]' : ''
        }`}
        dir="rtl"
      >
        {/* MOBILE HEADER — RIGHT hamburger, CENTER logo, LEFT orders+cart (md:hidden) */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 md:hidden">
          {/* RIGHT: Hamburger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="القائمة"
            aria-expanded={drawerOpen}
            aria-controls="atelier-mobile-drawer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white shadow-sm transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* CENTER: Logo */}
          <a href={homeHref} className="flex shrink-0 flex-col items-center" aria-label={config?.storeName || store?.name}>
            {(config?.logo || store?.logo) ? (
              <img src={getImageUrl(config.logo || store.logo)} alt={config?.storeName || store?.name} className="h-8 w-auto object-contain" />
            ) : (
              <>
                <span className="font-serif text-[18px] font-bold tracking-wide text-stone-900">
                  {config?.storeName || store?.name}
                </span>
                <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.35em] text-[#b08d57] sm:block">
                  Atelier
                </span>
              </>
            )}
          </a>

          {/* LEFT: Orders + Cart */}
          <div className="flex items-center gap-1.5">
            {canShowAuth && (
              <button
                type="button"
                onClick={handleMyOrdersMobile}
                aria-label="طلباتي"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:bg-stone-50"
              >
                <Package className="h-5 w-5" strokeWidth={1.7} />
              </button>
            )}
            <button
              type="button"
              onClick={handleCartMobile}
              aria-label="سلة التسوق"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#9d7463] text-white shadow-sm transition hover:bg-[#8a7a6b]"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '+99' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* DESKTOP MASTHEAD — hidden on mobile, unchanged */}
        <div className="mx-auto hidden h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8 md:flex">
          {/* Left spacer — desktop nav only */}
          <div className="hidden flex-1 items-center gap-1 md:flex">
            <nav className="hidden items-center gap-4 md:flex text-sm font-medium">
              <a href={homeHref} className="text-sm font-medium hover:text-[#9d7463] transition-colors">الرئيسية</a>
              {POLICY_LINKS.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => setPolicyOpen(link.key)}
                  className="text-sm font-medium hover:text-[#9d7463] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Word-mark — centered */}
          <a href={homeHref} className="flex shrink-0 flex-col items-center" aria-label={config?.storeName || store?.name}>
            {(config?.logo || store?.logo) ? (
              <img src={getImageUrl(config.logo || store.logo)} alt={config?.storeName || store?.name} className="h-8 w-auto object-contain sm:h-12" />
            ) : (
              <>
                <span className="font-serif text-[18px] font-bold tracking-wide text-stone-900 sm:text-2xl">
                  {config?.storeName || store?.name}
                </span>
                <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.35em] text-[#b08d57] sm:block">
                  Atelier
                </span>
              </>
            )}
          </a>

          {/* Right cluster — DESKTOP full utility */}
          <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
            <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
              <Search className="h-5 w-5" strokeWidth={1.7} />
            </button>
            <div className="hidden md:flex items-center gap-0.5">
              <div className="hidden lg:block">
                <HeaderLoyaltyBadge />
              </div>
              <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
                <Heart className="h-5 w-5" strokeWidth={1.7} />
                {!!wishlist?.count && (
                  <span className="absolute top-0 -right-1 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#9d7463] px-1 text-[9px] font-bold text-white">
                    {wishlist.count}
                  </span>
                )}
              </button>
              {canShowAuth && (
              <button type="button" onClick={handleMyOrders} aria-label="طلباتي" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
                <Package className="h-5 w-5" strokeWidth={1.7} />
              </button>
              )}
              {canShowAuth && auth?.isLoggedIn && (
              <button type="button" onClick={()=>auth.setShowAddressesModal(true)} aria-label="عناويني" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
                <MapPin className="h-5 w-5" strokeWidth={1.7} />
              </button>
              )}
              {canShowAuth && (
              <button type="button" onClick={openAccount} aria-label="حسابي" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
                <User className="h-5 w-5" strokeWidth={1.7} />
              </button>
              )}
              <button type="button" onClick={() => ui.setShowCart(true)} aria-label="سلة التسوق" className="relative rounded-full p-2 text-stone-700 transition hover:bg-stone-100 hover:text-[#9d7463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7463]/40">
                <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9d7463] px-1 text-[9px] font-bold text-white">
                    {cartCount > 99 ? '+99' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Hairline nav — hidden by default; enable via settings.show_categories_bar (desktop only) */}
        {showCategoriesBar && categories.length > 0 && (
          <div className="hidden border-t border-stone-200/70 md:block">
            <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2.5 lg:gap-3 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((c: any) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className={navLink}>
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* MOBILE DRAWER — reused working Sheet primitive (Radix Dialog) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
          <SheetPrimitive.Content
            id="atelier-mobile-drawer"
            aria-describedby={undefined}
            className="fixed inset-y-0 right-0 z-50 flex h-full w-[84%] max-w-[340px] flex-col gap-0 bg-[#faf7f2] p-0 shadow-[-8px_0_30px_rgba(0,0,0,0.18)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rounded-l-2xl border-0 md:hidden"
          >
            <SheetPrimitive.Title className="sr-only">القائمة</SheetPrimitive.Title>
            {/* Drawer header — inside panel */}
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
              <a href={homeHref} className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
                {(config?.logo || store?.logo) ? (
                  <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-8 w-auto object-contain" />
                ) : (
                  <span className="font-serif text-lg font-bold text-stone-900">{config?.storeName || store?.name}</span>
                )}
              </a>
              <SheetPrimitive.Close asChild>
                <button type="button" aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">
                  <X className="h-5 w-5" />
                </button>
              </SheetPrimitive.Close>
            </div>

            <div className="flex flex-1 min-h-0 flex-col overflow-y-auto px-4 py-5 pb-[env(safe-area-inset-bottom)]">
              <nav className="space-y-1.5">
                <button
                  type="button"
                  onClick={openAccount}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-start shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white">
                    <User className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-sm font-bold text-stone-800">حسابي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    const el = document.getElementById('atelier-categories');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    else window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-start shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9d7463] text-white">
                    <LayoutGridIcon />
                  </span>
                  <span className="flex-1 text-sm font-bold text-stone-800">الأقسام</span>
                </button>
              </nav>

              <div className="my-5 h-px bg-stone-200" />

              <p className="mb-3 text-xs font-bold tracking-widest text-stone-500">تواصل معنا</p>
              <div className="grid grid-cols-3 gap-2.5">
                {socialSlots.map((slot) => {
                  if (!slot.safe) return null;
                  const Icon = getSocialIcon(slot.platform);
                  return (
                    <a
                      key={slot.idx}
                      href={slot.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={slot.platform}
                      onClick={() => setDrawerOpen(false)}
                      className="flex flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-4 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] font-bold capitalize text-stone-600">{slot.platform}</span>
                    </a>
                  );
                })}
                {socialSlots.filter((s) => s.safe).length === 0 && (
                  <p className="col-span-3 rounded-xl bg-white px-3 py-4 text-center text-xs text-stone-400 ring-1 ring-stone-200">لم يتم إعداد روابط التواصل بعد</p>
                )}
              </div>

              <div className="mt-6 rounded-xl bg-white p-3 ring-1 ring-stone-200">
                <p className="text-xs font-bold text-stone-700">تحتاج مساعدة؟</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">تواصل معنا عبر الروابط أعلاه أو عبر واتساب.</p>
              </div>
            </div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </Sheet>

      {/* Policy modals */}
      {POLICY_LINKS.map((link) => {
        if (policyOpen !== link.key || !activePolicy) return null;
        const content = getPolicyContent(link.key, policyVars, merchantPages, merchantContent);
        return (
          <Dialog key={link.key} open={policyOpen === link.key} onOpenChange={(o) => !o && setPolicyOpen(null)}>
            <DialogContent dir="rtl" className="max-h-[80vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold text-stone-900">{content.title}</DialogTitle>
                <DialogDescription className="sr-only">{content.title}</DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                {content.body}
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </>
  );
};

// Small helper icon for categories in drawer (reuse LayoutGrid but avoid extra import alias conflict)
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
