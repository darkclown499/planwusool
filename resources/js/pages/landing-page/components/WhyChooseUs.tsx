import React from 'react';
import { CheckCircle, Clock, Users, Zap, Star, Shield, Heart, Award } from 'lucide-react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';

interface WhyChooseUsProps {
  brandColor?: string;
  settings: any;
  sectionData: {
    title?: string;
    subtitle?: string;
    reasons?: Array<{ title: string; description: string; icon: string }>;
    stats?: Array<{ value: string; label: string; color: string }>;
    stats_title?: string;
    stats_subtitle?: string;
    cta_title?: string;
    cta_subtitle?: string;
  };
}

const iconMap: Record<string, React.ComponentType<any>> = {
  clock: Clock,
  users: Users,
  zap: Zap,
  'check-circle': CheckCircle,
  star: Star,
  shield: Shield,
  heart: Heart,
  award: Award,
};

export default function WhyChooseUs({ settings, sectionData, brandColor = '#3b82f6' }: WhyChooseUsProps) {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();

  const defaultReasons = [
    {
      icon: 'clock',
      title: 'Purpose-built for commerce',
      description: 'Every feature is designed to help you sell more, manage less, and grow faster.',
    },
    {
      icon: 'shield',
      title: 'Enterprise-grade reliability',
      description: '99.9% uptime, automatic backups, and dedicated support keep your business running.',
    },
    {
      icon: 'users',
      title: 'Built for teams of any size',
      description: 'From solo entrepreneurs to large organizations with complex workflows.',
    },
  ];

  const reasons = sectionData.reasons && sectionData.reasons.length > 0 ? sectionData.reasons : defaultReasons;

  const stats = sectionData.stats && sectionData.stats.length > 0
    ? sectionData.stats
    : [
        { value: '10K+', label: t('Active businesses', { defaultValue: 'Active businesses' }), color: brandColor },
        { value: '50+', label: t('Countries served', { defaultValue: 'Countries served' }), color: '#059669' },
        { value: '$2B+', label: t('Transactions processed', { defaultValue: 'Transactions processed' }), color: '#8b5cf6' },
        { value: '99.9%', label: t('Uptime guarantee', { defaultValue: 'Uptime guarantee' }), color: '#f59e0b' },
      ];

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className={`transition-all duration-700 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">{t('Why choose us')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-gray-900 sm:text-4xl">
              {t(sectionData.title || 'Built for serious businesses')}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-gray-500">
              {t(sectionData.subtitle || 'We provide the infrastructure, tools, and support that growing companies need to compete at scale.')}
            </p>

            <div className="mt-10 space-y-5">
              {reasons.map((reason, index) => {
                const IconComponent = iconMap[reason.icon] || Clock;
                return (
                  <div key={index} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${brandColor}0D` }}>
                      <IconComponent className="h-5 w-5" style={{ color: brandColor }} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-900">{t(reason.title, { defaultValue: reason.title })}</h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-gray-500">{t(reason.description, { defaultValue: reason.description })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`transition-all duration-700 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-2xl border border-gray-100 bg-white p-6 text-center transition-all hover:border-gray-200 hover:shadow-sm">
                  <div className="text-3xl font-semibold tracking-tight text-gray-900">{stat.value}</div>
                  <div className="mt-1.5 text-[13px] font-medium uppercase tracking-wider text-gray-400">{t(stat.label, { defaultValue: stat.label })}</div>
                </div>
              ))}
            </div>

            {(sectionData.cta_title || sectionData.cta_subtitle) && (
              <div className="mt-6 rounded-2xl p-8 text-center text-white" style={{ backgroundColor: brandColor }}>
                <div className="text-xl font-semibold">{t(sectionData.cta_title || 'Ready to grow?')}</div>
                <div className="mt-2 text-[15px] leading-relaxed text-white/80">{t(sectionData.cta_subtitle || 'Start with a free plan today.')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
