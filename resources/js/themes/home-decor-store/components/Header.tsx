import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, X, User, LogOut, Package, Heart } from 'lucide-react';
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
  storeId?: string | number;
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
  storeId,
  onWishlistClick,
  wishlistCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-lg">


      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {logo ? (
              <img src={getImageUrl(logo)} alt={storeName} className="max-w-28 md:max-w-32 object-contain" />
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs md:text-base">🏠</span>
                </div>
                <h1 className="text-base md:text-xl font-serif font-bold text-amber-900 truncate max-w-24 md:max-w-none">{storeName}</h1>
              </div>
            )}
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pr-12 pl-4 py-3 border-2 border-amber-200 rounded-full focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white/80 backdrop-blur-sm text-amber-900 placeholder-amber-600/60"
                />
              </div>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* User Menu - Desktop Only */}
            {isLoggedIn ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200"
                >
                  <User className="w-5 h-5 text-amber-700" />
                  <span className="text-amber-800 font-medium">{userName}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-amber-100 py-2 z-50">
                    <button
                      onClick={() => {
                        onProfileClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-amber-800"
                    >
                      <User className="w-4 h-4" />
                      <span>ملفي الشخصي</span>
                    </button>
                    <button
                      onClick={() => {
                        onOrdersClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-amber-800"
                    >
                      <Package className="w-4 h-4" />
                      <span>طلباتي</span>
                    </button>
                    <hr className="my-2 border-amber-100" />
                    <button
                      onClick={() => {
                        onLogoutClick();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-amber-800 hover:bg-amber-100 rounded-lg"
              >
                <User className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            )}

            {/* Wishlist */}
            {onWishlistClick && (
              <button
                onClick={onWishlistClick}
                className="relative p-2 text-amber-700 hover:bg-amber-100 rounded-lg"
                aria-label="المفضلة"
                title="المفضلة"
              >
                <Heart className="w-5 h-5 md:w-6 md:h-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-amber-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {storeId && (
              <NotificationBell
                storeId={storeId}
                isLoggedIn={isLoggedIn}
                onRequireLogin={onLoginClick}
              />
            )}
            {/* Mobile Actions */}
            <div className="md:hidden flex items-center space-x-1">
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg"
              >
                <Search className="w-5 h-5" />
              </button>
              {isLoggedIn ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onCartClick}
                className="relative p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Cart Button - Desktop Only */}
            <button
              onClick={onCartClick}
              className="hidden md:block relative p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {isMobileSearchOpen && (
          <div className="md:hidden mt-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pr-12 pl-4 py-3 border-2 border-amber-200 rounded-full focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white/80 backdrop-blur-sm text-amber-900 placeholder-amber-600/60"
                autoFocus
              />
            </form>
          </div>
        )}

        {/* Mobile User Menu */}
        {isUserMenuOpen && isLoggedIn && (
          <div className="md:hidden absolute left-4 top-16 w-36 bg-white rounded-lg shadow-lg border border-amber-100 py-1 z-50">
            <button
              onClick={() => {
                onProfileClick();
                setIsUserMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-amber-800 text-sm"
            >
              <User className="w-4 h-4" />
              <span>ملفي الشخصي</span>
            </button>
            <button
              onClick={() => {
                onOrdersClick();
                setIsUserMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-amber-800 text-sm"
            >
              <Package className="w-4 h-4" />
              <span>طلباتي</span>
            </button>
            <hr className="my-1 border-amber-100" />
            <button
              onClick={() => {
                onLogoutClick();
                setIsUserMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-right hover:bg-amber-50 flex items-center space-x-2 text-red-600 text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}


      </div>
    </header>
  );
};