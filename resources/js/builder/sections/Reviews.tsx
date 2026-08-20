import React from 'react';
import { Star, Quote } from 'lucide-react';
import { SectionHeading, css, EmptySection } from './helpers';
import type { BuilderSectionProps } from './helpers';

const DEFAULT_REVIEWS = [
  { name: 'محمد العلي', rating: 5, text: 'تجربة رائعة، الطلب وصل بسرعة والمنتج مطابق تماماً للوصف.' },
  { name: 'سارة أحمد', rating: 5, text: 'أفضل متجر تعاملت معه، الجودة ممتازة والتغليف احترافي جداً.' },
  { name: 'خالد حسن', rating: 4, text: 'خدمة عملاء ممتازة وسعر منافس. بالتأكيد سأطلب مرة أخرى.' },
];

export const ReviewsSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const list = (storeData?.content?.testimonials?.length ? storeData.content.testimonials : DEFAULT_REVIEWS) as any[];

  if (!list.length) {
    return <EmptySection title="لا توجد تقييمات بعد" hint="شاركنا تجربتك وساعد الآخرين." />;
  }

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading title={props.section_title || 'آراء عملائنا'} subtitle={'ماذا قالوا عن تجربتهم معنا.'} />
        <div className="grid gap-4 md:grid-cols-3">
          {list.map((r: any, i: number) => (
            <figure
              key={i}
              className="relative rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ borderColor: css('--twc-border', '#e2e8f0'), borderRadius: css('--twx-radius', '1rem') }}
            >
              <Quote className="absolute top-5 left-5 h-7 w-7 opacity-10" style={{ color: css('--twc-primary', '#0f8a5f') }} />
              <div className="mb-3 flex gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-4 w-4 ${n <= Number(r.rating) ? 'fill-current' : 'opacity-25'}`} />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                {r.text}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ background: css('--twc-primary', '#0f8a5f') }}
                >
                  {String(r.name || 'ز').slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-bold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                    {r.name || 'عميل'}
                  </p>
                  <p className="text-xs" style={{ color: css('--twc-muted', '#94a3b8') }}>
                    عميل موثوق
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};