import React from 'react';
import { JewelryGoldStore } from '../../themes/jewelry-gold-store/JewelryGoldStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const JewelryGold: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Gold Jewelry Store" />
      <JewelryGoldStore {...props} />
    </>
  );
};

export default JewelryGold;
