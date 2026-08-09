import React from 'react';
import { PetsStore } from '../../themes/pets-store/PetsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Pets: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Pets Store" />
      <StoreBoundary>        <PetsStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Pets;
