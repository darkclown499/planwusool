import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { GrocerySouqRoot } from './GrocerySouqRoot';
import { souqOverlays } from './SouqOverlays';

/**
 * سوق البقالة — Grocery Souq (نسخة BiddiMarket)
 * نسخة مطابقة لـ biddimarket.ps/orders: هيدر كريمي + بحث pill + سلة سوداء،
 * هيرو فاتح، تصنيفات مربعة 3/5/6، كروت pill سوداء. الألوان قابلة للتعديل من المصمم.
 */
const grocerySouq: TemplateModule = {
  meta: {
    slug: 'grocery-souq',
    name: 'سوق البقالة',
    name_en: 'Grocery Souq',
    sector: 'بقالة وسوبرماركت',
    sector_en: 'Grocery & Supermarket',
    description:
      'قالب السوبرماركت بنسخة Biddi: بحث pill، تصنيفات مربعة، هيرو فاتح وكروت سوداء. قابل للتعديل بالكامل من المصمم.',
    preview: 'linear-gradient(135deg,#FDF9F1 0%,#FFEC99 55%,#FFC20E 140%)',
    accent: '#FFC20E',
    is_free: true,
    plan_required: 'starter',
  },
  Root: GrocerySouqRoot,
  overlays: {
    ...NEUTRAL_OVERLAYS,
    ...souqOverlays,
  },
  contentSchema: [
    { key: 'banners', label: 'شرائح الواجهة (صور الهيرو)', type: 'image', group: 'الواجهة' },
    { key: 'accent_color', label: 'اللون الأساسي (أصفر Biddi)', type: 'color', group: 'الألوان', default: '#FFC20E' },
    { key: 'header_bg', label: 'لون خلفية الهيدر', type: 'color', group: 'الألوان', default: '#FDF9F1' },
  ],
};

export default grocerySouq;
export { GrocerySouqRoot };
