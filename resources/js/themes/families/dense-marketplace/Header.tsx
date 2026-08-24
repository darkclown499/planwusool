import React, { useState } from 'react';
import { Menu, MessageCircle, Search, X, Phone } from 'lucide-react';
import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';
import { CategoryChips } from './CategoryRail';

/** Floating WhatsApp button (fixed corner) driven by widget behavior toggles. */
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

/**
 * Dense-marketplace header — search-driven, not browse-driven: a
 * full-width search bar is always visible (never hidden behind a toggle
 * icon) on both desktop and mobile, and a sticky horizontal category chip
 * bar sits directly beneath it on mobile so shoppers can jump sections
 * without scrolling past a hero first.
 */
export const DenseMarketplaceHeader: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product, config, store } = useStorefrontCore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const logo = (props.logo as string) || config?.logo || storeData?.logo;
  const showNameText = !logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const categories = product.categories?.length ? product.categories : [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    product.handleSearch(query);
    setDrawerOpen(false);
  };

  const Logo = ({ compact = false }: { compact?: boolean }) => (
    <a href="/" className="flex min-w-0 shrink-0 items-center gap-2" aria-label={storeName}>
      {logo ? (
        <img src={logo} alt={storeName} className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 rounded-lg object-contain`} />
      ) : (
        <span
          className={`${compact ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'} flex shrink-0 items-center justify-center rounded-lg font-black text-white`}
          style={{ background: css('--twc-primary', '#0f8a5f') }}
        >
          {storeName.slice(0, 1)}
        </span>
      )}
      {showNameText && (
        <span
          className="hidden min-w-0 truncate text-base font-extrabold tracking-tight sm:block"
          style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
        >
          {storeName}
        </span>
      )}
    </a>
  );

  const SearchBar = ({ autoFocus = false }: { autoFocus?: boolean }) =>
    showSearch ? (
      <form onSubmit={onSearch} className="min-w-0 flex-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2"
            style={{ color: css('--twc-muted', '#94a3b8') }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={autoFocus}
            placeholder="ابحث في آلاف المنتجات..."
            className="w-full rounded-lg border bg-white py-2.5 ps-9 pe-3 text-sm outline-none transition focus:ring-2"
            style={{
              borderColor: css('--twc-border', '#e2e8f0'),
              color: css('--twc-text-primary', '#0f172a'),
              ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
            }}
          />
        </div>
      </form>
    ) : null;

  const Drawer = drawerOpen ? (
    <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl">
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
          <nav className="flex flex-col gap-1">
            <a
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-bold"
              style={{ background: `${css('--twc-primary', '#0f8a5f')}14`, color: css('--twc-primary', '#0f8a5f') }}
            >
              الرئيسية
            </a>
            {pages.map((p) => (
              <a
                key={p.slug}
                href={`/page/${p.slug}`}
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
                style={{ color: css('--twc-text-secondary', '#475569') }}
              >
                {p.title}
              </a>
            ))}
          </nav>
          {(config?.whatsapp_widget_phone || config?.phoneNumber) && (
            <a
              href={`tel:${config?.phoneNumber || config?.whatsapp_widget_phone}`}
              className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold"
              style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-secondary', '#475569') }}
            >
              <Phone className="h-4 w-4" style={{ color: css('--twc-primary', '#0f8a5f') }} />
              {config?.phoneNumber || config?.whatsapp_widget_phone}
            </a>
          )}
        </div>
      </aside>
    </div>
  ) : null;

  const stickyOn = props.sticky !== false;

  return (
    <>
      <header
        className={`${stickyOn ? 'sticky top-0 z-[100]' : 'relative'} w-full border-b shadow-sm`}
        style={{ background: css('--twc-surface', '#ffffff'), borderColor: css('--twc-border', '#e2e8f0') }}
      >
        {/* Row 1 — logo, prominent search (desktop inline), icons */}
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4">
          <button
            type="button"
            aria-label="القائمة"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border lg:hidden"
            style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <Logo />
          <div className="hidden min-w-0 flex-1 lg:flex">
            <SearchBar />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showWhatsapp && (
              <span className="hidden lg:block">
                <WhatsAppButton className="flex" />
              </span>
            )}
            {showAuth && <AccountButton />}
            {showCart && <CartButton />}
          </div>
        </div>

        {/* Row 2 — nav links (desktop, optional) */}
        {props.show_nav !== false && (pages.length > 0) && (
          <nav className="hidden border-t lg:block" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
            <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
              <a href="/" className="px-3 py-2 text-xs font-bold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
                الرئيسية
              </a>
              {pages.map((p) => (
                <a key={p.slug} href={`/page/${p.slug}`} className="px-3 py-2 text-xs font-semibold transition hover:opacity-75" style={{ color: css('--twc-text-secondary', '#475569') }}>
                  {p.title}
                </a>
              ))}
            </div>
          </nav>
        )}

        {/* Row (mobile) — always-visible search bar, no toggle */}
        <div className="border-t px-3 py-2 lg:hidden" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
          <SearchBar />
        </div>

        {/* Sticky mobile category chip bar — directly under the header, the family's mobile category browser */}
        {categories.length > 0 && (
          <div className="border-t lg:hidden" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
            <CategoryChips
              categories={categories}
              activeId={product.activeCategory}
              onSelect={(id) => product.handleCategoryClick(id)}
            />
          </div>
        )}
      </header>

      {showWhatsapp && <WhatsAppFab config={config} behavior={behavior} />}
      {Drawer}
    </>
  );
};

export default DenseMarketplaceHeader;
