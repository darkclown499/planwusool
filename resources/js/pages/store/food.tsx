import React from 'react';
import { FoodStore } from '../../themes/food-store/FoodStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Food: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Food Store" />
      <FoodStore {...props} />
    </>
  );
};

export default Food;
