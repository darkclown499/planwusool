import React, { useState } from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';
import { useStorefrontLocale } from '../../../contexts/StorefrontLocaleContext';
import { NotificationBell } from '../../../components/storefront/NotificationBell';

interface HeaderProps {
  storeName: string;
  logo?: string;
  onSearch: (query: string) => void;
  cartCount: number;
  onCartClick: () => void;
  onLoginClick: () => void;
  isLoggedIn: boolean;
  userName: string;
  onProfileClick: () => void;
  onOrdersClick: () => void;
  onLogoutClick: () => void;
  onMenuClick: () => void;
  onWishlistClick?: () => void;
  wishlistCount?: number;
  storeId?: string | number;
}

export const Header: React.FC<HeaderProps> = ({
  storeName,
  logo,
  onSearch,
  cartCount,
  onCartClick,
  onLoginClick,
  isLoggedIn,
  userName,
  onProfileClick,
  onOrdersClick,
  onLogoutClick,
  onMenuClick,
  onWishlistClick,
  wishlistCount = 0,
  storeId
}) => {
  const theme = useMasalahTheme();
  const { t } = useStorefrontLocale();
  const [query, setQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <header className="sticky top-0 z-40 shadow-md" style={{ background: theme.colors.primary }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-white p-2 rounded-lg hover:opacity-80 cursor-pointer"
          aria-label={t('القائمة')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 shrink-0 cursor-pointer"
        >
          {logo ? (
            <img src={logo} alt={storeName} className="h-10 w-10 rounded-lg object-cover bg-white" />
          ) : (
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold text-white"
              style={{ background: theme.colors.primaryDark }}
            >
              {storeName.charAt(0)}
            </span>
          )}
          <div className="hidden sm:block text-right">
            <span className="block text-white font-bold leading-tight">{storeName}</span>
            <span className="block text-white/80 text-xs">{t(theme.copy.tagline)}</span>
          </div>
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex justify-center">
          <div className="relative w-full max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ابحث عن منتج...')}
              className="w-full rounded-full bg-white/95 text-gray-800 placeholder:text-gray-400 text-sm px-4 py-2.5 pl-10 focus:outline-none"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-1 shrink-0">
          {storeId && (
            <NotificationBell
              storeId={storeId}
              isLoggedIn={isLoggedIn}
              onRequireLogin={onLoginClick}
            />
          )}

          {onWishlistClick && (
            <button
              onClick={onWishlistClick}
              className="relative p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
aria-label={t('المفضلة')}
               title={t('المفضلة')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span
                  className="absolute -top-1 -left-1 h-5 min-w-5 px-1 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: theme.colors.accent, color: theme.colors.onPrimary }}
                >
                  {wishlistCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onCartClick}
            className="relative p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label={t('سلة التسوق')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: theme.colors.accent, color: theme.colors.onPrimary }}
              >
                {cartCount}
              </span>
            )}
          </button>

          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
                aria-label={t('حسابي')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); onProfileClick(); }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {t('ملفي الشخصي')}
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onOrdersClick(); }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {t('طلباتي')}
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onLogoutClick(); }}
                    className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    {t('تسجيل الخروج')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1 p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label={t('تسجيل الدخول')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
