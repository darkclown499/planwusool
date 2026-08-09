import React from 'react';
import { KidsStore } from '../../themes/kids-store/KidsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Kids: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Kids Store" />
      <StoreBoundary>        <KidsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Kids;
