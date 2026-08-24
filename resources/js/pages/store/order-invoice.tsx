import React from 'react';
import { StoreProvider } from '../../contexts/StoreContext';
import { UnifiedInvoice } from '@/components/storefront/UnifiedInvoice';

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
    discount?: number;
    coupon?: string;
    currency: string;
    payment_method?: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    shipping_address: {
      name: string;
      address: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      image: string;
      tax_amount?: number;
      tax_name?: string;
      tax_percentage?: string;
      variants?: any;
    }>;
  };
  config?: any;
  store?: any;
}

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderNumber, order, config, store }) => {
  if (!config || !store) {
    // Fallback: render UnifiedInvoice without StoreProvider
    return <UnifiedInvoice orderNumber={orderNumber} order={order} />;
  }

  return (
    <StoreProvider config={config} store={store}>
      <UnifiedInvoice orderNumber={orderNumber} order={order} config={config} store={store} />
    </StoreProvider>
  );
};

export default OrderInvoice;