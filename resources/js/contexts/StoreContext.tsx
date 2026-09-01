import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { getImageUrl } from '../utils/image-helper';

interface StoreConfig {
    storeName: string;
    logo?: string;
    favicon?: string;
    phoneNumber: string;
    currency: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    email?: string;
    description?: string;
    copyrightText?: string;
    welcomeMessage?: string;
    meta_title?: string;
    meta_description?: string;
    google_analytics_id?: string;
    meta_pixel_id?: string;
    tiktok_pixel_id?: string;
    snapchat_pixel_id?: string;
    gtm_id?: string;
    whatsapp_widget_enabled?: boolean;
    whatsapp_widget_phone?: string;
    whatsapp_widget_message?: string;
    whatsapp_widget_position?: string;
    whatsapp_widget_show_on_mobile?: boolean;
    whatsapp_widget_show_on_desktop?: boolean;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
        whatsapp?: string;
        email?: string;
    };
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
    };
}

interface Store {
    id: string | number;
    name: string;
    slug: string;
    email?: string;
    logo?: string;
    description?: string;
    theme?: string;
    custom_css?: string;
    custom_javascript?: string;
    custom_head_scripts?: string;
    custom_body_scripts?: string;
}

interface StoreContextType {
    config: StoreConfig;
    store: Store;
    content?: any;
    behavior?: {
        enable_customer_login?: boolean;
        enable_customer_registration?: boolean;
        customer_registration_enabled?: boolean;
        require_login_checkout?: boolean;
        show_whatsapp_order_button?: boolean;
        show_search?: boolean;
        show_cart?: boolean;
        show_auth_button?: boolean;
        customer_accounts_enabled?: boolean;
        guest_checkout?: boolean;
        customer_verification_method?: 'none' | 'email';
    };
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
    children: ReactNode;
    config: StoreConfig;
    store: Store;
    content?: any;
    behavior?: StoreContextType['behavior'];
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children, config, store, content, behavior }) => {
    // Set dynamic favicon with cache-buster — updates whenever favicon changes
    useEffect(() => {
        const rawFavicon = config.favicon || (store as any)?.favicon || '';
        const existingLinks = document.querySelectorAll('link[rel*="icon"]');

        if (!rawFavicon) {
            // No favicon configured — ensure default is not stale (optional: keep existing)
            return;
        }

        const baseUrl = getImageUrl(rawFavicon);
        const timestamp = (store as any)?.updated_at ? new Date((store as any).updated_at).getTime() : Date.now();
        const separator = baseUrl.includes('?') ? '&' : '?';
        const hrefWithCacheBuster = `${baseUrl}${separator}v=${timestamp}`;

        // Update or create favicon links with cache-buster
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/png';
            document.head.appendChild(favicon);
        }
        favicon.href = hrefWithCacheBuster;

        // Also update apple-touch-icon for iOS
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            document.head.appendChild(appleIcon);
        }
        appleIcon.href = hrefWithCacheBuster;

        // Force browser to reload by temporarily removing and re-adding (helps WebKit)
        // Also update any existing icon links to use the new href
        existingLinks.forEach((link) => {
            if (link !== favicon && link !== appleIcon) {
                (link as HTMLLinkElement).href = hrefWithCacheBuster;
            }
        });
    }, [config.favicon, (store as any)?.favicon, (store as any)?.updated_at]);

    // Inject the store's SEO meta description once on mount.
    // Tracking scripts are handled exclusively by the centralized tracking layer
    // (tracking/CommerceTrackingProvider) — this legacy injection was removed to
    // guarantee single-loading, plan gating and CSP-nonce compliance.
    useEffect(() => {
        if (config.meta_description && config.meta_description.trim()) {
            let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = config.meta_description;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.meta_description]);

    const value: StoreContextType = {
        config,
        store,
        content,
        behavior,
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
