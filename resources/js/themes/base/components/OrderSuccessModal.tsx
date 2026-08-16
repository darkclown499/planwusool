import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, X, Package, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BaseOrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber?: string;
  onViewOrder?: () => void;
  onContinueShopping?: () => void;
  className?: string;
}

export const BaseOrderSuccessModal: React.FC<BaseOrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  onViewOrder,
  onContinueShopping,
  className,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className={cn('relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center', className)}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={t('Close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('Order Placed Successfully!')}</h2>
        <p className="text-gray-500 mb-6">
          {t('Thank you for your order. We have received your order and will process it shortly.')}
        </p>

        {orderNumber && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">{t('Order Number')}</p>
            <p className="text-xl font-bold text-gray-900">{orderNumber}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {onViewOrder && (
            <Button
              className="w-full py-3"
              onClick={onViewOrder}
              style={{ backgroundColor: 'var(--theme-color)' }}
            >
              <Package className="h-4 w-4 mr-2" />
              {t('View My Order')}
            </Button>
          )}
          {onContinueShopping && (
            <Button variant="outline" className="w-full py-3" onClick={onContinueShopping}>
              <Home className="h-4 w-4 mr-2" />
              {t('Continue Shopping')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseOrderSuccessModal;
