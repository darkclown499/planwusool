import { route } from 'ziggy-js';
import type { CommerceEventData, CommerceEventType, TrackingConfig } from './types';
import * as meta from './adapters/meta';
import * as tiktok from './adapters/tiktok';
import * as ga4 from './adapters/ga4';

/**
 * Social Commerce tracking singleton.
 *
 * - `initCommerceTracking` bootstraps whichever pixels the store configured;
 *   it is a no-op in preview/owner-preview modes.
 * - `trackCommerceEvent` fans every canonical event out to all active
 *   providers.
 * - `trackPurchase` is idempotent per order number: the same success may be
 *   observed twice (in-app success dispatch + returning from an external
 *   payment URL), so a sessionStorage breadcrumb guarantees exactly one
 *   purchase event. This is attribution for a successfully created order — it
 *   is NOT collected-revenue reporting (see marketing page docs).
 */

let config: TrackingConfig = {};
let initialized = false;

const PURCHASE_DEDUP_KEY = 'wusool_tracking_purchases';

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

function hasPurchaseFired(orderNumber: string): boolean {
    try {
        const stored: string[] = JSON.parse(sessionStorage.getItem(PURCHASE_DEDUP_KEY) || '[]');
        return stored.includes(orderNumber);
    } catch {
        return false;
    }
}

function markPurchaseFired(orderNumber: string): void {
    try {
        const stored: string[] = JSON.parse(sessionStorage.getItem(PURCHASE_DEDUP_KEY) || '[]');
        stored.push(orderNumber);
        sessionStorage.setItem(PURCHASE_DEDUP_KEY, JSON.stringify(stored));
    } catch {
        // sessionStorage unavailable (private browsing / storage blocked) — best effort.
    }
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

    if (hasPurchaseFired(orderNumber)) return;
    markPurchaseFired(orderNumber);

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