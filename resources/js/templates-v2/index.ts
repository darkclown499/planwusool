export * from './types';
export { getTemplateModule, requireTemplateModule, normalizeV2Slug, listTemplateModules } from './registry';
export { TemplateStorefrontV2 } from './TemplateStorefrontV2';
export {
  useStorefrontCore,
  usePriceFormatter,
  computeCartTotals,
  discountPercent,
  isVariableProduct,
  lowStockRemaining,
  freeShippingProgress,
  useCountdown,
  useRotatingAnnouncement,
  storePath,
  type V2Product,
} from './shared/hooks';
