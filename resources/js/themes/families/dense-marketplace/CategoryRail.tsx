import React from 'react';
import { LayoutGrid, Store } from 'lucide-react';
import { css } from '@/builder/sections/helpers';

export interface RailCategory {
  id: any;
  name: string;
  image?: string;
  slug?: string;
  product_count?: number;
}

interface CategoryRailProps {
  categories: RailCategory[];
  activeId?: any;
  onSelect: (id: any) => void;
  getHref?: (cat: RailCategory) => string | undefined;
  allLabel?: string;
  showAll?: boolean;
  title?: string;
  className?: string;
}

/**
 * Desktop persistent category sidebar/rail — the family's structural
 * signature. Sits beside the product grid (not stacked above it) so
 * merchants with high SKU counts can browse without leaving the grid.
 */
export const CategoryRail: React.FC<CategoryRailProps> = ({
  categories,
  activeId,
  onSelect,
  getHref,
  allLabel = 'كل الأقسام',
  showAll = true,
  title = 'الأقسام',
  className = '',
}) => {
  const Row: React.FC<{ cat: RailCategory | null }> = ({ cat }) => {
    const active = cat ? String(activeId) === String(cat.id) : !activeId || String(activeId) === 'all';
    const href = cat && getHref ? getHref(cat) : undefined;
    const body = (
      <>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md"
          style={{ background: cat?.image ? undefined : `${css('--twc-primary', '#0f8a5f')}14` }}
        >
          {cat?.image ? (
            <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            (cat ? <Store className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />)
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-start text-[13px] font-semibold">{cat ? cat.name : allLabel}</span>
        {cat?.product_count ? (
          <span className="shrink-0 text-[10px] font-medium" style={{ color: css('--twc-muted', '#94a3b8') }}>
            {cat.product_count}
          </span>
        ) : null}
      </>
    );
    const sharedStyle: React.CSSProperties = {
      color: active ? css('--twc-primary', '#0f8a5f') : css('--twc-text-secondary', '#475569'),
      background: active ? `${css('--twc-primary', '#0f8a5f')}12` : 'transparent',
      borderInlineStartColor: active ? css('--twc-primary', '#0f8a5f') : 'transparent',
    };
    const sharedClass =
      'flex w-full items-center gap-2 border-s-[3px] px-2.5 py-2 transition hover:bg-slate-50';
    return href ? (
      <a href={href} className={sharedClass} style={sharedStyle}>
        {body}
      </a>
    ) : (
      <button type="button" onClick={() => onSelect(cat ? cat.id : 'all')} className={sharedClass} style={sharedStyle}>
        {body}
      </button>
    );
  };

  return (
    <aside
      className={`hidden shrink-0 lg:block lg:w-52 xl:w-60 ${className}`}
      style={{}}
    >
      <div
        className="lg:sticky lg:top-24 overflow-hidden rounded-xl border"
        style={{ borderColor: css('--twc-border', '#e2e8f0'), background: css('--twc-surface', '#ffffff') }}
      >
        <p
          className="border-b px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide"
          style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') }}
        >
          {title}
        </p>
        <nav className="flex max-h-[70vh] flex-col overflow-y-auto py-1">
          {showAll && <Row cat={null} />}
          {categories.map((c) => (
            <Row key={c.id} cat={c} />
          ))}
        </nav>
      </div>
    </aside>
  );
};

/** Mobile sticky horizontal scrolling chip bar — the family's mobile equivalent of the rail. */
export const CategoryChips: React.FC<{
  categories: RailCategory[];
  activeId?: any;
  onSelect: (id: any) => void;
  allLabel?: string;
  showAll?: boolean;
  className?: string;
}> = ({ categories, activeId, onSelect, allLabel = 'الكل', showAll = true, className = '' }) => {
  const items = showAll ? [{ id: 'all', name: allLabel } as RailCategory, ...categories] : categories;
  return (
    <div className={`flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden ${className}`}>
      {items.map((c) => {
        const active = String(activeId ?? 'all') === String(c.id) || (c.id === 'all' && (!activeId || activeId === 'all'));
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition"
            style={{
              borderColor: active ? 'transparent' : css('--twc-border', '#e2e8f0'),
              background: active ? css('--twc-primary', '#0f8a5f') : css('--twc-surface', '#ffffff'),
              color: active ? css('--twc-primary-foreground', '#ffffff') : css('--twc-text-secondary', '#475569'),
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
};
