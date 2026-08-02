import React from 'react';
import { SportsStore } from '../../themes/sports-store/SportsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Sports: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Sports Store" />
      <SportsStore {...props} />
    </>
  );
};

export default Sports;
