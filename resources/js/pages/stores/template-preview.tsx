import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { StoreSite, TEMPLATES, buildPreviewStoreData, type StoreBranding } from '@/builder';

interface Props {
  store: any;
  templateSlug: string;
  storeBranding?: StoreBranding;
}

/**
 * Standalone, full-page template preview. Opened in its own browser tab
 * from the templates gallery so merchants can inspect a candidate theme
 * without losing the gallery in the original tab.
 */
export default function TemplatePreview({ store, templateSlug, storeBranding }: Props) {
  const [applying, setApplying] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || 'classic');

  const tpl = useMemo(
    () => TEMPLATES.find((t) => t.slug === templateSlug) || null,
    [templateSlug]
  );

  const isActive = tpl ? (activeTheme ? activeTheme === tpl.slug : tpl.slug === 'classic') : false;

  const storeData = useMemo(
    () => (tpl ? buildPreviewStoreData(tpl, store, storeBranding) : null),
    [tpl, store, storeBranding]
  );

  const applyTheme = async () => {
    if (!tpl) return;
    setApplying(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, {
        theme: tpl.slug,
        sections: tpl.sections,
        design_tokens: {
          colors: { ...tpl.tokens.colors },
          typography: { ...(tpl.tokens.typography || {}) },
          radius: tpl.tokens.radius,
        },
      });
      setActiveTheme(tpl.slug);
      toast.success('تم تطبيق القالب بنجاح', {
        description: `قالب «${tpl.name}» أصبح نشطاً على متجرك.`,
        action: {
          label: 'فتح المصمم',
          onClick: () => router.visit(`/stores/${store.id}/designer`),
        },
      });
    } catch (e) {
      console.error('Apply theme failed', e);
      toast.error('تعذر تطبيق القالب. حاول مرة أخرى.');
    } finally {
      setApplying(false);
    }
  };

  if (!tpl || !storeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-gray-500" dir="rtl">
        القالب غير موجود.
      </div>
    );
  }

  return (
    <div dir="rtl">
      <Head title={`معاينة قالب ${tpl.name}`} />
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/5"
            style={{ background: tpl.preview }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-gray-900">
              معاينة حية — قالب «{tpl.name}»
            </p>
            <p className="text-[11px] text-gray-400">
              تخصص: {tpl.category} · محتوى تجريبي لأغراض الاستعراض
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <Button variant="outline" size="sm" disabled>
              <Check className="me-1 h-4 w-4 text-emerald-600" />
              القالب الحالي
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={applyTheme}
              disabled={applying}
            >
              {applying ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-1 h-4 w-4" />
              )}
              تطبيق هذا القالب
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.close()}>
            <X className="me-1 h-4 w-4" />
            إغلاق
          </Button>
        </div>
      </div>
      {/* Full storefront preview */}
      <div className="bg-slate-50">
        <StoreSite template={tpl.slug} storeData={storeData} mode="home" />
      </div>
    </div>
  );
}
