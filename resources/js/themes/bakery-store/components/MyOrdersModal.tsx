import React, { useState } from 'react';
import { X, Package, Calendar, Eye, Search, Filter } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  
  const statusOptions = ['all', ...Array.from(new Set(orders.map(order => order.status.toLowerCase())))];

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-stone-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          
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
                <Package className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">My Orders</h2>
              <p className="text-stone-200 text-xs sm:text-sm">View your order history</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-4 sm:p-6 border-b border-stone-200 bg-stone-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-sm"
                />
              </div>
              <div className="relative min-w-[140px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-fit rounded-none px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-sm bg-white appearance-none cursor-pointer gap-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin mb-4"></div>
                <p className="text-stone-600 font-medium">Loading your orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-stone-400" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-3">
                  {searchQuery || statusFilter !== 'all' ? 'No Orders Found' : 'No Orders Yet'}
                </h3>
                <p className="text-stone-600 mb-8 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'Start shopping to see your orders here.'}
                </p>
                <button
                  onClick={onClose}
                  className="bg-stone-700 hover:bg-stone-800 text-white px-8 py-3 rounded-xl font-serif font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border-2 border-stone-200 hover:border-stone-300 transition-all hover:shadow-md overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-stone-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
<h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">#{order.id}</h3>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 mb-2">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span>{new Date(order.date).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(order.status)} w-fit`}>
                                {order.status.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-3 text-xs sm:text-sm">
                                <span className="text-stone-600">
                                  {order.items} item{order.items > 1 ? 's' : ''}
                                </span>
                                <span className="font-bold text-base sm:text-lg text-stone-900">
                                  {formatCurrency(order.total, storeSettings, currencies)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="bg-stone-700 hover:bg-stone-800 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-serif font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg flex-shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden text-xs">View</span>
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