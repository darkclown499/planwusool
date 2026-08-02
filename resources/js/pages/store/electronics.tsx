import React from 'react';
import { ElectronicsStore } from '../../themes/electronics-store/ElectronicsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Electronics: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Electronics Store" />
      <ElectronicsStore {...props} />
    </>
  );
};

export default Electronics;
