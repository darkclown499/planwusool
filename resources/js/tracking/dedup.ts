/**
 * Social Commerce — purchase deduplication.
 *
 * Rule: ONE logical Wusool order must produce at most ONE browser `purchase`
 * attribution per browser/profile under normal navigation, reload and invoice
 * behaviour.
 *
 * Storage is a durable (cross-tab, cross-session) key → timestamp map, so an
 * order observed in the success modal, then again on the standalone invoice
 * (even in a new tab, or after a reload) still fires exactly once. Entries are
 * bounded: expired entries (TTL) are pruned on every read/write and the map is
 * capped so it can never grow without bound.
 *
 * The dedup key is `${storeSlug}:${orderNumber}` — store + order identity — so:
 *   - two different stores sharing the same order number never collide
 *     (`store-a:100-1` !== `store-b:100-1`);
 *   - two different orders always fire independently;
 *   - the same order still fires once even if its number is re-fetched.
 *
 * This module is intentionally pure (no window/DOM imports) so the semantics
 * can be unit-tested standalone (see tests/js/tracking/dedup.test.mjs).
 *
 * This is attribution for a successfully created order — it is NOT
 * collected-revenue reporting.
 */

/** Cap on stored entries so the map never grows unbounded. */
export const PURCHASE_DEDUP_MAX_ENTRIES = 2000;

/** Retention window — an order older than this may fire again (fresh window). */
export const PURCHASE_DEDUP_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Minimal storage surface so both localStorage and sessionStorage can back it. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

type DedupMap = Record<string, number>;

/** Store + order scoped dedup key (fallback store tag if slug is missing). */
export function dedupKey(storeSlug: string, orderNumber: string): string {
    return `${storeSlug || 'anonymous'}:${orderNumber}`;
}

function readMap(storage: StorageLike, storageKey: string, now: number): DedupMap {
    try {
        const raw = storage.getItem(storageKey);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

        const cutoff = now - PURCHASE_DEDUP_TTL_MS;
        const map: DedupMap = {};
        for (const [key, t] of Object.entries(parsed as DedupMap)) {
            // Prune expired entries as the map is read (bounded retention).
            if (typeof t === 'number' && t >= cutoff) {
                map[key] = t;
            }
        }
        return map;
    } catch {
        // Corrupt or blocked storage — treat as empty (best effort, no throw).
        return {};
    }
}

/**
 * Returns true when the scoped order already fired a purchase within the TTL
 * window (i.e. it must NOT fire again). Prunes expired entries on read.
 */
export function hasPurchaseFired(storage: StorageLike | null, storageKey: string, key: string, now = Date.now()): boolean {
    if (!storage) return false;
    const map = readMap(storage, storageKey, now);
    const seen = typeof map[key] === 'number' && map[key] >= now - PURCHASE_DEDUP_TTL_MS;
    // Persist pruned map so expired entries stop accumulating.
    writeMap(storage, storageKey, map, now);
    return seen;
}

function writeMap(storage: StorageLike, storageKey: string, map: DedupMap, now: number): void {
    // Cap the map, evicting oldest entries first, so growth stays bounded.
    const entries = Object.entries(map).sort((a, b) => a[1] - b[1]);
    if (entries.length > PURCHASE_DEDUP_MAX_ENTRIES) {
        const drop = entries.length - PURCHASE_DEDUP_MAX_ENTRIES;
        const dropped = new Set(entries.slice(0, drop).map(([k]) => k));
        for (const k of dropped) delete map[k];
    }
    try {
        storage.setItem(storageKey, JSON.stringify(map));
    } catch {
        // Storage full/blocked (private browsing) — best effort, ignore.
    }
}

/**
 * Records that the scoped order fired within the TTL window. Returns the
 * storage key used so callers can keep a fallback in sync.
 */
export function markPurchaseFired(storage: StorageLike | null, storageKey: string, key: string, now = Date.now()): void {
    if (!storage) return;
    const map = readMap(storage, storageKey, now);
    map[key] = now;
    writeMap(storage, storageKey, map, now);
}