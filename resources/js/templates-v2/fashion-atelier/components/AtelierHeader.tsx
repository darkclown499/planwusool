import React, { useEffect, useState } from 'react';
import { Heart, MapPin, Menu, Package, Search, ShoppingBag, User } from 'lucide-react';
import { useStorefrontCore } from '../../shared/hooks';
import { getImageUrl } from '@/utils/image-helper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { POLICY_LINKS, getPolicyContent, renderPolicyBody } from './PolicyContent';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';

interface AtelierHeaderProps {
  homeHref?: string;
  onOpenMobileMenu?: () => void;
}

export const AtelierHeader: React.FC<AtelierHeaderProps> = ({ homeHref = '/', onOpenMobileMenu }) => {
  const { config, store, cart, auth, ui, wishlist, product, content, order, behavior } = useStorefrontCore() as any;
  const accountsOn = behavior?.customer_accounts_enabled !== false;
  const loginEnabled = accountsOn && behavior?.enable_customer_login !== false && behavior?.show_auth_button !== false;
  const canShowAuth = accountsOn && (auth?.isLoggedIn || loginEnabled);
  const [scrolled, setScrolled] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  const [policyOpen, setPolicyOpen] = useState<null | 'about' | 'shipping' | 'privacy'>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = (product?.categories || []).slice(0, 8);
  const cartCount = (cart?.cartItems || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);

  const openAccount = () => {
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

  return (
    <header
      data-atelier-header="true"
      className={`sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 transition-shadow ${
        scrolled ? 'shadow-[0_8px_30px_rgba(60,45,35,0.08)]' : ''
      }`}
      dir="rtl"
    >
      {/* MOBILE HEADER — RIGHT hamburger, CENTER logo, LEFT orders+cart (md:hidden) */}
      {/* grid-cols-[1fr_auto_1fr] keeps the logo dead-center regardless of side widths */}
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:hidden">
        {/* RIGHT: Hamburger */}
        <button
          type="button"
          onClick={() => onOpenMobileMenu?.()}
          aria-label="القائمة"
          className="flex h-10 w-10 items-center justify-center justify-self-start rounded-full bg-stone-900 text-white shadow-sm transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* CENTER: Logo — pinned to viewport center */}
        <a href={homeHref} className="flex shrink-0 flex-col items-center justify-self-center" aria-label={config?.storeName || store?.name}>
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
        <div className="flex items-center justify-self-end gap-1.5">
          {canShowAuth && (
            <button
              type="button"
              onClick={handleMyOrders}
              aria-label="طلباتي"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:bg-stone-50"
            >
              <Package className="h-5 w-5" strokeWidth={1.7} />
            </button>
          )}
          <button
            type="button"
            onClick={() => ui.setShowCart(true)}
            aria-label="سلة التسوق"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#F9A8D4] text-[#9d174d] shadow-sm transition hover:bg-[#ef9fc9]"
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
            <button type="button" onClick={() => ui.setShowCart(true)} aria-label="سلة التسوق" className="relative rounded-full bg-[#F9A8D4] p-2 text-[#9d174d] transition hover:bg-[#ef9fc9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9A8D4]/50">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-stone-900 px-1 text-[9px] font-bold text-white">
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
                {renderPolicyBody(content.body)}
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </header>
  );
};
