import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { X, Package, User, MapPin, ShoppingCart, Download, Calendar, CreditCard, Truck } from 'lucide-react';

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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 bg-black/50" onClick={onClose}>
        <div className="flex items-center justify-center h-full p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
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
    <div className="fixed inset-0 z-60 bg-black/50" onClick={onClose}>
      <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
        <div 
          className="bg-white w-full h-full md:h-[95vh] md:max-w-4xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">تفاصيل الطلب</h2>
                <p className="text-sm text-gray-600">الطلب رقم #{orderNumber}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-green-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Status Banner */}
            <div className="p-4 md:p-6 bg-white border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date(order.date).toLocaleDateString('ar')}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(order.total, storeSettings, currencies)}
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Customer & Shipping Info Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-2xl p-4 md:p-6">
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

                <div className="bg-gray-50 rounded-2xl p-4 md:p-6">
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

              {/* Order Items */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 md:p-6 border-b bg-gray-50">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">منتجات الطلب</h3>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {order.items.map((item: any, index: any) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + item.tax_amount;
                    return (
                      <div key={index} className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                            {(() => {
                              let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                              if (typeof item.variants === 'string') {
                                try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                              }
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
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>الكمية: {item.quantity}</span>
                              <span>السعر: {formatCurrency(item.price, storeSettings, currencies)}</span>
                              {item.tax_amount > 0 && (
                                <span>الضريبة: {formatCurrency(item.tax_amount, storeSettings, currencies)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrency(itemTotalWithTax, storeSettings, currencies)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">ملخص الطلب</h3>
                </div>
                
                <div className="space-y-3">
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
                  <div className="border-t border-green-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">الإجمالي</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(order.total, storeSettings, currencies)}</span>
                    </div>
                  </div>
                  {order.payment_method && (
                    <div className="border-t border-green-200 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">طريقة الدفع</span>
                        <span className="text-gray-900">{order.payment_method}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 p-4 md:p-6 bg-white">
            <button
              onClick={() => {
                window.location.href = route('store.order.pdf', { 
                  storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                  orderNumber 
                });
              }}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              تحميل PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};