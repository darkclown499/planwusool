import React from 'react';
import { SupermarketStore } from '../../themes/supermarket-store/SupermarketStore';

interface SupermarketPageProps {
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

export default function SupermarketPage(props: SupermarketPageProps) {
  return <SupermarketStore {...props} />;
}