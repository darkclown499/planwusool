import React from 'react';
import { BadgePercent, ArrowLeft } from 'lucide-react';
import { SectionHeading, css, EmptySection } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const OffersSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const offers = (storeData?.offers || []).filter((o: any) => o.active !== false);

  if (!offers.length) {
    return <EmptySection title="لا توجد عروض حالياً" hint="أنشئ عرضاً من لوحة التحكم ليظهر هنا." />;
  }

  return (
    <section className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={props.section_title || 'عروض خاصة'} subtitle={'خصومات لفترة محدودة لا تفوّتها.'} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer: any) => {
            const image = offer.image || offer.banner_image;
            const link = offer.link || '#template-products';
            return (
              <a
                key={offer.id}
                href={link}
                className="group relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border p-6 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                style={{
                  background: `linear-gradient(140deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-accent', '#f59e0b')})`,
                  borderRadius: css('--twx-radius', '1rem'),
                }}
              >
                {image && (
                  <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 transition group-hover:scale-105" />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <BadgePercent className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                    {offer.type || 'تخفيض'}
                  </span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-extrabold leading-snug drop-shadow">{offer.title}</h3>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4">
                    اغتنم الفرصة
                    <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};