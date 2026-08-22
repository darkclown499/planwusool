import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { BadgeCheck, Check, Eye, LayoutGrid, Loader2, Palette } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiPut } from '@/utils/api';
import { StoreSite, TEMPLATES, getTemplateCategories } from '@/builder';
import { getDemoCatalog } from '@/builder/demo-catalogs';
import type { BuilderTemplateConfig } from '@/builder/types';

type Props = {
  store: any;
  availableThemes?: string[];
};

/** Build a fake store payload so previews render real niche content. */
const buildDemoStoreData = (tpl: BuilderTemplateConfig) => {
  const catalog = getDemoCatalog(tpl.slug);
  return {
    id: 0,
    name: `معاينة ${tpl.name}`,
    slug: 'theme-preview',
    categories: catalog.categories,
    products: catalog.products,
    config: { storeName: tpl.name },
    content: {},
    offers: [],
    pages: [],
    behavior: {},
  };
};

export default function StoreThemesGallery({ store }: Props) {
  const [applying, setApplying] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('الكل');
  // Locally-tracked active template so badges move instantly after apply.
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || 'classic');

  const categories = useMemo(() => ['الكل', ...getTemplateCategories()], []);
  const templates = useMemo(
    () => (filter === 'الكل' ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter)),
    [filter]
  );

  const isActive = (slug: string) =>
    activeTheme ? activeTheme === slug : slug === 'classic';

  const previewTpl = useMemo(
    () => (previewSlug ? TEMPLATES.find((t) => t.slug === previewSlug) || null : null),
    [previewSlug]
  );

  const applyTheme = async (tpl: BuilderTemplateConfig) => {
    setApplying(tpl.slug);
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
      setApplying(null);
    }
  };

  return (
    <PageTemplate title="قالب المتجر" url={`/stores/${store.id}/templates`}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
            <Palette className="h-7 w-7 text-emerald-500" />
            قوالب المتجر
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            اختر من {TEMPLATES.length} قالباً عربياً متخصصاً — كلها مجانية وقابلة للتخصيص بالكامل من المصمم المرئي.
          </p>
        </div>

        {/* Specialty filter chips */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <LayoutGrid className="me-1 h-4 w-4 text-gray-400" />
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                filter === c
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white text-gray-500 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => {
            const active = isActive(tpl.slug);
            return (
              <div
                key={tpl.slug}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                {/* CSS mini-thumbnail from the template's own gradient */}
                <button
                  type="button"
                  onClick={() => setPreviewSlug(tpl.slug)}
                  className="relative block h-40 w-full overflow-hidden text-start"
                  style={{ background: tpl.preview }}
                  aria-label={`معاينة قالب ${tpl.name}`}
                >
                  <span
                    className="absolute inset-x-6 top-5 h-3 rounded-full bg-white/60"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-x-6 top-11 grid grid-cols-3 gap-2"
                    aria-hidden="true"
                  >
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="block h-14 rounded-xl bg-white/45" />
                    ))}
                  </span>
                  <span className="absolute bottom-4 right-5 text-xl font-black text-white drop-shadow-md">
                    {tpl.name}
                  </span>
                  <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                    <Eye className="h-3 w-3" />
                    معاينة حية
                  </span>
                  {active && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow">
                      <BadgeCheck className="h-3 w-3" />
                      الحالي
                    </span>
                  )}
                </button>

                {/* Card body */}
                <div className="flex flex-grow flex-col p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-gray-900">{tpl.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {tpl.description}
                  </p>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    {active ? (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        <Check className="me-1 h-3.5 w-3.5 text-emerald-600" />
                        القالب الحالي
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => applyTheme(tpl)}
                        disabled={applying !== null}
                      >
                        {applying === tpl.slug ? (
                          <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="me-1 h-3.5 w-3.5" />
                        )}
                        تطبيق القالب
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewSlug(tpl.slug)}
                      disabled={applying !== null}
                    >
                      <Eye className="me-1 h-3.5 w-3.5" />
                      معاينة
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full live-preview modal */}
      <Dialog open={!!previewTpl} onOpenChange={(open) => !open && setPreviewSlug(null)}>
        <DialogContent className="max-w-[min(1100px,96vw)] overflow-hidden p-0" dir="rtl">
          {previewTpl && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>معاينة قالب {previewTpl.name}</DialogTitle>
                <DialogDescription>{previewTpl.description}</DialogDescription>
              </DialogHeader>
              {/* Sticky action bar */}
              <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/5"
                    style={{ background: previewTpl.preview }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900">
                      معاينة حية — قالب «{previewTpl.name}»
                    </p>
                    <p className="text-[11px] text-gray-400">
                      تخصص: {previewTpl.category} · محتوى تجريبي لأغراض الاستعراض
                    </p>
                  </div>
                </div>
                {isActive(previewTpl.slug) ? (
                  <Button variant="outline" size="sm" disabled>
                    <Check className="me-1 h-4 w-4 text-emerald-600" />
                    القالب الحالي
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => applyTheme(previewTpl)}
                    disabled={applying !== null}
                  >
                    {applying === previewTpl.slug ? (
                      <Loader2 className="me-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="me-1 h-4 w-4" />
                    )}
                    تطبيق هذا القالب
                  </Button>
                )}
              </div>
              {/* Scrollable storefront preview */}
              <div className="max-h-[78vh] overflow-y-auto bg-slate-50">
                <StoreSite
                  template={previewTpl.slug}
                  storeData={buildDemoStoreData(previewTpl)}
                  mode="home"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
