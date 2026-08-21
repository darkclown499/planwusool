import React from 'react';
import { Truck, ShieldCheck, CreditCard, Headphones, Sparkles, RefreshCw } from 'lucide-react';
import { SectionHeading, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const ICONS: Record<string, React.ReactNode> = {
  truck: <Truck className="h-6 w-6" />,
  shield: <ShieldCheck className="h-6 w-6" />,
  card: <CreditCard className="h-6 w-6" />,
  support: <Headphones className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  refresh: <RefreshCw className="h-6 w-6" />,
};

const DEFAULT_FEATURES = [
  { title: 'شحن سريع', text: 'توصيل لجميع المناطق في أسرع وقت.', icon: 'truck' },
  { title: 'دفع آمن', text: 'خيارات دفع متعددة وآمنة 100%.', icon: 'card' },
  { title: 'دعم فوري', text: 'فريقنا جاهز لخدمتك على مدار الساعة.', icon: 'support' },
  { title: 'جودة مضمونة', text: 'منتجات أصلية بضمان استرجاع.', icon: 'shield' },
];

export const FeaturesSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const list = (storeData?.content?.features?.length ? storeData.content.features : DEFAULT_FEATURES) as any[];
  // Strict: clearing section_title in the designer hides the heading entirely.
  const hasTitleKey = Object.prototype.hasOwnProperty.call(props, 'section_title');
  const headingTitle = hasTitleKey ? String(props.section_title || '').trim() : 'لماذا تختارنا؟';
  const headingSubtitle = String(props.section_subtitle || '').trim();

  return (
    <section className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={headingTitle} subtitle={headingSubtitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.filter((f: any) => f?.title || f?.text).map((f: any, i: number) => (
            <div key={i} className="group rounded-2xl border bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
              <span
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white transition group-hover:scale-110"
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              >
                {ICONS[f.icon] || <Sparkles className="h-6 w-6" />}
              </span>
              {f.title && (
                <h3 className="text-base font-extrabold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                  {f.title}
                </h3>
              )}
              {f.text && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                  {f.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};