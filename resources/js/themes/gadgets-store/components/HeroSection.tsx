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
  return (
    <div className="bg-blue-600 text-white py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
          {welcomeMessage || `مرحباً بك في ${storeName}`}
        </h1>
        {description && (
          <p className="break-all text-sm md:text-lg opacity-90 mb-2">{description}</p>
        )}
        {(address || city) && (
          <p className="text-sm md:text-xl opacity-90">
            <span className="inline">📍 {[
              address,
              city,
              state,
              country,
              postalCode
            ].filter(Boolean).join('، ')}</span>
          </p>
        )}
      </div>
    </div>
  );
};