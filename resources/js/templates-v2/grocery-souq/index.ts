import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { GrocerySouqRoot } from './GrocerySouqRoot';
import { souqOverlays } from './SouqOverlays';

/**
 * سوق البقالة — Grocery Souq
 * قالب البقالة والمواد الغذائية: بحث مباشر داخل الهيدر، شريط أقسام،
 * عروض بعدّاد تنازلي، إضافة فورية من البطاقة وشريط سلة ثابت على الجوال.
 */
const grocerySouq: TemplateModule = {
  meta: {
    slug: 'grocery-souq',
    name: 'سوق البقالة',
    name_en: 'Grocery Souq',
    sector: 'بقالة وسوبرماركت',
    sector_en: 'Grocery & Supermarket',
    description:
      'قالب السوبرماركت: بحث فوري في الهيدر، عروض يومية بعدّاد تنازلي، إضافة بضغطة واحدة مع عدّاد كميات، وشريط سلة ثابت أسفل الجوال.',
    preview: 'linear-gradient(135deg,#f7f8f5 0%,#bbf7d0 55%,#16a34a 140%)',
    accent: '#16a34a',
    is_free: true,
    plan_required: 'starter',
  },
  Root: GrocerySouqRoot,
  overlays: {
    ...NEUTRAL_OVERLAYS,
    ...souqOverlays,
  },
  contentSchema: [
    { key: 'banners', label: 'شرائح الواجهة', type: 'image', group: 'الواجهة' },
    { key: 'deals.hours', label: 'مدة عدّاد العروض (ساعات)', type: 'text', group: 'العروض', default: '4' },
    { key: 'free_shipping_threshold', label: 'حد التوصيل المجاني', type: 'text', group: 'السلة', default: '150' },
  ],
};

export default grocerySouq;
export { GrocerySouqRoot };
