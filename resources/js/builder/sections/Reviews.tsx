import React from 'react';
import { Star, Quote } from 'lucide-react';
import { SectionHeading, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const DEFAULT_REVIEWS = [
  { name: 'محمد العلي', rating: 5, text: 'تجربة رائعة، الطلب وصل بسرعة والمنتج مطابق تماماً للوصف.' },
  { name: 'سارة أحمد', rating: 5, text: 'أفضل متجر تعاملت معه، الجودة ممتازة والتغليف احترافي جداً.' },
  { name: 'خالد حسن', rating: 4, text: 'خدمة عملاء ممتازة وسعر منافس. بالتأكيد سأطلب مرة أخرى.' },
];

/** Clamp any incoming rating to a sane 1..5 integer. */
const clampRating = (value: any): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} من 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
    ))}
  </div>
);

const Avatar: React.FC<{ src?: string; name?: string }> = ({ src, name }) => {
  if (src) {
    return <img src={src} alt={name || ''} className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: css('--twc-primary', '#0f8a5f') }}>
      {(name || '؟').trim().charAt(0)}
    </span>
  );
};

export const ReviewsSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  // Designer-managed reviews win over store content, which wins over defaults.
  const propItems = Array.isArray(props.items) ? props.items : [];
  const contentItems = (storeData?.content?.testimonials || []) as any[];
  const list = propItems.length
    ? propItems
    : contentItems.length
      ? contentItems.map((r) => ({ ...r, rating: clampRating(r.rating) }))
      : DEFAULT_REVIEWS;

  const displayMode = (props.display_mode as string) || 'grid';

  if (!list.length) {
    return null;
  }

  const headingTitle = String(props.section_title || 'آراء عملائنا');
  const headingSubtitle = 'ماذا قالوا عن تجربتهم معنا.';

  return (
    <section className="w-full py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={headingTitle} subtitle={headingSubtitle} />
        {displayMode === 'slider' ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {list.slice(0, 12).map((r: any, i: number) => (
              <figure
                key={i}
                className="relative w-[85%] shrink-0 snap-center rounded-2xl border bg-white p-6 transition-all duration-300 sm:w-[46%] lg:w-[31.5%]"
                style={{ borderColor: css('--twc-border', '#e2e8f0'), borderRadius: css('--twx-radius', '1rem') }}
              >
                <Quote className="absolute top-5 left-5 h-7 w-7 opacity-10" style={{ color: css('--twc-primary', '#0f8a5f') }} />
                <Stars rating={clampRating(r.rating)} />
                {r.text && (
                  <blockquote className="mt-3 min-h-[3.5rem] text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                    “{r.text}”
                  </blockquote>
                )}
                <figcaption className="mt-4 flex items-center gap-3">
                  <Avatar src={r.avatar} name={r.name} />
                  <span className="text-sm font-bold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                    {r.name || 'عميل'}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, 12).map((r: any, i: number) => (
              <figure
                key={i}
                className="relative rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ borderColor: css('--twc-border', '#e2e8f0'), borderRadius: css('--twx-radius', '1rem') }}
              >
                <Quote className="absolute top-5 left-5 h-7 w-7 opacity-10" style={{ color: css('--twc-primary', '#0f8a5f') }} />
                <Stars rating={clampRating(r.rating)} />
                {r.text && (
                  <blockquote className="mt-3 min-h-[3.5rem] text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                    “{r.text}”
                  </blockquote>
                )}
                <figcaption className="mt-4 flex items-center gap-3">
                  <Avatar src={r.avatar} name={r.name} />
                  <span className="text-sm font-bold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                    {r.name || 'عميل'}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
