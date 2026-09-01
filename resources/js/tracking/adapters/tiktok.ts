import type { CommerceEventData, CommerceEventType, TrackingConfig } from '../types';
import { injectExternalScript, injectInlineScript } from '../scripts';

/**
 * TikTok Pixel adapter. Uses the official events.js SDK host and the standard
 * `ttq.load` / `ttq.page` / `ttq.track` queue, so events pushed before the SDK
 * fully loads are processed once available.
 */

declare global {
    interface Window {
        ttq?: any;
    }
}

const TTQ_LOADER = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)));}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript";n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;var o=d.getElementsByTagName("script")[0];o.parentNode.insertBefore(n,o);};}(window,document,'ttq');`;

let activeId = '';
let cleanup: Array<() => void> = [];

export function init(config: TrackingConfig): void {
    const id = (config.tiktokPixelId || '').trim();
    if (!id) return;
    activeId = id;
    cleanup.forEach((fn) => fn());
    cleanup = [];

    injectExternalScript('https://analytics.tiktok.com/i18n/pixel/events.js', { 'data-wusool-tiktok': '1' }, config.nonce);
    const inline = injectInlineScript(`${TTQ_LOADER}ttq.load(${JSON.stringify(id)});`, config.nonce);
    cleanup.push(inline.dispose);
}

function fire(...args: unknown[]): void {
    if (!activeId) return;
    window.ttq?.[args[0] as string]?.(...(args.slice(1) as []));
}

export function track(event: CommerceEventType, data: CommerceEventData, tracking: TrackingConfig): void {
    if (!activeId) return;
    const currency = data.currency || tracking.currencyCode || 'ILS';

    switch (event) {
        case 'page_view':
            fire('page');
            break;
        case 'view_content':
            fire('track', 'ViewContent', {
                content_id: data.content_ids?.[0] || data.content_id || '',
                content_type: data.content_type || 'product',
                content_name: data.content_name,
                quantity: Number(data.quantity || 1),
                value: Number(data.value || 0),
                currency,
            });
            break;
        case 'search':
            fire('track', 'Search', { query: data.search_term || '' });
            break;
        case 'add_to_cart':
            fire('track', 'AddToCart', {
                content_id: data.content_ids?.[0] || data.content_id || '',
                content_type: data.content_type || 'product',
                content_name: data.content_name,
                quantity: Number(data.quantity || 1),
                value: Number(data.value || 0),
                currency,
            });
            break;
        case 'begin_checkout':
            fire('track', 'InitiateCheckout', {
                value: Number(data.value || 0),
                currency,
            });
            break;
        case 'purchase':
            if (data.purchase) {
                fire('track', 'CompletePayment', {
                    value: Number(data.purchase.value || 0),
                    currency: data.purchase.currency || currency,
                    transaction_id: data.purchase.transactionId,
                });
            }
            break;
    }
}