import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Save, Loader2, CheckCircle2, XCircle, History, RotateCcw, ExternalLink, Code2, FileCode2, User, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import CodeEditor from '@/components/code-editor';
import { apiPut, apiPost } from '@/utils/api';
import { AccordionSection } from '@/components/accordion-section';
import { formatLocalDate } from '@/utils/date-helper';

interface Revision {
  id: number;
  key: string;
  previous_value: string;
  new_value: string;
  reason: string;
  created_at: string;
  user: string | null;
}

interface Props {
  store: any;
  settings: any;
  revisions: Revision[];
}

const REASON_LABELS: Record<string, string> = {
  manual: 'Manual',
  autosave: 'Autosave',
  revert: 'Revert',
  reset: 'Reset',
};

const REASON_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  manual: 'default',
  autosave: 'secondary',
  revert: 'outline',
  reset: 'destructive',
};

export default function StoreAppearance({ store, settings, revisions = [] }: Props) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(settings || {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [resetting, setResetting] = useState(false);
  const [revertingId, setRevertingId] = useState<number | null>(null);

  useEffect(() => {
    setFormData(settings || {});
    setDirty(false);
  }, [settings]);

  const updateField = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
    setAutoSaveState('idle');
  };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    router.put(route('stores.appearance.update', store.id), formData, {
      preserveScroll: true,
      onFinish: () => {
        setSaving(false);
        setDirty(false);
        setAutoSaveState('saved');
      },
    });
  };

  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(() => {
      setAutoSaveState('saving');
      apiPut(route('stores.appearance.autosave', store.id), formData)
        .then(() => setAutoSaveState('saved'))
        .catch(() => setAutoSaveState('error'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, dirty, saving, store.id]);

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    apiPost(route('stores.appearance.reset', store.id))
      .catch(() => {})
      .finally(() => {
        setResetting(false);
        router.reload();
      });
  };

  const handleRevert = (revisionId: number) => {
    if (revertingId) return;
    setRevertingId(revisionId);
    apiPost(route('stores.appearance.revisions.revert', [store.id, revisionId]))
      .catch(() => {})
      .finally(() => {
        setRevertingId(null);
        router.reload();
      });
  };

  const viewStoreUrl = () => {
    const protocol = window.location.protocol;
    if (store.enable_custom_domain && store.custom_domain) {
      return `${protocol}//${store.custom_domain}`;
    }
    if (store.enable_custom_subdomain && store.custom_subdomain) {
      const currentHost = window.location.hostname;
      const baseDomain = currentHost.includes('localhost')
        ? 'localhost'
        : currentHost.split('.').slice(-2).join('.');
      return `${protocol}//${store.custom_subdomain}.${baseDomain}`;
    }
    return route('store.home', store.slug);
  };

  const pageActions = [
    {
      label: t('View Store'),
      icon: <ExternalLink className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => window.open(viewStoreUrl(), '_blank'),
    },
    {
      label: saving ? t('Saving...') : t('Save Changes'),
      icon: saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSave,
      disabled: saving,
    },
  ];

  return (
    <PageTemplate
      title={t('Store Appearance')}
      url={`/stores/${store.id}/appearance`}
      description={t('Customize your application\'s branding and appearance')}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Store Appearance') },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          {autoSaveState === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">{t('Auto-saving draft...')}</span></>}
          {autoSaveState === 'saved' && <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> <span className="text-green-600">{t('Draft saved automatically')}</span></>}
          {autoSaveState === 'error' && <><XCircle className="h-3.5 w-3.5 text-red-500" /> <span className="text-red-500">{t('Auto-save failed, please save manually')}</span></>}
        </div>
        {dirty && !saving && <span className="text-xs text-muted-foreground">{t('Unsaved changes')}</span>}
      </div>

      <AccordionSection
        title={t('Custom CSS & JavaScript')}
        icon={<Code2 className="h-4 w-4" />}
        subtitle={t('Add custom CSS and JavaScript to customize your store appearance and functionality.')}
        defaultOpen
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="custom_css" className="flex items-center gap-1.5 mb-2">
              <FileCode2 className="h-3.5 w-3.5" />
              {t('Custom CSS')}
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              {t('Add custom CSS styles to modify your store appearance. Maximum 50,000 characters.')}
            </p>
            <CodeEditor
              value={formData.custom_css || ''}
              onChange={(value) => updateField('custom_css', value)}
              language="css"
              height="300px"
              placeholder={t('Add your custom CSS here')}
            />
          </div>

          <div>
            <Label htmlFor="custom_javascript" className="flex items-center gap-1.5 mb-2">
              <Code2 className="h-3.5 w-3.5" />
              {t('Custom JavaScript')}
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              {t('Add custom JavaScript code to enhance your store functionality. Maximum 50,000 characters.')}
            </p>
            <CodeEditor
              value={formData.custom_javascript || ''}
              onChange={(value) => updateField('custom_javascript', value)}
              language="javascript"
              height="300px"
              placeholder={t('Add your custom JavaScript here')}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span>{t('Reset custom CSS and JavaScript to their default (empty) values.')}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              <Loader2 className={`h-4 w-4 me-1 ${resetting ? 'animate-spin' : ''}`} />
              {t('Reset Custom Code')}
            </Button>
          </div>
        </div>
      </AccordionSection>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t('Revision History')}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('Every change to your custom code is saved here, so you can restore a previous version at any time.')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('No revisions yet.')}
              </p>
            ) : (
              <div className="space-y-3">
                {revisions.map((revision) => (
                  <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{revision.key === 'custom_css' ? t('Custom CSS') : t('Custom JavaScript')}</Badge>
                        <Badge variant={REASON_VARIANTS[revision.reason] || 'outline'}>
                          {t(REASON_LABELS[revision.reason] || 'Manual')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {revision.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {revision.user}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLocalDate(revision.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevert(revision.id)}
                      disabled={revertingId !== null}
                    >
                      {revertingId === revision.id && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
                      <RotateCcw className="h-4 w-4 me-1" />
                      {t('Restore this version')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
