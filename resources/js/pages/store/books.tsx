import React from 'react';
import { BooksStore } from '../../themes/books-store/BooksStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';
import StoreBoundary from '@/components/StoreBoundary';

const Books: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Books Store" />
      <StoreBoundary>        <BooksStore {...props} />      </StoreBoundary>
    </>
  );
};

export default Books;
