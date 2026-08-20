import React from 'react';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const toYouTube = (url?: string): string => {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
};

export const HeroSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.hero || storeData?.content?.banner || {};
  const storeName = storeData?.config?.storeName || storeData?.name || 'متجرنا';

  const title = props.title || content.title || `مرحباً بك في ${storeName}`;
  const subtitle =
    props.subtitle ||
    content.subtitle ||
    'منتجات مميزة بأسعار منافسة وشحن سريع. اكتشف أفضل ما لدينا اليوم.';
  const badge = props.badge || content.badge || '';
  const image = props.image || content.image || '';
  const videoUrl = props.video || content.video || '';
  const buttonText = props.button_text || content.button_text || 'تسوّق الآن';
  const buttonLink = props.button_link || content.button_link || '#template-products';
  const layout = props.layout || content.layout || 'split';

  const gradient = `linear-gradient(135deg, ${css('--twc-primary', '#0f8a5f')} 0%, ${css('--twc-secondary', '#0e7490')} 100%)`;

  return (
    <section id="template-hero" className="relative w-full overflow-hidden">
      {layout === 'full' || !image ? (
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
            <h1
              className="text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl"
              style={{ fontFamily: css('--twf-heading-font', 'inherit') }}
            >
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={buttonLink}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold transition hover:shadow-lg"
                style={{ color: css('--twc-primary', '#0f8a5f') }}
              >
                {buttonText}
                <ArrowLeft className="h-4 w-4" />
              </a>
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
          </div>
        </div>
      ) : (
        <div className="grid items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div className="mx-auto max-w-xl text-center md:text-start">
            {badge && (
              <span
                className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                style={{ background: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary-foreground', '#ffffff') }}
              >
                {badge}
              </span>
            )}
            <h1
              className="text-3xl font-black leading-tight sm:text-5xl"
              style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
            >
              {title}
            </h1>
            <p
              className="mt-4 text-base leading-relaxed sm:text-lg"
              style={{ color: css('--twc-text-secondary', '#475569') }}
            >
              {subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <a
                href={buttonLink}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                style={{ background: gradient }}
              >
                {buttonText}
                <ArrowLeft className="h-4 w-4" />
              </a>
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
          </div>
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2.5rem] opacity-40 blur-2xl"
              style={{ background: gradient }}
            />
            <img
              src={image}
              alt=""
              className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      )}
    </section>
  );
};