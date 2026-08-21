import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const BannersSection: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const variant = (props.variant as string) || 'carousel';
  const slides = (Array.isArray(props.slides) && props.slides.length
    ? props.slides
    : [
        {
          title: props.title,
          subtitle: props.subtitle,
          image: props.image,
          button_text: props.button_text,
          button_link: props.button_link,
        },
      ]).filter((s: any) => s?.title || s?.subtitle || s?.image || s?.background);

  if (!slides.length) return null;

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-7xl">
        {variant === 'carousel' && slides.length > 1 ? (
          <BannerCarousel slides={slides} />
        ) : variant === 'grid' ? (
          <div className="grid gap-5 md:grid-cols-2">
            {slides.map((slide: any, i: number) => (
              <BannerCard key={i} slide={slide} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {slides.map((slide: any, i: number) => (
              <BannerCard key={i} slide={slide} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const BannerCarousel: React.FC<{ slides: Record<string, any>[] }> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [paused, count]);

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((slide, i) => (
        <div key={i} className={i === index ? 'block' : 'hidden'}>
          <BannerCard slide={slide} />
        </div>
      ))}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="السابق"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="absolute start-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow backdrop-blur transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="التالي"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="absolute end-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow backdrop-blur transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 -bottom-6 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`شريحة ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-7' : 'w-2 opacity-60'}`}
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              />
            ))}
          </div>
        </>
      )}
    </div>
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
        <img src={slide.image} alt="" className="h-[240px] w-full object-cover opacity-50 transition duration-500 group-hover:scale-105 sm:h-[300px]" />
      ) : (
        <div className="h-[240px] w-full sm:h-[300px]" />
      )}
      {(slide.title || slide.subtitle || slide.button_text) && (
        <div className="absolute inset-0 flex flex-col items-start justify-center gap-3 px-6 sm:px-14" style={{ background: 'linear-gradient(90deg, rgba(2,6,23,.65) 0%, transparent 100%)' }}>
          {slide.title && <h3 className="max-w-xl text-2xl font-black text-white drop-shadow sm:text-4xl">{slide.title}</h3>}
          {slide.subtitle && <p className="max-w-lg text-sm text-white/90 sm:text-base">{slide.subtitle}</p>}
          {slide.button_text ? (
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
              {slide.button_text}
              <ArrowLeft className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      )}
    </a>
  );
};