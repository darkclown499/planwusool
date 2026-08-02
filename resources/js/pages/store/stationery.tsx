import React from 'react';
import { StationeryStore } from '../../themes/stationery-store/StationeryStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Stationery: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Stationery Store" />
      <StationeryStore {...props} />
    </>
  );
};

export default Stationery;
