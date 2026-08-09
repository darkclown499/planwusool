import React from 'react';
import { CosmeticsStore } from '../../themes/cosmetics-store/CosmeticsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Cosmetics: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Cosmetics Store" />
      <StoreBoundary>        <CosmeticsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Cosmetics;
