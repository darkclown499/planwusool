import React, { useEffect, useState } from 'react';
import { Check, ArrowLeft, ArrowRight, Headphones, Package, Store, Truck, Globe, Smartphone, Crown, Clock, Shield, Zap, Star, Boxes, Building2, Warehouse } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currency-helper';

const encryptPlanId = (planId: number): string => {
  const key = 'Store2025';
  const str = planId.toString();
  let encrypted = '';
  for (let i = 0; i < str.length; i++) {
    encrypted += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encrypted);
};

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearly_price?: number;
  duration: string;
  features?: string[];
  is_popular?: boolean;
  is_plan_enable: string;
}

interface PlansSectionProps {
  brandColor?: string;
  plans: Plan[];
  settings?: any;
  sectionData?: {
    title?: string;
    subtitle?: string;
    faq_text?: string;
  };
}

const defaultPlans = [
  {
    id: 1,
    name: 'باقة البداية',
    description: 'الخيار المثالي لاختبار النظام وإطلاق متجرك الأول بسهولة.',
    price: 0,
    yearly_price: 0,
    duration: 'yearly',
    limits: [
      { icon: Boxes, value: '18', label: 'منتج' },
      { icon: Store, value: '1', label: 'متجر' },
      { icon: Warehouse, value: '1', label: 'مخزن' },
    ],
    features: [
      'نطاق فرعي مجاني (store.wusool.ps)',
      'دعم فني متاح 8 ساعات يومياً',
    ],
    icon: Package,
    badge: null,
    is_popular: false,
    is_plan_enable: 'on',
  },
  {
    id: 2,
    name: 'باقة النمو',
    description: 'الباقة الأكثر مبيعاً، مصممة لتوسيع نشاطك التجاري وزيادة مبيعاتك.',
    price: 120,
    yearly_price: 120,
    duration: 'yearly',
    limits: [
      { icon: Boxes, value: '500', label: 'منتج' },
      { icon: Store, value: '1', label: 'متجر' },
      { icon: Warehouse, value: '1', label: 'مخزن' },
    ],
    features: [
      'نطاق فرعي مجاني (store.wusool.ps)',
      'تفعيل طرق الشحن',
      'دعم تطبيق الويب التقدمي (PWA)',
      'دعم فني 12 ساعة يومياً (واتساب + بريد إلكتروني)',
    ],
    icon: Zap,
    badge: 'الأكثر طلباً',
    is_popular: true,
    is_plan_enable: 'on',
  },
  {
    id: 3,
    name: 'باقة الاحتراف',
    description: 'الحل الشامل للمؤسسات، مع قابلية التخصيص الكامل حسب احتياج عملك.',
    price: 200,
    yearly_price: 200,
    duration: 'yearly',
    limits: [
      { icon: Boxes, value: '1000+', label: 'منتج' },
      { icon: Store, value: '2', label: 'متجر' },
      { icon: Warehouse, value: '3', label: 'مخازن' },
    ],
    features: [
      'إمكانية ربط نطاق مخصص (store.ps / store.com)',
      'إنشاء تطبيق موبايل + رفعه على Google Play و App Store',
      'كافة ميزات باقة النمو + إضافات مدفوعة حسب الطلب',
      'أولوية دعم VIP على مدار الساعة 24/7 (واتساب + بريد إلكتروني)',
    ],
    icon: Crown,
    badge: null,
    is_popular: false,
    is_plan_enable: 'on',
  },
];

const defaultPlanIcons: Record<number, React.ComponentType<any>> = {
  1: Package,
  2: Zap,
  3: Crown,
};

const planColorSchemes: Record<number, { bg: string; border: string; icon: string; hoverBorder: string }> = {
  1: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', hoverBorder: 'hover:border-slate-300' },
  2: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300' },
  3: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', hoverBorder: 'hover:border-indigo-300' },
};

const arabicOverrides: Record<number, { name: string; description: string; limits: Array<{ icon: React.ComponentType<any>; value: string; label: string }>; features: string[]; badge?: string; is_popular?: boolean }> = {
  1: {
    name: 'باقة البداية',
    description: 'الخيار المثالي لاختبار النظام وإطلاق متجرك الأول بسهولة.',
    limits: [
      { icon: Boxes, value: '18', label: 'منتج' },
      { icon: Store, value: '1', label: 'متجر' },
      { icon: Warehouse, value: '1', label: 'مخزن' },
    ],
    features: [
      'نطاق فرعي مجاني (store.wusool.ps)',
      'دعم فني متاح 8 ساعات يومياً',
    ],
  },
  2: {
    name: 'باقة النمو',
    description: 'الباقة الأكثر مبيعاً، مصممة لتوسيع نشاطك التجاري وزيادة مبيعاتك.',
    limits: [
      { icon: Boxes, value: '500', label: 'منتج' },
      { icon: Store, value: '1', label: 'متجر' },
      { icon: Warehouse, value: '1', label: 'مخزن' },
    ],
    features: [
      'نطاق فرعي مجاني (store.wusool.ps)',
      'تفعيل طرق الشحن',
      'دعم تطبيق الويب التقدمي (PWA)',
      'دعم فني 12 ساعة يومياً (واتساب + بريد إلكتروني)',
    ],
    badge: 'الأكثر طلباً',
    is_popular: true,
  },
  3: {
    name: 'باقة الاحتراف',
    description: 'الحل الشامل للمؤسسات، مع قابلية التخصيص الكامل حسب احتياج عملك.',
    limits: [
      { icon: Boxes, value: '1000+', label: 'منتج' },
      { icon: Store, value: '2', label: 'متجر' },
      { icon: Warehouse, value: '3', label: 'مخازن' },
    ],
    features: [
      'إمكانية ربط نطاق مخصص (store.ps / store.com)',
      'إنشاء تطبيق موبايل + رفعه على Google Play و App Store',
      'كافة ميزات باقة النمو + إضافات مدفوعة حسب الطلب',
      'أولوية دعم VIP على مدار الساعة 24/7 (واتساب + بريد إلكتروني)',
    ],
  },
};

