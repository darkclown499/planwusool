import React from 'react';
import { PharmacyStore } from '../../themes/pharmacy-store/PharmacyStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Pharmacy: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Pharmacy Store" />
      <StoreBoundary>        <PharmacyStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Pharmacy;
