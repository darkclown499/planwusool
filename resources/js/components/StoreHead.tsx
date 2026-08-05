import React from 'react';
import { Head } from '@inertiajs/react';

interface StoreHeadProps {
  store: any;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultKeywords?: string;
}

export default function StoreHead({ store, defaultTitle, defaultDescription, defaultKeywords }: StoreHeadProps) {
  const title = store?.seo_title || defaultTitle || store?.name || 'Wusool Store';
  const description = store?.seo_description || defaultDescription || store?.description || '';
  const keywords = store?.seo_keywords || defaultKeywords || '';

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
    </Head>
  );
}
