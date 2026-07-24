import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

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
  const fullAddress = [address, city, state, country, postalCode].filter(Boolean).join(', ');

  return (
    <section className="relative overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 bg-amber-900/90"></div>
      
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white/30 rounded-full"></div>
        <div className="absolute top-32 right-20 w-24 h-24 border-2 border-white/20 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-white/15 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 border-2 border-white/25 rounded-full"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center">
          <div className="text-white space-y-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight text-amber-200">
                {storeName}
              </h1>
              
              {welcomeMessage && (
                <p className="break-all text-xl md:text-2xl text-amber-100 font-light leading-relaxed">
                  {welcomeMessage}
                </p>
              )}
              
              {description && (
                <p className="break-all text-lg text-amber-200/90 leading-relaxed">
                  {description}
                </p>
              )}
            </div>



            {/* Store Info */}
            {fullAddress && (
              <div className="flex items-center justify-center space-x-1 md:space-x-2 text-amber-100">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <p className="text-sm md:text-base text-amber-200/80">{fullAddress}</p>
              </div>
            )}
          </div>


        </div>


      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" fill="none" className="w-full h-12">
          <path
            d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};