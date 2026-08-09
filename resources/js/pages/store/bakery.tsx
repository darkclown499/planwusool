import React from 'react';
import { BakeryStore } from '../../themes/bakery-store/BakeryStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const BakeryPage: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead
        store={props.store}
        defaultTitle={`${props.config?.storeName || 'Bakery'} - Fresh Baked Goods & Delicious Cakes`}
        defaultDescription="Discover our freshly baked goods, custom cakes, and delicious pastries made with love and premium ingredients."
        defaultKeywords="bakery, cakes, pastries, bread, cupcakes, custom cakes, fresh baked goods"
      />
      <StoreBoundary>        <BakeryStore {...props} />      </StoreBoundary>
    </>
  );
};

export default BakeryPage;
