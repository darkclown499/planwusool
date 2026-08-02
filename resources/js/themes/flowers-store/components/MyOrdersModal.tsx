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
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">طلباتي</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ابحث برقم الطلب أو الحالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">جارٍ تحميل الطلبات...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
                  <p className="text-gray-500 mb-6">لا توجد طلبات تطابق معايير البحث.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    مسح البحث
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات بعد</h3>
                  <p className="text-gray-500 mb-6">لم تقم بإجراء أي طلبات حتى الآن.</p>
                  <button
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    متابعة التسوق
                  </button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="relative bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border-2 border-red-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="mb-4 md:mb-5">
                      <div className="text-xs uppercase tracking-widest text-red-500 font-semibold mb-1 md:mb-2">رقم الطلب</div>
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">#{order.id}</h3>
                    </div>
                    
                    <div className="bg-red-50 rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-5 space-y-2 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm font-medium text-red-700">تاريخ الطلب</span>
                        <span className="text-xs md:text-sm font-bold text-gray-900">
                          {new Date(order.date).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm font-medium text-red-700">إجمالي المنتجات</span>
                        <span className="text-xs md:text-sm font-bold text-gray-900">{order.items} منتج</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm font-medium text-red-700">الحالة</span>
                        <span className={`text-xs md:text-sm font-bold capitalize px-2 md:px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="border-t border-red-200 pt-2 md:pt-3 mt-2 md:mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm md:text-base font-bold text-red-800">إجمالي الطلب</span>
                          <span className="text-lg md:text-xl font-black text-red-600">
                            {formatCurrency(order.total, storeSettings, currencies)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onViewOrder(order.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 md:py-3.5 rounded-xl md:rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-[1.02] text-sm md:text-base"
                    >
                      عرض تفاصيل الطلب
                    </button>
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