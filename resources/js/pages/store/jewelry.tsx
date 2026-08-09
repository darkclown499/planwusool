import React from 'react';
import { JewelryStore } from '../../themes/jewelry-store/JewelryStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Jewelry: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Jewelry Store" />
      <StoreBoundary>        <JewelryStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Jewelry;
