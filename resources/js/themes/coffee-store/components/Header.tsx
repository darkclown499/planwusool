import React, { useState } from 'react';
import { Search, ShoppingBag, User } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';

interface HeaderProps {
  storeName: string;
  logo?: string;
  onSearch: (query: string) => void;
  cartCount: number;
  onCartClick: () => void;
  onLoginClick: () => void;
  isLoggedIn: boolean;
  userName?: string;
  onProfileClick: () => void;
  onOrdersClick: () => void;
  onLogoutClick: () => void;
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
  onLogoutClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch);
    if (showMobileSearch) {
      setSearchQuery('');
      onSearch('');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-stone-50 border-b-2 border-stone-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              {logo ? (
                <img src={getImageUrl(logo)} alt={storeName} className="max-w-28 md:max-w-32 object-contain" />
              ) : (
                <h1 className="text-lg md:text-xl font-bold text-amber-900 font-serif truncate max-w-28 md:max-w-none">{storeName}</h1>
              )}
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="w-full relative">
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-4 pr-12 py-2 border-2 border-stone-300 focus:border-amber-500 focus:outline-none rounded-lg bg-white text-amber-900 placeholder-amber-600"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-600" />
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              {/* Cart */}
              <button
                onClick={onCartClick}
                className="relative p-3 text-amber-700 hover:text-amber-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              >
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-2 text-amber-700 hover:text-amber-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium">{userName}</span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-300 py-2 z-50">
                      <button
                        onClick={() => {
                          onProfileClick();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-right px-4 py-2 text-amber-800 hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        ملفي الشخصي
                      </button>
                      <button
                        onClick={() => {
                          onOrdersClick();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-right px-4 py-2 text-amber-800 hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        طلباتي
                      </button>
                      <hr className="my-2 border-stone-200" />
                      <button
                        onClick={() => {
                          onLogoutClick();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-right px-4 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 transition-colors rounded-lg font-medium cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2">
              {/* Mobile Search Icon */}
              <button
                onClick={toggleMobileSearch}
                className="p-2 text-amber-700 cursor-pointer"
              >
                <Search className="h-6 w-6" />
              </button>

              {/* Mobile Cart */}
              <button
                onClick={onCartClick}
                className="relative p-2 text-amber-700 cursor-pointer"
              >
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile User */}
              {isLoggedIn ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 text-amber-700 cursor-pointer"
                >
                  <User className="h-6 w-6" />
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="p-2 bg-amber-600 text-white rounded-lg cursor-pointer"
                >
                  <User className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-50 bg-stone-50 border-b-2 border-stone-300 px-4 py-3">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن المنتجات..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-4 pr-12 py-3 border-2 border-stone-300 focus:border-amber-500 focus:outline-none rounded-lg bg-white text-amber-900 placeholder-amber-600"
              autoFocus
            />
            <button
              onClick={toggleMobileSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobile User Menu */}
      {showUserMenu && isLoggedIn && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-50 bg-white border-b-2 border-stone-300 py-4">
          <div className="px-4 space-y-2">
            <button
              onClick={() => {
                onProfileClick();
                setShowUserMenu(false);
              }}
              className="w-full text-right px-4 py-3 text-amber-800 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
            >
              ملفي الشخصي
            </button>
            <button
              onClick={() => {
                onOrdersClick();
                setShowUserMenu(false);
              }}
              className="w-full text-right px-4 py-3 text-amber-800 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
            >
              طلباتي
            </button>
            <button
              onClick={() => {
                onLogoutClick();
                setShowUserMenu(false);
              }}
              className="w-full text-right px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </>
  );
};