import React, { useEffect, useRef } from 'react';
import { StoreProvider } from '../../contexts/StoreContext';
import { UnifiedInvoice } from '@/components/storefront/UnifiedInvoice';
import { initCommerceTracking, trackPurchase } from '@/tracking';

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
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current || !config || !store) return;
    bootedRef.current = true;

    // The invoice is a standalone page outside ThemeProvider, so initialize the
    // tracking layer imperatively. Durable store+order-scoped dedup guarantees no
    // double event when the customer reaches the invoice from the success modal
    // (even in a new tab or after a reload).
    initCommerceTracking({
      metaPixelId: config.meta_pixel_id || '',
      tiktokPixelId: config.tiktok_pixel_id || '',
      googleAnalyticsId: config.google_analytics_id || '',
      currencyCode: config.currency_code || 'ILS',
      storeSlug: typeof store === 'string' ? store : store?.slug,
    });
    trackPurchase(orderNumber, Number(order?.total || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, store]);

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