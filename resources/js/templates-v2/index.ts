export * from './types';
export { getTemplateModule, requireTemplateModule, normalizeV2Slug, listTemplateModules } from './registry';
export { TemplateStorefrontV2 } from './TemplateStorefrontV2';
export { buildV2PreviewStoreData, V2PreviewProviders } from './shared/preview';
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
