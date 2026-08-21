import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const toYouTube = (url?: string): string => {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
};

/** Convert any video URL into a playable embed (YouTube / Vimeo) or pass MP4 through. */
const toEmbed = (url?: string): { src: string; kind: 'mp4' | 'embed' | '' } => {
  const v = url || '';
  const yt = v.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) {
    return {
      src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&rel=0&playsinline=1&modestbranding=1`,
      kind: 'embed',
    };
  }
  const vm = v.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1&title=0&byline=0&portrait=0`,
      kind: 'embed',
    };
  }
  return { src: v, kind: /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i.test(v) ? 'mp4' : '' };
};

interface HeroSlide {
  title?: string;
  subtitle?: string;
  badge?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
}

export const HeroSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.hero || storeData?.content?.banner || {};
  const storeName = storeData?.config?.storeName || storeData?.name || 'متجرنا';

  // Strict conditional resolution: a key present in props is authoritative —
  // clearing it in the designer hides the element instead of falling back to
  // generic placeholder text (no empty text artifacts).
  const has = (k: string) => Object.prototype.hasOwnProperty.call(props, k);
  const pick = (k: string, fallback: string): string => {
    if (has(k)) return String(props[k] ?? '').trim();
    return fallback;
  };

  const title = pick('title', String(content.title || '').trim() || `مرحباً بك في ${storeName}`);
  const subtitle = pick('subtitle', String(content.subtitle || '').trim());
  const badge = pick('badge', String(content.badge || '').trim());
  const image = pick('image', String(content.image || '').trim());
  const videoUrl = pick('video', String(content.video || '').trim());
  const buttonText = pick('button_text', String(content.button_text || '').trim() || 'تسوّق الآن');
  const buttonLink = pick('button_link', String(content.button_link || '').trim() || '#template-products');

  const variant = (props.hero_variant as string) || (props.layout === 'full' ? 'full' : 'split_banner');

  const gradient = `linear-gradient(135deg, ${css('--twc-primary', '#0f8a5f')} 0%, ${css('--twc-secondary', '#0e7490')} 100%)`;

  /* -------- video_bg (background video loop + text overlay) -------- */
  if (variant === 'video_bg' || variant === 'video_background') {
    const embed = toEmbed(videoUrl);
    const hasOverlayContent = !!(title || subtitle || badge || buttonText);

    return (
      <section id="template-hero" className="relative w-full overflow-hidden">
        {/* Fixed responsive stage — no letterboxing: media always covers */}
        <div className="relative h-[500px] w-full overflow-hidden md:h-[650px]">
          {embed.kind === 'mp4' && embed.src ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={image || undefined}
              className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover"
            >
              <source src={embed.src} type="video/mp4" />
            </video>
          ) : embed.kind === 'embed' && embed.src ? (
            /* 16:9 cover trick: keeps the iframe larger than the stage on both axes */
            <iframe
              src={embed.src}
              title="Hero video"
              frameBorder={0}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
              style={{ width: '100%', minWidth: '177.77777778vh', height: '56.25vw', minHeight: '100%' }}
            />
          ) : image ? (
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}

          {hasOverlayContent && (
            <>
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(2,6,23,.55) 0%, rgba(2,6,23,.35) 50%, rgba(2,6,23,.65) 100%)' }}
              />
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                {badge && (
                  <span className="mb-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur">
                    {badge}
                  </span>
                )}
                {title && (
                  <h1
                    className="text-3xl font-black leading-tight text-white drop-shadow-md sm:text-5xl"
                    style={{ fontFamily: css('--twf-heading-font', 'inherit') }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 drop-shadow sm:text-lg">{subtitle}</p>
                )}
                {buttonText && (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={buttonLink}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                      style={{ background: gradient }}
                    >
                      {buttonText}
                      <ArrowLeft className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  /* -------- slider_full / full_slider (swipeable high-res banners) -------- */
  if (variant === 'slider_full' || variant === 'full_slider') {
    const extraSlides: HeroSlide[] = Array.isArray(props.slides)
      ? props.slides
      : Array.isArray(storeData?.content?.banners)
        ? storeData.content.banners
        : [];
    const slides: HeroSlide[] = [
      { title, subtitle, badge, image, button_text: buttonText, button_link: buttonLink },
      ...extraSlides.slice(0, 2),
    ].filter((s) => s.title);

    return <HeroSlider slides={slides} gradient={gradient} videoUrl={videoUrl} />;
  }

  /* -------- bento_grid -------- */
  if (variant === 'bento_grid') {
    const sideSlides: HeroSlide[] = (
      Array.isArray(props.slides) && props.slides.length
        ? props.slides.slice(0, 2)
        : [
            { title: props.side_title_1 || '', subtitle: props.side_subtitle_1 || '', image: props.side_image_1 || '' },
            { title: props.side_title_2 || '', subtitle: props.side_subtitle_2 || '', image: props.side_image_2 || '' },
          ]
    ).filter((s) => s.title || s.image);
    return (
      <section id="template-hero" className="relative w-full px-4 py-8 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {/* Main banner */}
          <div
            className="relative flex min-h-[340px] flex-col justify-center overflow-hidden rounded-[1.75rem] p-8 sm:p-12 md:col-span-2"
            style={{ background: gradient }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.4) 0, transparent 35%)',
              }}
            />
            {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
            <div className="relative z-10 max-w-xl">
              {badge && (
                <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white ring-1 ring-white/30">
                  {badge}
                </span>
              )}
              {title && <h1 className="text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">{title}</h1>}
              {subtitle && <p className="mt-4 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">{subtitle}</p>}
              {(buttonText || videoUrl) && (
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {buttonText && (
                    <a
                      href={buttonLink}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold transition hover:shadow-lg"
                      style={{ color: css('--twc-primary', '#0f8a5f') }}
                    >
                      {buttonText}
                      <ArrowLeft className="h-4 w-4" />
                    </a>
                  )}
                  {videoUrl && (
                    <a
                      href={toYouTube(videoUrl) || videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                    >
                      <PlayCircle className="h-4 w-4" />
                      شاهد الفيديو
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Side banners */}
          <div className="grid gap-4 md:grid-cols-1">
            {sideSlides.map((s, i) => (
              <a
                key={i}
                href={s.button_link || buttonLink}
                className="group relative flex min-h-[158px] flex-1 items-end overflow-hidden rounded-[1.25rem] p-5"
                style={{ background: i % 2 ? css('--twc-secondary', '#0e7490') : css('--twc-accent', '#f59e0b') }}
              >
                {s.image && (
                  <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 transition group-hover:scale-105" />
                )}
                {s.title && (
                  <span className="relative z-10 text-lg font-black text-white drop-shadow">{s.title}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* -------- split_banner (text left, image right — RTL awareness) -------- */
  if (variant === 'split_banner' && image) {
    return (
      <section id="template-hero" className="relative w-full overflow-hidden">
        <div className="grid items-center gap-8 px-4 py-14 md:grid-cols-2">
          {(badge || title || subtitle || buttonText || videoUrl) && (
            <div className="mx-auto max-w-xl text-center md:text-start">
              {badge && (
                <span
                  className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                  style={{ background: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary-foreground', '#ffffff') }}
                >
                  {badge}
                </span>
              )}
              {title && (
                <h1
                  className="text-3xl font-black leading-tight sm:text-5xl"
                  style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: css('--twc-text-secondary', '#475569') }}>
                  {subtitle}
                </p>
              )}
              {(buttonText || videoUrl) && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  {buttonText && (
                    <a
                      href={buttonLink}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                      style={{ background: gradient }}
                    >
                      {buttonText}
                      <ArrowLeft className="h-4 w-4" />
                    </a>
                  )}
                  {videoUrl && (
                    <a
                      href={toYouTube(videoUrl) || videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold"
                      style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-secondary', '#475569') }}
                    >
                      <PlayCircle className="h-4 w-4" />
                      شاهد الفيديو
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-[2.5rem] opacity-40 blur-2xl" style={{ background: gradient }} />
            <img src={image} alt="" className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-2xl" loading="eager" />
          </div>
        </div>
      </section>
    );
  }

  /* -------- full (fallback when no image or legacy 'full') -------- */
  return (
    <section id="template-hero" className="relative w-full overflow-hidden">
      <div
        className="relative flex min-h-[420px] items-center justify-center px-4 py-20 text-center"
        style={{ background: gradient }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.4) 0, transparent 35%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          {badge && (
            <span className="mb-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white ring-1 ring-white/30">
              {badge}
            </span>
          )}
          {title && (
            <h1 className="text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl" style={{ fontFamily: css('--twf-heading-font', 'inherit') }}>
              {title}
            </h1>
          )}
          {subtitle && <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{subtitle}</p>}
          {(buttonText || videoUrl) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {buttonText && (
                <a
                  href={buttonLink}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold transition hover:shadow-lg"
                  style={{ color: css('--twc-primary', '#0f8a5f') }}
                >
                  {buttonText}
                  <ArrowLeft className="h-4 w-4" />
                </a>
              )}
              {videoUrl && (
                <a
                  href={toYouTube(videoUrl) || videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  <PlayCircle className="h-4 w-4" />
                  شاهد الفيديو
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* Lightweight auto-advancing full-width hero slider. */
const HeroSlider: React.FC<{ slides: HeroSlide[]; gradient: string; videoUrl: string }> = ({
  slides,
  gradient,
  videoUrl,
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = Math.max(slides.length, 1);

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [paused, count]);

  const slide = slides[index] || { title: '', subtitle: '', badge: '', image: '' };
  const link = slide.button_link || '#template-products';
  const title = slide.title || '';
  const subtitle = slide.subtitle || '';
  const badge = slide.badge || '';
  const image = slide.image || '';
  const buttonText = slide.button_text || '';

  return (
    <section
      id="template-hero"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex min-h-[440px] items-center justify-center px-4 py-20 text-center" style={{ background: gradient }}>
        {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.5) 0, transparent 45%), radial-gradient(circle at 70% 75%, rgba(255,255,255,.35) 0, transparent 40%)' }} />
        <div key={index} className="relative z-10 mx-auto max-w-3xl animate-fade-slide">
          {badge && <span className="mb-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white ring-1 ring-white/30">{badge}</span>}
          {title && <h1 className="text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">{title}</h1>}
          {subtitle && <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{subtitle}</p>}
          {(buttonText || videoUrl) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {buttonText && (
                <a href={link} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold transition hover:shadow-lg" style={{ color: css('--twc-primary', '#0f8a5f') }}>
                  {buttonText}
                  <ArrowLeft className="h-4 w-4" />
                </a>
              )}
              {videoUrl && (
                <a href={toYouTube(videoUrl) || videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30">
                  <PlayCircle className="h-4 w-4" />
                  شاهد الفيديو
                </a>
              )}
            </div>
          )}
        </div>
        {/* Prev / Next + dots */}
        {count > 1 && (
          <>
            <button type="button" aria-label="السابق" onClick={() => setIndex((i) => (i - 1 + count) % count)} className="absolute start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/30">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button type="button" aria-label="التالي" onClick={() => setIndex((i) => (i + 1) % count)} className="absolute end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/30">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <button key={i} type="button" aria-label={`شريحة ${i + 1}`} onClick={() => setIndex(i)} className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};