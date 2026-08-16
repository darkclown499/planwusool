import React from 'react';
import { cn } from '@/lib/utils';
import { X, Package, Truck, MapPin, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatStoreCurrency } from '@/utils/currency-helper';
import { get_image_url } from '@/utils/image-helper';

interface OrderItem {
  product_name: string;
  quantity: number;
  total_price: number;
  product?: { cover_image?: string };
}

interface Order {
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  payment_method?: string;
  created_at: string;
  items: OrderItem[];
}

interface BaseOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  onDownloadPdf?: (orderNumber: string) => void;
  className?: string;
  isLoading?: boolean;
}

export const BaseOrderDetailsModal: React.FC<BaseOrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onDownloadPdf,
  className,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-green-100 text-green-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      failed: 'bg-red-100 text-red-700',
      paid: 'bg-green-100 text-green-700',
    };
    return map[status.toLowerCase()] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
        <div className={cn('relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden', className)}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">{t('Order Details')}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('Close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading || !order ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-gray-300 mb-4" />
                <p className="text-gray-500">{t('Loading order...')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusColor(order.status))}>
                      {t(order.status)}
                    </span>
                    {order.payment_status === 'paid' && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('Paid')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('Items')}</h4>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={get_image_url(item.product?.cover_image) || '/images/placeholder-product.png'}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-500">
                            {t('Qty')}: {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-gray-900">{formatStoreCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping info */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                  <Truck className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{t('Shipping Address')}</h4>
                    <p className="text-sm text-gray-600">{order.shipping_address}</p>
                    {order.shipping_city && <p className="text-sm text-gray-600">{order.shipping_city}</p>}
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{t('Payment Method')}</h4>
                    <p className="text-sm text-gray-600">{order.payment_method || '-'}</p>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('Subtotal')}</span>
                    <span>{formatStoreCurrency(order.subtotal)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('Discount')}</span>
                      <span>-{formatStoreCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('Shipping')}</span>
                    <span>{formatStoreCurrency(order.shipping_amount)}</span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('Tax')}</span>
                      <span>{formatStoreCurrency(order.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>{t('Total')}</span>
                    <span>{formatStoreCurrency(order.total_amount)}</span>
                  </div>
                </div>

                {/* Actions */}
                {onDownloadPdf && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => onDownloadPdf(order.order_number)}
                      style={{ backgroundColor: 'var(--theme-color)' }}
                    >
                      {t('Download Invoice')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseOrderDetailsModal;
