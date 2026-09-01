import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { initCommerceTracking, trackCommerceEvent } from '.';
import type { TrackingConfig } from './types';

interface Props {
    config: Record<string, any>;
    isPreview?: boolean;
    isOwnerPreview?: boolean;
    children?: ReactNode;
}

/**
 * Bootstraps all configured commerce pixels once per storefront mount and
 * emits the canonical page_view event on every navigation (initial load and
 * Inertia-driven URL changes). Template/owner previews are always excluded:
 * pixels are never loaded and no event is ever fired.
 */
export function CommerceTrackingProvider({ config: configProps, isPreview, isOwnerPreview, children }: Props) {
    const { url } = usePage();

    const disabled = Boolean(isPreview || isOwnerPreview);
    const metaPixelId = configProps.meta_pixel_id || '';
    const tiktokPixelId = configProps.tiktok_pixel_id || '';
    const googleAnalyticsId = configProps.google_analytics_id || '';
    const nonce = (configProps as Record<string, any>).cspNonce as string | undefined;
    const storeSlug = (configProps as Record<string, any>).store_slug as string | undefined;
    const currencyCode = configProps.currency_code || 'ILS';

    useEffect(() => {
        initCommerceTracking({ metaPixelId, tiktokPixelId, googleAnalyticsId, disabled, nonce, currencyCode, storeSlug });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metaPixelId, tiktokPixelId, googleAnalyticsId, disabled, nonce, storeSlug, currencyCode]);

    useEffect(() => {
        trackCommerceEvent('page_view', { url });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return <>{children}</>;
}