import type { TemplateModule } from '../types';
import { NEUTRAL_OVERLAYS } from '../shared/neutral';
import { BazaarMarketRoot } from './BazaarMarket';
import { BazaarProductDetail } from './BazaarProductDetail';

/**
 * البازار — Bazaar Market
 * القالب الافتراضي لأي متجر عام: واجهة بيضاء ودودة بلمسات تركوازية،
 * شريط أقسام، دوائر تصنيف، شبكة منتجات متوازنة وشريط ثقة أساسي.
 */
const bazaarMarket: TemplateModule = {
  meta: {
    slug: 'bazaar-market',
    name: 'البازار',
    name_en: 'Bazaar Market',
    sector: 'سوق عام',
    sector_en: 'General Market',
    description:
      'القالب العام المرن لأي نوع متجر: تصميم نظيف ومتوازن، أقسام واضحة، عروض أسبوعية، وشريط ثقة يبني الثقة من أول زيارة.',
    preview: 'linear-gradient(135deg,#f8fafc 0%,#99f6e4 55%,#0d9488 140%)',
    accent: '#0d9488',
    is_free: true,
    plan_required: 'starter',
  },
  Root: BazaarMarketRoot,
  overlays: { ...NEUTRAL_OVERLAYS, product_detail: BazaarProductDetail as any },
  contentSchema: [
    { key: 'banners', label: 'شرائح الواجهة', type: 'image', group: 'الواجهة' },
  ],
};

export default bazaarMarket;
export { BazaarMarketRoot };
