import React from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { getStoreThemes } from '@/data/storeThemes';
import { useTranslation } from 'react-i18next';

interface ThemesSectionProps {
  settings: any;
  sectionData: any;
  brandColor: string;
}

export default function ThemesSection({ settings, sectionData, brandColor }: ThemesSectionProps) {
  const { t } = useTranslation();
  const title = t(sectionData.title || 'Choose Your Perfect Store Theme');
  const subtitle = t(sectionData.subtitle || 'Select from our collection of professionally designed themes, each crafted for specific business categories to maximize your success.');
  const selectedThemes = sectionData.selected_themes || ['gadgets', 'fashion', 'bakery'];
  
  // Get themes from centralized data and filter to only show selected ones
  const allThemes = getStoreThemes();
  const displayThemes = allThemes.filter(theme => selectedThemes.includes(theme.id));

  return (
    <section id="themes" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: brandColor }}>
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayThemes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Theme Preview */}
              <div className="relative h-60 bg-gradient-to-br from-gray-100 to-gray-200 theme-preview-container">
                <img
                  src={theme.thumbnail}
                  alt={`${theme.name} theme preview`}
                  className="w-full h-full object-cover theme-preview-image"
                  onError={(e) => {
                    // Fallback to placeholder if image doesn't exist
                    e.currentTarget.src = `data:image/svg+xml;base64,${btoa(`
                      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#f3f4f6"/>
                        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
                          ${theme.name} Preview
                        </text>
                      </svg>
                    `)}`;
                  }}
                />

              </div>

              {/* Theme Info */}
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{t(theme.name, { defaultValue: theme.name })}</h3>
                </div>
                <p className="text-gray-600 mb-4">{t(theme.description, { defaultValue: theme.description })}</p>
                
                {/* Device Icons */}
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <Tablet className="w-4 h-4 text-gray-400" />
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 ms-2">{t('Responsive Design')}</span>
                </div>


              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4" style={{ color: brandColor }}>
              {t(sectionData.cta_title || 'ابدأ معنا لتكتشف العديد من القوالب الأخرى')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t(sectionData.cta_description || 'اختر قالبك المفضل وابدأ بناء متجرك الأول في دقائق، مع إمكانية تغيير القالب في أي وقت مع نمو نشاطك.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="px-8 py-3 text-white rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                {t(sectionData.primary_button_text || 'ابدأ متجرك الآن')}
              </a>
              <a
                href="#features"
                className="px-8 py-3 border-2 rounded-lg font-medium transition-colors hover:text-white"
                style={{ 
                  borderColor: brandColor,
                  color: brandColor
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = brandColor;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = brandColor;
                }}
              >
                {t(sectionData.secondary_button_text || 'Explore All Themes')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}