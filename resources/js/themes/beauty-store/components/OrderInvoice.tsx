import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '../../../utils/currency-formatter';

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

  return (
    <>
      <Head title={`فاتورة الطلب - ${orderNumber}`} />
      
      <div className="min-h-screen bg-fuchsia-50 py-4 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6 border-t-4 border-fuchsia-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
              <div className="mb-4 md:mb-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">فاتورة الطلب</h1>
                <p className="text-fuchsia-600 text-sm md:text-base font-medium">الطلب رقم #{orderNumber}</p>
              </div>
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={handlePrint}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-sm md:text-base print:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="hidden sm:inline">طباعة</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-sm md:text-base print:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            {/* Order Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-fuchsia-50 p-3 rounded-lg border border-fuchsia-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-fuchsia-700 font-semibold capitalize text-sm bg-fuchsia-100 px-2 py-1 rounded-full">{order.status}</span>
                </div>
                <div className="text-gray-600 text-sm">
                  <span className="font-medium">التاريخ:</span> {new Date(order.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">رقم الطلب:</span> <span className="font-semibold text-fuchsia-700">{order.id}</span>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-fuchsia-700 mb-3 text-base flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  معلومات العميل
                </h3>
                <div className="text-gray-600 space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">الاسم:</span> {order.customer.name}</p>
                  <p><span className="font-medium text-gray-700">البريد الإلكتروني:</span> <span className="break-all">{order.customer.email}</span></p>
                  <p><span className="font-medium text-gray-700">الهاتف:</span> {order.customer.phone}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-fuchsia-700 mb-3 text-base flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  عنوان الشحن
                </h3>
                <div className="text-gray-600 space-y-1 text-sm">
                  <p className="font-medium text-gray-700">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="font-semibold text-fuchsia-700 mb-4 text-sm md:text-base flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
              </svg>
              منتجات الطلب
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-fuchsia-100">
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-fuchsia-700 text-xs md:text-sm">المنتج</th>
                    <th className="text-center py-2 md:py-3 px-2 md:px-4 font-semibold text-fuchsia-700 text-xs md:text-sm">الكمية</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 font-semibold text-fuchsia-700 text-xs md:text-sm">السعر</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 font-semibold text-fuchsia-700 text-xs md:text-sm">الضريبة</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 font-semibold text-fuchsia-700 text-xs md:text-sm">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                    return (
                      <tr key={index} className="border-b border-fuchsia-50 hover:bg-fuchsia-50">
                        <td className="py-3 md:py-4 px-2 md:px-4">
                          <h4 className="font-medium text-gray-900 text-xs md:text-sm leading-tight">{item.name}</h4>
                          {(() => {
                            const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                            return variants && Object.keys(variants).length > 0 && (
                              <div className="text-xs text-fuchsia-500 mt-1 font-medium">
                                {Object.entries(variants).map(([key, value], index) => (
                                  <span key={key}>
                                    {key}: {value}
                                    {index < Object.keys(variants).length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-center text-gray-600 text-xs md:text-sm font-medium">{item.quantity}</td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-left text-gray-600 text-xs md:text-sm">{formatCurrency(item.price, storeSettings, currencies)}</td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-left text-gray-600 text-xs md:text-sm">
                          <div>{formatCurrency(item.tax_amount || 0, storeSettings, currencies)}</div>
                          <div className="text-xs text-gray-500">{item.tax_name || 'الضريبة'} {item.tax_percentage ? `(${item.tax_percentage}%)` : ''}</div>
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-left font-semibold text-fuchsia-700 text-xs md:text-sm">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-fuchsia-100">
            <div className="max-w-sm mr-auto">
              <h3 className="font-semibold text-fuchsia-700 mb-4 text-sm md:text-base">ملخص الطلب</h3>
              <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="text-gray-900">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-fuchsia-600 text-sm md:text-base">
                  <span>خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                  <span>-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">الضريبة</span>
                <span className="text-gray-900">{formatCurrency(order.tax, storeSettings, currencies)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">الشحن</span>
                <span className="text-gray-900">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
              </div>
              <div className="border-t-2 border-fuchsia-100 pt-2 md:pt-3">
                <div className="flex justify-between">
                  <span className="text-base md:text-lg font-semibold text-gray-900">الإجمالي</span>
                  <span className="text-lg md:text-xl font-bold text-fuchsia-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                </div>
              </div>
              {order.payment_method && (
                <div className="border-t pt-2 md:pt-3">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">طريقة الدفع</span>
                    <span className="text-gray-900">{order.payment_method}</span>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm bg-white p-6 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-medium text-fuchsia-600">شكراً لاختيارك متجرنا!</span>
            </div>
            <p>إذا كان لديك أي استفسار حول طلبك، يرجى التواصل مع فريق الدعم.</p>
          </div>
        </div>
      </div>
    </>
  );
};