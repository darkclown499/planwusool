import React from 'react';
import { FragrancesStore } from '../../themes/fragrances-store/FragrancesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Fragrances: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Fragrances Store" />
      <FragrancesStore {...props} />
    </>
  );
};

export default Fragrances;
