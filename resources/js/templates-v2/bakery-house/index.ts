import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { BakeryHouseRoot } from './BakeryHouse';
import { bakeryOverlays } from './BakeryOverlays';

/**
 * بيت المخبز — Bakery House
 * قالب المخبوزات والحلويات: أجواء حرفية دافئة، عدّاد آخر دفعة من الفرن،
 * اختيار الوزن والحجم من داخل البطاقة، ورفوف مخصصة للحلويات.
 */
const bakeryHouse: TemplateModule = {
  meta: {
    slug: 'bakery-house',
    name: 'بيت المخبز',
    name_en: 'Bakery House',
    sector: 'مخبز وحلويات',
    sector_en: 'Bakery & Sweets',
    description:
      'قالب المخبوزات الحرفية: شريط طازج يومياً، عدّاد آخر دفعة، اختيار الوزن من البطاقة، ورفوف كيك وحلويات شرقية مستقلة.',
    preview: 'linear-gradient(135deg,#fdf6ec 0%,#f5c98a 60%,#b45309 140%)',
    accent: '#b45309',
    is_free: true,
    plan_required: 'starter',
  },
  Root: BakeryHouseRoot,
  overlays: {
    ...NEUTRAL_OVERLAYS,
    ...bakeryOverlays,
  },
  contentSchema: [
    { key: 'banners', label: 'بانر الواجهة', type: 'image', group: 'الواجهة' },
    { key: 'last_batch.time', label: 'وقت آخر دفعة', type: 'text', group: 'المخبز', default: '21:00' },
    { key: 'free_shipping_threshold', label: 'حد التوصيل المجاني', type: 'text', group: 'السلة', default: '100' },
  ],
};

export default bakeryHouse;
export { BakeryHouseRoot };
