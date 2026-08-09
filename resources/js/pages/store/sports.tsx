import React from 'react';
import { SportsStore } from '../../themes/sports-store/SportsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Sports: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Sports Store" />
      <StoreBoundary>        <SportsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Sports;
