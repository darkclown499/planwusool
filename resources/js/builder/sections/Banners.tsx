import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const BannersSection: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-7xl space-y-5">
        {props.slides && Array.isArray(props.slides) && props.slides.length > 0 ? (
          props.slides.map((slide: any, i: number) => <BannerCard key={i} slide={slide} />)
        ) : (
          <BannerCard
            slide={{ title: props.title, subtitle: props.subtitle, image: props.image, button_text: props.button_text, button_link: props.button_link }}
          />
        )}
      </div>
    </section>
  );
};

const BannerCard: React.FC<{ slide: Record<string, any> }> = ({ slide }) => {
  if (!slide?.title && !slide?.subtitle && !slide?.image && !slide?.background) return null;
  return (
    <a
      href={slide.button_link || '#template-products'}
      className="group relative block overflow-hidden rounded-3xl"
      style={{
        background: slide.background
          ? slide.background
          : `linear-gradient(120deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})`,
      }}
    >
      {slide.image ? (
        <img
          src={slide.image}
          alt=""
          className="h-[240px] w-full object-cover opacity-50 transition duration-500 group-hover:scale-105 sm:h-[300px]"
        />
      ) : (
        <div className="h-[240px] w-full sm:h-[300px]" />
      )}
      <div
        className="absolute inset-0 flex flex-col items-start justify-center gap-3 px-6 sm:px-14"
        style={{ background: 'linear-gradient(90deg, rgba(2,6,23,.65) 0%, transparent 100%)' }}
      >
        {slide.title && <h3 className="max-w-xl text-2xl font-black text-white drop-shadow sm:text-4xl">{slide.title}</h3>}
        {slide.subtitle && <p className="max-w-lg text-sm text-white/90 sm:text-base">{slide.subtitle}</p>}
        {slide.button_text ? (
          <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
            {slide.button_text}
            <ArrowLeft className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </a>
  );
};