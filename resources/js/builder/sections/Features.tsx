import React from 'react';
import {
  Truck,
  ShieldCheck,
  CreditCard,
  Headphones,
  Sparkles,
  RefreshCw,
  Package,
  Gift,
  Star,
  Heart,
  Zap,
  Clock,
  Award,
  BadgeCheck,
  Wallet,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { SectionHeading, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

/**
 * Shared icon registry for the Features section. The designer's feature
 * editor (controls.tsx) imports this map so the picker and the storefront
 * always render the exact same icon set.
 */
export const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  card: CreditCard,
  support: Headphones,
  sparkles: Sparkles,
  refresh: RefreshCw,
  package: Package,
  gift: Gift,
  star: Star,
  heart: Heart,
  zap: Zap,
  clock: Clock,
  award: Award,
  badge_check: BadgeCheck,
  wallet: Wallet,
  store: Store,
};

export const FEATURE_ICON_KEYS = Object.keys(FEATURE_ICON_MAP);

const DEFAULT_FEATURES = [
  { title: 'شحن سريع', text: 'توصيل لجميع المناطق في أسرع وقت.', icon: 'truck' },
  { title: 'دفع آمن', text: 'خيارات دفع متعددة وآمنة 100%.', icon: 'card' },
  { title: 'دعم فوري', text: 'فريقنا جاهز لخدمتك على مدار الساعة.', icon: 'support' },
  { title: 'جودة مضمونة', text: 'منتجات أصلية بضمان استرجاع.', icon: 'shield' },
];

const renderIcon = (key?: string) => {
  const Icon = (key && FEATURE_ICON_MAP[key]) || FEATURE_ICON_MAP.sparkles;
  return <Icon className="h-6 w-6" />;
};

export const FeaturesSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  // Designer-managed items win over the store content, which wins over defaults.
  const propItems = Array.isArray(props.items) ? props.items : [];
  const contentItems = (storeData?.content?.features || []) as any[];
  const list = propItems.length ? propItems : contentItems.length ? contentItems : DEFAULT_FEATURES;
  // Strict: clearing section_title in the designer hides the heading entirely.
  const hasTitleKey = Object.prototype.hasOwnProperty.call(props, 'section_title');
  const headingTitle = hasTitleKey ? String(props.section_title || '').trim() : 'لماذا تختارنا؟';
  const headingSubtitle = String(props.section_subtitle || '').trim();

  if (!list.some((f: any) => f?.title || f?.text)) {
    return null;
  }

  const cols = Math.min(Math.max(Number(props.columns) || 4, 2), 4);
  const gridClass =
    cols === 2 ? 'grid gap-4 sm:grid-cols-2' : cols === 3 ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={headingTitle} subtitle={headingSubtitle} />
        <div className={gridClass}>
          {list.filter((f: any) => f?.title || f?.text).map((f: any, i: number) => (
            <div key={i} className="group rounded-2xl border bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
              <span
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white transition group-hover:scale-110"
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              >
                {renderIcon(f.icon)}
              </span>
              {f.title && (
                <h3 className="text-base font-extrabold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                  {f.title}
                </h3>
              )}
              {f.text && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: css('--twc-text-secondary', '#475569') }}>
                  {f.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
