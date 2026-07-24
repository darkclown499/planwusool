import React from 'react';
import { Head } from '@inertiajs/react';
import { FashionStore } from '../../themes/fashion-store/FashionStore';
import { BaseThemeProps } from '../../types/theme';

const Fashion: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <Head title="Fashion Store" />
      <FashionStore {...props} />
    </>
  );
};

export default Fashion;