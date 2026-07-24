import React from 'react';
import { formatCurrency } from '../../../utils/currency-formatter';
import { X, Package, Search, Filter, Wrench, Calendar, DollarSign, Eye } from 'lucide-react';
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
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  
  const statusOptions = ['all', ...Array.from(new Set(orders.map(order => order.status.toLowerCase())))];
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
        return 'bg-green-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-slate-800 w-full max-w-5xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col border-2 border-red-600" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="bg-black text-white p-3 sm:p-4 border-b-2 border-red-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 flex items-center justify-center">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">ORDER HISTORY</h2>
                  <div className="text-red-400 text-xs sm:text-sm font-bold">PARTS & ACCESSORIES</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-slate-900 p-3 sm:p-4 border-b border-slate-700">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="SEARCH ORDER NUMBER..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold uppercase"
                />
              </div>
              <div className="relative min-w-[140px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-fit rounded-none px-3 py-2 bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold uppercase appearance-none cursor-pointer gap-3">
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
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-slate-600 border-t-red-600 animate-spin mb-4"></div>
                <p className="text-white font-bold">LOADING ORDERS...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 border-2 border-slate-700 flex items-center justify-center mx-auto mb-6">
                  <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 uppercase">
                  {searchQuery || statusFilter !== 'all' ? 'NO ORDERS FOUND' : 'NO ORDERS YET'}
                </h3>
                <p className="text-slate-300 mb-8 max-w-sm mx-auto text-sm sm:text-base">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'ADJUST SEARCH OR FILTER CRITERIA' 
                    : 'START SHOPPING FOR AUTOMOTIVE PARTS'}
                </p>
                <button
                  onClick={onClose}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-bold transition-colors text-sm sm:text-base"
                >
                  CONTINUE SHOPPING
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-slate-900 border-2 border-slate-700 hover:border-red-600 transition-all">
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm sm:text-base mb-1">ORDER #{order.id}</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>{new Date(order.date).toLocaleDateString()}</span>
                              </div>
                              <span className={`px-2 py-1 text-xs font-bold w-fit ${getStatusColor(order.status)}`}>
                                {order.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs sm:text-sm">
                              <span className="text-slate-300">
                                {order.items} PART{order.items > 1 ? 'S' : ''}
                              </span>
                              <div className="flex items-center gap-1 text-red-400 font-bold">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(order.total, storeSettings, currencies)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 font-bold transition-colors flex items-center gap-2 text-xs sm:text-sm flex-shrink-0"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">VIEW DETAILS</span>
                          <span className="sm:hidden">VIEW</span>
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