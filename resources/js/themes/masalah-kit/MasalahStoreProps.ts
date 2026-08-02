export interface MasalahStoreProps {
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
  action?: string | null;
}
