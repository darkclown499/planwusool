import React from 'react';
import { PageTemplate } from '@/components/page-template';
import DomainsTab from './components/domains-tab';

interface Props {
  store: { id: number; name: string; slug: string };
}

export default function StoreDomainsPage({ store }: Props) {
  return (
    <PageTemplate
      title="الدومين"
      description="النطاق الفرعي، النطاق المخصص، تعليمات DNS والتحقق"
      url={`/stores/${store.id}/domains`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'الدومين' },
      ]}
    >
      <div className="mx-auto max-w-5xl">
        <DomainsTab storeId={Number(store.id)} />
      </div>
    </PageTemplate>
  );
}
