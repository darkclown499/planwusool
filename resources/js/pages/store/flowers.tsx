import React from 'react';
import { FlowersStore } from '../../themes/flowers-store/FlowersStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Flowers: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Flowers Store" />
      <StoreBoundary>        <FlowersStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Flowers;
