import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';

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

  // Dynamic favicon with cache-buster — forces browser to reload when store favicon changes
  const faviconHref = (() => {
    const rawFavicon = store?.favicon || (store as any)?.config?.favicon || '';
    if (!rawFavicon) return '/images/logos/favicon.png';
    const baseUrl = rawFavicon.startsWith('http') || rawFavicon.startsWith('/') ? rawFavicon : `/${rawFavicon}`;
    // Use getImageUrl to handle relative storage paths
    const resolved = baseUrl.startsWith('http') ? baseUrl : getImageUrl(baseUrl);
    const timestamp = store?.updated_at ? new Date(store.updated_at).getTime() : Date.now();
    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}v=${timestamp}`;
  })();

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

      // aggregateRating is only emitted for real verified reviews — a 0/empty
      // aggregate is never exposed to search engines.
      const reviewCount = Number(p.reviewCount ?? p.review_count ?? 0);
      const averageRating = Number(p.averageRating ?? p.average_rating ?? 0);
      if (reviewCount > 0 && averageRating > 0) {
        item.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: averageRating.toFixed(1),
          bestRating: 5,
          reviewCount,
        };
      }

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

  useEffect(() => {
    // BreadcrumbList schema for the store homepage
    const existing = document.getElementById('store-breadcrumb-schema');
    if (existing) existing.remove();

    if (!store?.name) return;

    const baseUrl = window.location.origin;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: store.name,
          item: store.store_url || baseUrl,
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'store-breadcrumb-schema';
    script.textContent = JSON.stringify(breadcrumb);
    document.head.appendChild(script);

    return () => {
      document.getElementById('store-breadcrumb-schema')?.remove();
    };
  }, [store?.name, store?.store_url]);

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={window.location.href} />
      <link rel="icon" type="image/png" href={faviconHref} />
      <link rel="apple-touch-icon" href={faviconHref} />
      <meta property="og:site_name" content={store?.name || title} />
      <meta property="og:title" content={title} />
      <meta property="og:url" content={window.location.href} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content="website" />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
    </Head>
  );
}