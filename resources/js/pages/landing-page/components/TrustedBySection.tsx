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
  { name: 'Jawwal', src: '/images/logos/jawwal.png' },
  { name: 'Reflect', src: '/images/logos/reflect.png' },
  { name: 'PalPay', src: '/images/logos/palpay.png' },
  { name: 'Aramaex', src: '/images/logos/aramaex.png' },
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
      className="relative overflow-hidden bg-white py-14 sm:py-16 lg:py-20"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{MARQUEE_CSS}</style>
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
        className={`mt-10 overflow-hidden transition-all duration-700 delay-200 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className="trusted-track">
          {[...TRUSTED_LOGOS, ...TRUSTED_LOGOS].map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="mx-2 flex h-24 w-52 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white px-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
            >
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                className="max-h-12 w-auto max-w-full object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
