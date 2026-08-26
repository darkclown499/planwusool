import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { usePriceFormatter, useStorefrontCore } from '../../shared/hooks';
import { useServerSearch } from '@/hooks/useServerSearch';

interface AtelierSearchOverlayProps {
  onClose: () => void;
  onProductClick: (product: any) => void;
}

/**
 * Compact header search — now server-backed via canonical StorefrontSearchController
 * (GET /api/storefront/search?q=...&store_id=...). Store-scoped, active products
 * & active categories only, Arabic/English/SKU, variant-aware availability/price.
 * Suggestions still derive from real store data (chips), never hardcoded.
 */
export const AtelierSearchOverlay: React.FC<AtelierSearchOverlayProps> = ({ onClose, onProductClick }) => {
  const { product, store, config } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [query, setQuery] = useState('');
  const [serverResults, setServerResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const storeName = (config as any)?.storeName || (store as any)?.name || 'المتجر';

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // REUSE shared server contract — single source of truth
  const { results: serverResultsRaw, loading: serverLoading, error: serverError } = useServerSearch(query, 8);
  const results = serverResultsRaw !== null ? serverResultsRaw : [];

  const products = product?.products || [];

  const suggestions = useMemo(() => {
    const names = new Set<string>();
    for (const p of products.slice(0, 40)) {
      for (const word of String(p.name || '').split(/\s+/)) {
        if (word.length > 3 && !names.has(word)) {
          if (names.size >= 6) break;
          names.add(word);
        }
      }
      if (names.size >= 6) break;
    }
    return Array.from(names);
  }, [products]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="mx-auto mt-12 max-w-2xl w-full p-4">
        <div
          className="bg-white rounded-2xl p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-bold text-stone-800">ابحث في {storeName}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق البحث"
              className="rounded-full bg-stone-100 p-2 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 transition focus-within:border-[#9d7463] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#9d7463]/20">
            <Search className="h-5 w-5 shrink-0 text-stone-400" strokeWidth={1.7} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج، قسم، أو كود..."
              className="w-full bg-transparent text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="مسح"
                className="shrink-0 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Suggestion chips — compact directly below search bar */}
          {suggestions.length > 0 && query.trim().length < 2 && (
            <div className="my-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-medium text-stone-600 transition hover:border-[#9d7463] hover:bg-white hover:text-[#9d7463]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Results — loading / error / empty / grid */}
          <div className="mt-2 max-h-[50vh] overflow-y-auto">
            {query.trim().length >= 2 && serverLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ البحث…</div>
            ) : query.trim().length >= 2 && serverError ? (
              <p className="py-8 text-center text-sm text-red-500">{serverError}</p>
            ) : query.trim().length >= 2 && results.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">لم نجد منتجات مطابقة</p>
            ) : query.trim().length >= 2 && results.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      // Server result shape is V2-compatible; ProductContext will fetch full detail if needed
                      onProductClick(p);
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 text-right transition hover:border-[#9d7463]/30 hover:bg-white hover:shadow-md text-start"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
                      <img
                        src={getImageUrl(p.image || p.images?.[0] || '')}
                        alt={p.name}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-800 group-hover:text-[#9d7463]">{p.name}</span>
                      <span className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-bold text-stone-900">{formatPrice(p.price)}</span>
                        {p.originalPrice && Number(p.originalPrice) > Number(p.price) && <span className="text-xs text-stone-400 line-through">{formatPrice(p.originalPrice)}</span>}
                        {p.availability === 'out_of_stock' && <span className="text-[11px] font-bold text-red-500">نفذت</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
