import React from 'react';
import { BeautyStore } from '../../themes/beauty-store/BeautyStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Beauty: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Beauty Store" />
      <StoreBoundary>        <BeautyStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Beauty;
