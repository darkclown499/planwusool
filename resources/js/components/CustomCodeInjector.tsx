import React, { useEffect } from 'react';

interface CustomCodeInjectorProps {
  customCss?: string;
  customJavascript?: string;
}

export const CustomCodeInjector: React.FC<CustomCodeInjectorProps> = ({
  customCss,
  customJavascript
}) => {
  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  useEffect(() => {
    // Inject custom CSS
    if (customCss && customCss.trim()) {
      const styleId = 'custom-store-css';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.type = 'text/css';
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = decodeHtmlEntities(customCss);
    }

    // Inject custom JavaScript
    if (customJavascript && customJavascript.trim()) {
      const scriptId = 'custom-store-js';
      let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (scriptElement) {
        scriptElement.remove();
      }
      
      scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      scriptElement.type = 'text/javascript';
      scriptElement.textContent = decodeHtmlEntities(customJavascript);
      document.body.appendChild(scriptElement);
    }

    // Cleanup function
    return () => {
      // Remove custom CSS on unmount
      const styleElement = document.getElementById('custom-store-css');
      if (styleElement) {
        styleElement.remove();
      }
      
      // Remove custom JavaScript on unmount
      const scriptElement = document.getElementById('custom-store-js');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [customCss, customJavascript]);

  return null; // This component doesn't render anything visible
};