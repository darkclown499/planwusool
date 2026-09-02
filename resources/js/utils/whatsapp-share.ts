/**
 * Centralized WhatsApp product-share builder.
 *
 * All six storefront templates MUST build the share link through this helper so
 * the shared URL is canonical (Store::getStoreUrl → custom domain or store
 * subdomain), never window.location.origin (which is wrong in admin previews).
 */
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';

export interface ProductShareInput {
  name: string;
  seoUrlSlug?: string | number | null;
  id?: string | number | null;
}

/**
 * Canonical product URL from the store's canonical base URL.
 */
export function canonicalProductUrl(storeUrl: string, product: ProductShareInput): string {
  const base = (storeUrl || '').replace(/\/+$/, '');
  const slug = product?.seoUrlSlug ?? product?.id ?? '';
  if (!base || !slug) return '';
  return `${base}/product/${encodeURIComponent(String(slug))}`;
}

/**
 * Build a wa.me share deep link (message only, user picks the recipient chat).
 */
export function productShareWhatsAppUrl(storeUrl: string, product: ProductShareInput): string {
  const url = canonicalProductUrl(storeUrl, product);
  const name = product?.name || '';
  const message = `${name} ${url}`.trim();
  // No target number → wa.me/?text= shares to whichever chat the user chooses.
  return createWhatsAppUrl('', message) || `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Build a wa.me message sent to a specific merchant number (order via WhatsApp).
 */
export function orderViaWhatsAppUrl(merchantNumber: string, product: ProductShareInput, storeName?: string): string {
  const name = product?.name || '';
  const lines = [name].filter(Boolean);
  if (storeName) lines.push(`— ${storeName}`);
  const message = lines.join('\n');
  return createWhatsAppUrl(merchantNumber, message);
}