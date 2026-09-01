/**
 * Social Commerce tracking — shared canonical event model for every Wusool
 * template. One internal event shape is translated to Meta Pixel, TikTok
 * Pixel and GA4 by the adapters in this module.
 */

export type CommerceEventType =
    | 'page_view'
    | 'view_content'
    | 'search'
    | 'add_to_cart'
    | 'begin_checkout'
    | 'purchase';

export interface PurchaseItem {
    id?: string | number;
    name?: string;
    quantity?: number;
    price?: number;
}

export interface PurchaseData {
    transactionId: string;
    value: number;
    currency: string;
    items?: PurchaseItem[];
}

export interface CommerceEventData {
    url?: string;
    content_type?: string;
    content_ids?: string[];
    content_id?: string;
    content_name?: string;
    quantity?: number;
    value?: number;
    currency?: string;
    search_term?: string;
    num_items?: number;
    purchase?: PurchaseData;
}

export interface TrackingConfig {
    googleAnalyticsId?: string;
    metaPixelId?: string;
    tiktokPixelId?: string;
    /** True in template/owner preview modes — no pixels are ever loaded or fired. */
    disabled?: boolean;
    /** Shared CSP nonce for inline init scripts (from HandleInertiaRequests). */
    nonce?: string;
    /** Store subdomain used to scope the session order lookup for Purchase payloads. */
    storeSlug?: string;
    currencyCode?: string;
}