import React, { useEffect, useState } from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';

interface HeroSliderProps {
  storeName: string;
  welcomeMessage?: string;
}

interface Slide {
  title: string;
  subtitle: string;
  cta: string;
  icon?: string;
}

const slideIcons = [
  'M20 7h-4V5a4 4 0 00-8 0v2H4a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zm-10-2a2 2 0 014 0v2h-4V5z',
  'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z',
  'M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z'
];

export const HeroSlider: React.FC<HeroSliderProps> = ({ storeName, welcomeMessage }) => {
  const theme = useMasalahTheme();
  const [current, setCurrent] = useState(0);

  const slides: Slide[] = [
    {
      title: welcomeMessage || theme.copy.heroTitle,
      subtitle: theme.copy.heroSubtitle,
      cta: theme.copy.heroCta,
      icon: slideIcons[0]
    },
    {
      title: theme.copy.tagline,
      subtitle: `${theme.copy.features[0]?.title}: ${theme.copy.features[0]?.desc} ${theme.copy.features[1]?.title}: ${theme.copy.features[1]?.desc}`,
      cta: 'اكتشف المزيد',
      icon: slideIcons[1]
    },
    {
      title: 'الدفع عند الاستلام',
      subtitle: `نوصل طلبك إلى: ${theme.copy.deliveryAreas.join('، ')}`,
      cta: 'أطلب الآن',
      icon: slideIcons[2]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const variant = theme.layout.heroVariant;

  if (variant === 'minimal') {
    return (
      <div
        className="relative overflow-hidden rounded-xl text-white my-4"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
        }}
      >
        <div className="px-6 py-8 md:px-10 md:py-10 text-center">
          <p className="text-sm opacity-90 mb-1">{theme.copy.tagline}</p>
          <h1 className="text-xl md:text-3xl font-bold mb-2">{slides[current].title}</h1>
          <p className="text-sm opacity-90 max-w-2xl mx-auto mb-4">{slides[current].subtitle}</p>
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-xs font-bold px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {slides[current].cta}
            </span>
          </div>
        </div>
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${index === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              aria-label={`شريحة ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className="relative overflow-hidden rounded-xl text-white my-4"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
        }}
      >
        <div className="px-6 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs opacity-90 mb-1">{theme.copy.tagline}</p>
            <h1 className="text-lg md:text-2xl font-bold">{slides[current].title}</h1>
            <p className="text-sm opacity-90 mt-1 max-w-lg">{slides[current].subtitle}</p>
          </div>
          <span
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full shrink-0"
            style={{ background: theme.colors.primaryDark }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={slides[current].icon || ''} />
            </svg>
            {slides[current].cta}
          </span>
        </div>
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${index === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              aria-label={`شريحة ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl text-white my-4"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
      }}
    >
      <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute -right-10 -bottom-14 w-64 h-64 rounded-full bg-white/10" />
      <div className="relative px-6 py-10 md:px-12 md:py-14">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-flex items-center justify-center h-12 w-12 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={slides[current].icon || ''} />
            </svg>
          </span>
          <p className="text-sm opacity-90">{theme.copy.tagline}</p>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold mb-3 max-w-2xl">{slides[current].title}</h1>
        <p className="text-sm md:text-base opacity-90 mb-6 max-w-2xl">{slides[current].subtitle}</p>
        <button
          onClick={() => document.getElementById('masalah-products')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm font-bold px-6 py-3 rounded-full cursor-pointer transition-transform hover:scale-105"
          style={{ background: theme.colors.primaryDark, color: theme.colors.onPrimary }}
        >
          {slides[current].cta}
        </button>
      </div>
      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${index === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            aria-label={`شريحة ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
