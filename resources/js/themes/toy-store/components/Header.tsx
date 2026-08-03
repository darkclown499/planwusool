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
  wishlistCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <header className="bg-white shadow-lg border-b-4 border-purple-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex-shrink-0">
              {logo ? (
                <img 
                  className="max-w-28 md:max-w-32 object-contain" 
                  src={getImageUrl(logo)} 
                  alt={storeName}
                />
              ) : (
                <div className="text-xl md:text-2xl font-bold text-purple-600 tracking-tight truncate max-w-32 md:max-w-none">
                  {storeName}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="block w-full pr-10 pl-3 py-3 border-2 border-blue-200 rounded-full leading-5 bg-blue-50 placeholder-blue-400 focus:outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 text-gray-900"
                placeholder="ابحث عن المنتجات..."
              />
            </form>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Wishlist */}
            {onWishlistClick && (
              <button
                onClick={onWishlistClick}
                className="relative p-3 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition-colors duration-200"
                aria-label="المفضلة"
              >
                <Heart className="h-6 w-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-3 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition-colors duration-200"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-green-400 text-purple-800 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                >
                  <User className="h-6 w-6" />
                  <span className="text-sm font-medium">{userName || 'حسابي'}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border-2 border-purple-100 py-2 z-50">
                    <button
                      onClick={() => {
                        onProfileClick();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <User className="h-4 w-4 ml-3" />
                      ملفي الشخصي
                    </button>
                    <button
                      onClick={() => {
                        onOrdersClick();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <Package className="h-4 w-4 ml-3" />
                      طلباتي
                    </button>
                    <hr className="my-2 border-purple-100" />
                    <button
                      onClick={() => {
                        onLogoutClick();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                    >
                      <LogOut className="h-4 w-4 ml-3" />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full font-medium transition-colors duration-200"
              >
                تسجيل الدخول
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {onWishlistClick && (
              <button
                onClick={onWishlistClick}
                className="relative p-2 text-purple-600 hover:text-purple-800"
                aria-label="المفضلة"
              >
                <Heart className="h-6 w-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 text-purple-600 hover:text-purple-800"
            >
              <Search className="h-6 w-6" />
            </button>
            
            <button
              onClick={onCartClick}
              className="relative p-2 text-purple-600 hover:text-purple-800"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-green-400 text-purple-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            
            {isLoggedIn ? (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-purple-600 hover:text-purple-800"
              >
                <User className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="p-2 text-purple-600 hover:text-purple-800"
              >
                <User className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        {showMobileSearch && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="block w-full pr-10 pl-3 py-3 border-2 border-blue-200 rounded-full leading-5 bg-blue-50 placeholder-blue-400 focus:outline-none focus:bg-white focus:border-purple-400 text-gray-900"
                placeholder="ابحث عن المنتجات..."
                autoFocus
              />
            </form>
          </div>
        )}
      </div>

      {/* Mobile User Menu */}
      {showMobileMenu && isLoggedIn && (
        <div className="md:hidden absolute left-4 top-16 w-48 bg-white shadow-lg border-2 border-purple-100 py-2 z-50">
          <button
            onClick={() => {
              onProfileClick();
              setShowMobileMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            <User className="h-4 w-4 ml-3" />
            ملفي الشخصي
          </button>
          <button
            onClick={() => {
              onOrdersClick();
              setShowMobileMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            <Package className="h-4 w-4 ml-3" />
            طلباتي
          </button>
          <hr className="my-2 border-purple-100" />
          <button
            onClick={() => {
              onLogoutClick();
              setShowMobileMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
          >
            <LogOut className="h-4 w-4 ml-3" />
            تسجيل الخروج
          </button>
        </div>
      )}
    </header>
  );
};