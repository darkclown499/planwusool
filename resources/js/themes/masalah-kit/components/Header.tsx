import React, { useState } from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';

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
  onMenuClick
}) => {
  const theme = useMasalahTheme();
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
          aria-label="القائمة"
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
            <span className="block text-white/80 text-xs">{theme.copy.tagline}</span>
          </div>
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex justify-center">
          <div className="relative w-full max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
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
          <button
            onClick={onCartClick}
            className="relative p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="سلة التسوق"
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
                aria-label="حسابي"
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
                    ملفي الشخصي
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onOrdersClick(); }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    طلباتي
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onLogoutClick(); }}
                    className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1 p-2 text-white rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="تسجيل الدخول"
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
