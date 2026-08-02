import React, { useState } from 'react';
import { X, Package, Search, Eye } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-purple-900/50" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white w-full max-w-3xl overflow-hidden shadow-2xl rounded-2xl border-4 border-purple-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-purple-100 border-b-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800">طلباتي</h2>
                <p className="text-purple-600 text-sm font-medium">عرض طلباتك</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-purple-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 md:p-6 bg-purple-50 border-b-2 border-purple-200">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                placeholder="البحث في الطلبات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border-2 border-purple-200 rounded-xl bg-purple-50 text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 text-sm md:text-base"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-16">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                <p className="text-purple-600 font-medium">جارٍ تحميل الطلبات...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 md:py-16">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-purple-800 mb-2">
                  {searchQuery ? 'لا توجد طلبات' : 'لا توجد طلبات بعد'}
                </h3>
                <p className="text-purple-600 mb-6 font-medium">
                  {searchQuery 
                    ? 'جرّب مصطلح بحث مختلف.' 
                    : 'ابدأ التسوق لترى طلباتك هنا!'}
                </p>
                <button
                  onClick={onClose}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-md"
                >
                  {searchQuery ? 'مسح البحث' : 'متابعة التسوق'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 md:p-4 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                            <h3 className="font-bold text-purple-800 text-sm md:text-base truncate">#{order.id}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(order.status)}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-purple-600">
                            <span>{new Date(order.date).toLocaleDateString()}</span>
                            <span>{order.items} منتج</span>
                            <span className="font-bold text-purple-700">
                              {formatCurrency(order.total, storeSettings, currencies)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onViewOrder(order.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm md:text-base w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4" />
                        <span>عرض</span>
                      </button>
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