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
    <div className="relative bg-red-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center">
          {/* Main Heading */}
          <h1 className="text-3xl md:text-5xl font-serif font-light text-gray-900 mb-4 tracking-wide">
            {welcomeMessage || (
              <>
                مرحباً بك في <br />
                <span className="font-medium text-red-600">{storeName}</span>
              </>
            )}
          </h1>

          {/* Description */}
          {description && (
            <p className="break-all text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed font-light">
              {description}
            </p>
          )}

          {/* Location */}
          {(address || city) && (
            <div className="flex items-center justify-center text-gray-500 mb-4">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm md:text-base font-light">
                {[address, city, state, country, postalCode].filter(Boolean).join('، ')}
              </span>
            </div>
          )}


        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-red-100 rounded-full opacity-60 animate-pulse hidden md:block" />
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-pink-100 rounded-full opacity-60 animate-pulse hidden md:block" />
        <div className="absolute top-1/2 left-5 w-12 h-12 bg-red-200 rounded-full opacity-40 animate-pulse hidden lg:block" />
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-6 md:h-8 text-white" fill="currentColor" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
        </svg>
      </div>
    </div>
  );
};