import React, { useMemo, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, LayoutTemplate, Paintbrush, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';
import { AdvancedBuilder } from '@/templates/AdvancedBuilder';
import type { PlanTier, TemplateConfig } from '@/templates/types';

interface StoreProps {
  id: number;
  name: string;
  slug: string;
  theme: string;
  template_slug: string;
  design_tokens?: any;
  store_url: string;
}

interface TemplateProps {
  slug: string;
  name: string;
  name_en?: string;
  description?: string;
  category: string;
  is_free: boolean;
  plan_required: string;
  design_tokens?: any;
  sections?: any[];
  layout?: any;
}

interface Props {
  store: StoreProps;
  currentTemplate?: TemplateProps | null;
  userPlanName?: string | null;
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
  demoStoreUrl?: string;
}

export default function StoreAppearance({
  store,
  currentTemplate,
  userPlanName,
  userPlanTier = 'starter',
  isSuperAdmin = false,
}: Props) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const templateConfig = useMemo<TemplateConfig | null>(() => {
    if (!currentTemplate) return null;
    return {
      slug: currentTemplate.slug,
      name: currentTemplate.name,
      name_en: currentTemplate.name_en,
      description: currentTemplate.description,
      category: currentTemplate.category,
      is_free: currentTemplate.is_free,
      plan_required: (currentTemplate.plan_required as PlanTier) || 'professional',
      sections: currentTemplate.sections || [],
      layout: currentTemplate.layout || { container: 'container mx-auto px-4', spacing: 'normal' },
      design_tokens: currentTemplate.design_tokens || {},
    };
  }, [currentTemplate]);

  // Merge the store's token overrides with the template defaults (deep merge
  // per group) so the editor always starts from the effective design tokens.
  const mergedDesignTokens = useMemo(() => {
    const defaults = (templateConfig?.design_tokens || {}) as Record<string, Record<string, string>>;
    const overrides = (store.design_tokens || {}) as Record<string, Record<string, string>>;
    return {
      colors: { ...(defaults.colors || {}), ...(overrides.colors || {}) },
      typography: { ...(defaults.typography || {}), ...(overrides.typography || {}) },
      spacing: { ...(defaults.spacing || {}), ...(overrides.spacing || {}) },
    };
  }, [templateConfig, store.design_tokens]);

  const previewUrl = useMemo(
    () => `${store.store_url}?v=${reloadKey}`,
    [store.store_url, reloadKey]
  );

  const handleSaved = () => {
    // Refresh the live preview so the saved design tokens are applied
    setReloadKey((k) => k + 1);
  };

  return (
    <PageTemplate
      title={t('Store Customization')}
      url={`/stores/${store.id}/appearance`}
      description={t('Customize your store colors, fonts, and spacing with the template editor.')}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Store Customization') },
      ]}
      action={
        <Button asChild variant="outline">
          <Link href={route('stores.template-select', store.id)}>
            <LayoutTemplate className="h-4 w-4 me-1" />
            {t('Change Template')}
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Current template summary */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <Paintbrush className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {currentTemplate ? currentTemplate.name : store.template_slug}
                </p>
                <p className="text-sm text-gray-500">
                  {currentTemplate?.description || t('No template configured yet.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              >
                <RefreshCw className="h-3.5 w-3.5 me-1" />
                {t('Refresh Preview')}
              </Button>
              <a
                href={store.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('Open Store')}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Editor + Live preview */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Advanced builder */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Template Editor')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedBuilder
                template={templateConfig}
                storeId={store.id}
                designTokens={mergedDesignTokens}
                userPlanName={userPlanName}
                userPlanTier={userPlanTier}
                isSuperAdmin={isSuperAdmin}
                onSave={handleSaved}
              />
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{t('Live Preview')}</CardTitle>
              <a
                href={store.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                {store.store_url}
              </a>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <iframe
                  key={reloadKey}
                  ref={iframeRef}
                  src={previewUrl}
                  title={`${store.name} preview`}
                  className="h-[34rem] w-full bg-white"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 px-1 text-xs text-gray-400">
                {t('Preview updates after saving. For a full experience, open the store in a new tab.')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
