import React from 'react';
import { Head } from '@inertiajs/react';

interface StoreHeadProps {
  store: any;
  defaultTitle?: string;
}

export default function StoreHead({ store, defaultTitle }: StoreHeadProps) {
  const title = store?.seo_title || defaultTitle || store?.name || 'Wusool Store';

  return <Head title={title} />;
}
