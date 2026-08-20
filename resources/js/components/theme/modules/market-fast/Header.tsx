import type { ThemeConfig } from '@/config/theme.schema';
import { getImageUrl } from '@/utils/image-helper';
import { MapPin, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import React, { useState } from 'react';

export interface MarketFastHeaderProps {
  config: ThemeConfig;
  storeName: string;
  logo?: string;
  deliveryZone?: string;
  onSearch: (query: string) => void;
  categories: { id: string; name: string; description?: string }[];
  activeCategory?: string;
  onCategoryClick: (id: string) => void;
  cartCount: number;
  isLoggedIn: boolean;
  userName?: string;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onOrdersClick: () => void;
  onLogoutClick: () => void;
  onCartClick: () => void;
}

/** Lightweight emoji hint for a category name — keeps the rail visual and compact. */
function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/خضار|فواكه|بقالة|سوبر/.test(n)) return '🥬';
  if (/ألبان|حليب|جبن/.test(n)) return '🥛';
  if (/لحوم|دجاج|لحم/.test(n)) return '🥩';
  if (/مشروبات|قهوة|عصير/.test(n)) return '🧃';
  if (/حلويات|شوكولاتة/.test(n)) return '🍫';
  if (/خبز|مخبوز/.test(n)) return '🍞';
  if (/عناية|صيدلية/.test(n)) return '💊';
  if (/أطفال|بيبي/.test(n)) return '🧸';
  if (/منظفات|منزل/.test(n)) return '🧴';
  return '🛒';
}

/**
 * market-fast compact header: logo + delivery-zone pill + search in the top bar,
 * and a sticky horizontal category rail below it (icon + title pills), exactly
 * matching the grocery quick-browse pattern.
 */
export const MarketFastHeader: React.FC<MarketFastHeaderProps> = ({
  config,
  storeName,
  logo,
  deliveryZone,
  onSearch,
  categories,
  activeCategory,
  onCategoryClick,
  cartCount,
  isLoggedIn,
  userName,
  onLoginClick,
  onProfileClick,
  onOrdersClick,
  onLogoutClick,
  onCartClick,
}) => {
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const primary = config.styling.primaryColor;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <header>
      {/* Compact top navbar */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:px-4">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <a href={window.location.pathname} className="flex min-w-0 items-center gap-2">
              {logo ? (
                <img src={getImageUrl(logo)} alt={storeName} className="h-8 max-w-24 object-contain" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: primary }}>
                  {storeName.slice(0, 1)}
                </span>
              )}
              <span className="hidden truncate text-base font-extrabold text-slate-900 sm:block">{storeName}</span>
            </a>
          </div>

          {/* Delivery zone indicator */}
          {deliveryZone && (
            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 xl:inline-flex">
              <MapPin className="h-3 w-3" />
              {deliveryZone}
            </span>
          )}

          {/* Search */}
          <form onSubmit={submit} className="min-w-0 flex-1">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="ابحث عن المنتجات..."
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onCartClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95"
              style={{ backgroundColor: primary }}
              aria-label="السلة"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold" style={{ color: primary }}>
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNavOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                  aria-label="حسابي"
                >
                  <User className="h-4 w-4" />
                </button>
                {navOpen && (
                  <div className="absolute left-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl">
                    <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-700">{userName || storeName}</div>
                    <button type="button" onClick={() => { setNavOpen(false); onProfileClick(); }} className="block w-full px-4 py-2 text-right text-sm text-slate-600 hover:bg-emerald-50">حسابي</button>
                    <button type="button" onClick={() => { setNavOpen(false); onOrdersClick(); }} className="block w-full px-4 py-2 text-right text-sm text-slate-600 hover:bg-emerald-50">طلباتي</button>
                    <button type="button" onClick={() => { setNavOpen(false); onLogoutClick(); }} className="block w-full px-4 py-2 text-right text-sm text-rose-600 hover:bg-rose-50">تسجيل الخروج</button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 sm:inline-flex"
                style={{ backgroundColor: primary }}
              >
                <User className="h-3.5 w-3.5" />
                دخول
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky horizontal category rail */}
      <nav
        className="no-scrollbar sticky top-0 z-30 flex items-center gap-2 overflow-x-auto bg-white px-4 py-2"
        style={{ borderBottom: '1px solid rgba(226,232,240,0.9)' }}
        aria-label="الأقسام"
      >
        <button
          type="button"
          onClick={() => onCategoryClick('')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            !activeCategory ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          الكل
        </button>
        {categories.map((category) => {
          const active = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryClick(category.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="text-sm leading-none">{categoryEmoji(category.name)}</span>
              <span className="truncate">{category.name}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export default MarketFastHeader;