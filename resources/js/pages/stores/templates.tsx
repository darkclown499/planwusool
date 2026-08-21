import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, Crown, Eye, Loader2, Lock, Palette, Sparkles, X } from 'lucide-react';
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

/* Industry tags per template slug */
const SECTOR_TAGS: Record<string, string[]> = {
  zen: ['عام', 'متاجر شاملة'],
  bazaar: ['سوبرماركت', 'بقالة'],
  rose: ['أزياء', 'موضة'],
  ocean: ['إلكترونيات', 'تقنية'],
  velvet: ['أزياء', 'تجميل'],
  fresh: ['طعام', 'قهوة'],
  night: ['عام', 'ليلي'],
  luxe: ['فاخر', 'هدايا'],
};

/* Human-readable feature list derived from the template's actual sections */
const featuresOf = (tpl: BuilderTemplateConfig): string[] => {
  const f: string[] = [];
  const hero = tpl.sections.find((s) => s.type === 'hero');
  const hv = hero?.props?.hero_variant as string | undefined;
  if (hv === 'video_bg') f.push('فيديو خلفية حي');
  if (hv === 'slider_full' || hv === 'full_slider') f.push('سلايدر بانرات عالي الدقة');
  if (hv === 'bento_grid') f.push('شبكة Bento متعددة الوسائط');
  if (hv === 'split_banner') f.push('بانر مقسوم نص/صورة');
  const cat = tpl.sections.find((s) => s.type === 'categories');
  const cv = cat?.props?.variant as string | undefined;
  if (cv === 'circle_pills') f.push('تصنيفات دائرية');
  if (cv === 'grid_cards') f.push('بطاقات تصنيفات مصوّرة');
  if (cv === 'horizontal_scroll') f.push('تمرير أفقي للتصنيفات');
  const prod = tpl.sections.find((s) => s.type === 'products');
  const pv = prod?.props?.variant as string | undefined;
  if (pv === 'bento_products') f.push('منتج مميز + شبكة Bento');
  if (pv === 'tabbed_categories') f.push('تبويبات حسب التصنيف');
  if (pv === 'compact_grid') f.push('شبكة منتجات كثيفة');
  f.push(`${tpl.sections.length} أقسام جاهزة بمحتوى تجريبي كامل`);
  return f.slice(0, 5);
};

/* Demo catalog so the full-screen preview shows real content */
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

export default function StoreThemesGallery({ store, availableThemes, userPlanTier, isSuperAdmin }: Props) {
  const [previewTpl, setPreviewTpl] = useState<BuilderTemplateConfig | null>(null);
  const [confirmTpl, setConfirmTpl] = useState<BuilderTemplateConfig | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const templates = useMemo(() => TEMPLATES, []);
  const tier: PlanTier = isSuperAdmin ? 'professional' : userPlanTier || 'starter';
  // Legacy slug lists are normalized to the new catalog before matching.
  const allowed = useMemo(
    () => new Set((availableThemes || []).map((s) => normalizeTemplateSlug(s))),
    [availableThemes]
  );

  // Unlocked when the plan tier grants it OR the backend list explicitly allows it.
  const isLocked = (tpl: BuilderTemplateConfig) =>
    !isSuperAdmin && !canAccessTemplate(tpl, tier) && !allowed.has(tpl.slug);

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
      router.visit(`/stores/${store.id}/designer`);
    } catch (e) {
      console.error('Apply theme failed', e);
      setApplying(null);
    }
  };

  return (
    <>
      <PageTemplate title="معرض القوالب" url={`/stores/${store.id}/templates`}>
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <Palette className="h-7 w-7 text-emerald-500" />
              معرض القوالب
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              قوالب جاهزة بالكامل لمتجر «{store.name}» — كل قالب يأتي بمحتوى تجريبي غني (بانرات، فيديوهات، تصنيفات ومنتجات).
              عاين القالب ثم طبّقه بضغطة واحدة وانتقل مباشرة إلى المصمم لتخصيصه.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => {
              const locked = isLocked(tpl);
              const active = store.theme === tpl.slug;
              return (
                <div
                  key={tpl.slug}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg ${
                    active ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden" style={{ background: tpl.preview }}>
                    {/* Mini structural mockup */}
                    <div className="absolute inset-0 flex flex-col gap-2 p-5 opacity-90 transition duration-500 group-hover:scale-[1.03]">
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black text-white" style={{ background: tpl.tokens.colors.primary }}>
                          {tpl.name.slice(0, 1)}
                        </span>
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="h-1.5 w-8 rounded-full bg-white/70" />
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 h-14 w-3/4 rounded-xl bg-white/60 shadow-sm" />
                      <div className="grid flex-1 grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="rounded-full bg-white/50" />
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pb-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="rounded-lg bg-white/70 shadow-sm" />
                        ))}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="absolute start-3 top-3 flex gap-1.5">
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                          <Check className="h-3 w-3" /> القالب الحالي
                        </span>
                      )}
                      {!tpl.is_free && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                          <Crown className="h-3 w-3" /> مميز
                        </span>
                      )}
                    </div>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow">
                          <Lock className="h-3.5 w-3.5" /> يتطلب خطة أعلى
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-slate-900">{tpl.name}</h3>
                      <span dir="ltr" className="font-mono text-[11px] font-bold text-slate-400">{tpl.name_en}</span>
                    </div>
                    {tpl.description && <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{tpl.description}</p>}

                    {/* Sector tags */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {(SECTOR_TAGS[tpl.slug] || ['عام']).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Features */}
                    <ul className="mb-4 space-y-1.5">
                      {featuresOf(tpl).map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewTpl(tpl)}>
                        <Eye className="h-4 w-4" />
                        معاينة المباشرة
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={locked || applying === tpl.slug}
                        onClick={() => setConfirmTpl(tpl)}
                      >
                        {applying === tpl.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        تطبيق القالب على المتجر
                      </Button>
                    </div>
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
                  <p className="text-sm font-black text-slate-900">معاينة قالب {previewTpl.name}</p>
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
                <h3 className="text-base font-black text-slate-900">تطبيق قالب «{confirmTpl.name}» على المتجر؟</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  سيتم استبدال أقسام متجرك الحالية بمحتوى القالب الجاهز (بانرات وصور وفيديوهات تجريبية)،
                  ثم ستنتقل مباشرة إلى المصمم البصري لتخصيصه. لا يمكن التراجع تلقائياً.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
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
