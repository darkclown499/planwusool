import React from 'react';
import { Head } from '@inertiajs/react';
import { ToyStore } from '../../themes/toy-store/ToyStore';

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
      <Head>
        <title>{props.config?.storeName || 'Toy Store'}</title>
        <meta name="description" content={props.config?.description || 'Fun and colorful toy store with educational toys, games, and activities for children of all ages.'} />
        <meta name="keywords" content="toys, games, educational toys, children toys, kids games, puzzles, action figures, dolls" />
      </Head>
      <ToyStore {...props} />
    </>
  );
}