import React from 'react';
import { ToyStore } from '../../themes/toy-store/ToyStore';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

interface ToyStorePageProps {
  config: any;
  categories: any[];
  products: any[];
  store?: any;
  isLoggedIn?: boolean;
  customer?: any;
  customer_address?: any[];
  showResetModal?: boolean;
  resetToken?: string;
  payment_status?: string;
  order_number?: string;
}

export default function ToyStorePage(props: ToyStorePageProps) {
  return (
    <>
      <StoreHead
        store={props.store}
        defaultTitle={props.config?.storeName || 'Toy Store'}
        defaultDescription="Fun and colorful toy store with educational toys, games, and activities for children of all ages."
        defaultKeywords="toys, games, educational toys, children toys, kids games, puzzles, action figures, dolls"
      />
      <StoreBoundary>        <ToyStore {...props} />      </StoreBoundary>
    </>
  );
}
