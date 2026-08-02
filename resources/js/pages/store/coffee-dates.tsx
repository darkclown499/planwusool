import React from 'react';
import { CoffeeDatesStore } from '../../themes/coffee-dates-store/CoffeeDatesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const CoffeeDates: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Coffee & Dates Store" />
      <CoffeeDatesStore {...props} />
    </>
  );
};

export default CoffeeDates;
