import React, { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

/**
 * editorial-boutique Header — a Minimog-style boutique bar: a thin uppercase
 * nav row sits above a dead-centered wordmark, with icon actions (search,
 * wishlist, account, bag) balanced on the trailing side. Hairline border
 * only, no shadow/gradient chrome; the cart badge is blush with black
 * digits (never white-on-color) to match the family's "quiet color, loud
 * contrast" rule. Search opens the family's own full-screen overlay
 * (ui.setShowSearch) instead of an inline dropdown.
 */
export const Header: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { cart, auth, ui, wishlist, config, store } = useStorefrontCore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWishlist = props.show_wishlist !== false;
  const showNav = props.show_nav !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const logo = (props.logo as string) || config?.logo || storeData?.logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const cartCount = cart.cartItems?.length || 0;
  const wishlistCount = wishlist.count || wishlist.items?.length || 0;

  const border = css('--twc-border', '#ededed');
  const textPrimary = css('--twc-text-primary', '#161311');
  const textSecondary = css('--twc-text-secondary', '#8a8178');
  const primary = css('--twc-primary', '#f6d7d5');
  const headingFont = css('--twf-heading-font', 'inherit');

  const navItems = [{ slug: '', title: 'الرئيسية' }, ...pages.map((p) => ({ slug: p.slug, title: p.title }))];

  const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; badge?: number }> = ({
    label,
    onClick,
    children,
    badge,
  }) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative flex h-9 w-9 items-center justify-center transition hover:opacity-60"
      style={{ color: textPrimary }}
    >
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <span
          className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          style={{ background: primary, color: '#000000' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      <header
        className={`${props.sticky !== false ? 'sticky top-0' : 'relative'} z-[100] w-full border-b`}
        style={{ background: css('--twc-background', '#ffffff'), borderColor: border }}
      >
        {showNav && (
          <div className="hidden border-b py-2.5 md:block" style={{ borderColor: border }}>
            <nav className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4">
              {navItems.map((n) => (
                <a
                  key={n.slug || 'home'}
                  href={n.slug ? `/page/${n.slug}` : '/'}
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:opacity-60"
                  style={{ color: textSecondary }}
                >
                  {n.title}
                </a>
              ))}
            </nav>
          </div>
        )}

        <div className="mx-auto grid grid-cols-3 items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="القائمة"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center md:hidden"
              style={{ color: textPrimary }}
            >
              <Menu className="h-5 w-5" />
            </button>
            {showSearch && (
              <span className="hidden md:inline-flex">
                <IconButton label="بحث" onClick={() => ui.setShowSearch(true)}>
                  <Search className="h-[18px] w-[18px]" />
                </IconButton>
              </span>
            )}
          </div>

          <a href="/" className="flex min-w-0 items-center justify-center gap-2" aria-label={storeName}>
            {logo ? (
              <img src={logo} alt={storeName} className="h-9 w-9 shrink-0 object-contain" />
            ) : null}
            <span
              className="truncate text-lg font-semibold tracking-wide sm:text-xl"
              style={{ color: textPrimary, fontFamily: headingFont }}
            >
              {storeName}
            </span>
          </a>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            {showSearch && (
              <span className="md:hidden">
                <IconButton label="بحث" onClick={() => ui.setShowSearch(true)}>
                  <Search className="h-[18px] w-[18px]" />
                </IconButton>
              </span>
            )}
            {showWishlist && (
              <span className="hidden sm:inline-flex">
                <IconButton label="المفضلة" onClick={() => auth.setShowWishlistModal(true)} badge={wishlistCount}>
                  <Heart className="h-[18px] w-[18px]" />
                </IconButton>
              </span>
            )}
            {showAuth && (
              <span className="hidden sm:inline-flex">
                <IconButton
                  label={auth.isLoggedIn ? 'حسابي' : 'تسجيل الدخول'}
                  onClick={() => (auth.isLoggedIn ? auth.setShowOrdersModal(true) : auth.setShowLoginModal(true))}
                >
                  <User className="h-[18px] w-[18px]" />
                </IconButton>
              </span>
            )}
            {showCart && (
              <IconButton label="الحقيبة" onClick={() => ui.setShowCart(true)} badge={cartCount}>
                <ShoppingBag className="h-[18px] w-[18px]" />
              </IconButton>
            )}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside
            className="absolute inset-y-0 end-0 flex w-[82vw] max-w-xs flex-col"
            style={{ background: css('--twc-background', '#ffffff'), borderInlineStart: `1px solid ${border}` }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
              <span className="text-base font-semibold tracking-wide" style={{ color: textPrimary, fontFamily: headingFont }}>
                {storeName}
              </span>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center"
                style={{ color: textPrimary }}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col divide-y overflow-y-auto" style={{ borderColor: border }}>
              {navItems.map((n) => (
                <a
                  key={n.slug || 'home'}
                  href={n.slug ? `/page/${n.slug}` : '/'}
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: textSecondary, borderColor: border }}
                >
                  {n.title}
                </a>
              ))}
              {showWishlist && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    auth.setShowWishlistModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 text-start text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: textSecondary, borderColor: border }}
                >
                  <Heart className="h-4 w-4" />
                  المفضلة
                </button>
              )}
              {showAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    auth.isLoggedIn ? auth.setShowOrdersModal(true) : auth.setShowLoginModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 text-start text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: textSecondary, borderColor: border }}
                >
                  <User className="h-4 w-4" />
                  {auth.isLoggedIn ? 'حسابي' : 'تسجيل الدخول'}
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};

export default Header;
