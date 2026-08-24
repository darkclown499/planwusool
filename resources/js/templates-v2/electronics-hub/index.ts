import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { ElectronicsHubRoot } from './ElectronicsHub';
import { hubOverlays } from './ElectronicsOverlays';

/**
 * عالم التقنية — Electronics Hub
 * قالب الإلكترونيات والتقنية: واجهة داكنة بلمسات زرقاء، بطاقات مواصفات،
 * شريط ضمانات، صفقات النهار بعدّاد، وجدول مواصفات داخل صفحة الجهاز.
 */
const electronicsHub: TemplateModule = {
  meta: {
    slug: 'electronics-hub',
    name: 'عالم التقنية',
    name_en: 'Electronics Hub',
    sector: 'إلكترونيات وتقنية',
    sector_en: 'Electronics & Tech',
    description:
      'قالب متاجر الأجهزة: بحث فوري في الهيدر، بطاقة مواصفات لكل جهاز، عدّاد صفقات النهار، وشارات ضمان رسمي على كل منتج.',
    preview: 'linear-gradient(135deg,#0b1220 0%,#1e3a8a 60%,#22d3ee 140%)',
    accent: '#2563eb',
    is_free: true,
    plan_required: 'starter',
  },
  Root: ElectronicsHubRoot,
  overlays: {
    ...NEUTRAL_OVERLAYS,
    ...hubOverlays,
  },
  contentSchema: [
    { key: 'banners', label: 'بانر الواجهة', type: 'image', group: 'الواجهة' },
    { key: 'deals.hours', label: 'مدة عدّاد الصفقات (ساعات)', type: 'text', group: 'العروض', default: '26' },
  ],
};

export default electronicsHub;
export { ElectronicsHubRoot };
