import React, { useMemo, useState, useCallback } from 'react';
import {
  Check,
  X,
  Info,
  ArrowLeft,
  Package,
  Zap,
  Crown,
  Globe,
  Smartphone,
  Bot,
  Palette,
  Shield,
  Truck,
  MessageCircle,
  CreditCard,
  Clock,
  Boxes,
  Store,
  Warehouse,
  Database,
  Layout,
  Rocket,
  Headphones,
  Wallet,
  Star,
  MessageSquare,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { sanitizeHtml } from '@/utils/xss-protection';

const formatUSD = (amount: number): string => {
  if (amount === 0) return '$0';
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  yearly_price?: number;
  duration: string;
  domain_type?: string;
  support_hours?: number;
  support_type?: string;
  max_stores?: number;
  max_users_per_store?: number;
  max_products_per_store?: number;
  max_warehouses?: number;
  storage_limit?: number;
  themes?: string[];
  enable_custdomain?: string;
  enable_custsubdomain?: string;
  enable_branding?: string;
  pwa_business?: string;
  enable_chatgpt?: string;
  enable_shipping_method?: string;
  enable_mobile_app?: string;
  enable_sms?: string;
  enable_theme_editor?: string;
  enable_accounting_integration?: string;
  is_trial?: string | null;
  trial_day?: number;
  is_plan_enable: string;
  is_default?: boolean;
  is_recommended?: boolean;
}

interface PlansSectionProps {
  brandColor?: string;
  plans: Plan[];
  settings?: object;
  sectionData?: {
    title?: string;
    subtitle?: string;
    faq_text?: string;
  };
}

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;

const PLAN_META: Record<string, { name: string; description: string; icon: IconType; originalPrice: number }> = {
  Starter: { name: 'باقة البداية', description: 'الخيار المثالي لاختبار النظام وإطلاق متجرك الأول بسهولة.', icon: Package, originalPrice: 0 },
  Growth: { name: 'باقة النمو', description: 'الباقة الأكثر مبيعاً، مصممة لتوسيع نشاطك التجاري وزيادة مبيعاتك.', icon: Zap, originalPrice: 360 },
  Professional: { name: 'باقة الاحتراف', description: 'الحل الشامل للمؤسسات، مع قابلية التخصيص الكامل حسب احتياج عملك.', icon: Crown, originalPrice: 570 },
};

const fallbackPlans: Plan[] = [
  {
    id: 1,
    name: 'Starter',
    price: 0,
    yearly_price: 0,
    duration: 'yearly',
    domain_type: 'subdomain',
    support_hours: 8,
    support_type: 'email',
    max_stores: 1,
    max_users_per_store: 1,
    max_products_per_store: 18,
    max_warehouses: 1,
    storage_limit: 1,
    themes: [],
    enable_custdomain: 'off',
    enable_custsubdomain: 'on',
    enable_branding: 'off',
    pwa_business: 'off',
    enable_chatgpt: 'off',
    enable_shipping_method: 'off',
    enable_mobile_app: 'off',
    enable_sms: 'off',
    enable_theme_editor: 'off',
    enable_accounting_integration: 'off',
    is_plan_enable: 'on',
    is_default: true,
    is_recommended: false,
  },
  {
    id: 2,
    name: 'Growth',
    price: 240,
    yearly_price: 240,
    duration: 'yearly',
    domain_type: 'subdomain',
    support_hours: 12,
    support_type: 'whatsapp,email',
    max_stores: 1,
    max_users_per_store: 1,
    max_products_per_store: 500,
    max_warehouses: 2,
    storage_limit: 10,
    themes: [],
    enable_custdomain: 'off',
    enable_custsubdomain: 'on',
    enable_branding: 'off',
    pwa_business: 'on',
    enable_chatgpt: 'on',
    enable_shipping_method: 'on',
    enable_mobile_app: 'off',
    enable_sms: 'on',
    enable_theme_editor: 'off',
    enable_accounting_integration: 'off',
    is_plan_enable: 'on',
    is_default: false,
    is_recommended: true,
  },
  {
    id: 3,
    name: 'Professional',
    price: 360,
    yearly_price: 360,
    duration: 'yearly',
    domain_type: 'custom',
    support_hours: 24,
    support_type: 'whatsapp,email,vip',
    max_stores: 2,
    max_users_per_store: 5,
    max_products_per_store: 10000,
    max_warehouses: 3,
    storage_limit: 50,
    themes: [],
    enable_custdomain: 'on',
    enable_custsubdomain: 'on',
    enable_branding: 'on',
    pwa_business: 'on',
    enable_chatgpt: 'on',
    enable_shipping_method: 'on',
    enable_mobile_app: 'on',
    enable_sms: 'on',
    enable_theme_editor: 'on',
    enable_accounting_integration: 'on',
    is_plan_enable: 'on',
    is_default: false,
    is_recommended: false,
  },
];

const isOn = (v: unknown): boolean => v === 'on' || v === true || v === 1 || v === '1';

const isPaidPlan = (p: Plan): boolean => (p.price || 0) > 0 || (p.yearly_price || 0) > 0;

const fmtNumber = (n: number): string => {
  if (n >= 10000) return `${Math.round(n / 1000)}K+`;
  return n.toLocaleString('en-US');
};

type CellValue = { kind: 'yes' | 'no' | 'text'; text: string };

const yes = (): CellValue => ({ kind: 'yes', text: 'نعم' });
const yesNo = (v: unknown): CellValue => (isOn(v) ? { kind: 'yes', text: 'نعم' } : { kind: 'no', text: '—' });

const supportText = (p: Plan): string => {
  const parts = (p.support_type || 'email').split(',');
  const map: Record<string, string> = { email: 'بريد إلكتروني', whatsapp: 'واتساب', vip: 'دعم VIP' };
  return parts.map((x) => map[x.trim()] || x.trim()).join(' + ');
};

type CompareRow = { label: string; tooltip?: string; get: (p: Plan) => CellValue };
type CompareGroup = { title: string; icon: IconType; rows: CompareRow[] };

const COMPARE_GROUPS: CompareGroup[] = [
  {
    title: 'المتجر والتصميم',
    icon: Layout,
    rows: [
      { label: 'قوالب احترافية جاهزة', get: (p) => ({ kind: 'text', text: `${(p.themes || []).length} قالباً` }) },
      { label: 'محرر قوالب متقدم', tooltip: 'تعديل الألوان والخطوط والتنسيقات بالكامل بدون أي كود برمجي.', get: (p) => yesNo(p.enable_theme_editor) },
      { label: 'ربط نطاق مخصص', tooltip: 'ربط دومين خاص بمتجرك مثل store.com بدلاً من النطاق الفرعي.', get: (p) => yesNo(p.enable_custdomain) },
      { label: 'نوع النطاق', tooltip: 'نطاق مخصص (custom) أو نطاق فرعي (subdomain).', get: (p) => ({ kind: 'text', text: p.domain_type === 'custom' ? 'نطاق مخصص' : 'نطاق فرعي' }) },
      { label: 'نطاق فرعي مجاني', get: (p) => yesNo(p.enable_custsubdomain) },
      { label: 'تطبيق ويب PWA', tooltip: 'تطبيق ويب يمكن للعملاء تثبيته على أجهزتهم مثل التطبيقات العادية، بسرعة وأداء مميز.', get: (p) => yesNo(p.pwa_business) },
      { label: 'تطبيق موبايل أصلي', tooltip: 'تطبيق أندرويد وآيفون لمتجرك وتقديمه على متجري Google Play و App Store.', get: (p) => yesNo(p.enable_mobile_app) },
      { label: 'إشعارات SMS', tooltip: 'رسائل نصية تلقائية للعملاء عند إنشاء الطلب وتغيير حالته.', get: (p) => yesNo(p.enable_sms) },
      { label: 'إزالة علامة المنصة', tooltip: 'إخفاء هوية المنصة وإظهار علامتك التجارية فقط (White Label).', get: (p) => yesNo(p.enable_branding) },
    ],
  },
  {
    title: 'المنتجات والمخزون',
    icon: Boxes,
    rows: [
      { label: 'عدد المنتجات', get: (p) => ({ kind: 'text', text: fmtNumber(p.max_products_per_store || 0) }) },
      { label: 'المخازن', get: (p) => ({ kind: 'text', text: String(p.max_warehouses || 0) }) },
      { label: 'الموظفون والصلاحيات', get: (p) => ({ kind: 'text', text: String(p.max_users_per_store || 0) }) },
      { label: 'مساحة التخزين', get: (p) => ({ kind: 'text', text: `${p.storage_limit || 0} GB` }) },
      { label: 'أتمتة طلبات واتساب', tooltip: 'كل طلب يصل مباشرة إلى واتسابك كرسالة معبأة بكل التفاصيل: المنتجات والسعر والعنوان.', get: (p) => isPaidPlan(p) ? yes() : ({ kind: 'no', text: '—' }) },
      { label: 'رمز QR واستيراد/تصدير', tooltip: 'رمز QR يفتح متجرك مباشرة، مع استيراد وتصدير المنتجات بسهولة.', get: (p) => isPaidPlan(p) ? yes() : ({ kind: 'no', text: '—' }) },
    ],
  },
  {
    title: 'الدفع',
    icon: Wallet,
    rows: [
      { label: 'بوابات دفع عالمية', tooltip: 'Stripe, PayPal, Razorpay, Paystack, Flutterwave, Mollie, Midtrans وغيرها من 20+ بوابة.', get: (p) => isPaidPlan(p) ? yes() : ({ kind: 'no', text: '—' }) },
    ],
  },
  {
    title: 'التسويق والنمو',
    icon: Rocket,
    rows: [
      { label: 'استعادة السلات المتروكة', tooltip: 'تذكيرات تلقائية عبر البريد والواتساب للعملاء الذين لم يكملوا الشراء.', get: (p) => isPaidPlan(p) ? yes() : ({ kind: 'no', text: '—' }) },
      { label: 'نظام الإحالة', tooltip: 'مكافأة عملائك عند دعوة أصدقائهم للشراء من متجرك.', get: (p) => isPaidPlan(p) ? yes() : ({ kind: 'no', text: '—' }) },
    ],
  },
  {
    title: 'الذكاء الاصطناعي',
    icon: Bot,
    rows: [
      { label: 'توليد المحتوى بالـ AI', tooltip: 'كتابة أوصاف المنتجات وترجمتها واقتراح أسعار تنافسية تلقائياً.', get: (p) => yesNo(p.enable_chatgpt) },
      { label: 'تكامل المحاسبة', tooltip: 'مزامنة الفواتير والمصاريف مع أنظمة المحاسبة الخارجية.', get: (p) => yesNo(p.enable_accounting_integration) },
    ],
  },
  {
    title: 'الشحن',
    icon: Truck,
    rows: [
      { label: 'طرق الشحن', tooltip: 'تحديد مناطق الشحن وتكاليفها وطريقة التسليم لكل منطقة.', get: (p) => yesNo(p.enable_shipping_method) },
    ],
  },
  {
    title: 'الدعم الفني',
    icon: Headphones,
    rows: [
      { label: 'ساعات الدعم اليومية', get: (p) => ({ kind: 'text', text: `${p.support_hours || 0} ساعة` }) },
      { label: 'قنوات الدعم', tooltip: 'البريد الإلكتروني، واتساب، أو دعم VIP مخصص.', get: (p) => ({ kind: 'text', text: supportText(p) }) },
    ],
  },
  {
    title: 'الفترة التجريبية',
    icon: Clock,
    rows: [
      { label: 'فترة تجريبية مجانية', get: (p) => p.is_trial === 'on' && (p.trial_day ?? 0) > 0 ? ({ kind: 'text', text: `${p.trial_day} يوم` }) : ({ kind: 'no', text: '—' }) },
    ],
  },
];

function getProminentFeatures(plan: Plan): Array<{ icon: IconType; text: string }> {
  const picks: Array<{ icon: IconType; text: string }> = [];
  const push = (cond: boolean, icon: IconType, text: string) => {
    if (cond) picks.push({ icon, text });
  };

  push(isOn(plan.enable_custdomain), Globe, 'ربط نطاق مخصص خاص بك');
  push(isOn(plan.enable_mobile_app), Smartphone, 'تطبيق موبايل + نشر على المتاجر');
  push(isOn(plan.enable_chatgpt), Bot, 'ذكاء اصطناعي لأوصاف وترجمة المنتجات');
  push(isOn(plan.enable_theme_editor), Palette, 'محرر قوالب احترافي');
  push(isOn(plan.enable_branding), Shield, 'إزالة علامة المنصة (White Label)');
  push(isOn(plan.pwa_business), Smartphone, 'تطبيق ويب PWA قابل للتثبيت');
  push(isOn(plan.enable_sms), MessageSquare, 'إشعارات SMS تلقائية للعملاء');
  push(isOn(plan.enable_shipping_method), Truck, 'طرق شحن ومناطق توصيل');
  push(isOn(plan.enable_custsubdomain), Globe, 'نطاق فرعي مجاني (store.wusool.ps)');

  const core: Array<{ icon: IconType; text: string }> = [
    { icon: MessageCircle, text: 'أتمتة طلبات واتساب بكل تفاصيلها' },
    { icon: CreditCard, text: '20+ بوابة دفع + COD وتحويل بنكي' },
    { icon: Palette, text: '29 قالباً جاهزاً متعدد الفئات' },
  ];
  for (const c of core) {
    if (picks.length < 4) picks.push(c);
  }
  return picks.slice(0, 4);
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="group/info relative inline-flex align-middle"
      title={text}
      aria-label={text}
    >
      <Info
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="h-3.5 w-3.5 cursor-help text-gray-400 transition-colors hover:text-gray-600"
      />
      {open && (
        <span className="pointer-events-none absolute bottom-full right-0 z-40 mb-1.5 w-60 rounded-xl bg-gray-900 px-3 py-2.5 text-[11px] leading-relaxed text-white shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  if (isNaN(num)) {
    return `rgba(16, 183, 127, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PlansSection({
  plans,
  sectionData,
  brandColor = '#10b77f',
}: PlansSectionProps) {
  const { ref, isVisible } = useScrollAnimation();

  const encryptPlanId = useCallback(async (planId: number): Promise<string> => {
    try {
      const response = await fetch(route('api.plan.encrypt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to encrypt plan ID');
      }
      
      const data = await response.json();
      return data.encrypted_plan_id;
    } catch (error) {
      console.error('Failed to encrypt plan ID:', error);
      // Fallback to simple base64 (not secure, but prevents complete breakage)
      return btoa(planId.toString());
    }
  }, []);

  const displayPlans = useMemo(() => {
    const source = plans && plans.length > 0 ? plans : fallbackPlans;
    return [...source]
      .filter((p) => p.is_plan_enable !== 'off')
      .sort((a, b) => {
        if (a.price === 0) return -1;
        if (b.price === 0) return 1;
        return a.price - b.price;
      });
  }, [plans]);

  const getPrice = (plan: Plan): number => {
    if (plan.yearly_price !== undefined && plan.yearly_price > 0) return plan.yearly_price;
    return plan.price;
  };

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-gray-50 py-20 sm:py-24 lg:py-28"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[800px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: hexToRgba(brandColor, 0.08) }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── Header ─── */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <span
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-[13px] font-bold"
            style={{ backgroundColor: hexToRgba(brandColor, 0.12), color: brandColor }}
          >
            الخطط والأسعار
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.6rem]">
            {sectionData?.title || 'اختر خطتك'}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            {sectionData?.subtitle || 'ابدأ بخطتنا المجانية وترقَّ مع نمو أعمالك.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">جميع الخطط اشتراكات سنوية</span>
          </div>
        </div>

        {/* ─── Plan cards ─── */}
        <div
          className={`mt-12 grid grid-cols-1 gap-6 transition-all duration-700 delay-300 md:grid-cols-3 lg:gap-8 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {displayPlans.map((plan) => {
            const meta = PLAN_META[plan.name] || {
              name: plan.name,
              description: plan.description || '',
              icon: Package,
              originalPrice: 0,
            };
            const isPopular = Boolean(plan.is_recommended);
            const price = getPrice(plan);
            const PlanIcon = meta.icon;
            const limits = [
              { icon: Boxes, value: fmtNumber(plan.max_products_per_store || 0), label: 'منتج' },
              { icon: Store, value: String(plan.max_stores || 0), label: 'متجر' },
              { icon: Warehouse, value: String(plan.max_warehouses || 0), label: 'مخزن' },
              { icon: Database, value: `${plan.storage_limit || 0}GB`, label: 'تخزين' },
            ];
            const prominent = getProminentFeatures(plan);

            return (
              <div
                key={plan.id}
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isPopular
                    ? 'z-10 border-transparent p-8 shadow-2xl ring-2'
                    : 'border-gray-200 p-7 hover:border-gray-300'
                }`}
                style={
                  isPopular
                    ? ({
                        boxShadow: `0 24px 60px -18px ${hexToRgba(brandColor, 0.35)}`,
                        '--tw-ring-color': brandColor,
                      } as React.CSSProperties)
                    : {}
                }
              >
                {isPopular && (
                  <div
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ background: `linear-gradient(90deg, transparent, ${brandColor}, transparent)` }}
                  />
                )}
                {isPopular && (
                  <span
                    className="absolute left-6 top-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    الأكثر طلباً
                  </span>
                )}
                {plan.is_trial === 'on' && (plan.trial_day ?? 0) > 0 && (
                  <span
                    className={`absolute left-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md ${
                      isPopular ? 'top-[38px]' : 'top-6'
                    }`}
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    <Clock className="h-3 w-3 fill-current" />
                    تجربة مجانية {plan.trial_day} يوم
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-white/60 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}, ${hexToRgba(brandColor, 0.55)})`,
                      boxShadow: `0 10px 26px -8px ${hexToRgba(brandColor, 0.5)}`,
                    }}
                  >
                    <PlanIcon className="h-5 w-5 text-white" strokeWidth={1.9} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">{meta.name}</h3>
                    <p className="text-[12px] font-medium text-gray-400">
                      اشتراك سنوي
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-relaxed text-gray-500">{sanitizeHtml(meta.description || '')}</p>

                <div className="mt-5 flex items-baseline gap-2">
                  {meta.originalPrice > 0 && price < meta.originalPrice && (
                    <span className="text-lg font-medium text-gray-400 line-through">
                      {formatUSD(meta.originalPrice)}
                    </span>
                  )}
                  <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                    {price === 0 ? 'مجاناً' : formatUSD(price)}
                  </span>
                  {price > 0 && <span className="text-[14px] text-gray-500">/ سنة</span>}
                </div>
                {price === 0 && <p className="mt-1 text-xs font-medium text-emerald-600">مجاني للأبد بدون بطاقة</p>}

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {limits.map((limit, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-1 py-3 text-center"
                    >
                      <limit.icon className="mb-1.5 h-4 w-4" style={{ color: brandColor }} />
                      <span className="text-[15px] font-extrabold leading-none text-gray-900">{limit.value}</span>
                      <span className="mt-1 text-[10px] font-medium text-gray-500">{limit.label}</span>
                    </div>
                  ))}
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {prominent.map((f, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: hexToRgba(brandColor, 0.12) }}
                      >
                        <f.icon className="h-3 w-3" style={{ color: brandColor }} />
                      </span>
                      <span className="text-[13px] font-medium leading-relaxed text-gray-600">{f.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                    <button
                      onClick={async () => {
                        const encryptedPlanId = await encryptPlanId(plan.id);
                        router.get(route('register', { plan: encryptedPlanId }));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold transition-all duration-300 hover:-translate-y-0.5"
                      style={
                        isPopular
                          ? {
                              backgroundColor: brandColor,
                              color: '#fff',
                              boxShadow: `0 12px 28px -8px ${hexToRgba(brandColor, 0.55)}`,
                            }
                          : {
                              border: `1px solid ${hexToRgba(brandColor, 0.4)}`,
                              color: brandColor,
                              backgroundColor: hexToRgba(brandColor, 0.06),
                            }
                      }
                    >
                      {price === 0 ? 'ابدأ مجاناً' : 'ابدأ الآن'}
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
              </div>
            );
          })}
        </div>

        {/* ─── Comparison table ─── */}
        <div
          className={`mt-20 transition-all duration-700 delay-300 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="mx-auto max-w-2xl text-center">
            <span
              className="mb-4 inline-block rounded-full px-4 py-1.5 text-[13px] font-bold"
              style={{ backgroundColor: hexToRgba(brandColor, 0.12), color: brandColor }}
            >
              قارن الخطط
            </span>
            <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              كل ما تحتاجه في مكان واحد
            </h3>
          </div>

          <div className="mt-10 overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-right">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="sticky right-0 z-10 w-[260px] bg-gray-50/80 px-6 py-4 text-[13px] font-extrabold text-gray-900">
                    الميزة
                  </th>
                  {displayPlans.map((plan) => {
                    const meta = PLAN_META[plan.name] || { name: plan.name };
                    return (
                      <th key={plan.id} className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-2 text-[14px] font-extrabold text-gray-900">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: plan.is_recommended ? brandColor : '#d1d5db' }}
                          />
                          {meta.name}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARE_GROUPS.map((group) => (
                  <React.Fragment key={group.title}>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <td
                        colSpan={displayPlans.length + 1}
                        className="px-6 py-2.5 text-[12px] font-extrabold text-gray-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <group.icon className="h-4 w-4" style={{ color: brandColor }} />
                          {group.title}
                        </span>
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                      >
                        <td className="sticky right-0 z-10 bg-white px-6 py-3 text-[13px] font-medium text-gray-700">
                          <span className="inline-flex items-center gap-1.5">
                            {row.label}
                            {row.tooltip && <InfoTip text={row.tooltip} />}
                          </span>
                        </td>
                        {displayPlans.map((plan) => {
                          const cell = row.get(plan);
                          return (
                            <td key={plan.id} className="px-4 py-3 text-center">
                              {cell.kind === 'yes' && <Check className="mx-auto h-5 w-5 text-emerald-500" strokeWidth={2.5} />}
                              {cell.kind === 'no' && <X className="mx-auto h-4.5 w-4.5 text-gray-300" strokeWidth={2.5} />}
                              {cell.kind === 'text' && (
                                <span className="text-[13px] font-bold text-gray-800">{cell.text}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sectionData?.faq_text && (
          <div className="mt-10 text-center">
            <p className="text-[14px] text-gray-500">{sanitizeHtml(sectionData.faq_text)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
