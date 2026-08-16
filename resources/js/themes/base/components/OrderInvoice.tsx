import React from 'react';
import { cn } from '@/lib/utils';
import { Printer, Download, X, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatStoreCurrency } from '@/utils/currency-helper';
import { get_image_url } from '@/utils/image-helper';

interface Invoice {
  id: string;
  date: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  currency: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
}

interface BaseOrderInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  className?: string;
}

export const BaseOrderInvoice: React.FC<BaseOrderInvoiceProps> = ({
  isOpen,
  onClose,
  invoice,
  onDownloadPdf,
  onPrint,
  className,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative min-h-full flex items-start justify-center p-4">
        <div className={cn('relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden', className)}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t('Invoice')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('Close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Invoice body */}
          <div className="p-6 lg:p-10 print:p-0">
            {/* Store header */}
            <div className="flex flex-wrap items-center justify-between gap-6 border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: 'var(--theme-color)' }}
                >
                  {invoice.id?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t('Invoice')}</h3>
                  <p className="text-sm text-gray-500">{invoice.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('Date')}</p>
                <p className="font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Customer & shipping */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('Bill To')}</h4>
                {invoice.customer?.name && <p className="text-sm text-gray-600">{invoice.customer.name}</p>}
                {invoice.customer?.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p className="text-sm text-gray-600">{invoice.customer.phone}</p>}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('Ship To')}</h4>
                {invoice.shipping_address?.address && (
                  <p className="text-sm text-gray-600">{invoice.shipping_address.address}</p>
                )}
                {invoice.shipping_address?.city && (
                  <p className="text-sm text-gray-600">{invoice.shipping_address.city}</p>
                )}
                {invoice.shipping_address?.country && (
                  <p className="text-sm text-gray-600">{invoice.shipping_address.country}</p>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-start py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{t('Item')}</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{t('Qty')}</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{t('Price')}</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{t('Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={get_image_url(item.image) || '/images/placeholder-product.png'}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-sm">{item.quantity}</td>
                      <td className="text-right py-3 px-2 text-sm">{formatStoreCurrency(item.price)}</td>
                      <td className="text-right py-3 px-2 text-sm font-medium">{formatStoreCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('Subtotal')}</span>
                <span>{formatStoreCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('Discount')}</span>
                  <span>-{formatStoreCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('Shipping')}</span>
                <span>{formatStoreCurrency(invoice.shipping)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Tax')}</span>
                  <span>{formatStoreCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>{t('Total')}</span>
                <span>{formatStoreCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 print:hidden">
            {onPrint && (
              <Button variant="outline" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('Print')}
              </Button>
            )}
            {onDownloadPdf && (
              <Button onClick={onDownloadPdf} style={{ backgroundColor: 'var(--theme-color)' }}>
                <Download className="h-4 w-4 mr-2" />
                {t('Download PDF')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseOrderInvoice;
