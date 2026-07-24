import React from 'react';
import { X, Package, MapPin, Calendar, CreditCard, Receipt, Download } from 'lucide-react';
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-700 mx-auto mb-4"></div>
            <p className="text-stone-600 font-serif">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-stone-50 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="relative bg-stone-700 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">Order Details</h2>
              <p className="text-stone-200 text-xs sm:text-sm">Order #{orderNumber}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-stone-50 min-h-0">
            {/* Hero Card */}
            <div className="bg-stone-50 rounded-3xl p-6 m-4 border-2 border-stone-200 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-stone-700 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">#{order.id}</h3>
                    <p className="text-stone-600 flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-2">{formatCurrency(order.total, storeSettings, currencies)}</div>
                  <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold ${getStatusColor(order.status)} shadow-md`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-md border border-stone-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-stone-700 rounded-xl flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-serif font-bold text-stone-900">Customer</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wide">Name</label>
                      <p className="font-semibold text-stone-900">{order.customer.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wide">Email</label>
                      <p className="text-stone-600 text-sm">{order.customer.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wide">Phone</label>
                      <p className="text-stone-600 text-sm">{order.customer.phone}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-5 shadow-md border border-stone-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-stone-700 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-serif font-bold text-stone-900">Delivery</h4>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wide">Recipient</label>
                      <p className="font-semibold text-stone-900">{order.shipping_address.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wide">Address</label>
                      <div className="text-sm text-stone-600 leading-relaxed">
                        <p>{order.shipping_address.address}</p>
                        <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                        <p>{order.shipping_address.postal_code}, {order.shipping_address.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
                <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-stone-700" />
                    <h4 className="font-serif font-bold text-stone-900">Items ({order.items.length})</h4>
                  </div>
                </div>
                
                <div className="divide-y divide-stone-100">
                  {order.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const itemTotalWithTax = itemTotal + item.tax_amount;
                    const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                    
                    return (
                      <div key={index} className="p-5 hover:bg-stone-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <h5 className="font-serif font-semibold text-stone-900 mb-1">{item.name}</h5>
                            {variants && Object.keys(variants).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {Object.entries(variants).map(([key, value], idx) => (
                                  <span key={key} className="bg-stone-200 px-2 py-1 rounded-lg text-xs text-stone-700">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-stone-600">
                              <span className="bg-stone-100 px-2 py-1 rounded">Qty: {item.quantity}</span>
                              <span>{formatCurrency(item.price, storeSettings, currencies)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-stone-900">{formatCurrency(itemTotalWithTax, storeSettings, currencies)}</div>
                            {item.tax_amount > 0 && (
                              <div className="text-xs text-stone-500">incl. tax</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
                <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-stone-700" />
                    <h4 className="font-serif font-bold text-stone-900">Payment Summary</h4>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(order.subtotal, storeSettings, currencies)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({order.coupon})</span>
                      <span className="font-semibold">-{formatCurrency(order.discount, storeSettings, currencies)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-600">Tax</span>
                    <span className="font-semibold">{formatCurrency(order.tax, storeSettings, currencies)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Shipping</span>
                    <span className="font-semibold">{formatCurrency(order.shipping, storeSettings, currencies)}</span>
                  </div>
                  <div className="border-t-2 border-stone-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-serif font-bold text-stone-900">Total</span>
                      <span className="text-2xl font-serif font-bold text-stone-700">{formatCurrency(order.total, storeSettings, currencies)}</span>
                    </div>
                  </div>
                  {order.payment_method && (
                    <div className="border-t border-stone-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Payment Method</span>
                        <span className="bg-stone-700 text-white px-3 py-1 rounded-lg font-medium">{order.payment_method}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-stone-200 p-4 sm:p-6 flex-shrink-0 bg-stone-50">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  window.location.href = route('store.order.pdf', { 
                    storeSlug: (window as any).page?.props?.store?.slug || 'demo', 
                    orderNumber 
                  });
                }}
                className="bg-stone-700 hover:bg-stone-800 text-white px-6 py-3 rounded-xl font-serif font-semibold transition-colors flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};