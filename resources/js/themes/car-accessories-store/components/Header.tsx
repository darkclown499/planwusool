import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, Heart } from 'lucide-react';
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
  onWishlistClick?: () => void;
  wishlistCount?: number;
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
  onWishlistClick,
  wishlistCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="bg-slate-900 text-white shadow-2xl sticky top-0 z-50 border-b-2 border-red-600">
      {/* Racing stripe */}
      <div className="h-1 bg-red-600"></div>
      
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            {logo ? (
              <img className="max-w-28 md:max-w-32 object-contain" src={getImageUrl(logo)} alt={storeName} />
            ) : (
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 flex items-center justify-center ml-2 sm:ml-3 shadow-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <span className="text-base sm:text-lg font-bold text-white truncate max-w-24 sm:max-w-none">{storeName}</span>
              </div>
            )}
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:block flex-1 max-w-2xl mx-4 lg:mx-8">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full pl-4 pr-12 py-2 lg:py-3 bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Search className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="lg:hidden p-1 sm:p-2 text-slate-300 hover:text-red-400 transition-colors"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Wishlist */}
            {onWishlistClick && (
              <button
                onClick={onWishlistClick}
                className="relative p-1 sm:p-2 text-slate-300 hover:text-red-400 transition-colors"
                aria-label="المفضلة"
              >
                <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-600 text-white text-xs h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold shadow-lg">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-1 sm:p-2 text-slate-300 hover:text-red-400 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-600 text-white text-xs h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* User Menu - Desktop */}
            {isLoggedIn ? (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-slate-300 hover:text-red-400 transition-colors"
                >
                  <User className="w-6 h-6" />
                  <span className="text-sm font-medium max-w-20 truncate">{userName}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        onProfileClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <User className="w-4 h-4 ml-3" />
                      ملفي الشخصي
                    </button>
                    <button
                      onClick={() => {
                        onOrdersClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Package className="w-4 h-4 ml-3" />
                      طلباتي
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        onLogoutClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 ml-3" />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="hidden lg:flex items-center space-x-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all font-bold text-sm shadow-lg hover:shadow-xl"
              >
                <User className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            )}

            {/* Mobile User Icon */}
            {isLoggedIn ? (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="lg:hidden p-1 sm:p-2 text-slate-300 hover:text-red-400 transition-colors"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="lg:hidden p-1 sm:p-2 text-slate-300 hover:text-red-400 transition-colors"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}


          </div>
        </div>

        {/* Mobile Search - Only show when toggled */}
        {showMobileSearch && (
          <div className="lg:hidden pb-3 sm:pb-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2 sm:py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 sm:p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </form>
          </div>
        )}
      </div>



      {/* Mobile User Menu */}
      {isUserMenuOpen && isLoggedIn && (
        <div className="lg:hidden absolute left-4 top-16 w-40 bg-white shadow-lg border border-slate-200 py-2 z-50">
          <button
            onClick={() => {
              onProfileClick();
              setIsUserMenuOpen(false);
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <User className="w-4 h-4 ml-3" />
            ملفي الشخصي
          </button>
          <button
            onClick={() => {
              onOrdersClick();
              setIsUserMenuOpen(false);
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <Package className="w-4 h-4 ml-3" />
            طلباتي
          </button>
          <hr className="my-2" />
          <button
            onClick={() => {
              onLogoutClick();
              setIsUserMenuOpen(false);
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 ml-3" />
            تسجيل الخروج
          </button>
        </div>
      )}
    </header>
  );
};