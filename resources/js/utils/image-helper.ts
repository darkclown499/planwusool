/**
 * Derive Spatie thumb/conversion URL from an original storage path.
 * Spatie stores conversions as: /storage/{id}/conversions/{filename}-{conversion}.{ext}
 * We generate the expected thumb URL and let <img onError> fallback to original.
 */
export function getThumbUrl(path: string, conversion: string = 'thumb'): string {
  const original = getImageUrl(path);
  if (!original || original.startsWith('data:') || original.startsWith('blob:')) return original;
  // Only for local /storage paths
  try {
    const url = new URL(original, window.location.origin);
    const pathname = url.pathname; // e.g. /storage/29/abc.webp or /storage/media/29/abc.webp
    // Do not convert external absolute URLs (unsplash etc) or already conversion paths
    if (pathname.includes('/conversions/') || pathname.includes('-thumb') || pathname.includes('-small') || pathname.includes('-medium')) {
      return original;
    }
    if (!pathname.startsWith('/storage')) return original;
    // Build conversion path: /storage/29/abc.webp -> /storage/29/conversions/abc-thumb.webp
    const lastSlash = pathname.lastIndexOf('/');
    const dir = pathname.slice(0, lastSlash);
    const file = pathname.slice(lastSlash + 1);
    const dot = file.lastIndexOf('.');
    const name = dot > 0 ? file.slice(0, dot) : file;
    const ext = dot > 0 ? file.slice(dot) : '.webp';
    const convFile = `${name}-${conversion}${ext}`;
    const thumbPath = `${dir}/conversions/${convFile}`;
    return `${url.origin}${thumbPath}${url.search}${url.hash}`;
  } catch {
    return original;
  }
}

/**
 * Get optimized image URL: for product cards (small) use thumb 300/400 conversion,
 * for medium use 800, for large keep original (already WebP 1280). Falls back to
 * original if conversion missing (onError handler will swap).
 */
export function getOptimizedImageUrl(path: string, size: 'thumb' | 'small' | 'medium' | 'original' = 'small'): string {
  if (!path) return '';
  if (String(path).startsWith('http')) return getImageUrl(path);
  if (size === 'original') return getImageUrl(path);
  // Map size -> conversion name defined in MediaItem
  const conv = size === 'thumb' ? 'thumb' : size; // thumb 300, small 400, medium 800
  return getThumbUrl(path, conv);
}

/**
 * Get the full URL for an image path
 * 
 * @param path The relative path (e.g., /storage/media/29/avatar.png)
 * @returns The full URL
 */
export function getImageUrl(path: string): string {
  if (!path || typeof path !== 'string') {
    if (path == null) return '';
    path = String(path);
    if (!path) return '';
  }

  if (path.startsWith('http')) {
    return path;
  }

  let baseUrl = '';

  // Try app settings first
  const appSettings = (window as any).appSettings;
  if (appSettings?.baseUrl) {
    baseUrl = appSettings.baseUrl;
  }

  // Try global settings from Inertia
  if (!baseUrl) {
    const page = (window as any).page;
    const globalSettings = page?.props?.globalSettings;
    if (globalSettings?.base_url) {
      baseUrl = globalSettings.base_url;
    }
  }

  // Fallback: construct from current URL
  if (!baseUrl) {
    const { origin, pathname } = window.location;

    // For paths like /product/storego/storego-saas-react-demo/...
    if (pathname.includes('/product/')) {
      const pathParts = pathname.split('/');
      const mainFileIndex = pathParts.indexOf('main_file');

      if (mainFileIndex >= 0) {
        // If main_file is in the path, verify it's the root
        const basePath = pathParts.slice(0, mainFileIndex + 1).join('/');
        baseUrl = origin + basePath;
      } else {
        const productIndex = pathParts.indexOf('product');
        if (productIndex >= 0 && pathParts.length > productIndex + 2) {
          // Reconstruct base path: /product/storego/storego-saas-react-demo
          const basePath = pathParts.slice(0, productIndex + 3).join('/');
          baseUrl = origin + basePath;
        }
      }
    }

    // Handle any subdirectory by detecting if we're not at root
    if (!baseUrl && pathname !== '/' && !pathname.startsWith('/storage/')) {
      const pathParts = pathname.split('/').filter(part => part);
      // If we have path segments and the first one isn't a known route, it's likely a base path
      if (pathParts.length > 0) {
        // Take the first path segment as potential base path
        const potentialBasePath = '/' + pathParts[0];
        baseUrl = origin + potentialBasePath;
      }
    }

    // Final fallback
    if (!baseUrl) {
      baseUrl = origin;
    }
  }

  // Clean up URL construction
  baseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}