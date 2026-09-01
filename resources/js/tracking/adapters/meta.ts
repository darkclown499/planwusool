import type { CommerceEventData, CommerceEventType, TrackingConfig } from '../types';
import { injectExternalScript, injectInlineScript } from '../scripts';

/**
 * Meta (Facebook) Pixel adapter. Uses the official fbevents.js SDK host and
 * the canonical `fbq('init' | 'track')` calls. Events named after the standard
 * Meta events (PageView, ViewContent, Search, AddToCart, InitiateCheckout,
 * Purchase) so existing Meta ad sets keep working unchanged.
 */

declare global {
    interface Window {
        fbq?: any;
        _fbq?: any;
    }
}

let activeId = '';
let cleanup: Array<() => void> = [];

function ensureQueue(): void {
    if (typeof window.fbq === 'function') return;
    const w = window as any;
    w.fbq = function () {
        const fn = w.fbq;
        fn.callMethod ? fn.callMethod.apply(fn, arguments) : fn.queue.push(arguments);
    };
    if (!w._fbq) w._fbq = w.fbq;
    w.fbq.push = w.fbq;
    w.fbq.loaded = true;
    w.fbq.version = '2.0';
    w.fbq.queue = [];
}

function fire(...args: unknown[]): void {
    if (!activeId) return;
    ensureQueue();
    window.fbq?.(...args);
}

export function init(config: TrackingConfig): void {
    const id = (config.metaPixelId || '').trim();
    if (!id) return;
    activeId = id;
    cleanup.forEach((fn) => fn());
    cleanup = [];

    ensureQueue();
    const ext = injectExternalScript('https://connect.facebook.net/en_US/fbevents.js', { 'data-wusool-meta': '1' }, config.nonce);
    cleanup.push(ext.dispose);

    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);
    cleanup.push(() => noscript.remove());

    const inline = injectInlineScript(`fbq('init', ${JSON.stringify(id)});`, config.nonce);
    cleanup.push(inline.dispose);
}

export function track(event: CommerceEventType, data: CommerceEventData, tracking: TrackingConfig): void {
    if (!activeId) return;
    const currency = data.currency || tracking.currencyCode || 'ILS';
    const contents = (data.purchase?.items || [])
        .filter((it) => it.id !== undefined)
        .map((it) => ({ id: String(it.id), quantity: Number(it.quantity || 1), item_price: Number(it.price || 0) }));

    switch (event) {
        case 'page_view':
            fire('track', 'PageView');
            break;
        case 'view_content':
            fire('track', 'ViewContent', {
                content_type: data.content_type || 'product',
                content_ids: data.content_ids || (data.content_id ? [data.content_id] : []),
                content_name: data.content_name,
                value: Number(data.value || 0),
                currency,
                contents: content_list(data),
            });
            break;
        case 'search':
            fire('track', 'Search', { search_string: data.search_term || '' });
            break;
        case 'add_to_cart':
            fire('track', 'AddToCart', {
                content_ids: data.content_ids || (data.content_id ? [data.content_id] : []),
                content_name: data.content_name,
                value: Number(data.value || 0),
                currency,
                contents: content_list(data),
            });
            break;
        case 'begin_checkout':
            fire('track', 'InitiateCheckout', {
                num_items: data.num_items,
                value: Number(data.value || 0),
                currency,
            });
            break;
        case 'purchase':
            if (data.purchase) {
                fire('track', 'Purchase', {
                    value: Number(data.purchase.value || 0),
                    currency: data.purchase.currency || currency,
                    transaction_id: data.purchase.transactionId,
                    contents,
                });
            }
            break;
    }
}

function content_list(data: CommerceEventData): Array<{ id: string; quantity: number; item_price: number }> {
    return (data.content_ids || (data.content_id ? [data.content_id] : []))
        .map((id) => ({ id: String(id), quantity: Number(data.quantity || 1), item_price: Number(data.value || 0) / (data.quantity || 1) }));
}