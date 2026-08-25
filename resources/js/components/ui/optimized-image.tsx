import React, { useState, useCallback } from 'react';
import { getImageUrl, getOptimizedImageUrl, getThumbUrl } from '@/utils/image-helper';

type OptimizedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  optimizedSize?: 'thumb' | 'small' | 'medium' | 'original';
  fallbackSrc?: string;
  aspectClass?: string; // e.g. "aspect-[3/4]"
};

/**
 * OptimizedImage — storefront image with:
 * - thumb/small conversion for product cards (300-400px), medium for heroes
 * - lazy + async decoding, sizes, and fallback to original on conversion miss
 * - subtle shimmer placeholder to avoid CLS while loading
 */
export function OptimizedImage({
  src,
  alt,
  optimizedSize = 'small',
  fallbackSrc,
  className = '',
  loading,
  decoding = 'async',
  sizes,
  onError,
  aspectClass,
  ...rest
}: OptimizedImageProps) {
  const isExternal = src?.startsWith('http');
  const isStorage = src?.startsWith('/storage') || src?.startsWith('storage');
  const useOptimized = !isExternal && isStorage && optimizedSize !== 'original';

  const [imgSrc, setImgSrc] = useState(() => {
    if (!src) return '';
    if (useOptimized) return getOptimizedImageUrl(src, optimizedSize);
    return getImageUrl(src);
  });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback<React.ReactEventHandler<HTMLImageElement>>(
    (e) => {
      // If thumb/small conversion 404s (old uploads before conversion), fallback to original
      if (useOptimized && !failed) {
        const orig = getImageUrl(src);
        if (imgSrc !== orig) {
          setImgSrc(orig);
          setFailed(true);
          return;
        }
      }
      if (fallbackSrc && imgSrc !== fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
      onError?.(e as any);
    },
    [src, imgSrc, useOptimized, failed, fallbackSrc, onError]
  );

  if (!src) return null;

  // Default sizes: cards ~50vw on mobile (2 cols), ~25vw desktop (4 cols); hero ~100vw
  const defaultSizes = optimizedSize === 'medium' ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

  return (
    <span className={`relative block overflow-hidden bg-stone-100 ${aspectClass ?? ''} ${className}`}>
      {!loaded && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 to-stone-200" aria-hidden />}
      <img
        src={imgSrc}
        alt={alt ?? ''}
        loading={loading ?? (optimizedSize === 'medium' ? 'eager' : 'lazy')}
        decoding={decoding}
        // @ts-ignore - fetchPriority is valid but not in TS img attrs
        fetchPriority={optimizedSize === 'medium' ? 'high' : 'low'}
        sizes={sizes ?? defaultSizes}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        {...rest}
      />
    </span>
  );
}

// Re-export helper for direct use when <img> is preferred over component
export { getOptimizedImageUrl, getThumbUrl, getImageUrl };
