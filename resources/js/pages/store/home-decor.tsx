import React from 'react';
import { HomeDecorStore } from '../../themes/home-decor-store/HomeDecorStore';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

interface HomeDecorPageProps {
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
  theme?: string;
  storeSettings?: any;
  currencies?: any[];
  countries?: any[];
  storeCurrency?: any;
}

const HomeDecorPage: React.FC<HomeDecorPageProps> = (props) => {
  return (
    <>
      <StoreHead
        store={props.store}
        defaultTitle={`${props.config?.storeName || 'Home Decor'} - Premium Home Décor & Furniture`}
        defaultDescription="Transform your living space with our curated collection of premium furniture and home décor pieces."
        defaultKeywords="furniture, home decor, interior design, living room, bedroom, dining room"
      />
      <StoreBoundary>        <HomeDecorStore {...props} />      </StoreBoundary>
    </>
  );
};

export default HomeDecorPage;
