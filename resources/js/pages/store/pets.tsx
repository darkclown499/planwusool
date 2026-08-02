import React from 'react';
import { PetsStore } from '../../themes/pets-store/PetsStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Pets: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Pets Store" />
      <PetsStore {...props} />
    </>
  );
};

export default Pets;
