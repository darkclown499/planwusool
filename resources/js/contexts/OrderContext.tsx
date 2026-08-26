import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Order {
  id: string;
  date: string;
  status: string;
  total: number;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface OrderContextType {
  userOrders: any[];
  loadingOrders: boolean;
  selectedOrderId: string | null;
  showOrderDetailsModal: boolean;
  showOrderSuccess: boolean;
  orderNumber: string;
  setSelectedOrderId: (id: string | null) => void;
  setShowOrderDetailsModal: (show: boolean) => void;
  setShowOrderSuccess: (show: boolean) => void;
  setOrderNumber: (orderNumber: string) => void;
  loadUserOrders: () => Promise<void>;
  handleViewOrder: (orderNumber: string) => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

interface OrderProviderProps {
  children: ReactNode;
  storeId?: string | number;
  isLoggedIn?: boolean;
  paymentStatus?: string;
  orderNumber?: string;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ 
  children, 
  storeId, 
  isLoggedIn = false,
  paymentStatus,
  orderNumber: initialOrderNumber
}) => {
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '');
  
  // Handle initial payment status — one-time consumption, URL params cleaned by TemplateStorefrontV2.
  // This effect remains for SSR-injected props fallback but also respects consumed marker.
  useEffect(() => {
    if (paymentStatus === 'success' && initialOrderNumber) {
      try {
        const marker = `${initialOrderNumber}:success`;
        const consumed = sessionStorage.getItem('wusool_order_success_consumed');
        if (consumed === marker) return;
        sessionStorage.setItem('wusool_order_success_consumed', marker);
      } catch {}
      setOrderNumber(initialOrderNumber);
      setShowOrderSuccess(true);
    }
  }, [paymentStatus, initialOrderNumber]);

  const loadUserOrders = async () => {
    if (!storeId) return;
    
    setLoadingOrders(true);
    try {
      const response = await fetch(`${route('api.orders.index')}?store_id=${storeId}`, {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Auto-load when authenticated state changes or storeId becomes available
  useEffect(() => {
    if (storeId) {
      loadUserOrders();
    }
  }, [storeId, isLoggedIn]);

  const handleViewOrder = (orderNumber: string) => {
    setSelectedOrderId(orderNumber);
    setShowOrderDetailsModal(true);
  };

  const value: OrderContextType = {
    userOrders,
    loadingOrders,
    selectedOrderId,
    showOrderDetailsModal,
    showOrderSuccess,
    orderNumber,
    setSelectedOrderId,
    setShowOrderDetailsModal,
    setShowOrderSuccess,
    setOrderNumber,
    loadUserOrders,
    handleViewOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};