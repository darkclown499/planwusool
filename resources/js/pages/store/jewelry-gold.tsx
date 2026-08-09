import React from 'react';
import { JewelryGoldStore } from '../../themes/jewelry-gold-store/JewelryGoldStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const JewelryGold: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Gold Jewelry Store" />
      <StoreBoundary>        <JewelryGoldStore {...props} />      </StoreBoundary>
    </>
  );
};

export default JewelryGold;
