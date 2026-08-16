import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Package, ChevronRight, Loader2, PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatStoreCurrency } from '@/utils/currency-helper';

interface Order {
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; total_price: number }>;
}

interface BaseMyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOrder?: (orderNumber: string) => void;
  orders?: Order[];
  className?: string;
  isLoading?: boolean;
}

export const BaseMyOrdersModal: React.FC<BaseMyOrdersModalProps> = ({
  isOpen,
  onClose,
  onViewOrder,
  orders = [],
  className,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('Pending'),
      processing: t('Processing'),
      confirmed: t('Confirmed'),
      shipped: t('Shipped'),
      delivered: t('Delivered'),
      cancelled: t('Cancelled'),
      failed: t('Failed'),
    };
    return labels[status.toLowerCase()] || status;
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-green-100 text-green-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
        <div className={cn('relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden', className)}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t('My Orders')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('Close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-gray-300 mb-4" />
                <p className="text-gray-500">{t('Loading your orders...')}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackageOpen className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('No orders yet')}</h3>
                <p className="text-gray-500">{t('When you place an order, it will appear here')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <button
                    key={order.order_number}
                    onClick={() => onViewOrder && onViewOrder(order.order_number)}
                    className="w-full text-start bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{order.order_number}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusColor(order.status))}>
                        {statusLabel(order.status)}
                      </span>
                      <span className="font-semibold text-gray-900">{formatStoreCurrency(order.total_amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseMyOrdersModal;
