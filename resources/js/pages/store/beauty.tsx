import React from 'react';
import { BeautyStore } from '../../themes/beauty-store/BeautyStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Beauty: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Beauty Store" />
      <BeautyStore {...props} />
    </>
  );
};

export default Beauty;
