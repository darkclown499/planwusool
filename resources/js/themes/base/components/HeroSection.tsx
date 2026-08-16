import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ShoppingBag, Truck, Shield, Headphones } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BaseHeroSectionProps {
  brandName?: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
  showFeatures?: boolean;
  brandColor?: string;
  className?: string;
}

export const BaseHeroSection: React.FC<BaseHeroSectionProps> = ({
  brandName = 'Our Store',
  subtitle,
  ctaText = 'Shop Now',
  onCtaClick,
  backgroundImage,
  showFeatures = true,
  brandColor = '#10b77f',
  className,
}) => {
  const { t } = useTranslation();

  const defaultSubtitle = t('Discover amazing products at unbeatable prices. Fast delivery, secure payments, and excellent customer service.');

  const features = [
    { icon: ShoppingBag, label: t('Quality Products'), description: t('Curated selection of premium items') },
    { icon: Truck, label: t('Fast Delivery'), description: t('Express shipping to your door') },
    { icon: Shield, label: t('Secure Payment'), description: t('100% secure checkout process') },
    { icon: Headphones, label: t('24/7 Support'), description: t('Dedicated customer service') },
  ];

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={{ backgroundColor: backgroundImage ? 'transparent' : 'var(--bg-secondary)' }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6">
            {brandName}
          </h1>
          <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {subtitle || defaultSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={onCtaClick}
              className="w-full sm:w-auto px-8 py-3 text-lg"
              style={{ backgroundColor: 'var(--theme-color)' }}
            >
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {showFeatures && (
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--theme-color)' }}
                >
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.label}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BaseHeroSection;