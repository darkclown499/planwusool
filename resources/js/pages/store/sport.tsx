import React from 'react';
import { SportStore } from '../../themes/sport-store/SportStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Sport: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Sport Store" />
      <SportStore {...props} />
    </>
  );
};

export default Sport;
