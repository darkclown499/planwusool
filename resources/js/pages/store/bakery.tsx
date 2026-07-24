import React from 'react';
import { Head } from '@inertiajs/react';
import { BakeryStore } from '../../themes/bakery-store/BakeryStore';
import { BaseThemeProps } from '../../types/theme';

const BakeryPage: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <Head title={`${props.config.storeName} - Fresh Baked Goods & Delicious Cakes`}>
        <meta name="description" content="Discover our freshly baked goods, custom cakes, and delicious pastries made with love and premium ingredients." />
        <meta name="keywords" content="bakery, cakes, pastries, bread, cupcakes, custom cakes, fresh baked goods" />
      </Head>
      <BakeryStore {...props} />
    </>
  );
};

export default BakeryPage;