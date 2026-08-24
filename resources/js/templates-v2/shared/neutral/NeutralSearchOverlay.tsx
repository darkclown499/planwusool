import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { useStorefrontCore } from '@/templates-v2/shared/hooks';

interface NeutralSearchOverlayProps {
  onClose: () => void;
  onProductClick: (product: any) => void;
}

/**
 * Minimal accent-neutral search fallback for templates that have not
 * branded their own overlay yet. Reads --twc-* variables so it blends with
 * whichever template scope mounts it.
 */
export const NeutralSearchOverlay: React.FC<NeutralSearchOverlayProps> = ({ onClose, onProductClick }) => {
  const { product } = useStorefrontCore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const products = product?.products || [];
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return [];
    return products
      .filter((p: any) => `${p.name || ''} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [q, products]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/50" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-x-0 top-0 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
            <Search className="h-5 w-5 text-stone-400" style={{ color: 'var(--twc-primary-600, #059669)' }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج…"
              className="w-full bg-transparent text-lg text-stone-800 focus:outline-none"
            />
            <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded p-1 text-stone-400 hover:text-stone-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          {results.length > 0 && (
            <ul className="mt-3 max-h-[60vh] overflow-y-auto pb-2">
              {results.map((p: any) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { onClose(); onProductClick(p); }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right transition hover:bg-stone-50">
                    <img src={getImageUrl(p.image)} alt="" className="h-12 w-12 rounded-md object-cover" loading="lazy" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">{p.name}</span>
                    <span className="text-sm font-bold text-stone-700">{formatCurrency(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
