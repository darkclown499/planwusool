import React from 'react';
import { FashionStore } from '../../themes/fashion-store/FashionStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Fashion: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Fashion Store" />
      <StoreBoundary>        <FashionStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Fashion;
