import React from 'react';
import { GadgetsStore } from '../../themes/gadgets-store/GadgetsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Gadgets: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Gadgets Store" />
      <StoreBoundary>        <GadgetsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Gadgets;
