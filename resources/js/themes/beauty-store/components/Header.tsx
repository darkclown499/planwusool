import React from 'react';
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showMobileSearch, setShowMobileSearch] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);

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
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-fuchsia-100">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              {logo ? (
                <img src={getImageUrl(logo)} alt={storeName} className="max-w-28 md:max-w-32 object-contain" />
              ) : (
                <h1 className="text-base md:text-xl font-serif font-bold text-gray-900 tracking-wide truncate max-w-28 md:max-w-none">{storeName}</h1>
              )}
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-300 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 md:gap-4">
              {/* Mobile Search */}
              <button 
                onClick={toggleMobileSearch}
                className="md:hidden p-2 text-gray-600 hover:text-fuchsia-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>



              {/* User Account */}
              {isLoggedIn ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-fuchsia-600 transition-colors"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-fuchsia-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="hidden md:inline">{userName || 'حسابي'}</span>
                    <svg className="w-3 h-3 md:w-4 md:h-4 hidden md:block rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                      <button
                        onClick={() => {
                          onProfileClick();
                          setShowDropdown(false);
                        }}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-fuchsia-50 hover:text-fuchsia-600 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        ملفي الشخصي
                      </button>
                      <button
                        onClick={() => {
                          onOrdersClick();
                          setShowDropdown(false);
                        }}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-fuchsia-50 hover:text-fuchsia-600 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                        </svg>
                        طلباتي
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          onLogoutClick();
                          setShowDropdown(false);
                        }}
                        className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l4-4m0 0l-4-4m4 4H9" />
                        </svg>
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={onLoginClick}
                  className="px-2 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-fuchsia-600 transition-colors"
                >
                  <span className="hidden md:inline">تسجيل الدخول</span>
                  <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              )}

              {/* Shopping Cart */}
              <button 
                onClick={onCartClick}
                className="relative p-1.5 md:p-2 text-gray-600 hover:text-fuchsia-600 transition-colors"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 md:-top-1 md:-left-1 bg-fuchsia-500 text-white text-xs rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="md:hidden fixed top-20 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ابحث عن المنتجات..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-10 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-300 focus:border-transparent focus:bg-white transition-all"
              autoFocus
            />
            <button 
              onClick={toggleMobileSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};