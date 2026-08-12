import React, { useState } from 'react';
import { Target, Heart, Award, Lightbulb, Star, Shield, Users, Zap } from 'lucide-react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';
import { createSafeHtml } from '@/utils/xss-protection';
import { getImageUrl } from '@/utils/image-helper';

interface AboutUsProps {
  brandColor?: string;
  settings: any;
  sectionData: {
    title?: string;
    description?: string;
    story_title?: string;
    story_content?: string;
    stats?: Array<{
      value: string;
      label: string;
      color: string;
    }>;
    values?: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
    image_title?: string;
    image_subtitle?: string;
    image_icon?: string;
    image?: string;
    background_color?: string;
  };
}

// Icon mapping for dynamic icons
const iconMap: Record<string, React.ComponentType<any>> = {
  'target': Target,
  'heart': Heart,
  'award': Award,
  'lightbulb': Lightbulb,
  'star': Star,
  'shield': Shield,
  'users': Users,
  'zap': Zap
};

// Values Section Component with Tabs
function ValuesSection({ values, brandColor }: { values: any[], brandColor: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('Our Core Values')}</h3>
        <p className="text-gray-600">{t('The principles that guide everything we do')}</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {values.map((value, index) => {
          const IconComponent = iconMap[value.icon] || Target;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === index
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === index ? brandColor : undefined
              }}
            >
              <IconComponent className="w-4 h-4" />
              <span className="text-sm font-medium">{t(value.title, { defaultValue: value.title })}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="text-center">
        {values.map((value, index) => {
          const IconComponent = iconMap[value.icon] || Target;
          return (
            <div
              key={index}
              className={`transition-all duration-300 ${
                activeTab === index ? 'opacity-100 block' : 'opacity-0 hidden'
              }`}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${brandColor}15` }}>
                <IconComponent className="w-8 h-8" style={{ color: brandColor }} />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">{t(value.title, { defaultValue: value.title })}</h4>
              <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">{t(value.description, { defaultValue: value.description })}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AboutUs({ settings, sectionData, brandColor = '#3b82f6' }: AboutUsProps) {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useTranslation();

  
  const sectionImage = sectionData.image ? getImageUrl(sectionData.image) : null;
  const backgroundColor = sectionData.background_color || '#f9fafb';
  // Default data if none provided
  const defaultValues = [
    {
      icon: 'target',
      title: 'Our Mission',
      description: 'To democratize e-commerce by providing powerful, easy-to-use tools that enable anyone to build and manage successful online stores from a single dashboard.'
    },
    {
      icon: 'heart',
      title: 'Our Values',
      description: 'We believe in innovation, scalability, and empowering entrepreneurs to achieve e-commerce success through cutting-edge multi-store technology.'
    },
    {
      icon: 'award',
      title: 'Our Commitment',
      description: 'Delivering exceptional multi-store management experience with enterprise-grade security, 99.9% uptime, and 24/7 dedicated support.'
    },
    {
      icon: 'lightbulb',
      title: 'Our Vision',
      description: 'A world where every entrepreneur can easily create, manage, and scale multiple profitable online stores without technical barriers or limitations.'
    }
  ];

  const defaultStats = [
    { value: '5+ Years', label: 'Experience', color: 'green' },
    { value: '15K+', label: 'Happy Users', color: 'green' },
    { value: '75+', label: 'Countries', color: 'green' }
  ];

  const values = sectionData.values && sectionData.values.length > 0 
    ? sectionData.values 
    : defaultValues;

  const stats = sectionData.stats && sectionData.stats.length > 0 
    ? sectionData.stats 
    : defaultStats;

  return (
    <section id="about" className="py-12 sm:py-16 lg:py-20" style={{ backgroundColor }} ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t(sectionData.title || 'About Us')}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
            {t(sectionData.description || 'We are passionate about empowering entrepreneurs to build successful e-commerce businesses.')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center mb-8 sm:mb-12 lg:mb-16">
          {/* Left Content */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {t(sectionData.story_title || 'Revolutionizing Multi-Store E-commerce Since 2020')}
            </h3>
            <div className="text-gray-600 mb-8 leading-relaxed" dangerouslySetInnerHTML={createSafeHtml(
              String(t(sectionData.story_content || 'Founded by e-commerce experts and technology innovators, Wusool was created to solve the complex challenges of managing multiple online stores. Our platform enables entrepreneurs to build, customize, and scale their store empire from a single powerful dashboard.')).replace(/\n/g, '</p><p className="mb-6">')
            )} />
            
            {stats.length > 0 && (
              <div className="flex items-center gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{t(stat.label, { defaultValue: stat.label })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Content - Image or Visual */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 h-96 flex items-center justify-center">
            {sectionImage ? (
              <img src={sectionImage} alt="About Us" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-3xl">{sectionData.image_icon || '🚀'}</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  {t(sectionData.image_title || 'Innovation Driven')}
                </h4>
                <p className="text-gray-600">
                  {t(sectionData.image_subtitle || 'Building the future of e-commerce')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Values Section with Tabs */}
        <div className={`transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <ValuesSection values={values} brandColor={brandColor} />
        </div>
      </div>
    </section>
  );
}