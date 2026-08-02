import React from 'react';
import { KidsStore } from '../../themes/kids-store/KidsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Kids: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Kids Store" />
      <KidsStore {...props} />
    </>
  );
};

export default Kids;
