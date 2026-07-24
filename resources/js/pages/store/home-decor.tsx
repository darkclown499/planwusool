import React from 'react';
import { Head } from '@inertiajs/react';
import { HomeDecorStore } from '../../themes/home-decor-store/HomeDecorStore';

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
      <Head title={`${props.config.storeName} - Premium Home Décor & Furniture`}>
        <meta name="description" content="Transform your living space with our curated collection of premium furniture and home décor pieces." />
        <meta name="keywords" content="furniture, home decor, interior design, living room, bedroom, dining room" />
      </Head>
      <HomeDecorStore {...props} />
    </>
  );
};

export default HomeDecorPage;