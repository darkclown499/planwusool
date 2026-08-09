import React from 'react';
import { SportStore } from '../../themes/sport-store/SportStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Sport: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Sport Store" />
      <StoreBoundary>        <SportStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Sport;
