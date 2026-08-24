import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';

interface StoreHeadProps {
  store: any;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultKeywords?: string;
  products?: any[];
}

export default function StoreHead({ store, defaultTitle, defaultDescription, defaultKeywords, products = [] }: StoreHeadProps) {
  const title = store?.seo_title || store?.meta_title || store?.name || defaultTitle || 'Wusool Store';
  const description = store?.seo_description || store?.meta_description || defaultDescription || store?.description || '';
  const keywords = store?.seo_keywords || store?.meta_keywords || defaultKeywords || '';
  const rawOgImage = store?.seo_image || store?.og_image || '';
  const ogImage = rawOgImage
    ? (rawOgImage.startsWith('http') ? rawOgImage : `${window.location.origin}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`)
    : '';

  useEffect(() => {
    // Name the browser tab after the store (seo_title, then store name) so tabs
    // never fall back to the app name or a generic template label.
    document.title = title;
  }, [title]);

  useEffect(() => {
    // Inject ItemList + Product rich-structure data for the visible store products,
    // enabling product rich results in Google (price/availability snippets).
    const existing = document.getElementById('store-itemlist-schema');
    if (existing) existing.remove();

    if (!products || products.length === 0) return;

    const baseUrl = window.location.origin;
    const items = products.slice(0, 60).map((p: any, i: number) => {
      const price = Number(p.price) || 0;
      const slug = p.slug || p.id;
      const img = p.image_url || p.image || null;
      const item: Record<string, any> = {
        '@type': 'Product',
        position: i + 1,
        name: p.name || `Product ${slug}`,
        url: `${baseUrl}/product/${slug}`,
        image: img,
        offers: {
          '@type': 'Offer',
          priceCurrency: p.currency || store?.currency_code || 'USD',
          price: price.toFixed(2),
          availability: p.stock_status === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        },
      };
      if (p.short_description) item.description = p.short_description;
      return item;
    });

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: title,
      itemListElement: items,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'store-itemlist-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById('store-itemlist-schema')?.remove();
    };
  }, [products, title, store?.currency_code]);

  useEffect(() => {
    // Store (Organization) schema so search engines can attach the merchant
    // identity — name, logo, contact — to every storefront page.
    const existing = document.getElementById('store-org-schema');
    if (existing) existing.remove();

    if (!store?.name) return;

    const baseUrl = window.location.origin;
    const org: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: store.name,
      url: store.store_url || baseUrl,
    };
    if (store.logo) org.logo = `${baseUrl}${String(store.logo).startsWith('/') ? '' : '/'}${store.logo}`;
    if (description) org.description = description;
    const phone = store.phone || store.whatsapp_number;
    if (phone) org.telephone = String(phone).replace(/[^0-9+]/g, '');
    if (store.city || store.country) {
      org.address = { '@type': 'PostalAddress', addressLocality: store.city || undefined, addressCountry: store.country || undefined };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'store-org-schema';
    script.textContent = JSON.stringify(org);
    document.head.appendChild(script);

    return () => {
      document.getElementById('store-org-schema')?.remove();
    };
  }, [store?.name, store?.logo, store?.phone, store?.city, store?.country, store?.store_url, store?.whatsapp_number, description]);

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={window.location.href} />
      <meta property="og:site_name" content={store?.name || title} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content="website" />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
    </Head>
  );
}