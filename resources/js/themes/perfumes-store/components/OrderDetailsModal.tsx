import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { X, Package, User, MapPin, Receipt, Download, Wrench, Calendar, DollarSign } from 'lucide-react';

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
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-600 p-6 sm:p-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-slate-600 border-t-amber-600 animate-spin mx-auto mb-4"></div>
            <p className="text-white font-bold text-center text-sm sm:text-base">جارٍ تحميل تفاصيل الطلب...</p>
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
        return 'bg-green-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'cancelled':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };
  
  return (
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-slate-800 w-full max-w-6xl h-[95vh] sm:h-[85vh] flex flex-col overflow-hidden border-2 border-amber-600" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="bg-black text-white p-3 sm:p-4 border-b-2 border-amber-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">تفاصيل الطلب</h2>
                  <div className="text-amber-400 text-xs sm:text-sm font-bold">#{orderNumber}</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-800 space-y-3 sm:space-y-4">
            
            {/* Order Status */}
            <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 flex items-center justify-center">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-xs sm:text-sm font-bold ${getStatusColor(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2 text-slate-300 mt-1 text-xs sm:text-sm">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-black border border-slate-700 p-3 text-center">
                  <div className="text-lg sm:text-xl font-bold text-amber-400">{formatCurrency(order.total, storeSettings, currencies)}</div>
                  <div className="text-xs text-slate-400 font-bold">الإجمالي</div>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base">معلومات العميل</h3>
                </div>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">الاسم:</span>
                    <span className="text-white">{order.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">البريد الإلكتروني:</span>
                    <span className="text-white break-all">{order.customer.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">الهاتف:</span>
                    <span className="text-white">{order.customer.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base">عنوان الشحن</h3>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-white">
                  <p className="font-bold">{order.shipping_address.name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}, {order.shipping_address.country}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 border-b border-slate-700 pb-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">منتجات الطلب ({order.items.length})</h3>
              </div>
              <div className="space-y-3">
                {order.items.map((item: any, index: any) => {
                  const itemTotal = item.price * item.quantity;
                  const itemTotalWithTax = itemTotal + (item.tax_amount || 0);
                  let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                  if (typeof item.variants === 'string') {
                    try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                  }
                  
                  return (
                    <div key={index} className="bg-black border border-slate-700 p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-sm sm:text-base mb-1">{item.name}</h4>
                          {variants && Object.keys(variants).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {Object.entries(variants).map(([key, value], idx) => (
                                <span key={key} className="bg-amber-600 text-white px-2 py-1 text-xs font-bold">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-slate-800 p-2 text-center">
                              <div className="text-slate-400 font-bold">الكمية</div>
                              <div className="text-white font-bold">{item.quantity}</div>
                            </div>
                            <div className="bg-slate-800 p-2 text-center">
                              <div className="text-slate-400 font-bold">السعر</div>
                              <div className="text-white font-bold">{formatCurrency(item.price, storeSettings, currencies)}</div>
                            </div>
                            {item.tax_amount > 0 && (
                              <div className="bg-slate-800 p-2 text-center">
                                <div className="text-slate-400 font-bold">الضريبة</div>
                                <div className="text-white font-bold">{formatCurrency(item.tax_amount, storeSettings, currencies)}</div>
                              </div>
                            )}
                            <div className="bg-amber-600 p-2 text-center">
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
            <div className="bg-black border-2 border-amber-600 p-3 sm:p-4">
              <div className="bg-amber-600 text-white p-2 mb-3 text-center">
                <h3 className="font-bold text-sm sm:text-base">ملخص الطلب</h3>
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400 font-bold">المجموع الفرعي</span>
                  <span className="text-white font-bold">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
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
                <div className="flex justify-between py-2 bg-amber-600 px-3 text-white">
                  <span className="font-bold text-sm sm:text-base">الإجمالي</span>
                  <span className="font-bold text-lg sm:text-xl">{formatCurrency(order.total, storeSettings, currencies)}</span>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between py-2 mt-2">
                    <span className="text-slate-400 font-bold">طريقة الدفع</span>
                    <span className="bg-slate-700 text-white px-2 py-1 font-bold text-xs">{order.payment_method}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t-2 border-amber-600 p-3 sm:p-4 bg-black flex justify-end">
            <button
              onClick={() => {
                window.location.href = route('store.order.pdf', { 
                  storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                  orderNumber 
                });
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 font-bold transition-colors flex items-center gap-2 text-xs sm:text-sm"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">تحميل PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};