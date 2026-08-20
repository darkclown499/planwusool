/**
 * Weight conversion helpers for the fresh-produce module.
 *
 * Pricing in produce markets is normally "per kilo" while shoppers think in
 * grams, pieces, or pounds. These helpers centralize the unit math so every
 * product card (and the cart line items) agree on the same conversion factors.
 */

export type WeightUnit = 'g' | 'kg' | 'lb' | 'oz' | 'pcs';

export const WEIGHT_UNITS: WeightUnit[] = ['g', 'kg', 'lb', 'oz', 'pcs'];

/** Conversion factors relative to 1 kilogram. */
const TO_KG: Record<WeightUnit, number> = {
  g: 1 / 1000,
  kg: 1,
  lb: 0.45359237,
  oz: 0.02834952,
  pcs: 1, // pieces are 1:1 with the listed item price
};

const UNIT_LABEL: Record<WeightUnit, string> = {
  g: 'جرام',
  kg: 'كيلو',
  lb: 'رطل',
  oz: 'أونصة',
  pcs: 'قطعة',
};

const UNIT_SHORT: Record<WeightUnit, string> = {
  g: 'جم',
  kg: 'كجم',
  lb: 'رطل',
  oz: 'أونصة',
  pcs: 'قطعة',
};

/**
 * Convert a quantity expressed in one unit into another.
 * @param quantity amount in `from` unit
 * @param from source unit
 * @param to target unit
 */
export function convertWeight(quantity: number, from: WeightUnit, to: WeightUnit): number {
  const kgs = quantity * TO_KG[from];
  return kgs / TO_KG[to];
}

/** True when the product's base price refers to a weight (kg) rather than a piece. */
export function isWeightProduct(units?: string | null): boolean {
  if (!units) return false;
  const normalized = units.toLowerCase();
  return normalized.includes('kg') || normalized.includes('كيلو') || normalized.includes('g');
}

/**
 * Compute the price for a requested quantity at a given unit when the product
 * is priced per kilogram.
 */
export function priceForWeight(
  basePricePerKg: number,
  quantity: number,
  unit: Exclude<WeightUnit, 'pcs'>
): number {
  const kgs = convertWeight(quantity, unit, 'kg');
  return basePricePerKg * kgs;
}

/** Human readable label for a unit. */
export function weightLabel(unit: WeightUnit, short = false): string {
  return short ? UNIT_SHORT[unit] : UNIT_LABEL[unit];
}

/** Round to a friendly precision (grams -> whole, kg/lb/oz -> 2 decimals). */
export function formatWeight(quantity: number, unit: WeightUnit): string {
  const decimals = unit === 'g' ? 0 : 2;
  return quantity.toFixed(decimals);
}