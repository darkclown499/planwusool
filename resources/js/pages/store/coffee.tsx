import React from 'react';
import { CoffeeStore } from '../../themes/coffee-store/CoffeeStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Coffee: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Coffee Store" />
      <StoreBoundary>        <CoffeeStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Coffee;
