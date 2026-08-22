import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, Loader2, Palette, Sparkles } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { StoreSite, TEMPLATES } from '@/builder';
import type { BuilderTemplateConfig } from '@/builder/types';

type Props = {
  store: any;
  availableThemes?: string[];
};

/* Demo catalog so the full-screen live preview shows real Arabic content */
const DEMO_CATEGORIES = [
  { id: '1', name: 'عطارة وتوابل', slug: 'spices', image: '/images/store/spices.jpg', product_count: 8 },
  { id: '2', name: 'خضار وفواكه', slug: 'produce', image: '/images/store/vegetables.jpg', product_count: 12 },
  { id: '3', name: 'حلويات عربية', slug: 'sweets', image: '/images/store/sweets.jpg', product_count: 6 },
  { id: '4', name: 'أزياء وملابس', slug: 'fashion', image: '/images/store/clothes.jpg', product_count: 9 },
  { id: '5', name: 'قهوة ومحمصة', slug: 'coffee', image: '/images/store/coffee.jpg', product_count: 5 },
  { id: '6', name: 'مخبز ومعجنات', slug: 'bakery', image: '/images/store/bakery.jpg', product_count: 7 },
];

const DEMO_PRODUCTS = [
  { id: '1', name: 'فلفل أسود مطحون طازج 250غ', price: 18, sale_price: 14, image: '/images/store/spices.jpg', categoryId: '1' },
  { id: '2', name: 'زعفران فاخر 5غ', price: 45, sale_price: null, image: '/images/store/spices.jpg', categoryId: '1' },
  { id: '3', name: 'سلة خضار موسمية طازجة', price: 35, sale_price: 29, image: '/images/store/vegetables.jpg', categoryId: '2' },
  { id: '4', name: 'تمر مجدول بجودة ممتازة', price: 60, sale_price: null, image: '/images/store/fruits.jpg', categoryId: '2' },
  { id: '5', name: 'كنافة نابلسية بالجبن', price: 55, sale_price: 48, image: '/images/store/sweets.jpg', categoryId: '3' },
  { id: '6', name: 'بقلاوة فستق حلبي (كيلو)', price: 85, sale_price: null, image: '/images/store/sweets.jpg', categoryId: '3' },
  { id: '7', name: 'عباية صيفية بتطريز يدوي', price: 220, sale_price: 180, image: '/images/store/clothes.jpg', categoryId: '4' },
  { id: '8', name: 'قهوة عربية مطحونة 500غ', price: 40, sale_price: null, image: '/images/store/coffee.jpg', categoryId: '5' },
  { id: '9', name: 'كاك وسكر (علبة 12 حبة)', price: 25, sale_price: null, image: '/images/store/bakery.jpg', categoryId: '6' },
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

export default function StoreThemesGallery({ store }: Props) {
  const [applying, setApplying] = useState<string | null>(null);
  // Locally-tracked active template so the "المفعل حالياً" badge moves instantly.
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || '');

  // Single-template catalog: the one and only classic template.
  const tpl = TEMPLATES[0];
  const isActive = useMemo(
    () => !activeTheme || activeTheme === tpl.slug,
    [activeTheme, tpl.slug]
  );

  const demoData = useMemo(() => buildDemoStoreData(tpl), [tpl]);

  const applyTheme = async () => {
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
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
            <Palette className="h-7 w-7 text-emerald-500" />
            قالب المتجر
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            متجرك يعمل بقالب «{tpl.name}» — تصميم عربي متكامل يشمل الترويسة، التصنيفات، المنتجات المجمّعة والطلب عبر واتساب.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Template info card */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              مجاني ومفعّل لجميع الباقات
            </span>
            <h2 className="mt-4 text-xl font-black text-gray-900">{tpl.name}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{tpl.description}</p>

            <ul className="mt-5 space-y-2.5 text-sm text-gray-600">
              {[
                'ترويسة واحدة أنيقة: شعار + بحث + سلة',
                'تصنيفات دائرية بالصور أسفل الترويسة',
                'منتجات مجمّعة تحت كل تصنيف مع فرز',
                'صفحة مستقلة لكل تصنيف /category/{slug}',
                'طلب مباشر عبر واتساب من أي بطاقة منتج',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              {isActive ? (
                <Button variant="outline" className="w-full" disabled>
                  <Check className="me-1 h-4 w-4" />
                  القالب الحالي
                </Button>
              ) : (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={applyTheme}
                  disabled={applying !== null}
                >
                  {applying ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Check className="me-1 h-4 w-4" />}
                  تطبيق القالب
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-gray-400">
                خصّص الأقسام والألوان بالكامل من{' '}
                <a href={`/stores/${store.id}/designer`} className="font-bold text-emerald-600 hover:underline">
                  المصمم المرئي
                </a>
              </p>
            </div>
          </div>

          {/* Live preview */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-xs font-extrabold text-gray-500">معاينة حيّة</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tpl.name}
              </span>
            </div>
            <div className="max-h-[720px] overflow-y-auto">
              <StoreSite template={tpl.slug} storeData={demoData} mode="home" />
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
