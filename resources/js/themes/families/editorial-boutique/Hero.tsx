import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import type { SwiperOptions } from 'swiper/types';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

interface Slide {
  title?: string;
  subtitle?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
}

const CtaButton: React.FC<{ text: string; link: string }> = ({ text, link }) => (
  <a
    href={link}
    className="inline-flex items-center gap-2 px-8 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85"
    style={{ background: css('--twc-primary', '#f6d7d5'), color: '#000000', borderRadius: css('--twx-radius', '4px') }}
  >
    {text}
    <ArrowLeft className="h-3.5 w-3.5" />
  </a>
);

/**
 * editorial-boutique Hero — a full-bleed lookbook banner (or swipeable set
 * of them for `hero_variant: 'slider_full'`, matching Anaqa's original
 * template config): a light scrim (not the generic hero's near-black one)
 * so the photography stays the star, a slim serif-leaning headline, and a
 * sharp-cornered blush button with black text/icon — never a white pill on
 * a colored gradient, which is the generic family's signature instead.
 */
export const Hero: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.hero || storeData?.content?.banner || {};
  const storeName = storeData?.config?.storeName || storeData?.name || 'متجرنا';

  const has = (k: string) => Object.prototype.hasOwnProperty.call(props, k);
  const pick = (k: string, fallback: string): string => (has(k) ? String(props[k] ?? '').trim() : fallback);

  const title = pick('title', String(content.title || '').trim() || `تشكيلة ${storeName} الجديدة`);
  const subtitle = pick('subtitle', String(content.subtitle || '').trim());
  const image = pick('image', String(content.image || '').trim());
  const buttonText = pick('button_text', String(content.button_text || '').trim() || 'تسوّقي الآن');
  const buttonLink = pick('button_link', String(content.button_link || '').trim() || '#template-products');

  const variant = (props.hero_variant as string) || 'split';
  const headingFont = css('--twf-heading-font', 'inherit');
  const overlayOpacity = Math.min(Math.max(Number(props.overlay_opacity ?? 0.35), 0), 0.85);

  if (variant === 'slider_full' || variant === 'full_slider') {
    const extraSlides: Slide[] = Array.isArray(props.slides) ? props.slides : [];
    const slides: Slide[] = [{ title, subtitle, image, button_text: buttonText, button_link: buttonLink }, ...extraSlides].filter(
      (s) => s.title || s.image
    );
    return <Slider slides={slides} overlayOpacity={overlayOpacity} headingFont={headingFont} autoplay={props.autoplay !== false} />;
  }

  const hasCopy = !!(title || subtitle || buttonText);

  return (
    <section id="template-hero" className="w-full" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
        {hasCopy && (
          <div className="order-2 mx-auto max-w-md text-center md:order-1 md:mx-0 md:text-start">
            {title && (
              <h1
                className="text-3xl font-medium leading-[1.15] tracking-tight sm:text-5xl"
                style={{ color: css('--twc-text-primary', '#161311'), fontFamily: headingFont }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed sm:text-base md:mx-0" style={{ color: css('--twc-text-secondary', '#8a8178') }}>
                {subtitle}
              </p>
            )}
            {buttonText && (
              <div className="mt-8 flex justify-center md:justify-start">
                <CtaButton text={buttonText} link={buttonLink} />
              </div>
            )}
          </div>
        )}
        {image && (
          <div className="order-1 md:order-2">
            <img
              src={image}
              alt=""
              loading="eager"
              className="aspect-[4/5] w-full object-cover sm:aspect-[3/4]"
              style={{ borderRadius: css('--twx-radius', '4px') }}
            />
          </div>
        )}
      </div>
    </section>
  );
};

const Slider: React.FC<{ slides: Slide[]; overlayOpacity: number; headingFont: string; autoplay: boolean }> = ({
  slides,
  overlayOpacity,
  headingFont,
  autoplay,
}) => {
  const count = slides.length;
  const swiperRef = React.useRef<SwiperClass | null>(null);

  if (count === 0) return null;

  const swiperParams: SwiperOptions & { dir?: string } = {
    modules: [Autoplay, Pagination, EffectFade],
    dir: 'rtl',
    effect: 'fade',
    fadeEffect: { crossFade: true },
    speed: 800,
    loop: count > 1,
    pagination:
      count > 1
        ? {
            clickable: true,
            el: '.eb-hero-dots',
            bulletClass: 'eb-hero-dot',
            bulletActiveClass: 'eb-hero-dot-active',
            renderBullet: (index: number, className: string) => `<button type="button" class="${className}" aria-label="${index + 1}"></button>`,
          }
        : false,
    autoplay: autoplay && count > 1 ? { delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
  };

  const primary = css('--twc-primary', '#f6d7d5');

  return (
    <section id="template-hero" className="relative w-full overflow-hidden">
      <style>{`
        .eb-hero-dots{position:absolute;inset-inline:0;bottom:1.5rem;z-index:30;display:flex;align-items:center;justify-content:center;gap:.5rem}
        .eb-hero-dot{height:.5rem;width:.5rem;border-radius:9999px;background:rgba(255,255,255,.55);transition:all .3s}
        .eb-hero-dot-active{width:1.5rem!important;background:${primary}}
      `}</style>
      <Swiper {...swiperParams} onSwiper={(sw) => (swiperRef.current = sw)} className="h-[460px] w-full sm:h-[560px]">
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="relative overflow-hidden">
            <a href={slide.button_link || '#template-products'} className="group absolute inset-0 block" aria-label={slide.title || 'شريحة ترويجية'}>
              {slide.image && <img src={slide.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover" />}
              <span className="absolute inset-0 block" style={{ background: `linear-gradient(0deg, rgba(0,0,0,${overlayOpacity}) 0%, rgba(0,0,0,${overlayOpacity * 0.3}) 55%, transparent 100%)` }} />
              <span className="relative z-10 flex h-full w-full flex-col items-center justify-end px-6 pb-16 text-center sm:pb-20">
                {slide.title && (
                  <span className="block max-w-lg text-3xl font-medium leading-[1.15] text-white drop-shadow-sm sm:text-5xl" style={{ fontFamily: headingFont }}>
                    {slide.title}
                  </span>
                )}
                {slide.subtitle && <span className="mt-4 block max-w-md text-sm leading-relaxed text-white/90 sm:text-base">{slide.subtitle}</span>}
                {slide.button_text && (
                  <span
                    className="mt-7 inline-flex items-center gap-2 px-8 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition group-hover:opacity-85"
                    style={{ background: primary, color: '#000000', borderRadius: css('--twx-radius', '4px') }}
                  >
                    {slide.button_text}
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
            </a>
          </SwiperSlide>
        ))}
      </Swiper>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="السابق"
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute start-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            aria-label="التالي"
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute end-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div className="eb-hero-dots" />
        </>
      )}
    </section>
  );
};

export default Hero;
