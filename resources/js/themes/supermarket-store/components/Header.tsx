import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Heart } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { NotificationBell } from '../../../components/storefront/NotificationBell';

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
  onWishlistClick,
  wishlistCount = 0,
  storeId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <>
      {/* Main Header */}
      <header className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center">
                {logo ? (
                  <img 
                    src={getImageUrl(logo)} 
                    alt="شعار المتجر" 
                    className="max-w-28 md:max-w-32 object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs md:text-lg font-bold">🛒</span>
                  </div>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن المنتجات..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      onSearch(e.target.value);
                    }}
                    className="w-full pr-12 pl-4 py-3 border-2 border-green-200 rounded-full focus:outline-none focus:border-green-500 text-gray-700"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
                  <button
                    type="submit"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition-colors"
                  >
                    بحث
                  </button>
                </div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Mobile Search */}
              <button 
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>

              {/* Wishlist */}
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
                  className="relative p-2 md:p-3 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                  aria-label="المفضلة"
                >
                  <Heart className="w-5 h-5 md:w-6 md:h-6 text-green-700" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -left-1 md:-top-2 md:-left-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cart */}
              <button
                onClick={onCartClick}
                className="relative p-2 md:p-3 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-green-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 md:-top-2 md:-left-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* User Menu - Desktop Only */}
              <div className="relative hidden md:block">
                {isLoggedIn ? (
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">مرحباً،</p>
                      <p className="text-sm text-green-600 font-semibold">{userName}</p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={onLoginClick}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>تسجيل الدخول</span>
                  </button>
                )}

                {/* User Dropdown */}
                {showUserMenu && isLoggedIn && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                    <button
                      onClick={() => {
                        onProfileClick();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      ملفي الشخصي
                    </button>
                    <button
                      onClick={() => {
                        onOrdersClick();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      طلباتي
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        onLogoutClick();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {showMobileSearch && (
            <div className="md:hidden pb-3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن المنتجات..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      onSearch(e.target.value);
                    }}
                    className="w-full pr-9 pl-9 py-2.5 border border-green-200 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                    autoFocus
                  />
                  <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-green-500 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowMobileSearch(false)}
                    className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white w-80 h-full shadow-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">القائمة</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {isLoggedIn ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">مرحباً،</p>
                      <p className="text-green-600 font-semibold">{userName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onProfileClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-right p-3 hover:bg-gray-100 rounded-lg"
                  >
                    ملفي الشخصي
                  </button>
                  <button
                    onClick={() => {
                      onOrdersClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-right p-3 hover:bg-gray-100 rounded-lg"
                  >
                    طلباتي
                  </button>
                  <button
                    onClick={() => {
                      onLogoutClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-right p-3 hover:bg-gray-100 rounded-lg text-red-600"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onLoginClick();
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};