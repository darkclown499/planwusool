import React from 'react';
import { StoreProvider } from '../../contexts/StoreContext';

// Theme-specific invoice components
import { OrderInvoice as GadgetsOrderInvoice } from '../../themes/gadgets-store/components/OrderInvoice';
import { OrderInvoice as FashionOrderInvoice } from '../../themes/fashion-store/components/OrderInvoice';
import { OrderInvoice as HomeDecorOrderInvoice } from '../../themes/home-decor-store/components/OrderInvoice';
import { OrderInvoice as BakeryOrderInvoice } from '../../themes/bakery-store/components/OrderInvoice';
import { OrderInvoice as SupermarketOrderInvoice } from '../../themes/supermarket-store/components/OrderInvoice';
import { OrderInvoice as CarAccessoriesOrderInvoice } from '../../themes/car-accessories-store/components/OrderInvoice';
import { OrderInvoice as ToyStoreOrderInvoice } from '../../themes/toy-store/components/OrderInvoice';

interface OrderInvoiceProps {
  orderNumber: string;
  order: {
    id: string;
    date: string;
    status: string;
    total: number;
    subtotal: number;
    tax: number;
    shipping: number;
    currency: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      image: string;
    }>;
  };
  config?: any;
  store?: any;
}

const OrderInvoiceContent: React.FC<Omit<OrderInvoiceProps, 'config' | 'store'>> = ({ orderNumber, order }) => {
  const store = (window as any).page?.props?.store || {};
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  
  // Determine theme from store or settings
  const currentTheme = store?.theme || storeSettings?.theme || 'gadgets';
  
  // Route to appropriate theme component
  switch (currentTheme) {
    case 'fashion':
      return <FashionOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'home-decor':
      return <HomeDecorOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'bakery':
      return <BakeryOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'supermarket':
      return <SupermarketOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'car-accessories':
      return <CarAccessoriesOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'toy':
      return <ToyStoreOrderInvoice orderNumber={orderNumber} order={order} />;
    case 'gadgets':
    default:
      return <GadgetsOrderInvoice orderNumber={orderNumber} order={order} />;
  }
};

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderNumber, order, config, store }) => {
  if (!config || !store) {
    return <OrderInvoiceContent orderNumber={orderNumber} order={order} />;
  }

  return (
    <StoreProvider config={config} store={store}>
      <OrderInvoiceContent orderNumber={orderNumber} order={order} />
    </StoreProvider>
  );
};

export default OrderInvoice;