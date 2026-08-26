import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import ProductForm from './ProductForm';

export default function EditProduct() {
  const { t } = useTranslation();
  const { product, categories, taxes, errors } = usePage().props as any;
  return (
    <PageTemplate
      title={t('Edit Product')}
      url="/products/edit"
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Edit Product') },
      ]}
    >
      <ProductForm mode="edit" product={product} categories={categories} taxes={taxes} errors={errors || {}} />
    </PageTemplate>
  );
}
