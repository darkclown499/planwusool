import { route } from 'ziggy-js';
import type { CommerceEventData, CommerceEventType, TrackingConfig } from './types';
import * as meta from './adapters/meta';
import * as tiktok from './adapters/tiktok';
import * as ga4 from './adapters/ga4';
import {
    beginPurchase,
    markPurchaseSent,
    clearPurchasePending,
    dedupKey,
} from './dedup';

/**
 * Social Commerce tracking singleton.
 *
 * - `initCommerceTracking` bootstraps whichever pixels the store configured;
 *   it is a no-op in preview/owner-preview modes.
 * - `trackCommerceEvent` fans every canonical event out to all active
 *   providers.
 * - `trackPurchase` is idempotent per logical order using a pending→sent state
 *   machine backed by a durable, store+order-scoped localStorage breadcrumb.
 *   A purchase is claimed as `pending` (short TTL) before the canonical order
 *   fetch, and only promoted to `sent` (30-day TTL) AFTER the configured
 *   provider adapters were invoked without a local exception. A failed payload
 *   fetch clears the pending claim so a reload/revisit can retry — a purchase
 *   is never permanently suppressed before it actually dispatches. sessionStorage
 *   mirrors localStorage only as a fallback when localStorage is unavailable.
 *
 * This is attribution for a successfully created order — it is NOT
 * collected-revenue reporting (see marketing page docs).
 *
 * CONSENT GATING = DEFERRED / PLATFORM PRIVACY GAP: these pixels load and fire
 * without visitor consent gating. Wusool's cookie-consent banner
 * (CookieConsentBanner) is scoped to the merchant app shell — it is NOT a
 * storefront tracking CMP and does not gate pixel loading. No privacy
 * compliance is claimed until a storefront consent system gates these scripts.
 */

let config: TrackingConfig = {};
let initialized = false;

const PURCHASE_STORAGE_KEY = 'wusool_tracking_purchases';

/** localStorage is shared across tabs/sessions — the durable dedup store. */
function durableStorage(): Storage | null {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

/** sessionStorage fallback for environments that block localStorage. */
function fallbackStorage(): Storage | null {
    try {
        return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    } catch {
        return null;
    }
}

function withProviders(fn: (disabled: boolean) => void): void {
    if (!initialized || config.disabled) return;
    fn(true);
}

export function initCommerceTracking(next: TrackingConfig): void {
    config = { ...next };

    if (config.disabled) {
        return;
    }

    meta.init(config);
    tiktok.init(config);
    ga4.init(config);
    initialized = true;
}

export function trackCommerceEvent(event: CommerceEventType, data: CommerceEventData = {}): void {
    withProviders(() => {
        meta.track(event, data, config);
        tiktok.track(event, data, config);
        ga4.track(event, data, config);
    });
}

/**
 * Claims the purchase slot. Returns true when this caller should proceed.
 * Mirrors the state onto both durable and fallback storage; a claim that is
 * blocked in either counts as blocked for the order.
 */
function tryBeginPurchase(orderNumber: string): boolean {
    const key = dedupKey(config.storeSlug || '', orderNumber);
    const now = Date.now();
    const durable = beginPurchase(durableStorage(), PURCHASE_STORAGE_KEY, key, now);
    const fallback = beginPurchase(fallbackStorage(), PURCHASE_STORAGE_KEY, key, now);
    return durable && fallback;
}

/** Promotes pending → sent after successful dispatch. */
function recordPurchaseSent(orderNumber: string): void {
    const key = dedupKey(config.storeSlug || '', orderNumber);
    const now = Date.now();
    markPurchaseSent(durableStorage(), PURCHASE_STORAGE_KEY, key, now);
    markPurchaseSent(fallbackStorage(), PURCHASE_STORAGE_KEY, key, now);
}

/** Drops the pending claim so a failed fetch can be retried later. */
function retractPurchasePending(orderNumber: string): void {
    const key = dedupKey(config.storeSlug || '', orderNumber);
    const now = Date.now();
    clearPurchasePending(durableStorage(), PURCHASE_STORAGE_KEY, key, now);
    clearPurchasePending(fallbackStorage(), PURCHASE_STORAGE_KEY, key, now);
}

/** True when at least one advertising provider is configured to receive events. */
function hasConfiguredProvider(): boolean {
    return Boolean(
        config.metaPixelId?.trim() ||
            config.tiktokPixelId?.trim() ||
            config.googleAnalyticsId?.trim(),
    );
}

interface OrderItem {
    id?: string | number;
    product_id?: string | number;
    name?: string;
    price?: string | number;
    quantity?: string | number;
}

interface OrderPayload {
    order_number?: string;
    total?: string | number;
    currency_code?: string;
    items?: OrderItem[];
}

async function fetchOrderPayload(orderNumber: string): Promise<OrderPayload | null> {
    try {
        const hour = window.location.hostname.split('.')[0];
        const storeSlug = config.storeSlug || hour;
        const url = route('api.orders.show', { orderNumber });
        const response = await fetch(`${url}?store_slug=${encodeURIComponent(storeSlug)}`, {
            headers: { Accept: 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) return null;
        const body = await response.json();
        return body?.data?.order ?? (body as OrderPayload);
    } catch {
        return null;
    }
}

export async function trackPurchase(orderNumber: string, optimisticTotal?: number): Promise<void> {
    if (!initialized || config.disabled || !orderNumber) return;

    // Claim the slot (pending, short TTL). Blocked by an active `sent` (already
    // attributed) or a recent concurrent `pending` (another tab in flight).
    if (!tryBeginPurchase(orderNumber)) return;

    // Resolve the canonical order payload. On failure, retract the pending claim
    // so a subsequent reload/revisit can retry — never permanently suppressed
    // just because the network failed.
    const payload = await fetchOrderPayload(orderNumber);
    if (!payload) {
        retractPurchasePending(orderNumber);
        return;
    }

    const items = (payload.items || []).map((item) => ({
        id: item.id ?? item.product_id,
        name: item.name,
        quantity: Number(item.quantity ?? 1),
        price: Number(item.price ?? 0),
    }));

    const value =
        payload.total !== undefined
            ? Number(payload.total)
            : typeof optimisticTotal === 'number' && Number.isFinite(optimisticTotal)
              ? optimisticTotal
              : 0;

    // Dispatch to configured providers. For browser SDKs "sent" = the adapter
    // event calls were invoked without a local exception after canonical order
    // data was resolved; we do not wait for remote acknowledgement they provide.
    trackCommerceEvent('purchase', {
        purchase: {
            transactionId: String(payload.order_number || orderNumber),
            value,
            currency: String(payload.currency_code || config.currencyCode || 'ILS'),
            items,
        },
    });

    // Only promote to `sent` when at least one provider is actually configured
    // and the dispatch path completed without throwing. A store with no pixels
    // is never permanently marked — nothing was actually sent.
    if (hasConfiguredProvider()) {
        recordPurchaseSent(orderNumber);
    } else {
        retractPurchasePending(orderNumber);
    }
}