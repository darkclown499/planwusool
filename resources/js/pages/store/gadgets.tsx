import React from 'react';
import { Head } from '@inertiajs/react';
import { GadgetsStore } from '../../themes/gadgets-store/GadgetsStore';
import { BaseThemeProps } from '../../types/theme';

const Gadgets: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <Head title="Gadgets Store" />
      <GadgetsStore {...props} />
    </>
  );
};

export default Gadgets;