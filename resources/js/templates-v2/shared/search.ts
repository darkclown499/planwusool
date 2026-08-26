import { useMemo } from 'react';
import { useStorefrontCore } from './hooks';

/**
 * Shared search contract for every v2 template.
 * Single source of business rules:
 * - store scope via product.products already filtered server-side to active + store_id
 * - query trimmed, min length 2
 * - matches name / sku / description
 * - limit enforced
 * Templates may render results differently but must consume this hook
 * to keep query semantics identical.
 */
export function useStorefrontSearch(query: string, limit = 7) {
  const { product } = useStorefrontCore() as any;
  return useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [] as any[];
    const list: any[] = product?.products || [];
    const out: any[] = [];
    for (const p of list) {
      const name = String(p.name || '').toLowerCase();
      const sku = String(p.sku || '').toLowerCase();
      const desc = String(p.description || p.short_description || '').toLowerCase();
      if (name.includes(q) || sku.includes(q) || desc.includes(q)) {
        out.push(p);
        if (out.length >= limit) break;
      }
    }
    return out;
  }, [query, product?.products, limit]);
}
