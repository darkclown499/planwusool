import React from 'react';
import { FoodStore } from '../../themes/food-store/FoodStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Food: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Food Store" />
      <StoreBoundary>        <FoodStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Food;
