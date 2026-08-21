import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, Eye, Loader2, Lock, Palette, X } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { canAccessTemplate, normalizeTemplateSlug, StoreSite, TEMPLATES } from '@/builder';
import type { BuilderTemplateConfig, PlanTier } from '@/builder/types';

type Props = {
  store: any;
  availableThemes?: string[];
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
};

/* Industry tag per template slug (used for the glassmorphism badge) */
const SECTOR_LABEL: Record<string, string> = {
  zen: 'عام',
  bazaar: 'مطاعم',
  rose: 'أزياء',
  ocean: 'تقنية',
  velvet: 'أزياء',
  fresh: 'مطاعم',
  night: 'عام',
  luxe: 'هدايا',
};

/* Category filter tabs + template membership */
const FILTERS = ['الكل', 'الأكثر مبيعاً', 'أزياء وموضة', 'إلكترونيات', 'مطاعم وأغذية'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_MAP: Record<string, Exclude<Filter, 'الكل'>> = {
  zen: 'الأكثر مبيعاً',
  night: 'الأكثر مبيعاً',
  luxe: 'الأكثر مبيعاً',
  rose: 'أزياء وموضة',
  velvet: 'أزياء وموضة',
  ocean: 'إلكترونيات',
  bazaar: 'مطاعم وأغذية',
  fresh: 'مطاعم وأغذية',
};

/* Pull the most representative high-res banner out of the template's hero */
const heroImageOf = (tpl: BuilderTemplateConfig): string => {
  const hero = tpl.sections.find((s) => s.type === 'hero');
  const props = (hero?.props || {}) as any;
  if (typeof props.image === 'string' && props.image) return props.image;
  const slides = Array.isArray(props.slides) ? props.slides : [];
  for (const s of slides) {
    if (s?.image) return String(s.image);
  }
  // Sector-appropriate fallbacks
  const fallbacks: Record<string, string> = {
    zen: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    bazaar: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    rose: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    ocean: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80',
    velvet: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    fresh: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    night: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    luxe: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80',
  };
  return fallbacks[tpl.slug] || fallbacks.zen;
};

const heroTitleOf = (tpl: BuilderTemplateConfig): string => {
  const hero = tpl.sections.find((s) => s.type === 'hero');
  const props = (hero?.props || {}) as any;
  return String(props.title || props.heading || tpl.name);
};

/* Exactly two key highlights per card */
const highlightsOf = (tpl: BuilderTemplateConfig): string[] => {
  const hero = tpl.sections.find((s) => s.type === 'hero');
  const hv = hero?.props?.hero_variant as string | undefined;
  const bullets: string[] = [];
  if (hv === 'video_bg') bullets.push('دعم الفيديو في الهيرو');
  else if (hv === 'slider_full' || hv === 'full_slider') bullets.push('سلايدر بانرات عالي الدقة');
  else if (hv === 'bento_grid') bullets.push('شبكة Bento متعددة الوسائط');
  else if (hv === 'split_banner') bullets.push('بانر مقسوم نص/صورة');
  else bullets.push('تصنيفات ومنتجات جاهزة بالكامل');
  bullets.push('متوافق مع الجوال 100%');
  return bullets.slice(0, 2);
};

/* Demo catalog so the full-screen live preview shows real content */
const DEMO_CATEGORIES = [
  { id: 1, name: 'الأكثر مبيعاً', image: 'https://picsum.photos/seed/wusool-cat1/480/360' },
  { id: 2, name: 'وصل حديثاً', image: 'https://picsum.photos/seed/wusool-cat2/480/360' },
  { id: 3, name: 'عروض خاصة', image: 'https://picsum.photos/seed/wusool-cat3/480/360' },
  { id: 4, name: 'مجموعات مختارة', image: 'https://picsum.photos/seed/wusool-cat4/480/360' },
];

const DEMO_PRODUCTS = [
  { id: 1, name: 'ساعة ذكية Pro Max', price: 349, sale_price: 279, image: 'https://picsum.photos/seed/wusool-p1/600/600', category_id: 2 },
  { id: 2, name: 'سماعات لاسلكية Studio', price: 189, sale_price: null, image: 'https://picsum.photos/seed/wusool-p2/600/600', category_id: 2 },
  { id: 3, name: 'حقيبة جلد فاخرة', price: 259, sale_price: 199, image: 'https://picsum.photos/seed/wusool-p3/600/600', category_id: 4 },
  { id: 4, name: 'عطر شرقي فاخر 100مل', price: 149, sale_price: null, image: 'https://picsum.photos/seed/wusool-p4/600/600', category_id: 3 },
  { id: 5, name: 'قهوة مختصة 500غ', price: 65, sale_price: 49, image: 'https://picsum.photos/seed/wusool-p5/600/600', category_id: 3 },
  { id: 6, name: 'نظارة شمسية UV400', price: 129, sale_price: null, image: 'https://picsum.photos/seed/wusool-p6/600/600', category_id: 4 },
  { id: 7, name: 'مجموعة عناية يومية', price: 95, sale_price: 75, image: 'https://picsum.photos/seed/wusool-p7/600/600', category_id: 1 },
  { id: 8, name: 'لوحة مفاتيح ميكانيكية RGB', price: 220, sale_price: null, image: 'https://picsum.photos/seed/wusool-p8/600/600', category_id: 2 },
];

const buildDemoStoreData = (tpl: BuilderTemplateConfig) => ({
  id: 0,
  name: `معاينة ${tpl.name}`,
  slug: 'theme-preview',
  categories: DEMO_CATEGORIES,
  products: DEMO_PRODUCTS,
  config: { storeName: `معاينة ${tpl.name}` },
  content: {},
  offers: [],
  pages: [],
  behavior: {},
});

/* ------------------------------------------------------------------ */
/* TemplateMockup — realistic storefront screenshot built from the     */
/* template's own hero media, tokens and palette.                     */
/* ------------------------------------------------------------------ */
const TemplateMockup: React.FC<{ tpl: BuilderTemplateConfig }> = ({ tpl }) => {
  const image = heroImageOf(tpl);
  const title = heroTitleOf(tpl);
  const primary = tpl.tokens.colors.primary;

  return (
    <div className="aspect-[16/10] overflow-hidden rounded-t-xl bg-slate-100">
      <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
        {/* Browser chrome */}
        <div className="flex h-6 items-center gap-1.5 border-b border-slate-200 bg-white px-3">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="mr-auto flex h-3.5 w-40 items-center rounded-full bg-slate-100 px-2">
            <span className="h-1 w-16 rounded-full bg-slate-300" />
          </span>
        </div>
        {/* Mini navbar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-1.5">
          <span className="flex items-center gap-1">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded text-[7px] font-black text-white" style={{ background: primary }}>
              {tpl.name.slice(0, 1)}
            </span>
            <span className="text-[8px] font-black text-slate-700">{tpl.name}</span>
          </span>
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1 w-6 rounded-full bg-slate-200" />
            ))}
          </span>
        </div>
        {/* Hero shot */}
        <div className="relative h-[62%] w-full overflow-hidden">
          <img src={image} alt={tpl.name} loading="lazy" className="h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-2 right-3 left-3">
            <p className="line-clamp-1 text-[11px] font-black leading-snug text-white drop-shadow-md">{title}</p>
            <span className="mt-1 inline-block rounded px-2 py-0.5 text-[7px] font-bold text-white" style={{ background: primary }}>
              تسوّق الآن
            </span>
          </div>
        </div>
        {/* Product strip */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="overflow-hidden rounded-md bg-white shadow-sm">
              <img src={`https://picsum.photos/seed/${tpl.slug}-p${i}/200/200`} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              <div className="space-y-0.5 p-1">
                <span className="block h-1 w-3/4 rounded-full bg-slate-200" />
                <span className="block h-1 w-1/2 rounded-full" style={{ background: `${primary}66` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function StoreThemesGallery({ store, availableThemes, userPlanTier, isSuperAdmin }: Props) {
  const [previewTpl, setPreviewTpl] = useState<BuilderTemplateConfig | null>(null);
  const [confirmTpl, setConfirmTpl] = useState<BuilderTemplateConfig | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('الكل');
  // Locally-tracked active template so the "المفعل حالياً" badge moves instantly.
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || '');

  const tier: PlanTier = isSuperAdmin ? 'professional' : userPlanTier || 'starter';
  // Legacy slug lists are normalized to the new catalog before matching.
  const allowed = useMemo(
    () => new Set((availableThemes || []).map((s) => normalizeTemplateSlug(s))),
    [availableThemes]
  );

  // Unlocked when the plan tier grants it OR the backend list explicitly allows it.
  const isLocked = (tpl: BuilderTemplateConfig) =>
    !isSuperAdmin && !canAccessTemplate(tpl, tier) && !allowed.has(tpl.slug);

  const filtered = useMemo(
    () => (filter === 'الكل' ? TEMPLATES : TEMPLATES.filter((t) => FILTER_MAP[t.slug] === filter)),
    [filter]
  );

  const applyTheme = async (tpl: BuilderTemplateConfig) => {
    setApplying(tpl.slug);
    setConfirmTpl(null);
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
      // Stay on the gallery — just move the active badge and notify.
      setActiveTheme(tpl.slug);
      toast.success('تم تغيير القالب بنجاح', {
        description: `قالب «${tpl.name}» أصبح نشطاً على متجرك.`,
        action: {
          label: 'الذهاب للمصمم',
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
    <>
      <PageTemplate title="معرض القوالب" url={`/stores/${store.id}/templates`}>
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
              <Palette className="h-7 w-7 text-emerald-500" />
              معرض القوالب
            </h1>
            <p className="text-sm leading-relaxed text-gray-500">
              قوالب جاهزة بالكامل لمتجر «{store.name}» — عاين القالب مباشرة ثم طبّقه بضغطة واحدة وانتقل إلى المصمم لتخصيصه.
            </p>
          </div>

          {/* Sticky category filter bar */}
          <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-gray-100 bg-white/85 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              {FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
              <span className="mr-auto hidden shrink-0 text-[11px] font-bold text-gray-400 sm:block">
                {filtered.length} قالب
              </span>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tpl) => {
              const locked = isLocked(tpl);
              const active = activeTheme === tpl.slug;
              return (
                <div
                  key={tpl.slug}
                  className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all hover:shadow-md ${
                    active ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  {/* Preview mockup with floating badges */}
                  <div className="relative cursor-pointer" onClick={() => setPreviewTpl(tpl)}>
                    <TemplateMockup tpl={tpl} />

                    {/* Floating badges */}
                    <div className="absolute start-3 top-9 flex flex-col items-start gap-1.5">
                      {active && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                          المفعل حالياً
                        </span>
                      )}
                      {!tpl.is_free && (
                        <span className="rounded-full bg-violet-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                          احترافي
                        </span>
                      )}
                      {tpl.is_free && (
                        <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                          مجاني
                        </span>
                      )}
                    </div>
                    <span className="absolute end-3 top-9 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      {SECTOR_LABEL[tpl.slug] || 'عام'}
                    </span>

                    {locked && (
                      <div className="absolute inset-0 top-6 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]" style={{ borderRadius: 'inherit' }}>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-gray-700 shadow">
                          <Lock className="h-3.5 w-3.5" /> يتطلب خطة أعلى
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-grow flex-col p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{tpl.name}</h3>
                      <span dir="ltr" className="shrink-0 font-mono text-[10px] font-bold text-gray-400">{tpl.name_en}</span>
                    </div>
                    {tpl.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{tpl.description}</p>
                    )}

                    {/* Key feature bullets */}
                    <ul className="mt-3 space-y-1.5">
                      {highlightsOf(tpl).map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/50 p-4">
                    {active ? (
                      <Button size="sm" variant="outline" disabled className="flex-1 border-emerald-200 bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                        مفعل
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={locked || applying === tpl.slug}
                        onClick={() => setConfirmTpl(tpl)}
                      >
                        {applying === tpl.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        تطبيق القالب
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewTpl(tpl)}>
                      <Eye className="h-4 w-4" />
                      معاينة المباشرة
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageTemplate>

      {/* Full-screen live preview modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm" onClick={() => setPreviewTpl(null)}>
          <div
            className="absolute inset-3 overflow-hidden rounded-2xl bg-white shadow-2xl md:inset-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: previewTpl.tokens.colors.primary }}>
                  {previewTpl.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">معاينة مباشرة — قالب {previewTpl.name}</p>
                  <p className="text-[11px] text-slate-400">محتوى تجريبي للعرض فقط — التطبيق يتم من بطاقة القالب</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={isLocked(previewTpl)} onClick={() => setConfirmTpl(previewTpl)}>
                  <Check className="h-4 w-4" /> تطبيق هذا القالب
                </Button>
                <Button variant="outline" size="icon" onClick={() => setPreviewTpl(null)} aria-label="إغلاق">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="h-[calc(100%-57px)] overflow-y-auto">
              <StoreSite
                template={previewTpl.slug}
                designTokens={previewTpl.tokens}
                templateOverrides={{ sections: previewTpl.sections }}
                storeData={buildDemoStoreData(previewTpl)}
                isPreview
              />
            </div>
          </div>
        </div>
      )}

      {/* Apply-template confirmation modal */}
      {confirmTpl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setConfirmTpl(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: confirmTpl.tokens.colors.primary }}>
                {confirmTpl.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-black text-gray-900">تطبيق قالب «{confirmTpl.name}» على المتجر؟</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  سيتم استبدال أقسام متجرك الحالية بمحتوى القالب الجاهز (بانرات وصور وفيديوهات تجريبية)،
                  ثم ستنتقل مباشرة إلى المصمم البصري لتخصيصه. لا يمكن التراجع تلقائياً.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmTpl(null)}>
                إلغاء
              </Button>
              <Button size="sm" disabled={applying === confirmTpl.slug} onClick={() => applyTheme(confirmTpl)}>
                {applying === confirmTpl.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                نعم، طبّق القالب
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
