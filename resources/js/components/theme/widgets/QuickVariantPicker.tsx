import { Check } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface VariantOption {
  name: string;
  values: string[];
}

interface QuickVariantPickerProps {
  /** Variant definitions from the product (name + values). */
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  swatchStyle?: 'round' | 'square';
  accentColor?: string;
  onChange: (selection: Record<string, string>) => void;
}

/**
 * Compact per-card variant picker for the quick-variant feature. Renders each
 * variant group as a row of tappable chips; the first value of each group is
 * pre-selected so adding to cart is a single tap.
 */
export const QuickVariantPicker: React.FC<QuickVariantPickerProps> = ({
  variants = [],
  swatchStyle = 'round',
  accentColor = '#10b981',
  onChange,
}) => {
  const normalized: VariantOption[] = useMemo(
    () =>
      variants
        .filter((v) => v && v.name)
        .map((v) => ({ name: v.name, values: v.values || v.options || [] }))
        .filter((v) => v.values.length > 0),
    [variants]
  );

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    normalized.forEach((group) => {
      initial[group.name] = group.values[0];
    });
    return initial;
  });

  const pick = (groupName: string, value: string) => {
    const next = { ...selection, [groupName]: value };
    setSelection(next);
    onChange(next);
  };

  if (normalized.length === 0) return null;

  const shape =
    swatchStyle === 'square'
      ? 'rounded-md'
      : 'rounded-full';

  return (
    <div className="flex flex-col gap-1.5">
      {normalized.map((group) => (
        <div key={group.name} className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-500">{group.name}:</span>
          <div className="flex flex-wrap gap-1">
            {group.values.map((value) => {
              const active = selection[group.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => pick(group.name, value)}
                  title={value}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium transition-colors ${shape} ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                  style={active ? { backgroundColor: `${accentColor}14`, borderColor: accentColor } : undefined}
                >
                  {active && <Check className="h-3 w-3" />}
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};