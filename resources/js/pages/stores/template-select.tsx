import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, Store as StoreIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { TemplateGallery } from '@/templates/TemplateGallery';
import type { PlanTier } from '@/templates/types';

interface StoreProps {
  id: number;
  name: string;
  slug: string;
  theme: string;
  template_slug: string;
  store_url: string;
}

interface TemplateProps {
  slug: string;
  name: string;
  name_en: string;
  description: string;
  category: string;
  is_free: boolean;
  plan_required: string;
  design_tokens: any;
}

interface Props {
  store: StoreProps;
  templates: TemplateProps[];
  userPlanName?: string | null;
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
  demoStoreUrl?: string;
}

export default function TemplateSelect({
  store,
  userPlanName,
  userPlanTier = 'starter',
  isSuperAdmin = false,
  demoStoreUrl = '',
}: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (slug: string) => {
    setSelected(slug);
  };

  const handleSave = () => {
    if (!selected || saving) return;
    setSaving(true);
    router.put(
      route('stores.template-select.update', store.id),
      { template_slug: selected },
      {
        preserveScroll: true,
        onFinish: () => setSaving(false),
      }
    );
  };

  return (
    <PageTemplate
      title={t('Choose Template')}
      url={`/stores/${store.id}/template-select`}
      description={t('Pick a template that fits your business. You can change it anytime.')}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Choose Template') },
      ]}
      action={
        selected ? (
          <Button onClick={handleSave} disabled={saving}>
            <CheckCircle2 className="h-4 w-4 me-1" />
            {saving ? t('Saving...') : t('Save Template')}
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Current store summary */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <StoreIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{store.name}</p>
                <p className="text-sm text-gray-500" dir="ltr">{store.store_url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                القالب الحالي: {store.template_slug}
              </span>
              <a
                href={store.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('View Store')}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Template gallery */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Available Templates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateGallery
              currentSlug={store.template_slug}
              userPlanName={userPlanName}
              userPlanTier={userPlanTier}
              isSuperAdmin={isSuperAdmin}
              demoStoreUrl={demoStoreUrl}
              onSelect={handleSelect}
            />
          </CardContent>
        </Card>

        {selected && (
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
            >
              {t('Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 me-1" />
              {saving ? t('Saving...') : t('Save Template')}
            </Button>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
