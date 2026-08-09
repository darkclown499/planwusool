import React from 'react';
import { CoffeeDatesStore } from '../../themes/coffee-dates-store/CoffeeDatesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const CoffeeDates: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Coffee & Dates Store" />
      <StoreBoundary>        <CoffeeDatesStore {...props} />      </StoreBoundary>
    </>
  );
};

export default CoffeeDates;
