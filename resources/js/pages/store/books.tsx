import React from 'react';
import { BooksStore } from '../../themes/books-store/BooksStore';
import { BaseThemeProps } from '../../types/theme';
import StoreHead from '@/components/StoreHead';

const Books: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <StoreHead store={props.store} defaultTitle="Wusool - Books Store" />
      <BooksStore {...props} />
    </>
  );
};

export default Books;
