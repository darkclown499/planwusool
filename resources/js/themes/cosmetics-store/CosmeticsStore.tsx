import React from 'react';
import PWAProvider from '@/components/pwa/PWAProvider';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { MasalahThemeProvider, MasalahStore, MasalahStoreProps } from '../masalah-kit';
import { cosmeticsConfig } from './config';

export const CosmeticsStore: React.FC<MasalahStoreProps> = (props) => {
  return (
    <PWAProvider store={props.store}>
      <ThemeProvider
        config={props.config}
        store={props.store}
        categories={props.categories}
        products={props.products}
        isLoggedIn={props.isLoggedIn}
        customer={props.customer}
        customerAddress={props.customer_address}
        showResetModal={props.showResetModal}
        resetToken={props.resetToken}
        paymentStatus={props.payment_status}
        orderNumber={props.order_number}
        action={props.action}
      >
        <MasalahThemeProvider config={cosmeticsConfig}>
          <MasalahStore />
        </MasalahThemeProvider>
      </ThemeProvider>
    </PWAProvider>
  );
};
