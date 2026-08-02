import React from 'react';
import { CosmeticsStore } from '../../themes/cosmetics-store/CosmeticsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Cosmetics: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Cosmetics Store" />
      <CosmeticsStore {...props} />
    </>
  );
};

export default Cosmetics;
