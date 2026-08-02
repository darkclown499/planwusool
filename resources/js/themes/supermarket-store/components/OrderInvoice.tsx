import React from 'react';
import { Head } from '@inertiajs/react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Printer, Download, Package, User, MapPin, Receipt, ShoppingBag } from 'lucide-react';

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
        return 'text-green-800 bg-green-100 border-green-200';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'cancelled':
        return 'text-red-800 bg-red-100 border-red-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: {[key: string]: string} = {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      confirmed: 'مؤكد',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <>
      <Head title={`فاتورة الطلب - ${orderNumber}`} />
      
      <div className="min-h-screen bg-green-50 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">فاتورة الطلب</h1>
                    <p className="text-gray-600 text-sm sm:text-base">#{orderNumber}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handlePrint}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm print:hidden"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm print:hidden"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            {/* Order Status Banner */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">التاريخ:</span> {new Date(order.date).toLocaleDateString('ar')}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">رقم الطلب</p>
                  <p className="font-bold text-gray-900">{order.id}</p>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">معلومات العميل</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">الاسم:</span>
                    <p className="font-medium text-gray-900">{order.customer.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">البريد الإلكتروني:</span>
                    <p className="font-medium text-gray-900 break-all">{order.customer.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">الهاتف:</span>
                    <p className="font-medium text-gray-900">{order.customer.phone}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">عنوان الشحن</h3>
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-900">{order.shipping_address.name}</p>
                  <p className="text-gray-600">{order.shipping_address.address}</p>
                  <p className="text-gray-600">
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p className="text-gray-600">{order.shipping_address.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">منتجات الطلب</h3>
            </div>
            
            {/* Mobile View */}
            <div className="block sm:hidden space-y-4">
              {order.items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                return (
                  <div key={index} className="bg-green-50 rounded-2xl p-4 border border-green-100">
                    <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
                    {(() => {
                      const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                      return variants && Object.keys(variants).length > 0 && (
                        <div className="text-xs text-gray-500 mb-2">
                          {Object.entries(variants).map(([key, value], index) => (
                            <span key={key}>
                              {key}: {value}
                              {index < Object.keys(variants).length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">الكمية:</span>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">سعر القطعة:</span>
                        <p className="font-medium">{formatCurrency(item.price, storeSettings, currencies)}</p>
                      </div>
                      {item.tax_amount > 0 && (
                        <>
                          <div>
                            <span className="text-gray-500">الضريبة:</span>
                            <p className="font-medium">{formatCurrency(item.tax_amount, storeSettings, currencies)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">نسبة الضريبة:</span>
                            <p className="font-medium">{item.tax_percentage}%</p>
                          </div>
                        </>
                      )}
                      <div className="col-span-2 pt-2 border-t border-green-200">
                        <span className="text-gray-500">الإجمالي:</span>
                        <p className="font-bold text-green-600 text-lg">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-green-100">
                    <th className="text-right py-4 px-2 font-semibold text-gray-900">المنتج</th>
                    <th className="text-center py-4 px-2 font-semibold text-gray-900">الكمية</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-900">السعر</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-900">الضريبة</th>
                    <th className="text-left py-4 px-2 font-semibold text-gray-900">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-green-50">
                        <td className="py-4 px-2">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {(() => {
                            const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
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
                        <td className="py-4 px-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-4 px-2 text-left text-gray-600">{formatCurrency(item.price, storeSettings, currencies)}</td>
                        <td className="py-4 px-2 text-left text-gray-600">
                          <div>{formatCurrency(item.tax_amount || 0, storeSettings, currencies)}</div>
                          {item.tax_percentage && (
                            <div className="text-xs text-gray-500">({item.tax_percentage}%)</div>
                          )}
                        </td>
                        <td className="py-4 px-2 text-left font-semibold text-gray-900">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">ملخص الطلب</h3>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm sm:text-base">
                    <span>خصم الكوبون {order.coupon && `(${order.coupon})`}</span>
                    <span className="font-medium">-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">الضريبة</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">الشحن</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="border-t border-green-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg sm:text-xl font-bold text-gray-900">الإجمالي</span>
                    <span className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                  </div>
                </div>
                {order.payment_method && (
                  <div className="border-t border-green-200 pt-3">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">طريقة الدفع</span>
                      <span className="text-gray-900 font-medium">{order.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 p-6 bg-white rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">شكراً لتعاملك معنا!</h3>
            <p className="text-gray-600 text-sm">إذا كانت لديك أي أسئلة، يرجى التواصل مع فريق الدعم.</p>
          </div>
        </div>
      </div>
    </>
  );
};