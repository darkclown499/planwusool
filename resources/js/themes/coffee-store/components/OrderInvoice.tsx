import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Package, Calendar, Receipt, MapPin, Download, Printer } from 'lucide-react';

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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-stone-100 text-amber-800 border-stone-200';
    }
  };

  return (
    <>
      <Head title={`فاتورة الطلب - ${orderNumber}`} />
      
      <div className="min-h-screen bg-stone-50 py-4 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-amber-700 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-amber-900">فاتورة الطلب</h1>
                    <p className="text-amber-600">#{orderNumber}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-stone-100 hover:bg-stone-200 text-amber-700 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 font-serif font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 font-serif font-semibold"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تحميل PDF</span>
                </button>
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-stone-50 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <span className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border-2 ${getStatusColor(order.status)} w-fit`}>
                    {order.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-amber-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-serif font-bold text-amber-900">
                  {formatCurrency(order.total, storeSettings, currencies)}
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Receipt className="w-5 h-5 text-amber-700" />
                  <h3 className="font-serif font-bold text-amber-900">معلومات العميل</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-amber-700">الاسم:</span> {order.customer.name}</p>
                  <p><span className="font-semibold text-amber-700">البريد الإلكتروني:</span> <span className="break-all">{order.customer.email}</span></p>
                  <p><span className="font-semibold text-amber-700">الهاتف:</span> {order.customer.phone}</p>
                </div>
              </div>
              
              <div className="bg-stone-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-amber-700" />
                  <h3 className="font-serif font-bold text-amber-900">عنوان الشحن</h3>
                </div>
                <div className="text-sm text-amber-600 leading-relaxed">
                  <p className="font-semibold text-amber-900 mb-1">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}، {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}، {order.shipping_address.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-amber-700" />
              <h3 className="font-serif font-bold text-amber-900 text-lg">منتجات الطلب ({order.items.length})</h3>
            </div>
            
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                const variants: Record<string, any> = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                
                return (
                  <div key={index} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-serif font-semibold text-amber-900 mb-1">{item.name}</h4>
                        {variants && Object.keys(variants).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(variants).map(([key, value], idx) => (
                              <span key={key} className="bg-stone-200 px-2 py-1 rounded text-xs text-amber-700">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-amber-600">
                          <span className="bg-amber-700 text-white px-2 py-1 rounded font-medium">الكمية: {item.quantity}</span>
                          <span>{formatCurrency(item.price, storeSettings, currencies)}</span>
                          {(item.tax_amount ?? 0) > 0 && (
                            <span>الضريبة: {formatCurrency(item.tax_amount ?? 0, storeSettings, currencies)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-amber-900">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-200">
            <h3 className="font-serif font-bold text-amber-900 text-lg mb-6">ملخص الطلب</h3>
            <div className="bg-stone-50 rounded-xl p-5">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-amber-600">المجموع الفرعي</span>
                  <span className="font-semibold">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                    <span className="font-semibold">-{formatCurrency(order.discount ?? 0, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-amber-600">الضريبة</span>
                  <span className="font-semibold">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">الشحن</span>
                  <span className="font-semibold">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="border-t-2 border-stone-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-serif font-bold text-amber-900">الإجمالي</span>
                    <span className="text-2xl font-serif font-bold text-amber-700">{formatCurrency(order.total, storeSettings, currencies)}</span>
                  </div>
                </div>
                {order.payment_method && (
                  <div className="border-t border-stone-300 pt-4">
                    <div className="flex justify-between">
                      <span className="text-amber-600">طريقة الدفع</span>
                      <span className="bg-amber-700 text-white px-3 py-1 rounded-lg font-medium">{order.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-amber-600">
            <div className="bg-white rounded-2xl p-6 border border-stone-200">
              <h4 className="font-serif font-bold text-amber-900 mb-2">شكراً لتعاملك معنا!</h4>
              <p className="text-sm">نقدّر ثقتك ونتمنى أن تستمتع بمشروبك المفضل.</p>
              <p className="text-sm mt-1">لأي استفسارات أو دعم، يرجى التواصل مع فريق خدمة العملاء لدينا.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};