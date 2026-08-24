import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

/**
 * modern-minimal Hero — one calm, understated layout regardless of the
 * `hero_variant` a merchant may carry over from another family: centered
 * copy, a single quiet CTA, and (optionally) a wide plain photo below with
 * a hairline border instead of a gradient/overlay treatment. No slider,
 * no bento grid, no video-background theatrics — the point of this family
 * is restraint.
 */
export const Hero: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.hero || storeData?.content?.banner || {};
  const storeName = storeData?.config?.storeName || storeData?.name || 'متجرنا';

  const has = (k: string) => Object.prototype.hasOwnProperty.call(props, k);
  const pick = (k: string, fallback: string): string => (has(k) ? String(props[k] ?? '').trim() : fallback);

  const badge = pick('badge', String(content.badge || '').trim());
  const title = pick('title', String(content.title || '').trim() || `مرحباً بك في ${storeName}`);
  const subtitle = pick('subtitle', String(content.subtitle || '').trim());
  const image = pick('image', String(content.image || '').trim());
  const buttonText = pick('button_text', String(content.button_text || '').trim() || 'تسوّق الآن');
  const buttonLink = pick('button_link', String(content.button_link || '').trim() || '#template-products');

  const border = css('--twc-border', '#e2e8f0');
  const hasContent = !!(badge || title || subtitle || buttonText);

  return (
    <section id="template-hero" className="w-full" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24 sm:pb-14 lg:px-8">
        {hasContent && (
          <>
            {badge && (
              <span
                className="mb-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]"
                style={{ color: css('--twc-text-secondary', '#64748b') }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: css('--twc-primary', '#0f8a5f') }} />
                {badge}
              </span>
            )}
            {title && (
              <h1
                className="text-3xl font-light leading-[1.15] tracking-tight sm:text-5xl"
                style={{ color: css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: css('--twc-text-secondary', '#64748b') }}>
                {subtitle}
              </p>
            )}
            {buttonText && (
              <div className="mt-9">
                <a
                  href={buttonLink}
                  className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: css('--twc-primary', '#0f8a5f'), borderRadius: css('--twx-radius', '0.75rem') }}
                >
                  {buttonText}
                  <ArrowLeft className="h-4 w-4" />
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {image && (
        <div className="container mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div
            className="overflow-hidden"
            style={{ border: `1px solid ${border}`, borderRadius: css('--twx-radius', '0.75rem') }}
          >
            <img src={image} alt="" loading="eager" className="aspect-[16/7] w-full object-cover sm:aspect-[21/8]" />
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
