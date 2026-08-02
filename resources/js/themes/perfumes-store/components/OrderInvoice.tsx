import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Package, Calendar, Receipt, MapPin, Download, Printer, User, Wrench, DollarSign } from 'lucide-react';

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
        return 'bg-green-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'processing':
        return 'bg-blue-600 text-white';
      case 'cancelled':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <>
      <Head title={`فاتورة الطلب - ${orderNumber}`} />
      
      <div className="min-h-screen bg-slate-900 py-4 md:py-8 print:bg-white print:py-0 print:font-sans">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Header */}
          <div className="bg-slate-800 border-2 border-amber-600 p-4 sm:p-6 mb-6 print:bg-white print:border-gray-300 print:border print:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white print:text-gray-900 print:font-bold print:text-2xl">فاتورة الطلب</h1>
                    <p className="text-amber-400 font-bold print:text-gray-700 print:font-semibold print:text-base">#{orderNumber}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-2 transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm"
                >
                  <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 sm:px-4 sm:py-2 transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">تحميل PDF</span>
                </button>
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-black border border-slate-700 p-3 sm:p-4 mb-6 print:bg-gray-50 print:border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className={`px-3 py-2 text-xs sm:text-sm font-bold w-fit ${getStatusColor(order.status)} print:bg-gray-200 print:text-gray-800`}>
                    {order.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-slate-300 print:text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm print:text-gray-800">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-400 print:text-gray-900">
                  {formatCurrency(order.total, storeSettings, currencies)}
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4">
              <div className="bg-slate-900 border border-slate-700 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base print:text-gray-900 print:font-semibold print:text-sm">معلومات العميل</h3>
                </div>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div><span className="text-slate-400 font-bold print:text-gray-600">الاسم:</span> <span className="text-white print:text-gray-900">{order.customer.name}</span></div>
                  <div><span className="text-slate-400 font-bold print:text-gray-600">البريد الإلكتروني:</span> <span className="text-white break-all print:text-gray-900">{order.customer.email}</span></div>
                  <div><span className="text-slate-400 font-bold print:text-gray-600">الهاتف:</span> <span className="text-white print:text-gray-900">{order.customer.phone}</span></div>
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-700 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base print:text-gray-900 print:font-semibold print:text-sm">عنوان الشحن</h3>
                </div>
                <div className="text-xs sm:text-sm text-white leading-relaxed print:text-gray-900">
                  <p className="font-bold mb-1">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}, {order.shipping_address.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-slate-800 border-2 border-slate-700 p-4 sm:p-6 mb-6 print:bg-white print:border-gray-300 print:border">
            <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-slate-700 pb-2">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base sm:text-lg print:text-gray-900 print:font-semibold print:text-base">منتجات الطلب ({order.items.length})</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {order.items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                
                return (
                  <div key={index} className="bg-black border border-slate-700 p-3 sm:p-4 print:bg-gray-50 print:border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm sm:text-base mb-1 print:text-gray-900 print:font-medium print:text-sm">{item.name}</h4>
                        {variants && Object.keys(variants).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(variants).map(([key, value], idx) => (
                              <span key={key} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold print:bg-gray-200 print:text-gray-800">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-slate-800 p-2 text-center border border-slate-600">
                            <div className="text-slate-400 font-bold print:text-gray-600">الكمية</div>
                            <div className="text-white font-bold print:text-gray-900">{item.quantity}</div>
                          </div>
                          <div className="bg-slate-800 p-2 text-center border border-slate-600">
                            <div className="text-slate-400 font-bold print:text-gray-600">السعر</div>
                            <div className="text-white font-bold print:text-gray-900">{formatCurrency(item.price, storeSettings, currencies)}</div>
                          </div>
                          {item.tax_amount > 0 && (
                            <div className="bg-slate-800 p-2 text-center border border-slate-600">
                              <div className="text-slate-400 font-bold print:text-gray-600">الضريبة</div>
                              <div className="text-white font-bold print:text-gray-900">{formatCurrency(item.tax_amount, storeSettings, currencies)}</div>
                            </div>
                          )}
                          <div className="bg-amber-600 p-2 text-center print:bg-gray-800">
                            <div className="text-white font-bold">الإجمالي</div>
                            <div className="text-white font-bold">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-black border-2 border-amber-600 p-4 sm:p-6 print:bg-white print:border-gray-300 print:border">
            <div className="bg-amber-600 text-white p-2 sm:p-3 mb-4 text-center print:bg-gray-800 print:text-white print:font-semibold print:text-base">
              <h3 className="font-bold text-sm sm:text-base">ملخص الدفع</h3>
            </div>
            <div className="bg-slate-800 p-3 sm:p-4 print:bg-gray-50 print:border print:border-gray-200">
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400 font-bold print:text-gray-600 print:font-medium print:text-sm">المجموع الفرعي</span>
                  <span className="text-white font-bold print:text-gray-900 print:font-medium print:text-sm">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-700 text-green-400">
                    <span className="font-bold">خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                    <span className="font-bold">-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400 font-bold">الضريبة</span>
                  <span className="text-white font-bold">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400 font-bold">الشحن</span>
                  <span className="text-white font-bold">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="bg-amber-600 p-3 flex justify-between items-center text-white print:bg-gray-800 print:font-bold print:text-base">
                  <span className="font-bold text-sm sm:text-base print:font-bold print:text-base">الإجمالي</span>
                  <span className="font-bold text-lg sm:text-xl print:font-bold print:text-lg">{formatCurrency(order.total, storeSettings, currencies)}</span>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between py-2 mt-3 border-t border-slate-700">
                    <span className="text-slate-400 font-bold">طريقة الدفع</span>
                    <span className="bg-slate-700 text-white px-2 py-1 font-bold">{order.payment_method}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8">
            <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 print:bg-white print:border-gray-200">
              <h4 className="font-bold text-white mb-2 text-sm sm:text-base print:text-gray-900 print:font-semibold print:text-sm">تمت معالجة الطلب بنجاح</h4>
              <p className="text-slate-300 text-xs sm:text-sm mb-1 print:text-gray-600 print:font-normal print:text-sm">شكراً لاختيارك منتجاتنا الفاخرة</p>
              <p className="text-slate-300 text-xs sm:text-sm print:text-gray-600 print:font-normal print:text-sm">للدعم تواصل مع فريق خدمة العملاء</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};