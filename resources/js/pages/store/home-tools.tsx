import React from 'react';
import { HomeToolsStore } from '../../themes/home-tools-store/HomeToolsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const HomeTools: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Home Tools Store" />
      <StoreBoundary>        <HomeToolsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default HomeTools;
