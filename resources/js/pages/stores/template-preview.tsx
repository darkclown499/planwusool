import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { requireTemplateModule, V2PreviewProviders, buildV2PreviewStoreData } from '@/templates-v2';

interface Props {
  store: any;
  templateSlug: string;
  storeBranding?: Record<string, any>;
}

/**
 * Standalone full-page template preview (v2). Renders the merchant's own
 * branding wearing the resolved template module with sector-authentic demo
 * content — "your store, already running" — in its own browser tab.
 */
export default function TemplatePreview({ store, templateSlug, storeBranding }: Props) {
  const [applying, setApplying] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || '');

  const tpl = useMemo(() => requireTemplateModule(templateSlug), [templateSlug]);
  const isActive = activeTheme === tpl.meta.slug;

  const storeData = useMemo(
    () => buildV2PreviewStoreData(tpl, store, storeBranding),
    [tpl, store, storeBranding]
  );

  const applyTheme = async () => {
    setApplying(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, {
        theme: tpl.meta.slug,
      });
      setActiveTheme(tpl.meta.slug);
      toast.success('تم تطبيق القالب بنجاح', {
        description: `قالب «${tpl.meta.name}» أصبح نشطاً على متجرك.`,
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

  return (
    <div dir="rtl">
      <Head title={`معاينة قالب ${tpl.meta.name}`} />

      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/5"
            style={{ background: tpl.meta.preview }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-gray-900">
              معاينة حية — قالب «{tpl.meta.name}»
            </p>
            <p className="text-[11px] text-gray-400">
              تخصص: {tpl.meta.sector} · محتوى تجريبي لأغراض الاستعراض
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              القالب النشط
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={applying}
              onClick={applyTheme}
              style={{ backgroundColor: tpl.meta.accent }}
              className="gap-1.5 text-white hover:opacity-90"
            >
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              تطبيق على متجري
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => window.close()}>
            إغلاق المعاينة
          </Button>
        </div>
      </div>

      {/* The template itself, wearing the merchant's brand + demo catalog */}
      <V2PreviewProviders storeData={storeData}>
        <tpl.Root storeData={storeData} mode="home" isPreview />
      </V2PreviewProviders>
    </div>
  );
}
