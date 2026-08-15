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
      
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
              <div className="mb-4 md:mb-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">فاتورة الطلب</h1>
                <p className="text-gray-600 text-sm md:text-base">الطلب رقم #{orderNumber}</p>
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
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-sm md:text-base print:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            {/* Order Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-gray-50 p-3 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-semibold capitalize text-sm">{order.status}</span>
                </div>
                <div className="text-gray-600 text-sm">
                  <span className="font-medium">التاريخ:</span> {new Date(order.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">رقم الطلب:</span> <span className="font-semibold text-gray-900">{order.id}</span>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-base">معلومات العميل</h3>
                <div className="text-gray-600 space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">الاسم:</span> {order.customer.name}</p>
                  <p><span className="font-medium text-gray-700">البريد الإلكتروني:</span> <span className="break-all">{order.customer.email}</span></p>
                  <p><span className="font-medium text-gray-700">الهاتف:</span> {order.customer.phone}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-base">عنوان الشحن</h3>
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
            <h3 className="font-semibold text-gray-900 mb-4 text-sm md:text-base">منتجات الطلب</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">المنتج</th>
                    <th className="text-center py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">الكمية</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">السعر</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">الضريبة</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 font-semibold text-gray-900 text-xs md:text-sm">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                    return (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 md:py-4 px-2 md:px-4">
                          <h4 className="font-medium text-gray-900 text-xs md:text-sm leading-tight">{item.name}</h4>
                          {(() => {
                            let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                            if (typeof item.variants === 'string') {
                              try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                            }
                            return variants && Object.keys(variants).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
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
                        <td className="py-3 md:py-4 px-2 md:px-4 text-center text-gray-600 text-xs md:text-sm">{item.quantity}</td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 text-xs md:text-sm">{formatCurrency(item.price, storeSettings, currencies)}</td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 text-xs md:text-sm">
                          <div>{formatCurrency(item.tax_amount || 0, storeSettings, currencies)}</div>
                          <div className="text-xs text-gray-500">{item.tax_name || 'الضريبة'} {item.tax_percentage ? `(${item.tax_percentage}%)` : ''}</div>
                        </td>
                        <td className="py-3 md:py-4 px-2 md:px-4 text-right font-semibold text-gray-900 text-xs md:text-sm">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm md:text-base">ملخص الطلب</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="text-gray-900">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600 text-sm md:text-base">
                  <span>خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                  <span>-{formatCurrency(order.discount ?? 0, storeSettings, currencies)}</span>
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
              <div className="border-t pt-2 md:pt-3">
                <div className="flex justify-between">
                  <span className="text-base md:text-lg font-semibold text-gray-900">الإجمالي</span>
                  <span className="text-lg md:text-xl font-bold text-orange-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
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

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>شكراً لتعاملك معنا!</p>
            <p>إذا كانت لديك أي أسئلة، يرجى التواصل مع فريق الدعم.</p>
          </div>
        </div>
      </div>
    </>
  );
};