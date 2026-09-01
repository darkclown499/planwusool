/**
 * Social Commerce — purchase deduplication (pending/sent state machine).
 *
 * Rule: ONE logical Wusool order must produce at most ONE browser `purchase`
 * attribution per browser/profile under normal navigation, reload and invoice
 * behaviour.
 *
 * A key moves through two states, stored as `{ status, t }`:
 *
 *   pending — a purchase is in flight (payload fetch → adapter dispatch).
 *             Has a SHORT TTL so a failed payload fetch can be retried and a
 *             concurrent tab is protected only while the attempt is live.
 *   sent    — the configured provider adapters were successfully invoked after
 *             canonical order data resolved. Region TTL (30 days) so an order
 *             only fires once per browser/profile.
 *
 * Transitions:
 *   beginPurchase(...)
 *     - if state is active `sent`            → BLOCK (false)
 *     - if state is active `pending`         → BLOCK (false, concurrent tab)
 *     - if stale `pending` / expired `sent`  → allowed; writes fresh `pending`
 *     - otherwise                            → writes `pending`, returns true
 *   markPurchaseSent(...)  pending → sent
 *   clearPurchasePending() pending → (removed) so the next visit can retry
 *
 * This prevents the lost-attribution failure where a key is permanently marked
 * BEFORE the fetch: here a failed payload fetch (or a no-provider store) leaves
 * no permanent `sent` state, so a refresh/revisit can retry.
 *
 * The dedup key is `${storeSlug}:${orderNumber}` — store + order identity — so:
 *   - two different stores sharing the same order number never collide;
 *   - two different orders always fire independently;
 *   - the same order fires once across success-modal → invoice → reload.
 *
 * localStorage read/write is synchronous; the immediate pending claim gives
 * best-effort cross-tab protection (mitigates, does not fully serialize,
 * multi-process races). This is acceptable for browser-first attribution.
 *
 * This module is intentionally pure (no window/DOM imports) so the semantics
 * can be unit-tested standalone (see tests/js/tracking/dedup.test.mjs).
 *
 * This is attribution for a successfully created order — it is NOT
 * collected-revenue reporting.
 */

/** Cap on stored entries so the map never grows unbounded. */
export const PURCHASE_DEDUP_MAX_ENTRIES = 2000;

/** Short window while a purchase attempt is in flight (protects concurrency). */
export const PURCHASE_PENDING_TTL_MS = 120 * 1000; // 120 seconds

/** Long window once a purchase is confirmed sent (per browser/profile). */
export const PURCHASE_SENT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Minimal storage surface so both localStorage and sessionStorage can back it. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export type PurchaseState = 'pending' | 'sent';

interface DedupRecord {
    s: PurchaseState;
    t: number;
}

type DedupMap = Record<string, DedupRecord>;

/** Store + order scoped dedup key (fallback store tag if slug is missing). */
export function dedupKey(storeSlug: string, orderNumber: string): string {
    return `${storeSlug || 'anonymous'}:${orderNumber}`;
}

function parseRecord(value: unknown): DedupRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const rec = value as Partial<DedupRecord>;
    if ((rec.s === 'pending' || rec.s === 'sent') && typeof rec.t === 'number') {
        return { s: rec.s, t: rec.t };
    }
    return null;
}

/**
 * Reads and prunes the map. Only live entries survive: `sent` within
 * SENT TTL, `pending` within PENDING TTL.
 */
function readMap(storage: StorageLike, storageKey: string, now: number): DedupMap {
    try {
        const raw = storage.getItem(storageKey);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

        const map: DedupMap = {};
        for (const [key, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
            const rec = parseRecord(rawValue);
            if (!rec) continue;
            const ttl = rec.s === 'sent' ? PURCHASE_SENT_TTL_MS : PURCHASE_PENDING_TTL_MS;
            if (rec.t >= now - ttl) {
                map[key] = rec;
            }
        }
        return map;
    } catch {
        // Corrupt or blocked storage — treat as empty (best effort, no throw).
        return {};
    }
}

function persistMap(storage: StorageLike, storageKey: string, map: DedupMap, now: number): void {
    // Cap the map, evicting oldest entries first, so growth stays bounded.
    const entries = Object.entries(map).sort((a, b) => a[1].t - b[1].t);
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
 * Claims the purchase slot. Returns `true` when this caller should proceed
 * (writing a fresh `pending`); returns `false` when blocked by an active
 * `sent` or a recent concurrent `pending`. Stale `pending` (expired short TTL)
 * and expired `sent` allow a retry / fresh window. Whichever branch is taken,
 * the pruned map is persisted so expired entries stop accumulating.
 */
export function beginPurchase(storage: StorageLike | null, storageKey: string, key: string, now = Date.now()): boolean {
    if (!storage) return true;
    const map = readMap(storage, storageKey, now);
    const current = map[key];

    // Active sent → already attributed, do not fire again (but persist pruning).
    if (current?.s === 'sent') {
        persistMap(storage, storageKey, map, now);
        return false;
    }
    // Active (recent) pending → another tab is already mid-flight.
    if (current?.s === 'pending') {
        persistMap(storage, storageKey, map, now);
        return false;
    }

    // Stale pending or expired sent (or absent) → claim with a fresh pending.
    map[key] = { s: 'pending', t: now };
    persistMap(storage, storageKey, map, now);
    return true;
}

/** Confirms the purchase was dispatched: pending → sent (30-day TTL). */
export function markPurchaseSent(storage: StorageLike | null, storageKey: string, key: string, now = Date.now()): void {
    if (!storage) return;
    const map = readMap(storage, storageKey, now);
    map[key] = { s: 'sent', t: now };
    persistMap(storage, storageKey, map, now);
}

/** Drops a pending claim so a failed payload fetch can be retried later. */
export function clearPurchasePending(storage: StorageLike | null, storageKey: string, key: string, now = Date.now()): void {
    if (!storage) return;
    const map = readMap(storage, storageKey, now);
    if (map[key]?.s === 'pending') {
        delete map[key];
        persistMap(storage, storageKey, map, now);
    }
}