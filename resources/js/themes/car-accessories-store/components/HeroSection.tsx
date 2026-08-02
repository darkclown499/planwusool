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
  const fullAddress = [address, city, state, country, postalCode].filter(Boolean).join('، ');

  return (
    <div className="bg-slate-900 text-white py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-red-500">
          {welcomeMessage || `مرحباً بك في ${storeName}`}
        </h1>
        {description && (
          <p className="text-lg md:text-xl opacity-90 mb-4 max-w-2xl mx-auto break-all">{description}</p>
        )}
        {fullAddress && (
          <p className="text-base md:text-lg opacity-80">
            <span className="inline">📍 {fullAddress}</span>
          </p>
        )}
      </div>
    </div>
  );
};