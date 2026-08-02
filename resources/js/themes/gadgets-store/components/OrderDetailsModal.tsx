import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';

interface OrderDetailsModalProps {
  onClose: () => void;
  orderNumber: string;
  storeSlug: string;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ onClose, orderNumber, storeSlug }) => {
  const [order, setOrder] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        const response = await fetch(`${route('api.orders.show', { orderNumber })}?store_slug=${storeSlug}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        }
      } catch (error) {
        console.error('Failed to load order details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [orderNumber, storeSlug]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جارٍ تحميل تفاصيل الطلب...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }
  
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  return (
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">تفاصيل الطلب</h2>
              <p className="text-gray-600 text-sm">الطلب رقم #{orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Order Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
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
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
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
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-base">منتجات الطلب</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-2 px-2 font-semibold text-gray-900 text-sm">المنتج</th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-900 text-sm">الكمية</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 text-sm">السعر</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 text-sm">الضريبة</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 text-sm">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => {
                      const itemTotal = item.price * item.quantity;
                      const itemTotalWithTax = itemTotal + item.tax_amount;
                      return (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-2">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">{item.name}</h4>
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
                          <td className="py-3 px-2 text-center text-gray-600 text-sm">{item.quantity}</td>
                          <td className="py-3 px-2 text-left text-gray-600 text-sm">{formatCurrency(item.price, storeSettings, currencies)}</td>
                          <td className="py-3 px-2 text-left text-gray-600 text-sm">
                            <div>{formatCurrency(item.tax_amount || 0, storeSettings, currencies)}</div>
                            <div className="text-xs text-gray-500">{item.tax_name || 'الضريبة'} {item.tax_percentage ? `(${item.tax_percentage}%)` : ''}</div>
                          </td>
                          <td className="py-3 px-2 text-left font-semibold text-gray-900 text-sm">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 text-base">ملخص الطلب</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="text-gray-900">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>خصم الكوبون ({order.coupon})</span>
                    <span>-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الضريبة</span>
                  <span className="text-gray-900">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الشحن</span>
                  <span className="text-gray-900">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">الإجمالي</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                  </div>
                </div>
                {order.payment_method && (
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">طريقة الدفع</span>
                      <span className="text-gray-900">{order.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-100 p-4 md:p-6 flex-shrink-0">
            <div className="flex justify-start">
              <button
                onClick={() => {
                  window.location.href = route('store.order.pdf', { 
                    storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                    orderNumber 
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2 print:hidden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                تحميل PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};