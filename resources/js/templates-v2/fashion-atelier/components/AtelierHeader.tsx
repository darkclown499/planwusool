import React, { useEffect, useState } from 'react';
import { Gift, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStorefrontCore } from '../../shared/hooks';
import { getImageUrl } from '@/utils/image-helper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { POLICY_LINKS, getPolicyContent } from './PolicyContent';
import HeaderLoyaltyBadge from '@/components/storefront/HeaderLoyaltyBadge';

interface AtelierHeaderProps {
  /** Extra links prepended to the category navigation (e.g. الرئيسية). */
  homeHref?: string;
}

/**
 * The Atelier header: a calm editorial masthead. Centered word-mark, quiet
 * utility icons with live counts, and a hairline category nav beneath.
 * Turns sticky + elevated once the page scrolls.
 */
export const AtelierHeader: React.FC<AtelierHeaderProps> = ({ homeHref = '/' }) => {
  const { config, store, cart, auth, ui, wishlist, product, content } = useStorefrontCore() as any;
  const [scrolled, setScrolled] = useState(false);
  const showCategoriesBar = ((store as any)?.settings?.show_categories_bar ?? (content as any)?.settings?.show_categories_bar ?? (content as any)?.homepage?.show_categories_bar ?? false) as boolean;
  const [menuOpen, setMenuOpen] = useState(false);
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

  const navLink = 'relative shrink-0 whitespace-nowrap px-3 py-2 text-[13px] font-medium tracking-wide text-stone-700 transition-colors hover:text-[#9d7463]';

  const policyVars = {
    STORE_NAME: String(config?.storeName || store?.name || 'متجرنا'),
    STORE_PHONE: String((config as any)?.phoneNumber || (config as any)?.phone || (store as any)?.phone || ''),
    STORE_CITY: String((config as any)?.city || (config as any)?.address || (store as any)?.city || ''),
  };
  const activePolicy = policyOpen ? getPolicyContent(policyOpen, policyVars) : null;

  return (
    <header
      className={`hidden md:block sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 transition-shadow ${
        scrolled ? 'shadow-[0_8px_30px_rgba(60,45,35,0.08)]' : ''
      }`}
      dir="rtl"
    >
      {/* Masthead */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Left cluster (mobile menu / desktop spacer) */}
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="القائمة"
            className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
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

        {/* Word-mark */}
        <a href={homeHref} className="flex shrink-0 flex-col items-center" aria-label={config?.storeName || store?.name}>
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt={config?.storeName || store?.name} className="h-10 w-auto object-contain sm:h-12" />
          ) : (
            <>
              <span className="font-serif text-xl font-bold tracking-wide text-stone-900 sm:text-2xl">
                {config?.storeName || store?.name}
              </span>
              <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.35em] text-[#b08d57] sm:block">
                Atelier
              </span>
            </>
          )}
        </a>

        {/* Utility icons */}
        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
          <button type="button" onClick={() => ui.setShowSearch(true)} aria-label="بحث" className="rounded-full p-2 text-stone-700 transition hover:bg-stone-100">
            <Search className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <div className="hidden sm:block">
            <HeaderLoyaltyBadge />
          </div>
          <button type="button" onClick={() => auth.setShowWishlistModal(true)} aria-label="المفضلة" className="relative rounded-full p-2 text-stone-700 transition hover:bg-stone-100">
            <Heart className="h-5 w-5" strokeWidth={1.7} />
            {!!wishlist?.count && (
              <span className="absolute top-0 -right-1 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#9d7463] px-1 text-[9px] font-bold text-white">
                {wishlist.count}
              </span>
            )}
          </button>
          <button type="button" onClick={openAccount} aria-label="حسابي" className="hidden rounded-full p-2 text-stone-700 transition hover:bg-stone-100 sm:block">
            <User className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <button type="button" onClick={() => ui.setShowCart(true)} aria-label="سلة التسوق" className="relative rounded-full p-2 text-stone-700 transition hover:bg-stone-100">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9d7463] px-1 text-[9px] font-bold text-white">
                {cartCount > 99 ? '+99' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hairline nav — hidden by default; enable via settings.show_categories_bar */}
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

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col bg-[#faf7f2] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <span className="font-serif text-lg font-bold text-stone-900">{config?.storeName || store?.name}</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <a href={homeHref} onClick={() => setMenuOpen(false)} className="block rounded-lg px-4 py-3 text-[15px] font-semibold text-stone-800 hover:bg-stone-100">
                الرئيسية
              </a>
              {categories.map((c: any) => (
                <a
                  key={c.id}
                  href={`/category/${c.slug || c.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-[15px] text-stone-600 hover:bg-stone-100 hover:text-[#9d7463]"
                >
                  {c.name}
                </a>
              ))}
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="mb-2 px-4 text-xs font-black tracking-wide text-stone-500">معلومات المتجر</p>
                {POLICY_LINKS.map((link) => (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setTimeout(() => setPolicyOpen(link.key), 150);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-start text-[15px] text-stone-600 hover:bg-stone-100 hover:text-[#9d7463]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </nav>
            <div className="border-t border-stone-200 p-4">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); openAccount(); }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-[#9d7463] hover:text-[#9d7463]"
              >
                <User className="h-4 w-4" />
                {auth?.isLoggedIn ? 'حسابي' : 'تسجيل الدخول'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Policy modals — shared for mobile drawer (desktop top bar uses AnnouncementBar dialogs) */}
      {POLICY_LINKS.map((link) => {
        if (policyOpen !== link.key || !activePolicy) return null;
        const content = getPolicyContent(link.key, policyVars);
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
    </header>
  );
};
