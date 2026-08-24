import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { usePriceFormatter, useStorefrontCore } from '../../shared/hooks';

interface AtelierSearchOverlayProps {
  onClose: () => void;
  onProductClick: (product: any) => void;
}

/**
 * Full-screen atelier search: a centered serif prompt over ivory, live
 * results as elegant rows with portrait thumbs. Esc closes.
 */
export const AtelierSearchOverlay: React.FC<AtelierSearchOverlayProps> = ({ onClose, onProductClick }) => {
  const { product } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const products = product?.products || [];
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p: any) => {
        const hay = `${p.name || ''} ${p.sku || ''} ${p.category || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [query, products]);

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
    <div className="fixed inset-0 z-[80] bg-[#faf7f2]/98 backdrop-blur" dir="rtl" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pt-16 sm:pt-24">
        <button type="button" onClick={onClose} aria-label="إغلاق البحث"
          className="absolute left-5 top-5 rounded-full bg-white p-2 text-stone-500 shadow-sm transition hover:text-stone-900">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <p className="mb-6 text-[11px] font-bold tracking-[0.35em] text-[#b08d57]">ابحثي في الأتيليه</p>
        </div>

        <div className="flex items-center gap-3 border-b-2 border-stone-300 pb-3 transition focus-within:border-[#9d7463]">
          <Search className="h-6 w-6 shrink-0 text-stone-400" strokeWidth={1.6} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم القطعة، مقاس، أو كود…"
            className="w-full bg-transparent font-serif text-xl text-stone-800 placeholder:text-stone-400 focus:outline-none sm:text-2xl"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="مسح" className="shrink-0 rounded-full p-1 text-stone-400 hover:text-stone-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pb-10">
          {query.trim().length < 2 ? (
            suggestions.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-bold tracking-wide text-stone-500">اقتراحات</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => setQuery(s)}
                      className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm text-stone-600 transition hover:border-[#9d7463] hover:text-[#9d7463]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : results.length === 0 ? (
            <p className="py-12 text-center font-serif text-lg text-stone-400">لا نتائج تطابق «{query}»</p>
          ) : (
            <ul className="divide-y divide-stone-200/80">
              {results.map((p: any) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { onClose(); onProductClick(p); }}
                    className="group flex w-full items-center gap-4 py-3 text-right transition">
                    <span className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-stone-100 ring-1 ring-stone-200">
                      <img src={getImageUrl(p.image)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[15px] font-semibold text-stone-800 group-hover:text-[#9d7463]">{p.name}</span>
                      <span className="mt-1 block text-sm font-bold text-stone-900">{formatPrice(p.price)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
