import React, { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useProduct } from '@/contexts/ProductContext';
import { getImageUrl } from '@/utils/image-helper';
import { css, priceOf, salePriceOf } from './helpers';

interface SearchOverlayProps {
  onClose: () => void;
}

/**
 * Shared full-screen search experience: live results grid + category chips,
 * used as the default `search` page-slot for any family that hasn't shipped
 * its own (see resources/js/themes/registry.ts's GENERIC_PAGES). Filters the
 * raw product list locally rather than going through ProductContext's
 * `handleSearch`/`filteredProducts`, since that state also drives the
 * per-family inline header search and must not be clobbered by this overlay.
 */
export const GenericSearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
  const { products, categories, handleProductClick } = useProduct();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    let list = products || [];
    if (categoryId !== 'all') {
      list = list.filter((p: any) => String(p.categoryId) === categoryId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p: any) => String(p.name || '').toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 60);
  }, [products, categoryId, query]);

  const hasFilter = query.trim().length > 0 || categoryId !== 'all';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: css('--twc-surface', '#ffffff') }}>
      <div className="flex items-center gap-2 border-b p-3 sm:p-4" style={{ borderColor: css('--twc-border', '#e5e7eb') }}>
        <SearchIcon className="h-5 w-5 shrink-0" style={{ color: css('--twc-text-secondary', '#6b7280') }} />
        <input
          autoFocus
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="flex-1 bg-transparent text-base outline-none"
          style={{ color: css('--twc-text-primary', '#111827') }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {categories?.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto px-3 py-2.5 sm:px-4"
          style={{ borderBottom: `1px solid ${css('--twc-border', '#e5e7eb')}` }}
        >
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition"
            style={{
              background: categoryId === 'all' ? css('--twc-primary-600', '#111827') : 'transparent',
              color: categoryId === 'all' ? css('--twc-primary-foreground', '#fff') : css('--twc-text-secondary', '#6b7280'),
              border: `1px solid ${categoryId === 'all' ? 'transparent' : css('--twc-border', '#e5e7eb')}`,
            }}
          >
            الكل
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(String(c.id))}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition"
              style={{
                background: categoryId === String(c.id) ? css('--twc-primary-600', '#111827') : 'transparent',
                color: categoryId === String(c.id) ? css('--twc-primary-foreground', '#fff') : css('--twc-text-secondary', '#6b7280'),
                border: `1px solid ${categoryId === String(c.id) ? 'transparent' : css('--twc-border', '#e5e7eb')}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {!hasFilter ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchIcon className="h-10 w-10" style={{ color: css('--twc-muted', '#d1d5db') }} />
            <p className="text-sm" style={{ color: css('--twc-text-secondary', '#6b7280') }}>
              اكتب اسم المنتج أو اختر تصنيفًا للبحث
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchIcon className="h-10 w-10" style={{ color: css('--twc-muted', '#d1d5db') }} />
            <p className="text-sm font-medium" style={{ color: css('--twc-text-primary', '#111827') }}>
              لا توجد نتائج
            </p>
            <p className="text-xs" style={{ color: css('--twc-text-secondary', '#6b7280') }}>
              جرّب كلمة بحث مختلفة
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((product: any) => {
              const image = getImageUrl(product.image);
              const hasSale = Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    handleProductClick(product);
                    onClose();
                  }}
                  className="flex flex-col overflow-hidden rounded-xl border text-start transition hover:shadow-md"
                  style={{ borderColor: css('--twc-border', '#e5e7eb'), background: css('--twc-background', '#fff') }}
                >
                  <div className="aspect-square w-full overflow-hidden" style={{ background: css('--twc-surface', '#f3f4f6') }}>
                    {image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex flex-col gap-1 p-2.5">
                    <span className="line-clamp-1 text-xs font-medium" style={{ color: css('--twc-text-primary', '#111827') }}>
                      {product.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: css('--twc-primary-600', '#111827') }}>
                        {salePriceOf(product)}
                      </span>
                      {hasSale && (
                        <span className="text-[10px]" style={{ color: css('--twc-muted', '#9ca3af'), textDecoration: 'line-through' }}>
                          {priceOf(product)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericSearchOverlay;