function PlansSection({ plans, settings, sectionData, brandColor = '#3b82f6' }: PlansSectionProps) {
  const { t, i18n } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();

  const currentLocale = (i18n.language || 'en').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);

  useEffect(() => {
    const nextDirection = isRtl ? 'rtl' : 'ltr';
    document.documentElement.dir = nextDirection;
    document.documentElement.lang = currentLocale;
  }, [currentLocale, isRtl]);

  const displayPlans = defaultPlans;

  const getPrice = React.useCallback(
    (plan: Plan) => {
      if (plan.yearly_price !== undefined && plan.yearly_price > 0) {
        return plan.yearly_price;
      }
      return plan.price;
    },
    [],
  );

  const getPlanName = (plan: any) => {
    const override = arabicOverrides[plan.id];
    return override?.name || plan.name;
  };

  const getPlanDescription = (plan: any) => {
    const override = arabicOverrides[plan.id];
    return override?.description || plan.description;
  };

  const getPlanLimits = (plan: any) => {
    const override = arabicOverrides[plan.id];
    return override?.limits || plan.limits || [];
  };

  const getPlanFeatures = (plan: any) => {
    const override = arabicOverrides[plan.id];
    return override?.features || plan.features || [];
  };

  const getBadgeText = (plan: any) => {
    const override = arabicOverrides[plan.id];
    return override?.badge || plan.badge || null;
  };

  return (
    <section id="pricing" className="bg-gray-50 py-16 sm:py-20 lg:py-28" ref={ref} style={{ fontFamily: isRtl ? 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif' : 'Inter, "Segoe UI", sans-serif' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-2xl text-center transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">{t(sectionData?.title || 'الخطط والأسعار')}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-gray-900 sm:text-4xl">
            {t(sectionData?.subtitle || 'خطط مرنة تناسب جميع المشاريع')}
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-500">
            {t('ابدأ مجاناً وتوسع مع نمو أعمالك. لا رسوم خفية ولا مفاجآت.')}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{t('جميع الخطط اشتراكات سنوية')}</span>
          </div>
        </div>

        <div className={`mt-12 grid grid-cols-1 gap-6 transition-all duration-700 delay-300 md:grid-cols-3 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {displayPlans.map((plan) => {
            const isPopular = Boolean(plan.is_popular);
            const PlanIcon = defaultPlanIcons[plan.id] || Package;
            return (
              <div key={plan.id} className={`relative flex flex-col h-full rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg ${
                isPopular
                  ? 'border-primary shadow-xl ring-2 ring-primary/20 scale-[1.05] z-10 p-8'
                  : 'border-gray-200 p-7 hover:border-gray-300'
              }`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold tracking-wider text-white" style={{ backgroundColor: brandColor }}>
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      {getBadgeText(plan) || t('الأكثر طلباً')}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${brandColor}0D` }}>
                      <PlanIcon className="h-5 w-5" style={{ color: brandColor }} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{getPlanName(plan)}</h3>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500 text-right">{getPlanDescription(plan)}</p>
                </div>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-gray-900">
                      {getPrice(plan) === 0 ? formatCurrency(0) : formatCurrency(getPrice(plan))}
                    </span>
                    <span className="text-[14px] text-gray-500">/{t('yr')}</span>
                  </div>
                  {getPrice(plan) === 0 && (
                    <p className="mt-1 text-xs text-gray-400">{t('Free forever')}</p>
                  )}
                </div>

                <div className="mt-6 flex-1 border-t border-gray-100 pt-6 space-y-6">
                  {/* Usage Limits Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {getPlanLimits(plan).map((limit: { icon: React.ComponentType<any>; value: string; label: string }, index: number) => {
                      const LimitIcon = limit.icon;
                      const colors = planColorSchemes[plan.id] || planColorSchemes[1];
                      return (
                        <div
                          key={index}
                          className={`flex flex-col items-center justify-center rounded-xl px-2 py-4 text-center shadow-sm transition-all duration-200 hover:shadow-md ${colors.bg} ${colors.border} border ${colors.hoverBorder}`}
                        >
                          <LimitIcon className={`mb-2 h-5 w-5 ${colors.icon}`} />
                          <span className="text-lg font-bold text-gray-900 leading-none">{limit.value}</span>
                          <span className="mt-1 text-[11px] font-medium text-gray-500 leading-none">{limit.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3">
                    {getPlanFeatures(plan).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-2.5 text-[13px] text-gray-600 text-right" dir="rtl">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-8">
                  <Link
                    href={route('register', { plan: encryptPlanId(plan.id) })}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition-all ${
                      isPopular
                        ? 'text-white hover:opacity-90 shadow-lg'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                    style={isPopular ? { backgroundColor: brandColor, boxShadow: `0 4px 14px ${brandColor}40` } : {}}
                  >
                    {getPrice(plan) === 0 ? t('ابدأ مجاناً') : t('ابدأ الآن')}
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {sectionData?.faq_text && (
          <div className="mt-10 text-center">
            <p className="text-[14px] text-gray-500">{t(sectionData.faq_text, { defaultValue: sectionData.faq_text })}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default PlansSection;
