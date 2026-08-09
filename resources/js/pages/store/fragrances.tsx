import React from 'react';
import { FragrancesStore } from '../../themes/fragrances-store/FragrancesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Fragrances: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Fragrances Store" />
      <StoreBoundary>        <FragrancesStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Fragrances;
