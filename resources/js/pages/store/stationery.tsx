import React from 'react';
import { StationeryStore } from '../../themes/stationery-store/StationeryStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Stationery: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Stationery Store" />
      <StoreBoundary>        <StationeryStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Stationery;
