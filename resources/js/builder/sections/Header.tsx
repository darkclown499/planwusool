import React, { useState } from 'react';
import { Menu, MessageCircle, Search, X } from 'lucide-react';
import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

/** Floating WhatsApp button (fixed corner) driven by the widget behavior toggles. */
const WhatsAppFab: React.FC<{ config: any; behavior: Record<string, any> }> = ({ config, behavior }) => {
  const showOnMobile = behavior.whatsapp_widget_show_on_mobile !== false;
  const showOnDesktop = behavior.whatsapp_widget_show_on_desktop !== false;
  if (!showOnMobile && !showOnDesktop) return null;

  const raw = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || '';
  const digits = String(raw).replace(/[^\d]/g, '');
  const href = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن منتجاتكم.')}`
    : 'https://wa.me';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      className={`fixed bottom-5 end-5 z-[120] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 ${
        showOnMobile ? '' : 'hidden md:flex'
      } ${showOnDesktop ? 'md:flex' : 'md:hidden'}`}
    >
      <MessageCircle className="h-7 w-7" />
      <span className="absolute -top-0.5 -end-0.5 flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
      </span>
    </a>
  );
};

export const HeaderSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product, config, store } = useStorefrontCore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const variant = (props.variant as string) || 'classic';
  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  // Uploaded logo wins over the store config logo.
  const logo = (props.logo as string) || config?.logo || storeData?.logo;
  // When a logo image exists the text name is hidden to avoid duplication.
  const showNameText = !logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    product.handleSearch(query);
    setMobileSearchOpen(false);
    setDrawerOpen(false);
  };

  /* ---------- Shared pieces ---------- */

  const LogoMark = ({ className = 'h-9 w-9' }: { className?: string }) =>
    logo ? (
      <img src={logo} alt={storeName} className={`${className} shrink-0 object-contain`} />
    ) : (
      <span
        className={`${className} flex shrink-0 items-center justify-center rounded-xl text-lg font-black text-white`}
        style={{ background: css('--twc-primary', '#0f8a5f') }}
      >
        {storeName.slice(0, 1)}
      </span>
    );

  const Logo = ({ compact = false }: { compact?: boolean }) => (
    <a href="/" className="flex min-w-0 items-center gap-2" aria-label={storeName}>
      <LogoMark className={compact ? 'h-8 w-8' : 'h-9 w-9'} />
      {showNameText && (
        <span
          className={`hidden min-w-0 truncate font-extrabold tracking-tight sm:block ${compact ? 'text-base' : 'text-lg'}`}
          style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
        >
          {storeName}
        </span>
      )}
    </a>
  );

  const SearchForm = ({ className = '' }: { className?: string }) =>
    showSearch ? (
      <form onSubmit={onSearch} className={className}>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full rounded-full border bg-white py-2.5 pr-10 pl-4 text-sm outline-none transition focus:ring-2"
            style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a'), ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f') }}
          />
          <Search className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2" style={{ color: css('--twc-muted', '#94a3b8') }} />
        </div>
      </form>
    ) : null;

  const Icons = ({ withWhatsappPill = true }: { withWhatsappPill?: boolean }) => (
    <div className="flex shrink-0 items-center gap-2">
      {withWhatsappPill && showWhatsapp && <span className="hidden lg:block"><WhatsAppInline /></span>}
      {showAuth && <AccountButton />}
      {showCart && <CartButton />}
    </div>
  );

  const NavBar = ({ centeredNav = false }: { centeredNav?: boolean }) => (
    <nav className="hidden border-t md:block" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
      <div className={`mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 ${centeredNav ? 'justify-center' : ''}`}>
        <a href="/" className="px-3 py-2.5 text-sm font-semibold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
          الرئيسية
        </a>
        {pages.map((p) => (
          <a key={p.slug} href={`/page/${p.slug}`} className="px-3 py-2.5 text-sm font-medium transition hover:opacity-75" style={{ color: css('--twc-text-secondary', '#475569') }}>
            {p.title}
          </a>
        ))}
      </div>
    </nav>
  );

  /* ---------- Mobile slide-in drawer ---------- */
  const Drawer = drawerOpen ? (
    <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
      {/* Dark backdrop overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      {/* Slide-in panel */}
      <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
          <Logo compact />
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-slate-50"
            style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-secondary', '#475569') }}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {showSearch && (
            <div className="mb-4">
              <SearchForm />
            </div>
          )}
          <nav className="flex flex-col gap-1">
            <a
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-bold"
              style={{ background: `${css('--twc-primary', '#0f8a5f')}14`, color: css('--twc-primary', '#0f8a5f') }}
            >
              الرئيسية
            </a>
            {pages.map((p) => (
              <a
                key={p.slug}
                href={`/page/${p.slug}`}
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
                style={{ color: css('--twc-text-secondary', '#475569') }}
              >
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  ) : null;

  /* ---------- Compact mobile row (<md) ---------- */
  const MobileRow = (
    <div className="flex h-14 items-center justify-between gap-2 px-3 md:hidden">
      <button
        type="button"
        aria-label="فتح القائمة"
        onClick={() => setDrawerOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95"
        style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
      >
        <Menu className="h-5 w-5" />
      </button>
      <Logo compact />
      <div className="flex shrink-0 items-center gap-1">
        {showSearch && (
          <button
            type="button"
            aria-label="بحث"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
            style={{ color: css('--twc-text-primary', '#0f172a') }}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        )}
        {showAuth && <AccountButton />}
        {showCart && <CartButton />}
      </div>
    </div>
  );

  const MobileSearchBar =
    mobileSearchOpen && showSearch ? (
      <div className="border-t px-3 pb-3 pt-2 md:hidden" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
        <SearchForm />
      </div>
    ) : null;

  /* ---------- Desktop inner content per variant ---------- */
  const DesktopInner = (() => {
    if (variant === 'minimal') {
      return (
        <>
          <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between gap-3 px-4 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="القائمة"
                onClick={() => setDrawerOpen(true)}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border md:flex"
                style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Logo />
            </div>
            <Icons withWhatsappPill={false} />
          </div>
          {MobileRow}
          {MobileSearchBar}
        </>
      );
    }

    if (variant === 'centered') {
      return (
        <>
          {/* True centered layout: icons | logo | actions on one row */}
          <div className="mx-auto hidden h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:grid">
            <div className="flex min-w-0 items-center gap-2">{showSearch && <SearchForm className="w-full max-w-[220px]" />}</div>
            <div className="flex min-w-0 items-center justify-center">
              <Logo />
            </div>
            <div className="flex min-w-0 items-center justify-end">
              <Icons />
            </div>
          </div>
          <NavBar centeredNav />
          {MobileRow}
          {MobileSearchBar}
        </>
      );
    }

    // classic + floating share the same inner layout
    return (
      <>
        <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between gap-3 px-4 md:flex">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="القائمة"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border lg:hidden"
              style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo />
          </div>
          <div className="hidden min-w-0 flex-1 justify-center px-6 lg:flex">
            <SearchForm className="w-full max-w-md" />
          </div>
          <Icons />
        </div>
        <NavBar />
        {MobileRow}
        {MobileSearchBar}
      </>
    );
  })();

  const stickyOn = props.sticky !== false;
  const isFloating = variant === 'floating';

  return (
    <>
      <header
        className={`${stickyOn ? 'sticky top-0 z-[100]' : 'relative'} z-[100] w-full ${isFloating ? 'bg-transparent' : 'border-b shadow-sm'}`}
        style={{
          background: isFloating ? 'transparent' : css('--twc-surface', '#ffffff'),
          borderColor: css('--twc-border', '#e2e8f0'),
        }}
      >
        {isFloating ? (
          <div className="m-3 md:m-4">
            <div
              className="overflow-hidden rounded-2xl border shadow-lg"
              style={{ background: css('--twc-surface', '#ffffff'), borderColor: css('--twc-border', '#e2e8f0') }}
            >
              {DesktopInner}
            </div>
          </div>
        ) : (
          DesktopInner
        )}
      </header>

      {/* Floating WhatsApp widget — fixed bottom corner, highest z-index */}
      {showWhatsapp && <WhatsAppFab config={config} behavior={behavior} />}

      {Drawer}
    </>
  );
};

/* Inline pill kept for desktop icon rows (non-floating usage) */
const WhatsAppInline: React.FC = () => (
  <WhatsAppButton className="flex" />
);
