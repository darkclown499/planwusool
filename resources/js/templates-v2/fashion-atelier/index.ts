import type { TemplateModule } from '../types';
import { FashionAtelierRoot } from './FashionAtelierRoot';
import { atelierOverlays } from './overlays';

/**
 * فاشن أتيليه — Fashion Atelier
 * قالب الأزياء: تحريري، فاخر، صور عمودية بتبديل زاوية عند الهوفر،
 * إضافة سريعة بالمقاسات داخل البطاقة (نمط أبريل)، سلة بشريط شحن مجاني.
 */
const fashionAtelier: TemplateModule = {
  meta: {
    slug: 'fashion-atelier',
    name: 'أتيليه الموضة',
    name_en: 'Fashion Atelier',
    sector: 'أزياء ومحجبات',
    sector_en: 'Fashion & Boutique',
    description:
      'قالب تحريري فاخر لمتاجر الأزياء والمحجبات: صور كبيرة بتبديل الزاوية عند المرور، اختيار المقاس واللون من داخل البطاقة، وشريط تقدّم للشحن المجاني.',
    preview: 'linear-gradient(135deg,#faf7f2 0%,#e7d8c9 60%,#9d7463 140%)',
    accent: '#9d7463',
    is_free: true,
    plan_required: 'starter',
  },
  Root: FashionAtelierRoot,
  overlays: atelierOverlays,
  contentSchema: [
    { key: 'announcement.1', label: 'شريط التنبيه ١', type: 'text', group: 'الرأس', default: 'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح' },
    { key: 'announcement.2', label: 'شريط التنبيه ٢', type: 'text', group: 'الرأس', default: 'شحن مجاني للطلبات فوق 250 ₪' },
    { key: 'hero.title', label: 'عنوان الواجهة', type: 'text', group: 'الواجهة', default: '' },
    { key: 'hero.subtitle', label: 'وصف الواجهة', type: 'text', group: 'الواجهة', default: '' },
    { key: 'banners', label: 'شرائح وبانرات الواجهة', type: 'image', group: 'الواجهة', hint: 'من مكتبة الوسائط' },
  ],
};

export default fashionAtelier;
export { FashionAtelierRoot };
