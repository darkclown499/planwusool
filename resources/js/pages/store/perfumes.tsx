import React from 'react';
import { PerfumesStore } from '../../themes/perfumes-store/PerfumesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Perfumes: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Perfumes Store" />
      <StoreBoundary>        <PerfumesStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Perfumes;
