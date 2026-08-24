/**
 * Returns the primary thumbnail for a product.
 * Prefers images[0] when images string exists, falls back to cover_image/thumbnail.
 */
export function getProductThumbnail(product: any): string {
  if (!product) return '';
  // images can be comma-separated string or array
  const images = product.images;
  if (images) {
    if (Array.isArray(images) && images.length > 0) {
      const first = String(images[0] || '').trim();
      if (first) return first;
    } else if (typeof images === 'string') {
      const trimmed = images.trim();
      if (trimmed) {
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const first = String(parsed[0] || '').trim();
              if (first) return first;
            }
          } catch {}
        }
        const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0) return parts[0];
        // single value without comma
        if (trimmed) return trimmed;
      }
    }
  }
  if (product.cover_image) return product.cover_image;
  if (product.thumbnail) return product.thumbnail;
  if (product.image) return product.image;
  return '';
}

export function getProductImages(product: any): string[] {
  if (!product) return [];
  const raw = product.images;
  if (!raw) {
    const fallback = product.cover_image || product.thumbnail;
    return fallback ? [String(fallback)] : [];
  }
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  const trimmed = String(raw).trim();
  if (!trimmed) {
    const fallback = product.cover_image || product.thumbnail;
    return fallback ? [String(fallback)] : [];
  }
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  return trimmed.split(',').map((p) => p.trim()).filter(Boolean);
}
