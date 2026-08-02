import React from 'react';
import { ClothingStore } from '../../themes/clothing-store/ClothingStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Clothing: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Clothing Store" />
      <ClothingStore {...props} />
    </>
  );
};

export default Clothing;
