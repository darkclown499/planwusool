import React from 'react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';

const PARTNER_LOGOS = [
  { name: 'متجر بال جاردنز', nameEn: 'Pal Gardens', src: '/images/logos/pal-gardens.svg' },
  { name: 'سوبرماركت البطة', nameEn: 'Al-Batta Supermarket', src: '/images/logos/albatta.svg' },
  { name: 'شركة القدس للتكنولوجيا', nameEn: 'Jerusalem Tech', src: '/images/logos/jerusalem-tech.svg' },
  { name: 'متجر العباسي للأزياء', nameEn: 'Al-Abbasi Fashion', src: '/images/logos/abbasi.svg' },
  { name: 'مخابز الشام', nameEn: 'Al-Sham Bakeries', src: '/images/logos/sham-bakery.svg' },
  { name: 'صيدليات الوفاء', nameEn: 'Wafaa Pharmacies', src: '/images/logos/wafaa.svg' },
  { name: 'همسة لزهور', nameEn: 'Hamsa Flowers', src: '/images/logos/hamsa.svg' },
  { name: 'رويال سنتر', nameEn: 'Royal Center', src: '/images/logos/royal.svg' },
  { name: 'كوانتوم ستور', nameEn: 'Quantum Store', src: '/images/logos/quantum.svg' },
  { name: 'معرض النورس', nameEn: 'Al-Nawras Exhibition', src: '/images/logos/nawras.svg' },
  { name: 'مطاعم بيت لحم', nameEn: 'Bethlehem Restaurants', src: '/images/logos/bethlehem.svg' },
  { name: 'بازار فلسطين', nameEn: 'Palestine Bazaar', src: '/images/logos/bazaar.svg' },
  { name: 'تكنو شوب', nameEn: 'Techno Shop', src: '/images/logos/technoshop.svg' },
  { name: 'مؤسسة الأرز الرقمية', nameEn: 'Cedar Digital', src: '/images/logos/cedar.svg' },
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
                'شركاؤنا من المتاجر والشركات الفلسطينية التي تدير أعمالها عبر منصة وصول'
            )}
          </p>
        </div>

        {/* Logos Grid */}
        <div
          className={`mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 transition-all duration-700 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {PARTNER_LOGOS.map((logo) => (
            <div
              key={logo.src}
              className="group flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-lg"
            >
              <div className="flex h-20 w-full items-center justify-center">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-16 w-auto max-w-full object-contain transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white';
                      fallback.style.backgroundColor = brandColor;
                      fallback.textContent = logo.name.charAt(0);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              <p className="mt-3 text-center text-[12px] font-semibold leading-tight text-gray-500 transition-colors duration-300 group-hover:text-gray-900">
                {logo.name}
              </p>
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
