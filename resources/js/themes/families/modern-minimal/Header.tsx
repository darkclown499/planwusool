import React, { useState } from 'react';
import { Menu, MessageCircle, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

/**
 * modern-minimal Header — a single quiet bar: wordmark, a thin centered
 * nav row of plain uppercase links, and unobtrusive line-icon actions
 * (search toggles inline instead of living as a permanent pill, cart shows
 * its count as a small superscript instead of a filled badge). No shadows,
 * no filled icon-circles, no gradients — everything reads as whitespace
 * first, chrome second.
 */
export const Header: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { cart, product, auth, ui, config, store } = useStorefrontCore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;
  const showNav = props.show_nav !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const logo = (props.logo as string) || config?.logo || storeData?.logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const cartCount = cart.cartItems?.length || 0;

  const waRaw = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
  const waDigits = String(waRaw).replace(/[^\d]/g, '');
  const waHref = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن منتجاتكم.')}` : '';

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    product.handleSearch(query);
    setSearchOpen(false);
    setDrawerOpen(false);
  };

  const border = css('--twc-border', '#e2e8f0');
  const textPrimary = css('--twc-text-primary', '#0f172a');
  const textSecondary = css('--twc-text-secondary', '#64748b');

  const Wordmark = ({ compact = false }: { compact?: boolean }) => (
    <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label={storeName}>
      {logo ? (
        <img src={logo} alt={storeName} className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 object-contain`} />
      ) : (
        <span
          className={`${compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base'} flex shrink-0 items-center justify-center rounded-full font-semibold`}
          style={{ border: `1px solid ${border}`, color: textPrimary }}
        >
          {storeName.slice(0, 1)}
        </span>
      )}
      <span
        className={`min-w-0 truncate font-semibold tracking-tight ${compact ? 'text-sm' : 'text-base'}`}
        style={{ color: textPrimary, fontFamily: css('--twf-heading-font', 'inherit') }}
      >
        {storeName}
      </span>
    </a>
  );

  const navLinks = (
    <>
      <a href="/" className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] transition hover:opacity-60" style={{ color: textPrimary }}>
        الرئيسية
      </a>
      {pages.map((p) => (
        <a
          key={p.slug}
          href={`/page/${p.slug}`}
          className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] transition hover:opacity-60"
          style={{ color: textSecondary }}
        >
          {p.title}
        </a>
      ))}
    </>
  );

  const IconButton: React.FC<{ label: string; onClick?: () => void; href?: string; children: React.ReactNode; badge?: number }> = ({
    label,
    onClick,
    href,
    children,
    badge,
  }) => {
    const cls = 'relative flex h-9 w-9 items-center justify-center transition hover:opacity-60';
    const style = { color: textPrimary };
    const content = (
      <>
        {children}
        {typeof badge === 'number' && badge > 0 && (
          <span
            className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ background: css('--twc-primary', '#0f8a5f') }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    );
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls} style={style}>
        {content}
      </a>
    ) : (
      <button type="button" aria-label={label} onClick={onClick} className={cls} style={style}>
        {content}
      </button>
    );
  };

  return (
    <>
      <header
        className={`hidden md:block ${props.sticky !== false ? 'sticky top-0' : 'relative'} z-[100] w-full border-b`}
        style={{ background: css('--twc-background', '#ffffff'), borderColor: border }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="القائمة"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center md:hidden"
              style={{ color: textPrimary }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Wordmark />
          </div>

          {showNav && (
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-8 overflow-x-auto md:flex">{navLinks}</nav>
          )}

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {showWhatsapp && waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 text-xs font-medium transition hover:opacity-60 lg:flex"
                style={{ color: textSecondary }}
              >
                <MessageCircle className="h-4 w-4" style={{ color: '#25D366' }} />
                واتساب
              </a>
            )}
            {showSearch && (
              <IconButton label="بحث" onClick={() => setSearchOpen((v) => !v)}>
                {searchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
              </IconButton>
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
              <IconButton label="السلة" onClick={() => ui.setShowCart(true)} badge={cartCount}>
                <ShoppingBag className="h-[18px] w-[18px]" />
              </IconButton>
            )}
          </div>
        </div>

        {searchOpen && showSearch && (
          <div className="border-t px-4 py-3 sm:px-6 lg:px-8" style={{ borderColor: border }}>
            <form onSubmit={submitSearch} className="mx-auto flex max-w-2xl items-center gap-3 border-b pb-2" style={{ borderColor: border }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: textSecondary }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: textPrimary }}
              />
            </form>
          </div>
        )}
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside
            className="absolute inset-y-0 end-0 flex w-[82vw] max-w-xs flex-col"
            style={{ background: css('--twc-background', '#ffffff'), borderInlineStart: `1px solid ${border}` }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
              <Wordmark compact />
              <button type="button" aria-label="إغلاق" onClick={() => setDrawerOpen(false)} className="flex h-8 w-8 items-center justify-center" style={{ color: textPrimary }}>
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            {showSearch && (
              <form onSubmit={submitSearch} className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: border }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: textSecondary }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: textPrimary }}
                />
              </form>
            )}
            <nav className="flex flex-1 flex-col divide-y overflow-y-auto" style={{ borderColor: border }}>
              <a href="/" onClick={() => setDrawerOpen(false)} className="px-5 py-3.5 text-sm font-medium" style={{ color: textPrimary, borderColor: border }}>
                الرئيسية
              </a>
              {pages.map((p) => (
                <a
                  key={p.slug}
                  href={`/page/${p.slug}`}
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-3.5 text-sm font-medium"
                  style={{ color: textSecondary, borderColor: border }}
                >
                  {p.title}
                </a>
              ))}
              {showAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    auth.isLoggedIn ? auth.setShowOrdersModal(true) : auth.setShowLoginModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 text-start text-sm font-medium"
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
