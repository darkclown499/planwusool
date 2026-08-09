import React, { useMemo, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { getAllTemplates, getTemplatesByCategory } from '@/templates/registry';
import type { TemplateConfig } from '@/templates/types';
import { useTranslation } from 'react-i18next';

interface ThemesSectionProps {
  settings: any;
  sectionData: any;
  brandColor: string;
  demoStoreUrl?: string;
}

const categoryLabels: Record<string, string> = {
  general: 'عام',
  fashion: 'أزياء وموضة',
  electronics: 'إلكترونيات',
  food: 'طعام ومطاعم',
  beauty: 'تجميل',
  digital: 'منتجات رقمية',
  luxury: 'فخامة',
  b2b: 'جملة B2B',
  home: 'منزل وديكور',
  automotive: 'سيارات',
  sports: 'رياضة',
  kids: 'أطفال',
  grocery: 'مواد غذائية',
  handmade: 'حرف يدوية',
  perfume: 'عطور',
  health: 'صحة',
  pets: 'حيوانات أليفة',
  books: 'كتب',
  flowers: 'زهور',
};

export default function ThemesSection({ sectionData, brandColor, demoStoreUrl = '' }: ThemesSectionProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');

  const title = t(sectionData.title || 'اختر القالب المناسب لمتجرك');
  const subtitle = t(sectionData.subtitle || 'منصة وصول توفر لك 29 قالباً احترافياً (7 مجانية و 22 مدفوعة) مصممة خصيصاً لتناسب تخصص متجرك.');
  
  const allTemplates = useMemo(() => getAllTemplates(), []);
  const byCategory = useMemo(() => getTemplatesByCategory(), []);

  const filteredTemplates = useMemo(() => {
    if (filter === 'free') return allTemplates.filter((t) => t.is_free);
    if (filter === 'paid') return allTemplates.filter((t) => !t.is_free);
    return allTemplates;
  }, [allTemplates, filter]);

  const categories = Object.keys(byCategory).filter((cat) =>
    filteredTemplates.some((t) => t.category === cat)
  );

  const previewUrl = (template: TemplateConfig): string => {
    const base = demoStoreUrl || '/demo';
    return `${base}?template=${template.slug}`;
  };

  return (
    <section id="themes" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: brandColor }}>
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {subtitle}
          </p>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {([
              ['all', `الكل (${allTemplates.length})`],
              ['free', 'مجانية'],
              ['paid', 'مدفوعة'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  filter === key
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={filter === key ? { backgroundColor: brandColor } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {categories.map((category) => {
          const templates = filteredTemplates.filter((t) => t.category === category);
          if (templates.length === 0) return null;

          return (
            <div key={category} className="mb-12">
              <h3 className="mb-5 text-xl font-bold text-gray-900">
                {categoryLabels[category] || category}
                <span className="mr-2 text-sm font-normal text-gray-400">
                  {templates.length} قالب
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {templates.map((template) => (
                  <div
                    key={template.slug}
                    className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    {/* Template Preview */}
                    <div
                      className="relative h-60 overflow-hidden"
                      style={{
                        background: template.design_tokens?.colors?.background || '#f9fafb',
                      }}
                    >
                      {/* Mini template mockup built from design tokens */}
                      <div className="absolute inset-0 flex flex-col p-5" dir="rtl">
                        <div className="flex items-center justify-between">
                          <div
                            className="h-3 w-14 rounded"
                            style={{
                              background: template.design_tokens?.colors?.['primary-500'] || brandColor,
                              borderRadius: 'var(--twb-radius, 0.375rem)',
                            }}
                          />
                          <div className="h-2 w-20 rounded bg-black/10" />
                        </div>
                        <div className="mt-6 flex flex-col items-center text-center">
                          <div
                            className="h-2.5 w-3/4 rounded-full bg-black/15"
                            style={{
                              background: template.design_tokens?.colors?.['text-muted'] || '#9ca3af',
                            }}
                          />
                          <div className="mt-2 h-2 w-1/2 rounded-full bg-black/10" />
                          <button
                            className="mt-4 h-8 w-24 rounded-full"
                            style={{ background: template.design_tokens?.colors?.['primary-500'] || brandColor }}
                          />
                        </div>
                        <div className="mt-auto grid grid-cols-3 gap-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-16 rounded-lg border"
                              style={{
                                background: template.design_tokens?.colors?.surface || '#ffffff',
                                borderColor: template.design_tokens?.colors?.['primary-100'] || '#e5e7eb',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Free/Paid Badge */}
                      <div
                        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow ${
                          template.is_free ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      >
                        {template.is_free ? 'مجاني' : 'مدفوع'}
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <div className="mb-1 flex items-start justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">{template.name}</h3>
                        <span className="text-xs font-medium text-gray-400">
                          {categoryLabels[template.category] || template.category}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{template.description}</p>

                      {/* Device Icons */}
                      <div className="flex items-center gap-2 mb-4">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <Tablet className="w-4 h-4 text-gray-400" />
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 ms-2">{t('Responsive Design')}</span>
                      </div>

                      {/* Preview Button */}
                      <a
                        href={previewUrl(template)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2.5 text-center rounded-lg font-medium text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: template.design_tokens?.colors?.['primary-600'] || brandColor }}
                      >
                        معاينة القالب
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4" style={{ color: brandColor }}>
              {t(sectionData.cta_title || 'ابدأ معنا لتكتشف جميع القوالب')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t(sectionData.cta_description || 'اختر قالبك المفضل وابدأ بناء متجرك الأول في دقائق، مع إمكانية تغيير القالب في أي وقت مع نمو نشاطك.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="px-8 py-3 text-white rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                {t(sectionData.primary_button_text || 'ابدأ متجرك الآن')}
              </a>
              <a
                href={demoStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border-2 rounded-lg font-medium transition-colors hover:text-white"
                style={{
                  borderColor: brandColor,
                  color: brandColor,
                }}
              >
                {t(sectionData.secondary_button_text || 'استكشف المتجر التجريبي')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}