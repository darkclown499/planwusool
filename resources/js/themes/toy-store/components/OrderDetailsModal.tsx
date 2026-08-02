import React from 'react';
import { X, Package, MapPin, Calendar, CreditCard, Download } from 'lucide-react';
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
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [orderNumber, storeSlug]);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

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

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-purple-900/30"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-purple-600 font-medium">جارٍ تحميل تفاصيل الطلب...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-60 bg-purple-900/50" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white w-full max-w-4xl overflow-hidden shadow-2xl rounded-2xl border-4 border-purple-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 bg-purple-100 border-b-2 border-purple-200">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-purple-800">تفاصيل الطلب</h2>
                <p className="text-purple-600 text-sm font-medium">الطلب رقم #{orderNumber}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-purple-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Order Summary */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-800 text-sm md:text-base">#{order.id}</h3>
                    <p className="text-purple-600 text-xs md:text-sm flex items-center gap-2 font-medium">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-lg md:text-xl font-bold text-purple-600 mb-1">{formatCurrency(order.total, storeSettings, currencies)}</div>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Shipping */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="bg-white border-2 border-purple-200 rounded-xl p-3 md:p-4">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Package className="w-4 h-4 text-purple-500" />
                  معلومات العميل
                </h4>
                <div className="space-y-2 text-xs md:text-sm">
                  <p><span className="text-purple-500">الاسم:</span> <span className="font-medium text-purple-800 break-words">{order.customer.name}</span></p>
                  <p><span className="text-purple-500">البريد الإلكتروني:</span> <span className="font-medium text-purple-800 break-all">{order.customer.email}</span></p>
                  <p><span className="text-purple-500">الهاتف:</span> <span className="font-medium text-purple-800">{order.customer.phone}</span></p>
                </div>
              </div>
              
              <div className="bg-white border-2 border-purple-200 rounded-xl p-3 md:p-4">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2 text-sm md:text-base">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  عنوان الشحن
                </h4>
                <div className="text-xs md:text-sm text-purple-600">
                  <p className="font-medium text-purple-800 break-words">{order.shipping_address.name}</p>
                  <p className="break-words">{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}, {order.shipping_address.country}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white border-2 border-purple-200 rounded-xl mb-4 md:mb-6">
              <div className="p-3 md:p-4 border-b-2 border-purple-200">
                <h4 className="font-bold text-purple-800 flex items-center gap-2 text-sm md:text-base">
                  <Package className="w-4 h-4 text-purple-500" />
                  منتجات الطلب ({order.items.length})
                </h4>
              </div>
              
              <div className="divide-y divide-purple-100">
                {order.items.map((item, index) => {
                  const itemTotal = item.price * item.quantity;
                  const itemTotalWithTax = itemTotal + item.tax_amount;
                  const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                  
                  return (
                    <div key={index} className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-purple-800 mb-2 text-sm md:text-base break-words">{item.name.replace(/Edition: Standard/gi, '').trim()}</h5>
                          {variants && Object.keys(variants).length > 0 && (
                            <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                              {Object.entries(variants).map(([key, value], idx) => (
                                <span key={key} className="bg-purple-100 px-2 py-1 rounded text-xs text-purple-600">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-purple-600">
                            <span>الكمية: {item.quantity}</span>
                            <span>{formatCurrency(item.price, storeSettings, currencies)} للقطعة</span>
                          </div>
                        </div>
                <div className="text-right sm:text-left">
                          <div className="font-bold text-purple-800 text-sm md:text-base">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                          {item.tax_amount > 0 && (
                            <div className="text-xs text-purple-500">شامل الضريبة</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white border-2 border-purple-200 rounded-xl">
              <div className="p-3 md:p-4 border-b-2 border-purple-200">
                <h4 className="font-bold text-purple-800 flex items-center gap-2 text-sm md:text-base">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  ملخص الطلب
                </h4>
              </div>
              
              <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-purple-600">المجموع الفرعي</span>
                  <span className="font-medium text-purple-800">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm md:text-base">
                    <span className="break-words">خصم الكوبون ({order.coupon})</span>
                    <span className="font-medium">-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-purple-600">الضريبة</span>
                  <span className="font-medium text-purple-800">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-purple-600">الشحن</span>
                  <span className="font-medium text-purple-800">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                </div>
                <div className="border-t-2 border-purple-200 pt-2 md:pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base md:text-lg font-bold text-purple-800">الإجمالي</span>
                    <span className="text-lg md:text-xl font-bold text-purple-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                  </div>
                </div>
                {order.payment_method && (
                  <div className="border-t-2 border-purple-200 pt-2 md:pt-3">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-purple-600">طريقة الدفع</span>
                      <span className="font-medium text-purple-800 break-words">{order.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t-2 border-purple-200 p-4 md:p-6 bg-purple-50">
            <div className="flex justify-center md:justify-start">
              <button
                onClick={() => {
                  window.location.href = route('store.order.pdf', { 
                    storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                    orderNumber 
                  });
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 md:px-6 md:py-3 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center gap-2 text-sm md:text-base shadow-md w-full md:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                تحميل PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};