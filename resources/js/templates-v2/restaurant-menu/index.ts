import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { RestaurantMenuRoot } from './RestaurantMenu';
import { restaurantOverlays } from './RestaurantOverlays';

/**
 * الهيئة — Al-Hay'a
 * قالب متجر عام خفيف مستوحى من متاجر التجزئة الحديثة: هيدر أبيض نظيف،
 * شريط بحث بارز، تنقل أفقي للأقسام، بانر/كاروسيل محتوى، وأقسام منتجات
 * كثيفة بأسلوب بطاقات بيضاء بسيطة — نفس البنية التفاعلية لمتاجر
 * العطارة والبقالة مع الحفاظ على بيانات التاجر الحقيقية.
 */
const restaurantMenu: TemplateModule = {
  meta: {
    slug: 'restaurant-menu',
    name: 'الهيئة',
    name_en: 'Al-Hay\'a',
    sector: 'متاجر عامة',
    sector_en: 'General Store',
    description:
      'قالب الهيئة: واجهة تسوق خفيفة ونظيفة — بانر محتوى مدمج، تنقل أفقي للأقسام، قسم منتجات مميزة، وأقسام ديناميكية لكل فئة مع بطاقات بيضاء وكثافة تصفح عالية.',
    preview: 'linear-gradient(135deg,#ffffff 0%,#f8fafc 50%,#2563eb 140%)',
    accent: '#2563eb',
    is_free: true,
    plan_required: 'starter',
  },
  Root: RestaurantMenuRoot,
  overlays: {
    ...NEUTRAL_OVERLAYS,
    ...restaurantOverlays,
  },
  contentSchema: [
    { key: 'banners', label: 'بانر القائمة', type: 'image', group: 'الواجهة' },
    { key: 'delivery_minutes', label: 'مدة التوصيل (دقيقة)', type: 'text', group: 'التوصيل', default: '45' },
  ],
};

export default restaurantMenu;
export { RestaurantMenuRoot };
