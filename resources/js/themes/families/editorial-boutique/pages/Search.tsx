import React, { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useProduct } from '@/contexts/ProductContext';
import { getImageUrl } from '@/utils/image-helper';
import { css, priceOf, salePriceOf } from '@/builder/sections/helpers';

interface SearchProps {
  onClose: () => void;
}

/**
 * editorial-boutique search — a full-screen overlay with the family's
 * portrait (3:4) result cards instead of the generic square grid, uppercase
 * -tracked category chips, and a hairline search field instead of a boxed
 * input, so it reads as a natural extension of the product grid, not a
 * bolted-on utility.
 */
export const Search: React.FC<SearchProps> = ({ onClose }) => {
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

  const border = css('--twc-border', '#ededed');
  const textPrimary = css('--twc-text-primary', '#161311');
  const textSecondary = css('--twc-text-secondary', '#8a8178');
  const primary = css('--twc-primary', '#f6d7d5');

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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="flex items-center gap-3 border-b p-4 sm:px-6" style={{ borderColor: border }}>
        <SearchIcon className="h-5 w-5 shrink-0" style={{ color: textSecondary }} />
        <input
          autoFocus
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحثي عن قطعة..."
          className="flex-1 bg-transparent text-base outline-none"
          style={{ color: textPrimary }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 shrink-0 items-center justify-center transition hover:opacity-60"
          style={{ color: textPrimary }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {categories?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b px-4 py-3 sm:px-6" style={{ borderColor: border }}>
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className="shrink-0 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition"
            style={{
              background: categoryId === 'all' ? textPrimary : 'transparent',
              color: categoryId === 'all' ? '#ffffff' : textSecondary,
              border: `1px solid ${categoryId === 'all' ? 'transparent' : border}`,
            }}
          >
            الكل
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(String(c.id))}
              className="shrink-0 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition"
              style={{
                background: categoryId === String(c.id) ? textPrimary : 'transparent',
                color: categoryId === String(c.id) ? '#ffffff' : textSecondary,
                border: `1px solid ${categoryId === String(c.id) ? 'transparent' : border}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {!hasFilter ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchIcon className="h-10 w-10" style={{ color: css('--twc-muted', '#d9cfc8') }} />
            <p className="text-sm" style={{ color: textSecondary }}>
              اكتبي اسم المنتج أو اختاري تصنيفًا للبحث
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchIcon className="h-10 w-10" style={{ color: css('--twc-muted', '#d9cfc8') }} />
            <p className="text-sm font-medium" style={{ color: textPrimary }}>
              لا توجد نتائج
            </p>
            <p className="text-xs" style={{ color: textSecondary }}>
              جرّبي كلمة بحث مختلفة
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4">
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
                  className="flex flex-col text-center"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden" style={{ background: css('--twc-surface', '#faf8f6') }}>
                    {image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex flex-col gap-1 pt-2.5">
                    <span className="line-clamp-1 text-[13px] font-medium" style={{ color: textPrimary }}>
                      {product.name}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: textPrimary }}>
                        {salePriceOf(product)}
                      </span>
                      {hasSale && (
                        <span className="text-[11px]" style={{ color: css('--twc-muted', '#a9a099'), textDecoration: 'line-through' }}>
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

export default Search;
