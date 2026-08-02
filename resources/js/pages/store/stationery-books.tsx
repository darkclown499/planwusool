import React from 'react';
import { StationeryBooksStore } from '../../themes/stationery-books-store/StationeryBooksStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const StationeryBooks: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Stationery & Books Store" />
      <StationeryBooksStore {...props} />
    </>
  );
};

export default StationeryBooks;
