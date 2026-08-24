import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import type { SwiperOptions } from 'swiper/types';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

interface DealSlide {
  title?: string;
  subtitle?: string;
  badge?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
}

/** Two-digit zero-padded segment for the countdown badge. */
const pad = (n: number) => String(Math.max(n, 0)).padStart(2, '0');

/** Live "ends in HH:MM:SS" countdown, resetting at local midnight — a daily
 *  flash-deal window so the urgency badge never goes stale. */
const useDailyCountdown = () => {
  const compute = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const diff = Math.max(end.getTime() - now.getTime(), 0);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  const [label, setLabel] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setLabel(compute()), 1000);
    return () => clearInterval(id);
  }, []);
  return label;
};

/**
 * flash-deals Hero — a full-bleed swipeable deal carousel with a persistent
 * urgency badge (live "ends in HH:MM:SS" countdown) overlaid on every slide.
 * This is the structural signature of the family: unlike a calm split
 * banner, every slide reads as a time-boxed promotion.
 */
export const Hero: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.hero || storeData?.content?.banner || {};
  const storeName = storeData?.config?.storeName || storeData?.name || 'متجرنا';
  const countdown = useDailyCountdown();

  const has = (k: string) => Object.prototype.hasOwnProperty.call(props, k);
  const pick = (k: string, fallback: string): string => (has(k) ? String(props[k] ?? '').trim() : fallback);

  const title = pick('title', String(content.title || '').trim() || `عروض ${storeName} اليوم`);
  const subtitle = pick('subtitle', String(content.subtitle || '').trim());
  const badge = pick('badge', String(content.badge || '').trim() || 'عروض لا تتكرر');
  const image = pick('image', String(content.image || '').trim());
  const buttonText = pick('button_text', String(content.button_text || '').trim() || 'تسوّق الآن');
  const buttonLink = pick('button_link', String(content.button_link || '').trim() || '#template-products');

  const extraSlides: DealSlide[] = Array.isArray(props.slides)
    ? props.slides
    : Array.isArray(storeData?.content?.banners)
      ? storeData.content.banners
      : [];

  const slides: DealSlide[] = [{ title, subtitle, badge, image, button_text: buttonText, button_link: buttonLink }, ...extraSlides].filter(
    (s) => s.title || s.image
  );

  const gradient = `linear-gradient(135deg, ${css('--twc-primary', '#0f8a5f')} 0%, ${css('--twc-secondary', '#0e7490')} 100%)`;
  const swiperRef = React.useRef<SwiperClass | null>(null);
  const count = slides.length;
  const autoplay = props.autoplay !== false;
  const autoplayDelay = Math.min(Math.max(Number(props.autoplay_delay) || 5000, 2000), 15000);
  const effect = (props.effect as string) === 'fade' ? 'fade' : 'slide';
  const showDots = props.show_dots !== false;

  const UrgencyBadge = (
    <div
      className="absolute top-4 start-4 z-20 flex items-center gap-2 rounded-full py-1.5 ps-2 pe-3.5 shadow-lg backdrop-blur sm:top-6 sm:start-6"
      style={{ background: 'rgba(2,6,23,.55)', border: `1px solid ${css('--twc-accent', '#f15f3d')}55` }}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: css('--twc-accent', '#f15f3d') }}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: css('--twc-accent', '#f15f3d') }} />
        <Flame className="relative h-3.5 w-3.5 fill-current text-white" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold text-white/80">ينتهي العرض خلال</span>
        <span className="font-mono text-sm font-black tabular-nums text-white" dir="ltr">
          {countdown}
        </span>
      </span>
    </div>
  );

  if (count === 0) {
    return (
      <section id="template-hero" className="relative w-full overflow-hidden">
        <div className="relative flex min-h-[380px] items-center justify-center px-4 py-16 text-center" style={{ background: gradient }} />
      </section>
    );
  }

  const swiperParams: SwiperOptions & { dir?: string } = {
    modules: [Autoplay, Pagination, EffectFade],
    dir: 'rtl',
    effect,
    fadeEffect: { crossFade: true },
    speed: effect === 'fade' ? 800 : 600,
    loop: count > 1,
    watchSlidesProgress: true,
    pagination:
      showDots && count > 1
        ? {
            clickable: true,
            el: '.flash-hero-dots',
            bulletClass: 'flash-hero-dot',
            bulletActiveClass: 'flash-hero-dot-active',
            renderBullet: (index: number, className: string) => `<button type="button" class="${className}" aria-label="${index + 1}"></button>`,
          }
        : false,
    autoplay: autoplay && count > 1 ? { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
  };

  return (
    <section id="template-hero" className="relative w-full overflow-hidden">
      <style>{`
        .flash-hero-dots{position:absolute;inset-inline:0;bottom:1.25rem;z-index:30;display:flex;align-items:center;justify-content:center;gap:.5rem}
        .flash-hero-dot{height:.5rem;width:.5rem;border-radius:9999px;background:rgba(255,255,255,.45);transition:all .3s}
        .flash-hero-dot:hover{background:rgba(255,255,255,.75)}
        .flash-hero-dot-active{width:1.75rem!important;background:${css('--twc-accent', '#f15f3d')}}
      `}</style>

      <Swiper {...swiperParams} onSwiper={(sw) => (swiperRef.current = sw)} className="h-[420px] w-full sm:h-[480px] md:h-[540px]">
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="relative overflow-hidden" style={{ background: gradient }}>
            <a href={slide.button_link || buttonLink} className="group absolute inset-0 block" aria-label={slide.title || 'عرض ترويجي'}>
              {slide.image && (
                <img src={slide.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span
                className="absolute inset-0 block"
                style={{ background: 'linear-gradient(0deg, rgba(2,6,23,.75) 0%, rgba(2,6,23,.35) 45%, rgba(2,6,23,.55) 100%)' }}
              />
              <span className="relative z-10 flex h-full w-full flex-col justify-end px-5 pb-14 sm:px-10 sm:pb-16 md:justify-center md:pb-0">
                <span className="block max-w-xl">
                  {slide.badge && (
                    <span
                      className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold text-white shadow"
                      style={{ background: css('--twc-accent', '#f15f3d') }}
                    >
                      <Flame className="h-3 w-3 fill-current" />
                      {slide.badge}
                    </span>
                  )}
                  {slide.title && (
                    <span
                      className="block text-3xl font-black leading-tight text-white drop-shadow-md sm:text-5xl"
                      style={{ fontFamily: css('--twf-heading-font', 'inherit') }}
                    >
                      {slide.title}
                    </span>
                  )}
                  {slide.subtitle && <span className="mt-3 block max-w-md text-sm leading-relaxed text-white/90 drop-shadow sm:text-base">{slide.subtitle}</span>}
                  {slide.button_text && (
                    <span
                      className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-extrabold text-white shadow-lg transition group-hover:opacity-90"
                      style={{ background: css('--twc-primary', '#0f8a5f') }}
                    >
                      {slide.button_text}
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                  )}
                </span>
              </span>
            </a>
          </SwiperSlide>
        ))}
      </Swiper>

      {UrgencyBadge}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="السابق"
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="التالي"
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {showDots && <div className="flash-hero-dots" />}
        </>
      )}
    </section>
  );
};

export default Hero;
