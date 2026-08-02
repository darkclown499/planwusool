import React from 'react';

interface HeroSectionProps {
  storeName: string;
  description?: string;
  welcomeMessage?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  storeName,
  description,
  welcomeMessage,
  address,
  city,
  state,
  country,
  postalCode
}) => {
  const locationParts = [address, city, state, country, postalCode].filter(Boolean);
  const hasLocation = locationParts.length > 0;

  return (
    <section className="bg-stone-100 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 text-center">

        {welcomeMessage && (
          <h1 className="text-4xl md:text-6xl font-bold text-amber-900 mb-6 font-serif leading-tight">
            {welcomeMessage}
          </h1>
        )}

        {description && (
          <p className="break-all text-xl text-amber-800 max-w-3xl mx-auto leading-relaxed mb-6">
            {description}
          </p>
        )}

        {hasLocation && (
          <div className="flex items-center justify-center text-amber-700 mt-4">
            <svg className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-base md:text-lg">{locationParts.join('، ')}</span>
          </div>
        )}
      </div>
    </section>
  );
};