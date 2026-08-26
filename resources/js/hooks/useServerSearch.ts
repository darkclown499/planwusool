import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';

/**
 * Canonical live search hook — store-scoped, debounced, abort-safe, stale-guard.
 * Contract:
 * - trims + normalizes whitespace, caps at 100 chars, min 2 chars
 * - debounce 280ms (rapid typing: ا -> اندومي)
 * - AbortController cancels previous fetch, stale results never overwrite newer query
 * - store_id enforced (no cross-store leak)
 * - limit 7-12 for live suggestions (full results page uses paginated endpoint)
 */
export function useServerSearch(query: string, limit = 8) {
  const { store } = useStore() as any;
  const storeId = store?.id;
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const raw = String(query || '');
    const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, 100);
    if (normalized.length < 2 || !storeId) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    seqRef.current += 1;
    const seq = seqRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = `/api/storefront/search?q=${encodeURIComponent(normalized)}&store_id=${encodeURIComponent(String(storeId))}&limit=${limit}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const json: any = await res.json();
        if (!cancelled && seqRef.current === seq) {
          setResults(Array.isArray(json.products) ? json.products : []);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (!cancelled && seqRef.current === seq) {
          setError('تعذر تحميل نتائج البحث. حاول مرة أخرى.');
          setResults([]);
        }
      } finally {
        if (!cancelled && seqRef.current === seq) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, storeId, limit]);

  return { results, loading, error };
}

/**
 * Normalize query for submit/URL: trim, collapse spaces, cap 100, encode safely.
 * Returns '' when below min length.
 */
export function normalizeSearchQuery(raw: string): string {
  const q = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  // strip raw HTML tags
  const clean = q.replace(/<[^>]*>/g, '').trim();
  return clean.length < 2 ? '' : clean;
}

/**
 * Navigate to dedicated storefront search results page (store subdomain /search?q=...).
 * Single canonical submit handler for keyboard Enter, icon click, mobile search button.
 */
export function submitStorefrontSearch(rawQuery: string) {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) return false;
  const url = `/search?q=${encodeURIComponent(q)}`;
  // Prefer Inertia router when available for SPA navigation + history preservation
  try {
    const { router } = require('@inertiajs/react') as any;
    if (router?.visit || router?.get) {
      (router.visit || router.get)(url);
      return true;
    }
  } catch {}
  window.location.assign(url);
  return true;
}
