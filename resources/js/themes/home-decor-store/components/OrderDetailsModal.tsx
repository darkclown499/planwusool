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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-amber-100">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-amber-700 font-medium text-center">جارٍ تحميل تفاصيل الطلب...</p>
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
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
        return 'text-green-700 bg-green-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'cancelled':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };
  
  return (
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden border-2 border-amber-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-amber-100 rounded-lg md:rounded-xl">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-serif font-bold text-amber-900">تفاصيل الطلب</h2>
                <p className="text-amber-600 text-xs md:text-sm">الطلب رقم #{orderNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-full transition-colors">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-4 md:space-y-6">
            {/* Order Status Bar */}
            <div className="bg-white rounded-2xl p-4 md:p-6 border-r-4 border-amber-500 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide ${getStatusColor(order.status)} shadow-sm`}>
                      {order.status}
                    </span>
                    <p className="text-amber-600 text-xs md:text-sm mt-1">
                      {new Date(order.date).toLocaleDateString('ar', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 md:bg-transparent rounded-xl md:rounded-none p-3 md:p-0 text-center md:text-right">
                  <div className="text-xl md:text-2xl font-bold text-amber-900">{formatCurrency(order.total, storeSettings, currencies)}</div>
                  <div className="text-xs md:text-sm text-amber-600">الإجمالي</div>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-amber-100">
                <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  معلومات العميل
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-medium">الاسم:</span>
                    <span className="text-amber-900">{order.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-medium">البريد الإلكتروني:</span>
                    <span className="text-amber-900 break-all">{order.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-medium">الهاتف:</span>
                    <span className="text-amber-900">{order.customer.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-amber-100">
                <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  عنوان الشحن
                </h3>
                <div className="space-y-1 text-amber-900">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-amber-100">
              <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-4 md:mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                منتجات الطلب ({order.items.length})
              </h3>
              <div className="space-y-4">
                {order.items.map((item: any, index: any) => {
                  const itemTotal = item.price * item.quantity;
                  const itemTotalWithTax = itemTotal + item.tax_amount;
                  let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                  if (typeof item.variants === 'string') {
                    try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                  }
                  
                  return (
                    <div key={index} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-amber-900 text-lg">{item.name}</h4>
                          {variants && Object.keys(variants).length > 0 && (
                            <div className="text-sm text-amber-600 mt-1">
                              {Object.entries(variants).map(([key, value], index) => (
                                <span key={key} className="inline-block bg-amber-100 px-2 py-1 rounded ml-2 mb-1">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-amber-700">
                            <span>الكمية: <strong>{item.quantity}</strong></span>
                            <span>السعر: <strong>{formatCurrency(item.price, storeSettings, currencies)}</strong></span>
                            {item.tax_amount > 0 && (
                              <span>الضريبة: <strong>{formatCurrency(item.tax_amount, storeSettings, currencies)}</strong></span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-900">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                          <div className="text-sm text-amber-600">إجمالي المنتج</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-amber-100">
              <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-4 md:mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
                ملخص الطلب
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-amber-100">
                  <span className="text-amber-700">المجموع الفرعي</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-amber-100 text-green-600">
                    <span>خصم الكوبون ({order.coupon})</span>
                    <span className="font-semibold">-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-amber-100">
                  <span className="text-amber-700">الضريبة</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-amber-100">
                  <span className="text-amber-700">الشحن</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-amber-50 rounded-xl px-4 border-2 border-amber-200">
                  <span className="text-xl font-bold text-amber-900">الإجمالي</span>
                  <span className="text-2xl font-bold text-amber-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between items-center py-2 mt-4">
                    <span className="text-amber-700">طريقة الدفع</span>
                    <span className="font-semibold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">{order.payment_method}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-amber-100 p-4 bg-amber-50 flex-shrink-0">
            <div className="flex justify-start">
              <button
                onClick={() => {
                  window.location.href = route('store.order.pdf', { 
                    storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                    orderNumber 
                  });
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2"
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