import { route } from 'ziggy-js';
import type { CommerceEventData, CommerceEventType, TrackingConfig } from './types';
import * as meta from './adapters/meta';
import * as tiktok from './adapters/tiktok';
import * as ga4 from './adapters/ga4';
import {
    hasPurchaseFired,
    markPurchaseFired,
    dedupKey,
} from './dedup';

/**
 * Social Commerce tracking singleton.
 *
 * - `initCommerceTracking` bootstraps whichever pixels the store configured;
 *   it is a no-op in preview/owner-preview modes.
 * - `trackCommerceEvent` fans every canonical event out to all active
 *   providers.
 * - `trackPurchase` is idempotent per logical order: the same success may be
 *   observed through the in-app success modal AND the standalone invoice
 *   (including a new tab or a later session). A durable, store+order-scoped
 *   localStorage breadcrumb (bounded: 30-day TTL, capped entry list) guarantees
 *   exactly one purchase event per browser/profile. sessionStorage is used only
 *   as a fallback when localStorage is unavailable.
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

function purchaseAlreadyFired(orderNumber: string): boolean {
    const key = dedupKey(config.storeSlug || '', orderNumber);
    return (
        hasPurchaseFired(durableStorage(), PURCHASE_STORAGE_KEY, key) ||
        hasPurchaseFired(fallbackStorage(), PURCHASE_STORAGE_KEY, key)
    );
}

function recordPurchaseFired(orderNumber: string): void {
    const key = dedupKey(config.storeSlug || '', orderNumber);
    const now = Date.now();
    markPurchaseFired(durableStorage(), PURCHASE_STORAGE_KEY, key, now);
    markPurchaseFired(fallbackStorage(), PURCHASE_STORAGE_KEY, key, now);
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

    if (purchaseAlreadyFired(orderNumber)) return;
    // Mark before the async fetch so a concurrent duplicate (reload/new tab)
    // cannot slip through while the order payload is being resolved.
    recordPurchaseFired(orderNumber);

    const payload = await fetchOrderPayload(orderNumber);

    const items = (payload?.items || []).map((item) => ({
        id: item.id ?? item.product_id,
        name: item.name,
        quantity: Number(item.quantity ?? 1),
        price: Number(item.price ?? 0),
    }));

    const value =
        payload && payload.total !== undefined
            ? Number(payload.total)
            : typeof optimisticTotal === 'number' && Number.isFinite(optimisticTotal)
              ? optimisticTotal
              : 0;

    trackCommerceEvent('purchase', {
        purchase: {
            transactionId: String(payload?.order_number || orderNumber),
            value,
            currency: String(payload?.currency_code || config.currencyCode || 'ILS'),
            items,
        },
    });
}