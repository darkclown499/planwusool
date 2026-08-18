export interface VariantGroup {
  name: string;
  values: string[];
}

export interface VariantCombination {
  id: string;
  values: string[];
  label: string;
  price?: string;
  cost_price?: string;
  stock?: string | number;
  low_stock_warning?: string | number;
  sku?: string;
  image?: string;
}

const SEP = '‖';

function clean(groups: VariantGroup[]): { name: string; values: string[] }[] {
  return groups
    .filter((g) => g.name && g.name.trim() !== '')
    .map((g) => ({
      name: g.name,
      values: (g.values || []).map((v) => v.trim()).filter((v) => v !== ''),
    }))
    .filter((g) => g.values.length > 0);
}

/**
 * Cartesian product of all attribute group values, e.g.
 * Color[أحمر, أزرق] × Size[L, XL] => 4 combinations.
 */
export function generateVariantCombinations(groups: VariantGroup[]): VariantCombination[] {
  const active = clean(groups);
  if (active.length === 0) return [];

  let rows: string[][] = [[]];
  for (const g of active) {
    const next: string[][] = [];
    for (const row of rows) {
      for (const v of g.values) {
        next.push([...row, v]);
      }
    }
    rows = next;
  }

  return rows.map((values) => ({
    id: values.join(SEP),
    values,
    label: values.join(' / '),
    price: '',
    cost_price: '',
    stock: '',
    low_stock_warning: '',
    sku: '',
    image: '',
  }));
}

/** Recompute combinations while preserving any user-entered edits by row id. */
export function mergeCombinationEdits(
  generated: VariantCombination[],
  previous: Record<string, VariantCombination>
): VariantCombination[] {
  return generated.map((combo) => {
    const prev = previous[combo.id];
    if (!prev) return combo;
    return {
      ...combo,
      price: prev.price ?? '',
      cost_price: prev.cost_price ?? '',
      stock: prev.stock ?? '',
      low_stock_warning: prev.low_stock_warning ?? '',
      sku: prev.sku ?? '',
      image: prev.image ?? '',
    };
  });
}

/** Build an edits map from a persisted array (used when editing an existing product). */
export function toCombinationEditsMap(combinations: VariantCombination[] | null | undefined): Record<string, VariantCombination> {
  if (!Array.isArray(combinations) || combinations.length === 0) return {};
  const map: Record<string, VariantCombination> = {};
  for (const c of combinations) {
    if (c && c.id) map[c.id] = c;
    else if (c && Array.isArray(c.values) && c.values.length) map[c.values.join(SEP)] = c;
  }
  return map;
}