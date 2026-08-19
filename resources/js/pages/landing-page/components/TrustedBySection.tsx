import React from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';

interface TrustedBySectionProps {
  brandColor?: string;
  settings: object;
  sectionData?: {
    title?: string;
    subtitle?: string;
  };
}

const TRUSTED_LOGOS = [
  { name: 'Twilio', src: '/images/logos/Twilio.png' },
  { name: 'HotSMS', src: '/images/logos/hotsms.png' },
  { name: 'PayPal', src: '/images/logos/paypal.png' },
  { name: 'Stripe', src: '/images/logos/Stripe.png' },
  { name: 'Jawwal Pay', src: '/images/logos/jawwal.png' },
  { name: 'Reflect', src: '/images/logos/reflect.png' },
  { name: 'PalPay', src: '/images/logos/palpay.png' },
  { name: 'Aramex', src: '/images/logos/aramaex.png' },
  { name: 'Mada', src: '/images/logos/mada.png' },
  { name: 'Ooredoo', src: '/images/logos/ooredoo.png' },
  { name: 'Laravel', src: '/images/logos/laravel.png' },
  { name: 'SSL', src: '/images/logos/ssl.png' },
  { name: 'LetsEncrypt', src: '/images/logos/LetsEncrypt.png' },
  { name: 'Cloudflare', src: '/images/logos/Cloudflare.png' },
  { name: 'MasterCard', src: '/images/logos/MasterCard.png' },
  { name: 'Visa', src: '/images/logos/Visa.png' },
  { name: 'Apple Pay', src: '/images/logos/apple.png' },
  { name: 'Google Pay', src: '/images/logos/google.png' },
  { name: 'WhatsApp', src: '/images/logos/whatsapp.png' },
  { name: 'Telegram', src: '/images/logos/telegram.png' },
];

const MARQUEE_CSS = `
  .trusted-track {
    display: flex;
    width: max-content;
    animation: trustedMarquee 32s linear infinite;
    will-change: transform;
  }
  .trusted-track:hover {
    animation-play-state: paused;
  }
  @keyframes trustedMarquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
`;

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  if (isNaN(num)) {
    return `rgba(16, 183, 127, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TrustedBySection({
  brandColor = '#10b77f',
  sectionData,
}: TrustedBySectionProps) {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="trusted-by"
      className="relative overflow-hidden bg-white pt-20 pb-14 sm:pt-24 sm:pb-16 lg:pb-20"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{MARQUEE_CSS}</style>
      {/* Soft blend from the dark hero above */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-950 via-zinc-800/60 to-transparent"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: hexToRgba(brandColor, 0.07) }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <span
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-[13px] font-bold"
            style={{ backgroundColor: hexToRgba(brandColor, 0.12), color: brandColor }}
          >
            معتمد لدى
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {sectionData?.title || 'ثقة كبرى شركات الدفع والتقنية'}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            {sectionData?.subtitle ||
              'بوابات دفع وبنية تقنية موثوقة من أبرز العلامات العالمية تضمن أمان متجرك وعملياتك.'}
          </p>
        </div>
      </div>

      <div
        dir="ltr"
        className={`mt-10 overflow-hidden transition-all duration-700 delay-200 [mask-image:linear-gradient(to_right,transparent_0,black_128px,black_calc(100%-128px),transparent_100%)] ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, black 128px, black calc(100% - 128px), transparent 100%)',
        }}
      >
        <div className="trusted-track">
          {[...TRUSTED_LOGOS, ...TRUSTED_LOGOS].map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="mx-2 flex h-16 min-w-[140px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50 px-6 py-4 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105"
              title={logo.name}
            >
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                className="max-h-9 w-auto max-w-full object-contain opacity-60 grayscale transition-all duration-300 ease-out hover:opacity-100 hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
