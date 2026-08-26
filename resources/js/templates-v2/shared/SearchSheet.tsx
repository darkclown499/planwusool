import React, { useEffect, useRef } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useServerSearch, submitStorefrontSearch } from '@/hooks/useServerSearch';
import { SearchResultItem, SearchResultSkeleton } from './SearchResultItem';
import { useStorefrontCore } from './hooks';

/**
 * Shared mobile-first search sheet — replaces the narrow centered modal.
 * Mobile: near-fullscreen sheet using dvh, safe-area aware, one scroll region.
 * Desktop: large popover / overlay panel.
 * Shared interaction contract: live results + Enter/submit -> /search?q=
 * Template-specific: colors/radius via props + CSS variables.
 */
export const SearchSheet: React.FC<{
  onClose: () => void;
  onProductClick: (p: any) => void;
  accent?: string;
  placeholder?: string;
  title?: string;
  variant?: 'fashion' | 'bazaar' | 'grocery' | 'bakery' | 'electronics' | 'restaurant' | 'neutral';
}> = ({ onClose, onProductClick, accent, placeholder = 'ابحث عن منتج…', title, variant = 'neutral' }) => {
  const { cart, product, config, store } = useStorefrontCore() as any;
  const storeName = title || (config as any)?.storeName || (store as any)?.name || 'المتجر';
  const [query, setQuery] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, error } = useServerSearch(query, 10);
  const list: any[] = Array.isArray(results) ? results : [];
  const showLive = query.trim().length >= 2;

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSubmit = () => {
    const ok = submitStorefrontSearch(query);
    if (ok) onClose();
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleQuickAdd = async (p: any) => {
    // Simple purchasable only; variant products open PDP
    const isVariant = p?.inventoryMode === 'variant' || (Array.isArray(p?.variants) && p.variants.length > 0);
    if (isVariant) {
      onClose();
      onProductClick(p);
      return;
    }
    try {
      await cart.addToCart({ ...p, quantity: 1 });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/50 backdrop-blur-[2px]" dir="rtl" role="dialog" aria-modal="true" onClick={onClose}>
      {/* Mobile: fullscreen sheet, Desktop: centered large panel */}
      <div
        className="flex w-full flex-col bg-white shadow-2xl
          max-md:min-h-[100dvh] max-md:h-[100dvh] max-md:rounded-none
          md:mx-auto md:mt-[6vh] md:max-h-[min(82dvh,760px)] md:max-w-2xl md:overflow-hidden md:rounded-[20px]
          max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--sheet-accent' as any]: accent || 'var(--twc-primary-600, #0f766e)' }}
      >
        {/* Header: Close | Input | Clear/Search */}
        <div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-3 py-3 md:px-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-stone-600 transition hover:bg-black/10"
          >
            <X className="h-5 w-5" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-1 items-center gap-2 rounded-full border border-black/10 bg-stone-50 px-3 py-2 focus-within:border-[var(--sheet-accent)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--sheet-accent)]/15"
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-stone-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              enterKeyHint="search"
              autoCorrect="off"
              spellCheck={false}
              aria-label="بحث"
              className="w-full bg-transparent text-[15px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={handleClear} aria-label="مسح البحث" className="shrink-0 rounded-full p-1 text-stone-400 hover:bg-black/5 hover:text-stone-700">
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="بحث"
              className="hidden shrink-0 rounded-full p-1.5 text-stone-500 hover:bg-black/5 md:flex"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
          <button
            type="button"
            onClick={handleSubmit}
            className="hidden shrink-0 rounded-full bg-black px-4 py-2 text-sm font-black text-white hover:bg-stone-800 md:inline-flex"
            style={{ background: accent || '#0f172a' }}
          >
            بحث
          </button>
        </div>

        {/* Hint row: store name + count */}
        <div className="flex shrink-0 items-center justify-between px-4 py-2 text-xs text-stone-500 md:px-5">
          <span className="font-bold">ابحث في {storeName}</span>
          {showLive && !loading && !error && list.length > 0 && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold">{list.length} نتيجة</span>}
        </div>

        {/* Body: single scroll region, no double scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 md:px-3">
          {!showLive ? (
            <div className="px-3 py-10 text-center">
              <p className="text-3xl">🔍</p>
              <p className="mt-2 text-sm font-bold text-stone-600">اكتب كلمة للبحث</p>
              <p className="mt-1 text-xs text-stone-400">مثال: اندومي، خبز، آيفون</p>
            </div>
          ) : loading ? (
            <div className="space-y-1 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
              <p className="flex items-center justify-center gap-2 py-3 text-xs text-stone-400">
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ البحث…
              </p>
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-bold text-red-600">{error}</p>
              <button type="button" onClick={() => setQuery((q) => q + ' ')} className="mt-3 rounded-full border px-4 py-1.5 text-xs font-bold hover:bg-stone-50">
                حاول مرة أخرى
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-bold text-stone-600">لم نجد منتجات مطابقة لـ &quot;{query.trim()}&quot;</p>
              <div className="mt-4 flex justify-center gap-2">
                <button type="button" onClick={handleClear} className="rounded-full border px-4 py-2 text-xs font-bold hover:bg-stone-50">
                  مسح البحث
                </button>
                <a href="/" className="rounded-full bg-black px-4 py-2 text-xs font-black text-white" style={{ background: accent || '#0f172a' }}>
                  العودة للتسوق
                </a>
              </div>
            </div>
          ) : (
            <>
              <ul className="space-y-0.5">
                {list.map((p: any) => (
                  <li key={p.id}>
                    <SearchResultItem product={p} onClick={(pp) => { onClose(); onProductClick(pp); }} onQuickAdd={handleQuickAdd} variant={variant as any} />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 px-4 py-3 text-sm font-black transition hover:bg-stone-50"
                style={{ borderColor: accent || '#0f172a', color: accent || '#0f172a' }}
              >
                عرض كل النتائج لـ &quot;{query.trim()}&quot; ←
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
