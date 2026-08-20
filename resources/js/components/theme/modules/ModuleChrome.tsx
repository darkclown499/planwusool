import { getImageUrl } from '@/utils/image-helper';
import {
  Facebook,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  Twitter,
  User,
  X,
  Youtube,
} from 'lucide-react';
import React, { useState } from 'react';
import type { ThemeConfig } from '@/config/theme.schema';

/* ------------------------------------------------------------------ */
/* Announcement bar                                                    */
/* ------------------------------------------------------------------ */

export const ModuleAnnouncement: React.FC<{ text?: string; accent: string; dark?: boolean }> = ({
  text,
  accent,
  dark = false,
}) => {
  if (!text) return null;
  return (
    <div className="px-4 py-1.5 text-center text-xs font-semibold text-white" style={{ backgroundColor: dark ? accent : accent, opacity: 0.96 }}>
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Header (shared chrome for all engine modules)                       */
/* ------------------------------------------------------------------ */

export interface ModuleHeaderProps {
  config: ThemeConfig;
  storeName: string;
  logo?: string;
  cartCount: number;
  cartType: string;
  onCartClick: () => void;
  onSearch?: (query: string) => void;
  isLoggedIn: boolean;
  userName?: string;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onOrdersClick: () => void;
  onLogoutClick: () => void;
  onWishlistClick?: () => void;
  wishlistCount?: number;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  config,
  storeName,
  logo,
  cartCount,
  cartType,
  onCartClick,
  onSearch,
  isLoggedIn,
  userName,
  onLoginClick,
  onProfileClick,
  onOrdersClick,
  onLogoutClick,
  onWishlistClick,
  wishlistCount = 0,
}) => {
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const primary = config.styling.primaryColor;
  const radius = config.styling.borderRadius;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  const actionBtn = `flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer`;
  const badge = `absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer" onClick={() => setMobileMenuOpen(true)} aria-label="القائمة">
            <Menu className="h-5 w-5" />
          </button>
          <a href={window.location.pathname} className="flex min-w-0 items-center gap-2">
            {logo ? (
              <img src={getImageUrl(logo)} alt={storeName} className="max-h-9 max-w-28 object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: primary, borderRadius: radius }}>
                {storeName.slice(0, 1)}
              </span>
            )}
            <span className="hidden truncate text-base font-extrabold text-gray-900 sm:block">{storeName}</span>
          </a>
        </div>

        {/* Desktop search */}
        {onSearch && (
          <form onSubmit={submitSearch} className="hidden flex-1 md:block md:max-w-xl">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="ابحث عن المنتجات..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-9 text-sm text-gray-700 outline-none focus:border-primary"
                style={{ borderRadius: radius }}
              />
            </div>
          </form>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onWishlistClick && (
            <button type="button" onClick={onWishlistClick} className={`${actionBtn} relative hidden sm:flex`} aria-label="المفضلة">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && <span className={badge} style={{ backgroundColor: primary }}>{wishlistCount}</span>}
            </button>
          )}

          <button type="button" onClick={onCartClick} className={`${actionBtn} relative`} aria-label="السلة">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && <span className={badge} style={{ backgroundColor: primary }}>{cartCount}</span>}
          </button>

          {isLoggedIn ? (
            <div className="relative">
              <button type="button" onClick={() => setUserMenuOpen((v) => !v)} className={`${actionBtn}`} aria-label="حسابي">
                <User className="h-5 w-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute left-0 top-11 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                  <div className="border-b border-gray-50 px-4 py-2 text-xs font-bold text-gray-700">{userName || storeName}</div>
                  <button type="button" onClick={() => { setUserMenuOpen(false); onProfileClick(); }} className="block w-full px-4 py-2 text-right text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">حسابي</button>
                  <button type="button" onClick={() => { setUserMenuOpen(false); onOrdersClick(); }} className="block w-full px-4 py-2 text-right text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">طلباتي</button>
                  <button type="button" onClick={() => { setUserMenuOpen(false); onLogoutClick(); }} className="block w-full px-4 py-2 text-right text-sm text-rose-600 hover:bg-rose-50 cursor-pointer">تسجيل الخروج</button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={onLoginClick} className="rounded-lg px-3 py-2 text-sm font-bold text-white hover:opacity-90 cursor-pointer hidden sm:block" style={{ backgroundColor: primary, borderRadius: radius }}>
              دخول
            </button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      {onSearch && (
        <div className="px-4 pb-2 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              placeholder="ابحث عن المنتجات..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-4 pr-9 text-sm text-gray-700 outline-none focus:border-primary"
              style={{ borderRadius: radius }}
            />
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-extrabold text-gray-900">{storeName}</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {isLoggedIn && (
                <>
                  <button type="button" onClick={() => { setMobileMenuOpen(false); onProfileClick(); }} className="rounded-lg px-3 py-2.5 text-right text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">حسابي</button>
                  <button type="button" onClick={() => { setMobileMenuOpen(false); onOrdersClick(); }} className="rounded-lg px-3 py-2.5 text-right text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">طلباتي</button>
                  <button type="button" onClick={() => { setMobileMenuOpen(false); onLogoutClick(); }} className="rounded-lg px-3 py-2.5 text-right text-sm text-rose-600 hover:bg-rose-50 cursor-pointer">تسجيل الخروج</button>
                </>
              )}
              {!isLoggedIn && (
                <button type="button" onClick={() => { setMobileMenuOpen(false); onLoginClick(); }} className="rounded-lg bg-primary px-3 py-2.5 text-right text-sm font-bold text-white cursor-pointer" style={{ backgroundColor: primary, borderRadius: radius }}>
                  دخول
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

/* ------------------------------------------------------------------ */
/* Footer (shared chrome for all engine modules)                       */
/* ------------------------------------------------------------------ */

export interface ModuleFooterProps {
  storeName: string;
  logo?: string;
  phone?: string;
  address?: string;
  email?: string;
  socialMedia?: Record<string, string>;
  copyrightText?: string;
  accent: string;
}

export const ModuleFooter: React.FC<ModuleFooterProps> = ({
  storeName,
  logo,
  phone,
  address,
  email,
  socialMedia,
  copyrightText,
  accent,
}) => {
  const socials = [
    { key: 'facebook', icon: Facebook },
    { key: 'instagram', icon: Instagram },
    { key: 'twitter', icon: Twitter },
    { key: 'youtube', icon: Youtube },
  ];
  return (
    <footer className="mt-8 border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            {logo ? (
              <img src={getImageUrl(logo)} alt={storeName} className="max-h-8 object-contain" />
            ) : (
              <span className="text-base font-extrabold text-gray-900">{storeName}</span>
            )}
          </div>
          <p className="text-sm text-gray-500">تسوّق بسهولة وأمان، التوصيل يصلك حتى باب المنزل.</p>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p className="font-bold text-gray-900">تواصل معنا</p>
          {phone && (
            <p className="flex items-center gap-2" dir="ltr">
              <Phone className="h-4 w-4" /> {phone}
            </p>
          )}
          {email && (
            <p className="flex items-center gap-2" dir="ltr">
              <Mail className="h-4 w-4" /> {email}
            </p>
          )}
          {address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {address}
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold text-gray-900">تابعنا</p>
          <div className="flex gap-2">
            {socials
              .filter((s) => socialMedia?.[s.key])
              .map((s) => {
                const Icon = s.icon;
                return (
                  <a key={s.key} href={socialMedia?.[s.key]} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-80">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        {copyrightText || `© ${new Date().getFullYear()} ${storeName} — جميع الحقوق محفوظة`}
      </div>
    </footer>
  );
};