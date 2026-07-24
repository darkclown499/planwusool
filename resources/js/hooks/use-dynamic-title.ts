import { useEffect } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { router } from '@inertiajs/react';

export function useDynamicTitle() {
  const { titleText } = useBrand();

  useEffect(() => {
    if (!titleText) return;
    
    // Update the document title with the custom title text
    const currentTitle = document.title;
    const parts = currentTitle.split(' - ');
    
    if (parts.length > 1) {
      // Keep the page-specific part, update the app name part
      const newTitle = `${parts[0]} - ${titleText}`;
      document.title = newTitle;
      
      // Also update Inertia's title if available
      if ((window as any).page) {
        (window as any).page.props.title = parts[0];
      }
    } else {
      // If no page-specific title, just use the app name
      document.title = titleText;
    }
  }, [titleText]);
}