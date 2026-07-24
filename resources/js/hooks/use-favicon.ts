import { useEffect } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { getImageUrl } from '@/utils/image-helper';

export function useFavicon() {
  const { favicon } = useBrand();

  useEffect(() => {
    if (!favicon) return;

    // Get the correct favicon URL using the image helper
    const faviconUrl = getImageUrl(favicon);

    // Remove all existing favicon links to avoid conflicts
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    
    // Add to document head
    document.head.appendChild(link);
    
    // Force browser to reload favicon by adding timestamp
    const timestamp = new Date().getTime();
    const linkWithTimestamp = document.createElement('link');
    linkWithTimestamp.rel = 'icon';
    linkWithTimestamp.type = 'image/x-icon';
    linkWithTimestamp.href = `${faviconUrl}?t=${timestamp}`;
    
    // Replace the previous link
    setTimeout(() => {
      link.remove();
      document.head.appendChild(linkWithTimestamp);
    }, 100);
  }, [favicon]);
}