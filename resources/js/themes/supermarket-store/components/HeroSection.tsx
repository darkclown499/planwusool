import React from 'react';
import { Truck, Shield, Clock, Leaf } from 'lucide-react';

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
  const fullAddress = [address, city, state, country, postalCode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="relative bg-green-700 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center">
          {welcomeMessage ? (
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6 text-white">
              {welcomeMessage}
            </h1>
          ) : (
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6 text-white">
              منتجات طازجة تصلك يومياً
            </h1>
          )}
          
          {description && (
            <p className="break-all text-base md:text-lg text-green-100 leading-relaxed mb-8 max-w-2xl mx-auto">
              {description}
            </p>
          )}
          
          {fullAddress && (
            <div className="bg-white rounded-lg p-4 mx-auto max-w-md mb-4 md:mb-0">
              <h3 className="font-semibold text-green-700 mb-2">📍 موقع المتجر</h3>
              <p className="text-gray-700 text-sm md:text-base">{fullAddress}</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};