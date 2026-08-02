import React from 'react';
import { FlowersStore } from '../../themes/flowers-store/FlowersStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Flowers: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Flowers Store" />
      <FlowersStore {...props} />
    </>
  );
};

export default Flowers;
