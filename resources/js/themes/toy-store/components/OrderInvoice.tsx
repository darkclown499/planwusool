import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Package, Calendar, MapPin, Download, Printer, Star } from 'lucide-react';

interface OrderInvoiceProps {
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
      image: string;
      variants?: any;
      tax_amount?: number;
      tax_name?: string;
      tax_percentage?: string;
    }>;
  };
}

export const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderNumber, order }) => {
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.location.href = route('store.order.pdf', { 
      storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
      orderNumber 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Head title={`فاتورة الطلب - ${orderNumber}`} />
      
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-3xl mx-auto px-4">
          
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">فاتورة الطلب</h1>
                  <p className="text-purple-600 font-medium text-sm md:text-base">الطلب رقم #{orderNumber}</p>
                </div>
              </div>
              <div className="flex gap-2 md:gap-3 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 md:px-4 md:py-2 rounded-xl transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تحميل PDF</span>
                </button>
              </div>
            </div>

            {/* Status & Date */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-gray-50 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit ${getStatusColor(order.status)}`}>
                  {order.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 text-gray-600 text-sm md:text-base">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(order.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-lg md:text-xl font-bold text-purple-600">
                {formatCurrency(order.total, storeSettings, currencies)}
              </div>
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h3 className="font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <Package className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                معلومات العميل
              </h3>
              <div className="space-y-2 text-xs md:text-sm">
                <p><span className="text-gray-500">الاسم:</span> <span className="font-medium break-words">{order.customer.name}</span></p>
                <p><span className="text-gray-500">البريد الإلكتروني:</span> <span className="font-medium break-all">{order.customer.email}</span></p>
                <p><span className="text-gray-500">الهاتف:</span> <span className="font-medium">{order.customer.phone}</span></p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h3 className="font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                عنوان الشحن
              </h3>
              <div className="text-xs md:text-sm text-gray-600">
                <p className="font-medium text-gray-900 break-words">{order.shipping_address.name}</p>
                <p className="break-words">{order.shipping_address.address}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                <p>{order.shipping_address.postal_code}, {order.shipping_address.country}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="font-bold text-gray-900 text-base md:text-lg mb-3 md:mb-4">منتجات الطلب ({order.items.length})</h3>
            <div className="space-y-3 md:space-y-4">
              {order.items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                if (typeof item.variants === 'string') {
                  try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                }
                
                return (
                  <div key={index} className="border border-gray-200 rounded-xl p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm md:text-base break-words">{item.name.replace(/Edition: Standard/gi, '').trim()}</h4>
                        {variants && Object.keys(variants).length > 0 && (
                          <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                            {Object.entries(variants).map(([key, value], idx) => (
                              <span key={key} className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-gray-600">
                          <span>الكمية: {item.quantity}</span>
                          <span>{formatCurrency(item.price, storeSettings, currencies)} للقطعة</span>
                          {(item.tax_amount ?? 0) > 0 && (
                            <span>الضريبة: {formatCurrency(item.tax_amount ?? 0, storeSettings, currencies)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right sm:text-right">
                        <div className="font-bold text-gray-900 text-sm md:text-base">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="font-bold text-gray-900 text-base md:text-lg mb-3 md:mb-4">ملخص الطلب</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600 text-sm md:text-base">
                  <span className="break-words">خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                  <span className="font-medium">-{formatCurrency(order.discount ?? 0, storeSettings, currencies)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">الضريبة</span>
                <span className="font-medium">{formatCurrency(order.tax, storeSettings, currencies)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">الشحن</span>
                <span className="font-medium">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
              </div>
              <div className="border-t pt-2 md:pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-bold text-gray-900">الإجمالي</span>
                  <span className="text-lg md:text-xl font-bold text-purple-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                </div>
              </div>
              {order.payment_method && (
                <div className="border-t pt-2 md:pt-3">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">طريقة الدفع</span>
                    <span className="font-medium break-words">{order.payment_method}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thank You */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-purple-500 fill-current" />
            </div>
            <h4 className="font-bold text-gray-900 text-base md:text-lg mb-2">شكراً لك!</h4>
            <p className="text-gray-600 text-sm md:text-base">شكراً لطلبك. نأمل أن تستمتع بمشترياتك!</p>
          </div>
        </div>
      </div>
    </>
  );
};