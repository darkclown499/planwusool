import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { Printer, Download, X, Home, Package, Truck, CreditCard, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface UnifiedInvoiceProps {
  orderNumber: string;
  order: {
    id: string;
    date: string;
    status: string;
    total: number;
    subtotal: number;
    tax: number;
    shipping: number;
    discount?: number;
    coupon?: string;
    currency: string;
    payment_method?: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    shipping_address: {
      name: string;
      address: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      image?: string;
      variants?: any;
      tax_amount?: number;
      tax_name?: string;
      tax_percentage?: string;
    }>;
  };
  config?: any;
  store?: any;
  storeSettings?: any;
}

const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'processing': 'bg-blue-100 text-blue-800 border-blue-200',
  'shipped': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'delivered': 'bg-green-100 text-green-800 border-green-200',
  'completed': 'bg-green-100 text-green-800 border-green-200',
  'cancelled': 'bg-red-100 text-red-800 border-red-200',
  'refunded': 'bg-purple-100 text-purple-800 border-purple-200',
  'failed': 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  'pending': <AlertCircle className="h-4 w-4" />,
  'processing': <Package className="h-4 w-4" />,
  'shipped': <Truck className="h-4 w-4" />,
  'delivered': <Home className="h-4 w-4" />,
  'completed': <Home className="h-4 w-4" />,
  'cancelled': <X className="h-4 w-4" />,
  'refunded': <CreditCard className="h-4 w-4" />,
  'failed': <AlertCircle className="h-4 w-4" />,
};

