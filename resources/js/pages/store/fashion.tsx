import React from 'react';
import { FashionStore } from '../../themes/fashion-store/FashionStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Fashion: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Fashion Store" />
      <FashionStore {...props} />
    </>
  );
};

export default Fashion;
