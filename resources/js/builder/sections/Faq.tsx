import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SectionHeading, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const DEFAULT_FAQS = [
  { q: 'كم تستغرق مدة التوصيل؟', a: 'يتم التوصيل خلال 1-4 أيام عمل حسب المنطقة.' },
  { q: 'ما هي طرق الدفع المتاحة؟', a: 'ندعم الدفع عند الاستلام وبطاقات الائتمان والدفع عبر واتساب.' },
  { q: 'كيف يمكنني تتبع طلبي؟', a: 'ستصلك رسالة تأكيد تتضمن تفاصيل الطلب ويمكنك متابعة حالته.' },
];

export const FaqSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const list = (storeData?.content?.faqs?.length ? storeData.content.faqs : DEFAULT_FAQS) as any[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="mx-auto max-w-3xl">
        <SectionHeading title={props.section_title || 'الأسئلة الشائعة'} subtitle={'كل ما تحتاج معرفته قبل الطلب.'} />
        <div className="space-y-3">
          {list.map((f: any, i: number) => {
            const open = openIndex === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                  style={{ background: open ? css('--twc-surface', '#f8fafc') : '#ffffff' }}
                >
                  <span className="text-sm font-bold sm:text-base" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    style={{ color: css('--twc-primary', '#0f8a5f') }}
                  />
                </button>
                {open && (
                  <div className="border-t px-5 py-4" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
                    <p className="text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                      {f.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};