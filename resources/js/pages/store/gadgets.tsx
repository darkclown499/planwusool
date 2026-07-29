import React from 'react';
import { GadgetsStore } from '../../themes/gadgets-store/GadgetsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Gadgets: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Gadgets Store" />
      <GadgetsStore {...props} />
    </>
  );
};

export default Gadgets;
