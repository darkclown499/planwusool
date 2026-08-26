export interface VariantGroup { name: string; values: string[] }
export interface VariantCombination { id: string; uuid?: string; values: string[]; label: string; price?: string; stock?: string|number; sku?: string; image?: string }

// Canonical availability check - respects track_inventory, allow_backorder, existence
export function isCombinationPurchasable(combo: VariantCombination, trackInventory: boolean, allowBackorder: boolean): boolean {
  if (!combo) return false
  if (!trackInventory) return true
  if (allowBackorder) return true
  const s = combo.stock
  if (s === '' || s === null || s === undefined) return false
  const n = Number(s)
  return Number.isFinite(n) && n > 0
}

export function getVariantOptionAvailability(
  groups: VariantGroup[],
  combinations: VariantCombination[],
  selection: Record<string,string>,
  trackInventory: boolean,
  allowBackorder: boolean,
): Record<string, Record<string, boolean>> {
  const cleanGroups = groups.filter(g=>g.name && g.values.length)
  const result: Record<string,Record<string,boolean>> = {}
  for (const g of cleanGroups) result[g.name] = {}
  if (!combinations || combinations.length===0) {
    // No combinations defined - all options unavailable except defined values
    for (const g of cleanGroups) for (const v of g.values) result[g.name][v]=false
    return result
  }
  for (const g of cleanGroups) {
    for (const candidate of g.values) {
      const testSel = { ...selection, [g.name]: candidate }
      // Check if at least one purchasable combination matches partial selection + candidate
      let available = false
      for (const combo of combinations) {
        // combo must contain candidate and match other selected values
        let matches = true
        for (const [k,v] of Object.entries(testSel)) {
          if (!v) continue
          // combo values set must contain v
          if (!combo.values.includes(v)) { matches=false; break }
        }
        if (!matches) continue
        // Also ensure combo is valid defined combination (exists)
        // Check exact values set equals combo values when fully selected? For partial we just need superset
        // For candidate check, we need combo.values includes candidate and all other selected
        if (isCombinationPurchasable(combo, trackInventory, allowBackorder)) { available=true; break }
        // Even if not purchasable, if track false/backorder true, still available
      }
      // Also disable if candidate value never appears in any defined combination
      const appears = combinations.some(c=>c.values.includes(candidate))
      result[g.name][candidate] = appears && available
    }
  }
  return result
}
