import React from 'react';
import { MapPin } from 'lucide-react';

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
  postalCode,
}) => {
  const fullAddress = [address, city, state, country, postalCode].filter(Boolean).join(', ');

  return (
    <div className="relative bg-purple-500 overflow-hidden">
      {/* Floating Elements Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-4 h-4 bg-green-300 rounded-full opacity-60 animate-[float_4s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-20 right-20 w-4 h-4 bg-blue-300 rounded-full opacity-50 animate-[float_5s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-20 w-5 h-5 bg-green-200 rounded-full opacity-40 animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 right-16 w-3 h-3 bg-blue-200 rounded-full opacity-70 animate-[float_3s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-purple-200 rounded-full opacity-50 animate-[float_4.5s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-green-400 rounded-full opacity-45 animate-[float_5.5s_ease-in-out_infinite]" style={{ animationDelay: '2.5s' }}></div>
      </div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
          {/* Welcome Message */}
          {welcomeMessage ? (
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight opacity-0 animate-[fadeInUp_1s_ease-out_0.3s_forwards]">
              {welcomeMessage}
            </h1>
          ) : (
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight opacity-0 animate-[fadeInUp_1s_ease-out_0.3s_forwards]">
              Welcome to {storeName}
            </h1>
          )}
          
          {/* Description */}
          {description && (
            <p className="break-all text-lg md:text-xl text-purple-100 mb-8 max-w-2xl mx-auto leading-relaxed opacity-0 animate-[fadeInUp_1s_ease-out_0.6s_forwards]">
              {description}
            </p>
          )}
          
          {/* Location */}
          {fullAddress && (
            <div className="inline-flex items-center justify-center space-x-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-3 text-purple-800 opacity-0 animate-[fadeInUp_1s_ease-out_0.9s_forwards] hover:bg-opacity-30 transition-all duration-300">
              <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <span className="text-sm md:text-base font-medium">{fullAddress}</span>
            </div>
          )}
        </div>
      </div>
      

      
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};