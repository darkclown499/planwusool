import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';

interface Order {
  id: string;
  date: string;
  status: string;
  total: number;
  items: number;
}

interface MyOrdersModalProps {
  onClose: () => void;
  orders: Order[];
  currency: string;
  loading?: boolean;
  onViewOrder: (orderNumber: string) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ onClose, orders, currency, loading, onViewOrder }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.status.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden border-2 border-yellow-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-yellow-100 bg-yellow-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-xl">
                <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-serif font-bold text-yellow-900">طلباتي</h2>
            </div>
            <button onClick={onClose} className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-25">
            <div className="relative">
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ابحث برقم الطلب أو الحالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-yellow-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-yellow-700 font-medium">جارٍ تحميل الطلبات...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-200">
                    <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-900 mb-3">لا توجد طلبات</h3>
                  <p className="text-yellow-700 mb-8 max-w-md mx-auto">لا توجد طلبات مطابقة لمعايير البحث.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg"
                  >
                    مسح البحث
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-200">
                    <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-900 mb-3">لا توجد طلبات بعد</h3>
                  <p className="text-yellow-700 mb-8 max-w-md mx-auto">لم تقم بإجراء أي طلبات حتى الآن.</p>
                  <button
                    onClick={onClose}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg"
                  >
                    متابعة التسوق
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order, index) => (
                  <div key={order.id} className="bg-white rounded-2xl border-r-4 border-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-yellow-600 group">
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Enhanced order header */}
                          <div className="flex flex-col gap-4 mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-yellow-900 group-hover:text-yellow-800 transition-colors">الطلب رقم #{order.id}</h3>
                                <div className="flex items-center gap-2 text-yellow-600 mt-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                                  </svg>
                                  <span className="text-sm font-medium">
                                    {new Date(order.date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide ${getStatusColor(order.status)} shadow-sm`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced order details */}
                          <div className="bg-yellow-50 rounded-xl p-5 mb-6 border border-yellow-100">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="text-center">
                                <div className="flex flex-col items-center mb-2">
                                  <svg className="w-5 h-5 text-yellow-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  <span className="text-2xl md:text-3xl font-bold text-yellow-900">{order.items}</span>
                                </div>
                                <div className="text-xs md:text-sm text-yellow-600 font-medium">{order.items > 1 ? 'منتجات' : 'منتج'}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex flex-col items-center mb-2">
                                  <svg className="w-5 h-5 text-yellow-600 mb-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                                  </svg>
                                  <span className="text-xl md:text-2xl font-bold text-yellow-900">{formatCurrency(order.total, storeSettings, currencies)}</span>
                                </div>
                                <div className="text-xs md:text-sm text-yellow-600 font-medium">الإجمالي</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced action button */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="text-sm text-yellow-500 order-2 sm:order-1">
                              منذ {Math.floor((new Date().getTime() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))} يوم
                            </div>
                            <button
                              onClick={() => onViewOrder(order.id)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-3 group order-1 sm:order-2"
                            >
                              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>عرض التفاصيل</span>
                              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};