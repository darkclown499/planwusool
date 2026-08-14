import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';

interface StoreHeadProps {
  store: any;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultKeywords?: string;
}

export default function StoreHead({ store, defaultTitle, defaultDescription, defaultKeywords }: StoreHeadProps) {
  const title = store?.seo_title || store?.name || defaultTitle || 'Wusool Store';
  const description = store?.seo_description || defaultDescription || store?.description || '';
  const keywords = store?.seo_keywords || defaultKeywords || '';

  useEffect(() => {
    // Name the browser tab after the store (seo_title, then store name) so tabs
    // never fall back to the app name or a generic template label.
    document.title = title;
  }, [title]);

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
    </Head>
  );
}
