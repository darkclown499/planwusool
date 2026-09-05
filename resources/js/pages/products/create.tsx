import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import UpgradeModal from '@/components/UpgradeModal';
import ProductForm from './ProductForm';

export default function CreateProduct() {
  const { t } = useTranslation();
  const { categories, taxes, errors, planLimits, planTiers } = usePage().props as any;
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <PageTemplate
      title={t('Create Product')}
      url="/products/create"
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Create Product') },
      ]}
    >
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} limitType="resource" current={planLimits?.current_products} max={planLimits?.max_products} tiers={planTiers} />
      {planLimits && !planLimits.can_create && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm"><strong>{t('Product limit reached')}:</strong> {t('You have {{current}}/{{max}} products.', { current: planLimits.current_products, max: planLimits.max_products })} <button onClick={() => setShowUpgrade(true)} className="font-semibold underline">{t('Upgrade your plan')}</button></div>
        </div>
      )}
      <ProductForm mode="create" categories={categories} taxes={taxes} errors={errors || {}} planLimits={planLimits} />
    </PageTemplate>
  );
}
