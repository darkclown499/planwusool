import React from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, ShoppingCart, Search, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface BaseHeaderProps {
  brandColor?: string;
  storeName?: string;
  logo?: string;
  showSearch?: boolean;
  showCart?: boolean;
  showUserMenu?: boolean;
  className?: string;
}

export const BaseHeader: React.FC<BaseHeaderProps> = ({
  brandColor = '#10b77f',
  storeName = 'Store',
  logo,
  showSearch = true,
  showCart = true,
  showUserMenu = true,
  className,
}) => {
  const { t } = useTranslation();
  const { config } = useStore();
  const { cartCount } = useCart();
  const { user, isLoggedIn, showLoginModal, showProfileModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = () => {
    // Implement search logic
    console.log('Search:', searchQuery);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200',
        'shadow-sm',
        className
      )}
      style={{ borderColor: 'var(--theme-color)' }}
    >
      {/* Top Bar - Mobile Search */}
      {showSearch && (
        <div
          className={cn(
            'lg:hidden px-4 py-2 bg-gray-50 border-b border-gray-100',
            searchOpen ? 'block' : 'hidden'
          )}
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={t('Search products...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="hidden lg:flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: 'var(--theme-color)' }}
            >
              {logo || storeName.charAt(0)}
            </div>
            <span className="text-lg font-bold text-gray-900">{storeName}</span>
          </a>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('Search products, categories...')}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {showSearch && (
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {showCart && (
            <button
              onClick={() => {}}
              className="relative p-2 text-gray-500 hover:text-gray-700"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          )}

          {showUserMenu && (
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showProfileModal(true)}
                    className="text-sm"
                  >
                    <User className="h-4 w-4 mr-1" />
                    {t('My Account')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showLoginModal(true)}
                  className="text-sm"
                >
                  <User className="h-4 w-4 mr-1" />
                  {t('Login')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn('lg:hidden px-4 py-3 border-t border-gray-100', mobileMenuOpen ? 'block' : 'hidden')}>
        <div className="flex flex-col gap-3">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('Search products...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            {showCart && (
              <button
                onClick={() => {}}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{t('Cart')}</span>
                {cartCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {showUserMenu && (
              <button
                onClick={() => isLoggedIn ? showProfileModal(true) : showLoginModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <User className="h-5 w-5" />
                <span>{isLoggedIn ? t('My Account') : t('Login')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default BaseHeader;