import React, { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const HeaderSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product, config, store } = useStorefrontCore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const variant = (props.variant as string) || 'classic';
  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const logo = config?.logo || storeData?.logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const centered = variant === 'centered';
  const showNavBar = pages.length > 0 && variant !== 'minimal';

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    product.handleSearch(query);
  };

  const Hamburger = (
    <button
      type="button"
      aria-label="القائمة"
      onClick={() => setOpen((v) => !v)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border lg:hidden"
      style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );

  const Logo = (
    <a href="/" className="flex min-w-0 items-center gap-2">
      {logo ? (
        <img src={logo} alt={storeName} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white" style={{ background: css('--twc-primary', '#0f8a5f') }}>
          {storeName.slice(0, 1)}
        </span>
      )}
      {!centered && (
        <span className="hidden min-w-0 truncate text-lg font-extrabold tracking-tight sm:block" style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}>
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

  const Icons = (
    <div className="flex shrink-0 items-center gap-2">
      {showWhatsapp && <WhatsAppButton className="hidden lg:flex" />}
      {showAuth && <AccountButton />}
      {showCart && <CartButton />}
    </div>
  );

  const NavBar = (
    <nav className="hidden border-t md:block" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
      <div className={`mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 ${centered ? 'justify-center' : ''}`}>
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

  const MobileDrawer = open ? (
    <div className="border-t p-4 lg:hidden" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
      {showSearch && (
        <form onSubmit={onSearch} className="mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full rounded-full border bg-white px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: css('--twc-border', '#e2e8f0') }}
          />
        </form>
      )}
      <div className="flex flex-col gap-1">
        <a href="/" className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
          الرئيسية
        </a>
        {pages.map((p) => (
          <a key={p.slug} href={`/page/${p.slug}`} className="rounded-lg px-3 py-2 text-sm font-medium" style={{ color: css('--twc-text-secondary', '#475569') }}>
            {p.title}
          </a>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <header
      className={`relative z-30 hidden w-full border-b md:block ${props.sticky === false ? '' : 'sticky top-0'}`}
      style={{
        background: css('--twc-surface', '#ffffff'),
        borderColor: css('--twc-border', '#e2e8f0'),
        boxShadow: '0 1px 3px rgba(2,6,23,.05)',
      }}
    >
      {/* minimal: single row, no center search, no nav bar */}
      {variant === 'minimal' ? (
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            {Hamburger}
            {Logo}
          </div>
          {Icons}
        </div>
      ) : centered ? (
        <>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 shrink-0 items-center gap-3">
              {Hamburger}
              <span className="hidden w-8 lg:block" />
            </div>
            <div className="flex min-w-0 items-center justify-center">
              <a href="/" className="flex min-w-0 items-center gap-2">
                {logo ? (
                  <img src={logo} alt={storeName} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white" style={{ background: css('--twc-primary', '#0f8a5f') }}>
                    {storeName.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 truncate text-lg font-extrabold tracking-tight" style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}>
                  {storeName}
                </span>
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2">{Icons}</div>
          </div>
          {showNavBar && NavBar}
          {MobileDrawer}
        </>
      ) : (
        // classic
        <>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              {Hamburger}
              {Logo}
            </div>
            <SearchForm className="hidden max-w-md flex-1 md:block" />
            {Icons}
          </div>
          {showNavBar && NavBar}
          {MobileDrawer}
        </>
      )}
    </header>
  );
};