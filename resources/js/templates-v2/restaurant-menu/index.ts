import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { RestaurantMenuRoot } from './RestaurantMenu';
import { restaurantOverlays } from './RestaurantOverlays';

/**
 * مطعم — Restaurant Menu
 * قالب المطاعم والمطابخ: قائمة طعام داكنة بصفوف أطباق أنيقة، تبويبات
 * أقسام ثابتة، اختيارات الشيف، وفاتورة طلب بأسلوب التذاكر مع طلب واتساب.
 */
const restaurantMenu: TemplateModule = {
  meta: {
    slug: 'restaurant-menu',
    name: 'قائمة المطعم',
    name_en: 'Restaurant Menu',
    sector: 'مطاعم',
    sector_en: 'Restaurants & Cafés',
    description:
      'قالب المطاعم: لوحة قائمة داكنة أنيقة، صفوف أطباق بفواصل سعر منقطة، تبويبات أقسام ثابتة، وفاتورة طلب جاهزة للواتساب.',
    preview: 'linear-gradient(135deg,#191410 0%,#3d332b 55%,#f59e0b 140%)',
    accent: '#f59e0b',
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