export const UnifiedInvoice: React.FC<UnifiedInvoiceProps> = ({ 
  orderNumber, 
  order, 
  config, 
  store, 
  storeSettings 
}) => {
  const { t } = useTranslation();
  
  const settings = storeSettings || (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  const storeConfig = config || (window as any).page?.props?.config || {};
  const storeData = store || (window as any).page?.props?.store || {};
  
  const storeName = storeConfig?.storeName || storeData?.name || 'متجري';
  const storeLogo = storeConfig?.logo || storeData?.logo;
  const storePhone = storeConfig?.phoneNumber || settings?.phone || '';
  const storeEmail = storeConfig?.email || storeData?.email || '';
  const storeAddress = storeConfig?.address || settings?.address || '';
  
  const statusColor = statusColors[order.status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  const statusIcon = statusIcons[order.status?.toLowerCase()] || <AlertCircle className="h-4 w-4" />;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const storeSlug = storeData?.slug || 'demo';
    window.location.href = route('store.order.pdf', { storeSlug, orderNumber });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Head title={`${t('Order Invoice')} - ${orderNumber}`} />
      
      <div className="min-h-screen bg-gray-50 py-4 md:py-8 print:bg-white print:py-0">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                {storeLogo ? (
                  <img 
                    src={getImageUrl(storeLogo)} 
                    alt={storeName} 
                    className="h-16 w-16 rounded-xl object-cover bg-gray-100"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'var(--twc-primary-600, #059669)' }}>
                    {storeName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('Order Invoice')}</h1>
                  <p className="text-gray-600 text-sm md:text-base">{storeName}</p>
                  {storePhone && <p className="text-gray-500 text-xs md:text-sm">{storePhone}</p>}
                  {storeEmail && <p className="text-gray-500 text-xs md:text-sm break-all">{storeEmail}</p>}
                </div>
              </div>
              <div className="flex gap-2 md:gap-3 flex-wrap justify-end print:hidden">
                <button
                  onClick={handlePrint}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm md:text-base',
                    'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  )}
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('Print')}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm md:text-base',
                    'bg-primary-600 hover:bg-primary-700 text-white border border-primary-600'
                  )}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('Download PDF')}</span>
                </button>
              </div>
            </div>

            {/* Order Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium" style={{ background: statusColor.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', 'border-') }}>
                  {statusIcon}
                  <span className="capitalize">{t(order.status) || order.status}</span>
                </div>
                <div className="text-gray-600 text-sm">
                  <span className="font-medium text-gray-700">{t('Date')}:</span> {formatDate(order.date)}
                </div>
              </div>
              <div className="text-sm text-right">
                <span className="text-gray-600">{t('Order Number')}:</span> <span className="font-semibold text-gray-900 ml-2">{order.id}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--twc-primary-100, #d1fae5)' }}>
                  <Home className="h-4 w-4" style={{ color: 'var(--twc-primary-600, #059669)' }} />
                </span>
                {t('Customer Information')}
              </h3>
              <div className="text-gray-600 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="font-medium text-gray-700 w-28 shrink-0">{t('Name')}:</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-medium text-gray-700 w-28 shrink-0">{t('Email')}:</span>
                  <span className="break-all">{order.customer.email}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-medium text-gray-700 w-28 shrink-0">{t('Phone')}:</span>
                  <span>{order.customer.phone}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--twc-primary-100, #d1fae5)' }}>
                  <Truck className="h-4 w-4" style={{ color: 'var(--twc-primary-600, #059669)' }} />
                </span>
                {t('Shipping Address')}
              </h3>
              <div className="text-gray-600 space-y-2 text-sm">
                <p className="font-medium text-gray-700">{order.shipping_address.name}</p>
                <p>{order.shipping_address.address}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6 border border-gray-100 mt-4 md:mt-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--twc-primary-100, #d1fae5)' }}>
                <Package className="h-4 w-4" style={{ color: 'var(--twc-primary-600, #059669)' }} />
              </span>
              {t('Order Items')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">{t('Product')}</th>
                    <th className="text-center py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">{t('Qty')}</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">{t('Price')}</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">{t('Tax')}</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">{t('Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 md:py-4 px-2 md:px-4">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.name}
                                className="h-12 w-12 rounded-lg object-cover bg-gray-100"
                              />
                            )}
                            <div className="min-w-0">
                              <h4 className="font-medium text-gray-900 text-xs md:text-sm leading-tight truncate">{item.name}</h4>
                              {(() => {
                                let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                                if (typeof item.variants === 'string') {
                                  try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                                }
                                return variants && Object.keys(variants).length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                                    {Object.entries(variants).map(([key, value], idx) => (
                                      <span key={key} className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                        {key}: {value}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-center text-gray-600 text-xs md:text-sm">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded border border-gray-200 bg-white">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 text-xs md:text-sm">
                          {formatCurrency(item.price, settings, currencies)}
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 text-xs md:text-sm">
                          <div>{formatCurrency(item.tax_amount || 0, settings, currencies)}</div>
                          <div className="text-[10px] text-gray-400">
                            {item.tax_name || t('Tax')} {item.tax_percentage ? `(${item.tax_percentage}%)` : ''}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right font-semibold text-gray-900 text-xs md:text-sm">
                          {formatCurrency(itemTotalWithTax, settings, currencies)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--twc-primary-100, #d1fae5)' }}>
                  <CreditCard className="h-4 w-4" style={{ color: 'var(--twc-primary-600, #059669)' }} />
                </span>
                {t('Order Summary')}
              </h3>
              <div className="space-y-2 md:space-y-3 max-w-md mx-auto lg:mx-0">
                <div className="flex justify-between text-sm md:text-base py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('Subtotal')}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.subtotal, settings, currencies)}</span>
                </div>
                
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 text-sm md:text-base py-2 border-b border-gray-100">
                    <span className="flex items-center gap-1.5">
                      <span className="text-green-600">-</span>
                      {t('Discount')} {order.coupon && `(${order.coupon})`}
                    </span>
                    <span className="font-medium">-{formatCurrency(order.discount ?? 0, settings, currencies)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm md:text-base py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('Tax')}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.tax, settings, currencies)}</span>
                </div>
                
                <div className="flex justify-between text-sm md:text-base py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('Shipping')}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.shipping, settings, currencies)}</span>
                </div>
                
                <div className="border-t pt-3 border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-base md:text-lg font-semibold text-gray-900">{t('Total')}</span>
                    <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                      {formatCurrency(order.total, settings, currencies)}
                    </span>
                  </div>
                </div>
                
                {order.payment_method && (
                  <div className="border-t pt-3 border-gray-200 mt-2">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-gray-600 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t('Payment Method')}
                      </span>
                      <span className="text-gray-900 font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm print:mt-4">
            <p className="font-medium text-gray-700 mb-1">{t('Thank you for your order!')}</p>
            <p>{t('If you have any questions, please contact our support team.')}</p>
            {storeAddress && <p className="mt-2">{storeAddress}</p>}
            <p className="mt-4 text-xs text-gray-400">{t('This is a computer-generated invoice and does not require a signature.')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UnifiedInvoice;