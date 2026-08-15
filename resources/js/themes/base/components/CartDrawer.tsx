import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { get_image_url } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { Button } from '@/components/ui/button';
import { formatStoreCurrency } from '@/utils/currency-helper';

interface BaseCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const BaseCartDrawer: React.FC<BaseCartDrawerProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, quantity);
    }
  };

  const formatPrice = (amount: number) => {
    return formatCurrency(amount, { currency: 'ILS', locale: 'he-IL' });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out',
          'flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('Shopping Cart')} ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t('Close cart')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 11" />
              </svg>
              <p className="text-gray-500 text-center mb-2">{t('Your cart is empty')}</p>
              <p className="text-gray-400 text-sm text-center">{t('Add some products to get started')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(Object.entries(items)).map(([productId, item]) => (
                <div key={productId} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={get_image_url(item.cover_image) || '/images/placeholder-product.png'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.variant && (
                      <div className="absolute top-1 right-1 text-xs bg-black/50 text-white px-1 py-0.5 rounded">
                        {item.variant}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatStoreCurrency(item.price)} × {item.quantity}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleQuantityChange(productId, item.quantity - 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        aria-label={t('Decrease quantity')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(productId, item.quantity + 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        aria-label={t('Increase quantity')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(productId)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    aria-label={t('Remove item')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v12a1 1 0 01-1 1h2a1 1 0 001-1V7H5a1 1 0 01-1-1V4a1 1 0 011-1h14a1 1 0 011 1v3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('Subtotal')}</span>
              <span className="font-medium text-gray-900">
                {formatStoreCurrency(total, { currency: 'ILS', locale: 'he-IL' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('Shipping')}</span>
              <span className="font-medium text-gray-900">
                {t('Calculated at checkout')}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>{t('Total')}</span>
              <span className="text-gray-900">
                {formatStoreCurrency(total, { currency: 'ILS', locale: 'he-IL' })}
              </span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {}}
              style={{ backgroundColor: 'var(--theme-color)' }}
            >
              {t('Proceed to Checkout')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={clearCart}
            >
              {t('Clear Cart')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseCartDrawer;