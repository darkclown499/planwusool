import React, { useState } from 'react';
import { Menu, MessageCircle, Phone, Search, Tag, X, Zap } from 'lucide-react';
import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

/**
 * flash-deals Header — a bold, promo-driven storefront bar (not the quiet
 * shared header): a colored contact strip up top, a heavy primary-tinted
 * main bar with a prominent search + orange "ابحث" button, and a bold pill
 * nav row for categories/pages. Reads as a deals/marketplace destination.
 */
export const Header: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product, config, store } = useStorefrontCore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const behavior = storeData?.behavior || {};
  const showSearch = props.show_search !== false && behavior.show_search !== false;
  const showCart = props.show_cart !== false && behavior.show_cart !== false;
  const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
  const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;
  const showNav = props.show_nav !== false;
  const stickyOn = props.sticky !== false;

  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const logo = (props.logo as string) || config?.logo || storeData?.logo;
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const categories = (product.categories || []).slice(0, 8);
  const phone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    product.handleSearch(query);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className={`${stickyOn ? 'sticky top-0 z-[100]' : 'relative'} w-full shadow-sm`}>
        {/* Contact / urgency strip */}
        <div className="hidden md:block" style={{ background: css('--twc-secondary', '#171830') }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs text-white/85">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Zap className="h-3 w-3" style={{ color: css('--twc-accent', '#f15f3d') }} />
              عروض يومية بخصومات حتى 50%
            </span>
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 transition hover:text-white">
                <Phone className="h-3 w-3" />
                {phone}
              </a>
            )}
          </div>
        </div>

        {/* Main bar */}
        <div style={{ background: css('--twc-primary', '#0f8a5f') }}>
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
            <button
              type="button"
              aria-label="القائمة"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>

            <a href="/" className="flex min-w-0 shrink-0 items-center gap-2" aria-label={storeName}>
              {logo ? (
                <img src={logo} alt={storeName} className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
              ) : (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-black"
                  style={{ background: css('--twc-accent', '#f15f3d'), color: '#ffffff' }}
                >
                  {storeName.slice(0, 1)}
                </span>
              )}
              <span className="hidden truncate text-lg font-black text-white sm:block" style={{ fontFamily: css('--twf-heading-font', 'inherit') }}>
                {storeName}
              </span>
            </a>

            {showSearch && (
              <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
                <div className="flex overflow-hidden rounded-full bg-white shadow-inner">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن عروض ومنتجات..."
                    className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
                    style={{ color: css('--twc-text-primary', '#0f172a') }}
                  />
                  <button
                    type="submit"
                    aria-label="بحث"
                    className="flex shrink-0 items-center justify-center gap-1.5 px-5 text-sm font-extrabold text-white transition hover:opacity-90"
                    style={{ background: css('--twc-accent', '#f15f3d') }}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="ms-auto flex shrink-0 items-center gap-1">
              {showWhatsapp && phone && (
                <a
                  href={`https://wa.me/${String(phone).replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="واتساب"
                  className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90 lg:flex"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              {showAuth && (
                <span className="text-white [&_button]:text-white [&_svg]:text-white">
                  <AccountButton />
                </span>
              )}
              {showCart && (
                <span className="text-white [&_button]:text-white [&_svg]:text-white">
                  <CartButton />
                </span>
              )}
            </div>
          </div>

          {/* Mobile search row */}
          {showSearch && (
            <form onSubmit={onSearch} className="px-4 pb-3 md:hidden">
              <div className="flex overflow-hidden rounded-full bg-white shadow-inner">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن عروض..."
                  className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm outline-none"
                  style={{ color: css('--twc-text-primary', '#0f172a') }}
                />
                <button
                  type="submit"
                  aria-label="بحث"
                  className="flex shrink-0 items-center justify-center px-4 text-white"
                  style={{ background: css('--twc-accent', '#f15f3d') }}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bold pill nav row */}
        {showNav && (categories.length > 0 || pages.length > 0) && (
          <nav className="hidden border-b bg-white md:block" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
            <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              <a
                href="/"
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-extrabold text-white"
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              >
                <Tag className="h-3 w-3" />
                الرئيسية
              </a>
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition hover:opacity-75"
                  style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-secondary', '#475569') }}
                >
                  {c.name}
                </button>
              ))}
              {pages.map((p) => (
                <a
                  key={p.slug}
                  href={`/page/${p.slug}`}
                  className="inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:opacity-75"
                  style={{ color: css('--twc-text-secondary', '#475569') }}
                >
                  {p.title}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="animate-slide-in-right absolute inset-y-0 end-0 flex w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between p-4 text-white" style={{ background: css('--twc-primary', '#0f8a5f') }}>
              <span className="text-base font-black">{storeName}</span>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="flex flex-col gap-1">
                <a
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-extrabold text-white"
                  style={{ background: css('--twc-primary', '#0f8a5f') }}
                >
                  الرئيسية
                </a>
                {categories.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      product.handleCategoryClick(c.id);
                      setDrawerOpen(false);
                    }}
                    className="rounded-xl px-3 py-2.5 text-start text-sm font-bold transition hover:bg-slate-50"
                    style={{ color: css('--twc-text-secondary', '#475569') }}
                  >
                    {c.name}
                  </button>
                ))}
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
      )}
    </>
  );
};

export default Header;
