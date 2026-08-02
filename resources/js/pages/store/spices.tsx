import React from 'react';
import { SpicesStore } from '../../themes/spices-store/SpicesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Spices: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Spices Store" />
      <SpicesStore {...props} />
    </>
  );
};

export default Spices;
