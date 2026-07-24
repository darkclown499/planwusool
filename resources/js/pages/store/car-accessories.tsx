import React from 'react';
import { Head } from '@inertiajs/react';
import { CarAccessoriesStore } from '../../themes/car-accessories-store/CarAccessoriesStore';
import { BaseThemeProps } from '../../types/theme';

const CarAccessories: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <Head title="Car Accessories Store" />
      <CarAccessoriesStore {...props} />
    </>
  );
};

export default CarAccessories;