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
        require_login_checkout?: boolean;
        show_whatsapp_order_button?: boolean;
        show_search?: boolean;
        show_cart?: boolean;
        show_auth_button?: boolean;
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
    // Set dynamic favicon once on mount
    useEffect(() => {
        if (config.favicon) {
            let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                favicon.type = 'image/x-icon';
                document.head.appendChild(favicon);
            }

            favicon.href = getImageUrl(config.favicon);
        }
    }, [config.favicon]);

    // Inject SEO meta tags and tracking scripts once on mount
    useEffect(() => {
        const injectedIds: string[] = [];

        // Meta description
        if (config.meta_description && config.meta_description.trim()) {
            let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = config.meta_description;
            injectedIds.push('meta-description');
        }

        // Google Analytics 4
        if (config.google_analytics_id && config.google_analytics_id.trim()) {
            const gaId = config.google_analytics_id.trim();
            const gaIdAttr = 'data-store-ga';
            if (!document.querySelector(`script[${gaIdAttr}]`)) {
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
                script.setAttribute(gaIdAttr, 'true');
                document.head.appendChild(script);

                const inline = document.createElement('script');
                inline.textContent = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId.replace(/'/g, "\\'")}');`;
                document.head.appendChild(inline);
            }
            injectedIds.push('store-ga');
        }

        // Meta Pixel
        if (config.meta_pixel_id && config.meta_pixel_id.trim()) {
            const pixelId = config.meta_pixel_id.trim();
            const pixelAttr = 'data-store-pixel';
            if (!document.querySelector(`script[${pixelAttr}]`)) {
                const noscript = document.createElement('noscript');
                const img = document.createElement('img');
                img.height = 1;
                img.width = 1;
                img.style.display = 'none';
                img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;
                noscript.appendChild(img);
                document.body.appendChild(noscript);

                const inline = document.createElement('script');
                inline.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelId.replace(/'/g, "\\'")}');fbq('track', 'PageView');`;
                inline.setAttribute(pixelAttr, 'true');
                document.head.appendChild(inline);
            }
            injectedIds.push('store-pixel');
        }

        // TikTok Pixel
        if (config.tiktok_pixel_id && config.tiktok_pixel_id.trim()) {
            const ttId = config.tiktok_pixel_id.trim();
            const ttAttr = 'data-store-tt';
            if (!document.querySelector(`script[${ttAttr}]`)) {
                const inline = document.createElement('script');
                inline.textContent = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)));}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;var o=document.getElementsByTagName("script")[0];o.parentNode.insertBefore(n,o);};ttq.load('${ttId.replace(/'/g, "\\'")}');ttq.page();}(window,document,'ttq');`;
                inline.setAttribute(ttAttr, 'true');
                document.head.appendChild(inline);
            }
            injectedIds.push('store-tt');
        }

        // Snapchat Pixel
        if (config.snapchat_pixel_id && config.snapchat_pixel_id.trim()) {
            const scId = config.snapchat_pixel_id.trim();
            const scAttr = 'data-store-sc';
            if (!document.querySelector(`script[${scAttr}]`)) {
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://sc-static.net/scevent.min.js';
                script.setAttribute(scAttr, 'true');
                document.head.appendChild(script);

                const inline = document.createElement('script');
                inline.textContent = `!function(e,t,n,s,u){e.snaptr=function(){e.snaptr.q.push(arguments)};e.snaptr.q=[];s=t.createElement("script");s.async=!0;s.src=u;n=t.getElementsByTagName("script")[0];n.parentNode.insertBefore(s,n)}(window,document,'script','script','https://sc-static.net/scevent.min.js');snaptr('init','${scId.replace(/'/g, "\\'")}');snaptr('track','PAGE_VIEW');`;
                inline.setAttribute(scAttr, 'true');
                document.head.appendChild(inline);
            }
            injectedIds.push('store-sc');
        }

        // Google Tag Manager
        if (config.gtm_id && config.gtm_id.trim()) {
            const gtmId = config.gtm_id.trim();
            const gtmAttr = 'data-store-gtm';
            if (!document.querySelector(`script[${gtmAttr}]`)) {
                const inline = document.createElement('script');
                inline.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId.replace(/'/g, "\\'")}');`;
                inline.setAttribute(gtmAttr, 'true');
                document.head.appendChild(inline);
            }
            injectedIds.push('store-gtm');
        }

        return () => {
            if (injectedIds.includes('store-ga')) {
                document.querySelectorAll('script[data-store-ga]').forEach((el) => el.remove());
            }
            if (injectedIds.includes('store-pixel')) {
                document.querySelectorAll('script[data-store-pixel]').forEach((el) => el.remove());
            }
            if (injectedIds.includes('store-tt')) {
                document.querySelectorAll('script[data-store-tt]').forEach((el) => el.remove());
            }
            if (injectedIds.includes('store-sc')) {
                document.querySelectorAll('script[data-store-sc]').forEach((el) => el.remove());
            }
            if (injectedIds.includes('store-gtm')) {
                document.querySelectorAll('script[data-store-gtm]').forEach((el) => el.remove());
            }
        };
    }, [config.meta_description, config.google_analytics_id, config.meta_pixel_id, config.tiktok_pixel_id, config.snapchat_pixel_id, config.gtm_id]);

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
