import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, CornerDownLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string;
  isSeparator?: boolean;
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowFreeText?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '8px 12px',
  borderRadius: '4px',
  color: '#09090b',
  backgroundColor: 'transparent',
  opacity: 1,
  pointerEvents: 'auto',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  outline: 'none',
  transition: 'background-color 0.1s',
};

const HINT_STYLE: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  marginLeft: '8px',
  fontWeight: 400,
};

const SEPARATOR_STYLE: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#e2e8f0',
  margin: '4px -12px',
  marginLeft: '-12px',
  marginRight: '-12px',
};

const EMPTY_STYLE: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: '#64748b',
  fontSize: '13px',
};

const FREE_TEXT_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '8px 12px',
  borderRadius: '4px',
  color: '#09090b',
  opacity: 1,
  pointerEvents: 'auto',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 400,
  outline: 'none',
  transition: 'background-color 0.1s',
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  allowFreeText = false,
  disabled = false,
  className,
  id,
}: SearchableSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);
  const normalized = search.trim().toLowerCase();
  const filtered = normalized
    ? options.filter(
        (o) => o.label.toLowerCase().includes(normalized) || (o.hint && o.hint.toLowerCase().includes(normalized))
      )
    : options;

  const canUseFreeText = allowFreeText && search.trim().length > 0 && !filtered.some((o) => o.label.toLowerCase() === normalized);

  const handleItemClick = (itemValue: string) => {
    onChange(itemValue);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
          onKeyDown={handleKeyDown}
        >
          <span className="truncate text-start">{selected ? selected.label : (placeholder || t('Select...'))}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onKeyDown={handleKeyDown}>
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="me-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder={searchPlaceholder || t('Search...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'transparent', border: 'none', width: '100%', color: '#09090b', opacity: 1 }}
            />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', padding: '4px' }}>
            {filtered.length === 0 && !canUseFreeText && (
              <div style={EMPTY_STYLE}>{emptyMessage || t('No results found.')}</div>
            )}
            {filtered.map((option, index) => {
              if (option.isSeparator) {
                return (
                  <div key={`sep-${index}`} style={SEPARATOR_STYLE} />
                );
              }
              const isSelected = value === option.value;
              const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
              const baseStyle = { ...ITEM_STYLE };
              return (
                <div
                  key={option.value}
                  onClick={() => handleItemClick(option.value)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  style={{ ...baseStyle, ...(isSelected ? { backgroundColor: '#e2e8f0' } : {}) }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#09090b', opacity: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {option.label}
                    </span>
                    {option.hint && (
                      <span style={HINT_STYLE}>{option.hint}</span>
                    )}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" style={{ color: '#09090b', flexShrink: 0 }} />}
                </div>
              );
            })}
            {canUseFreeText && (
              <div
                onClick={() => handleItemClick(search.trim())}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                style={FREE_TEXT_STYLE}
              >
                <CornerDownLeft className="h-4 w-4 shrink-0" />
                <span style={{ color: '#09090b', opacity: 1, fontWeight: 400 }}>
                  {t('Use')} "{search.trim()}"
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;