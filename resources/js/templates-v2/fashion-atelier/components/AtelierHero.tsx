import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';

interface HeroSlide {
  title?: string;
  subtitle?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
}

interface AtelierHeroProps {
  slides: HeroSlide[];
}

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    title: 'أناقة تُروى كقصة',
    subtitle: 'تشكيلة الموسم الجديدة — قطع مختارة بعناية لكل لحظة',
    button_text: 'اكتشفي التشكيلة',
    button_link: '#atelier-new',
  },
];

/**
 * Editorial full-bleed hero. Slow ken-burns zoom on the active photograph,
 * serif display type over a warm gradient veil, and a quiet progress rail.
 * Pure CSS transitions — no slider library.
 */
export const AtelierHero: React.FC<AtelierHeroProps> = ({ slides }) => {
  const list = (slides && slides.length > 0 ? slides : FALLBACK_SLIDES).filter((s) => s.image || s.title);
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (list.length <= 1) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % list.length), 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [list.length]);

  if (list.length === 0) return null;

  const go = (dir: number) => setIndex((i) => (i + dir + list.length) % list.length);

  return (
    <section className="relative h-[68vh] min-h-[420px] w-full overflow-hidden bg-stone-900 sm:h-[78vh]" dir="rtl">
      {list.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <img
            src={getImageUrl(slide.image || '')}
            alt=""
            className="h-full w-full object-cover"
            style={{
              transform: i === index ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 7s ease-out',
            }}
          />
          {/* Warm editorial veil */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </div>
      ))}

      {/* Copy */}
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <span className="mb-4 block h-px w-14 bg-[#d8b48a]" />
            {list.map((slide, i) => (
              <div
                key={i}
                className="transition-all duration-700"
                style={{
                  opacity: i === index ? 1 : 0,
                  transform: i === index ? 'translateY(0)' : 'translateY(18px)',
                  position: i === index ? 'relative' : 'absolute',
                  inset: i === index ? undefined : 0,
                  pointerEvents: i === index ? 'auto' : 'none',
                }}
              >
                {slide.subtitle && (
                  <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{slide.subtitle}</p>
                )}
                <h1 className="font-serif text-3xl font-bold leading-[1.25] text-white sm:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                {slide.button_text && (
                  <a
                    href={slide.button_link || '#atelier-new'}
                    className="group mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900"
                  >
                    {slide.button_text}
                    <span className="transition-transform group-hover:-translate-x-1">←</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      {list.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="السابق"
            className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:right-8">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="التالي"
            className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:left-8">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 right-1/2 z-10 flex translate-x-1/2 gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`شريحة ${i + 1}`}
                className="h-[3px] rounded-full transition-all duration-500"
                style={{ width: i === index ? 32 : 14, background: i === index ? '#e8cfa8' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
