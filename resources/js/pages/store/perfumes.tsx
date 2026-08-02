import React from 'react';
import { PerfumesStore } from '../../themes/perfumes-store/PerfumesStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Perfumes: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Perfumes Store" />
      <PerfumesStore {...props} />
    </>
  );
};

export default Perfumes;
