import { useEffect } from 'react';

interface PWAMetaTagsProps {
  store: {
    pwa: {
      name: string;
      short_name: string;
      description: string;
      theme_color: string;
      background_color: string;
      manifest_url: string;
    };
    favicon?: string;
  };
}

export default function PWAMetaTags({ store }: PWAMetaTagsProps) {
  useEffect(() => {
    if (!store?.pwa) return;

    const addMetaTag = (name: string, content: string) => {
      const existing = document.querySelector(`meta[name="${name}"]`);
      if (existing) {
        existing.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    const addLinkTag = (rel: string, href: string, type?: string) => {
      const existing = document.querySelector(`link[rel="${rel}"]`);
      if (existing) {
        existing.setAttribute('href', href);
      } else {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        if (type) link.type = type;
        document.head.appendChild(link);
      }
    };

    // PWA meta tags
    addMetaTag('application-name', store.pwa.name);
    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', store.pwa.short_name);
    addMetaTag('description', store.pwa.description);
    addMetaTag('theme-color', store.pwa.theme_color);
    addMetaTag('msapplication-TileColor', store.pwa.theme_color);

    // Manifest link
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) existingManifest.remove();
    addLinkTag('manifest', store.pwa.manifest_url, 'application/manifest+json');

    // Apple touch icons
    if (store.favicon) {
      addLinkTag('apple-touch-icon', store.favicon);
      addLinkTag('icon', store.favicon, 'image/png');
    }
  }, [store?.pwa, store?.favicon]);

  return null;
}