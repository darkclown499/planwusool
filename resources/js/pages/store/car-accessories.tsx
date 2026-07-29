import React from 'react';
import { CarAccessoriesStore } from '../../themes/car-accessories-store/CarAccessoriesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const CarAccessories: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Car Accessories Store" />
      <CarAccessoriesStore {...props} />
    </>
  );
};

export default CarAccessories;
