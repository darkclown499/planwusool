import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Search, X, Package, Calendar, ShoppingBag, Filter, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [statusFilter, setStatusFilter] = React.useState('all');
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         new Date(order.date).toLocaleDateString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
        return 'text-emerald-800 bg-emerald-100 border-emerald-200';
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

  const uniqueStatuses = ['all', ...Array.from(new Set(orders.map(order => order.status.toLowerCase())))];

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
        <div 
          className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">طلباتي</h2>
                <p className="text-sm text-gray-600">إجمالي الطلبات: {orders.length}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-emerald-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="p-4 md:p-6 border-b bg-white space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب أو الحالة أو التاريخ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div className="relative min-w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="focus:ring-emerald-500 focus:border-emerald-500">
                  <Filter className="w-4 h-4 text-gray-400 ml-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === 'all' ? 'كل الحالات' : getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">جارٍ تحميل الطلبات...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {searchQuery || statusFilter !== 'all' ? (
                    <Search className="w-10 h-10 text-emerald-600" />
                  ) : (
                    <Package className="w-10 h-10 text-emerald-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' ? 'لا توجد طلبات' : 'لا توجد طلبات بعد'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'لا توجد طلبات تطابق معايير البحث الخاصة بك.' 
                    : 'لم تقم بإجراء أي طلبات حتى الآن.'}
                </p>
                {searchQuery || statusFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    مسح عوامل التصفية
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    متابعة التسوق
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1 space-y-3 md:space-y-0 md:flex md:items-center md:gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">الطلب</div>
                            <div className="font-bold text-gray-900">#{order.id}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                              {new Date(order.date).toLocaleDateString('ar', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{order.items} منتجات</span>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <div className="text-lg font-bold text-emerald-600">
                              {formatCurrency(order.total, storeSettings, currencies)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="md:hidden">عرض التفاصيل</span>
                          <span className="hidden md:inline">عرض</span>
                        </button>
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