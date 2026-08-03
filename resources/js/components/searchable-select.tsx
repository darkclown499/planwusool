import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, CornerDownLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string;
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
        >
          <span className="truncate text-start">{selected ? selected.label : (placeholder || t('Select...'))}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder || t('Search...')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !canUseFreeText && (
              <CommandEmpty>{emptyMessage || t('No results found.')}</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="text-start">
                    {option.label}
                    {option.hint && <span className="ms-2 text-xs text-muted-foreground">{option.hint}</span>}
                  </span>
                  {value === option.value && <Check className="h-4 w-4 shrink-0" />}
                </CommandItem>
              ))}
              {canUseFreeText && (
                <CommandItem
                  value={search.trim()}
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch('');
                  }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <CornerDownLeft className="h-4 w-4 shrink-0" />
                  <span className="text-start">
                    {t('Use')} &quot;{search.trim()}&quot;
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
