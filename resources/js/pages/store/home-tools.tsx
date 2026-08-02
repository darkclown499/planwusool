import React from 'react';
import { HomeToolsStore } from '../../themes/home-tools-store/HomeToolsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const HomeTools: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Home Tools Store" />
      <HomeToolsStore {...props} />
    </>
  );
};

export default HomeTools;
