import React from 'react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';

const PARTNER_LOGOS = [
  { name: 'Twilio', src: '/images/logos/twilio.png' },
  { name: 'HotSMS', src: '/images/logos/hotsms.png' },
  { name: 'PayPal', src: '/images/logos/paypal.png' },
  { name: 'Stripe', src: '/images/logos/stripe.png' },
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
];

interface TestimonialsSectionProps {
  brandColor?: string;
  testimonials?: any[];
  settings?: any;
  sectionData?: {
    title?: string;
    subtitle?: string;
    trust_title?: string;
    trust_stats?: Array<{ value: string; label: string; color: string }>;
  };
}

export default function TestimonialsSection({
  settings,
  sectionData,
  brandColor = '#10b77f',
}: TestimonialsSectionProps) {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      className="py-16 sm:py-20 lg:py-28"
      ref={ref}
      dir="rtl"
      style={{
        fontFamily: 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 40%, #f0fdf4 100%)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <span
            className="inline-block rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            {t('شركاؤنا')}
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem]">
            {t(sectionData?.title || 'متاجر تثق بنا')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            {t(
              sectionData?.subtitle ||
                'نوفر لك أفضل بوابات الدفع، خوادم الحماية، وخدمات الربط لتوفير تجربة متكاملة وآمنة لعملائك.'
            )}
          </p>
        </div>

        {/* Logos Grid */}
        <div
          className={`mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-all duration-700 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {PARTNER_LOGOS.map((logo) => (
            <div
              key={logo.src}
              className="flex items-center justify-center h-24 w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-md"
            >
              <img
                src={logo.src}
                alt={logo.name}
                className="max-h-12 max-w-28 object-contain transition-all duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Trust Stats */}
        {sectionData?.trust_stats && sectionData.trust_stats.length > 0 && (
          <div className="mt-16 border-t border-gray-100 pt-12">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">
                {t(sectionData?.trust_title || 'موثوق عالمياً')}
              </h3>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-12">
              {sectionData.trust_stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: stat.color || brandColor }}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[14px] text-gray-500">
                    {t(stat.label, { defaultValue: stat.label })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
