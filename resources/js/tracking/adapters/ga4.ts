import type { CommerceEventData, CommerceEventType, TrackingConfig } from '../types';
import { injectExternalScript, injectInlineScript } from '../scripts';

/**
 * Google Analytics 4 adapter (gtag.js). `send_page_view: false` on config is
 * deliberate: our provider emits the single canonical page_view per
 * mount/SPA-navigation, so there is exactly one event per URL change.
 */

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

let activeId = '';
let cleanup: Array<() => void> = [];

function ensureDataLayer(): void {
    if (Array.isArray(window.dataLayer)) return;
    window.dataLayer = [];
    window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
    };
}

function fire(...args: unknown[]): void {
    if (!activeId) return;
    ensureDataLayer();
    window.gtag?.(...args);
}

export function init(config: TrackingConfig): void {
    const id = (config.googleAnalyticsId || '').trim();
    if (!id) return;
    activeId = id;
    cleanup.forEach((fn) => fn());
    cleanup = [];

    ensureDataLayer();
    injectExternalScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id), { 'data-wusool-ga4': '1' }, config.nonce);
    const inline = injectInlineScript(
        `function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)},{send_page_view:false});`,
        config.nonce,
    );
    cleanup.push(inline.dispose);
}

function items(data: CommerceEventData): Array<Record<string, unknown>> {
    return (data.purchase?.items || (data.content_ids || (data.content_id ? [data.content_id] : [])).map((id) => ({ id: String(id) })))
        .filter((it) => it.id !== undefined || it.name !== undefined)
        .map((it: any, index: number) => ({
            item_id: String(it.id ?? it.product_id ?? ''),
            item_name: it.name || data.content_name || '',
            quantity: Number(it.quantity ?? data.quantity ?? 1),
            price: Number(it.price ?? 0),
            index,
        }));
}

export function track(event: CommerceEventType, data: CommerceEventData, tracking: TrackingConfig): void {
    if (!activeId) return;
    const currency = data.currency || tracking.currencyCode || 'ILS';

    switch (event) {
        case 'page_view':
            fire('event', 'page_view', {
                page_location: typeof window !== 'undefined' ? window.location.href : '',
                page_title: typeof document !== 'undefined' ? document.title : '',
            });
            break;
        case 'view_content':
            fire('event', 'view_item', {
                value: Number(data.value || 0),
                currency,
                items: items(data),
            });
            break;
        case 'search':
            fire('event', 'search', { search_term: data.search_term || '' });
            break;
        case 'add_to_cart':
            fire('event', 'add_to_cart', {
                value: Number(data.value || 0),
                currency,
                items: items(data),
            });
            break;
        case 'begin_checkout':
            fire('event', 'begin_checkout', {
                value: Number(data.value || 0),
                currency,
                items: items(data),
            });
            break;
        case 'purchase':
            if (data.purchase) {
                fire('event', 'purchase', {
                    transaction_id: data.purchase.transactionId,
                    value: Number(data.purchase.value || 0),
                    currency: data.purchase.currency || currency,
                    items: items(data),
                });
            }
            break;
    }
}