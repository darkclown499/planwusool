import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { BadgeCheck, Check, Eye, LayoutGrid, Loader2, Palette } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { TEMPLATES, getTemplateCategories } from '@/builder';
import { TemplateThumb } from '@/builder/TemplateThumb';
import type { BuilderTemplateConfig } from '@/builder/types';

interface StoreBranding {
  name?: string;
  logo?: string | null;
  phone?: string | null;
}

interface Props {
  store: any;
  /** Real merchant branding resolved server-side for realistic previews. */
  storeBranding?: StoreBranding;
  availableThemes?: string[];
}

export default function StoreThemesGallery({ store, storeBranding }: Props) {
  const [applying, setApplying] = useState<string | null>(null);
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

  // Opens the full live preview in a new browser tab instead of an
  // in-page modal, so merchants can compare templates side by side.
  const openPreview = (slug: string) => {
    window.open(`/stores/${store.id}/templates/${slug}/preview`, '_blank', 'noopener');
  };

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
                {/* Realistic mini-storefront rendered from the template's own
                    tokens and niche demo imagery. */}
                <button
                  type="button"
                  onClick={() => openPreview(tpl.slug)}
                  className="relative block h-48 w-full overflow-hidden text-start"
                  aria-label={`معاينة قالب ${tpl.name}`}
                >
                  <TemplateThumb tpl={tpl} storeName={storeBranding?.name || undefined} className="h-full w-full" />
                  <span className="absolute bottom-2 right-3 rounded-lg bg-black/45 px-2 py-0.5 text-sm font-black text-white backdrop-blur-sm">
                    {tpl.name}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-emerald-900/0 opacity-0 transition-all group-hover:bg-emerald-900/25 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-lg">
                      <Eye className="h-4 w-4" />
                      معاينة حية
                    </span>
                  </span>
                  {active && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                      <BadgeCheck className="h-3 w-3" />
                      نشط
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
                      onClick={() => openPreview(tpl.slug)}
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
    </PageTemplate>
  );
}
