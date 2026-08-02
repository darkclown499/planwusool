import React from 'react';
import { CoffeeStore } from '../../themes/coffee-store/CoffeeStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Coffee: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Coffee Store" />
      <CoffeeStore {...props} />
    </>
  );
};

export default Coffee;
