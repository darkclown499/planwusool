import React from 'react';

/**
 * SafeSVG Component
 * Sanitizes SVG content before rendering to prevent XSS attacks
 * Removes script tags, event handlers, and other dangerous elements
 */
interface SafeSVGProps {
  svgString: string;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const SafeSVG: React.FC<SafeSVGProps> = ({ 
  svgString, 
  className = '', 
  width, 
  height 
}) => {
  // Sanitize SVG to prevent XSS
  const sanitizedSvg = React.useMemo(() => {
    if (!svgString) return '';
    
    return svgString
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers (onclick, onload, onerror, etc.)
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, '')
      // Remove data: URLs that could contain scripts (except for images)
      .replace(/data\s*:\s*text\/html/gi, '')
      // Remove style expressions (IE)
      .replace(/expression\s*\(/gi, '')
      // Remove @import in style
      .replace(/@import\s+/gi, '')
      // Remove behavior property (IE)
      .replace(/behavior\s*:/gi, '')
      // Remove -moz-binding (Firefox)
      .replace(/-moz-binding\s*:/gi, '')
      // Remove vbscript
      .replace(/vbscript\s*:/gi, '')
      // Remove meta refresh
      .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
      // Remove object/embed/applet tags
      .replace(/<(object|embed|applet)\b[^>]*>/gi, '')
      // Remove iframe/frame/frameset
      .replace(/<(iframe|frame|frameset)\b[^>]*>/gi, '')
      // Remove form/input/button (could be used for CSRF)
      .replace(/<(form|input|button|textarea|select)\b[^>]*>/gi, '')
      // Remove link rel=import
      .replace(/<link[^>]*rel\s*=\s*["']?import["']?[^>]*>/gi, '');
  }, [svgString]);

  // If no sanitized content, render empty
  if (!sanitizedSvg.trim()) {
    return <div className={className} />;
  }

  return (
    <div 
      className={className}
      style={{ 
        width: width || 'auto', 
        height: height || 'auto',
        display: 'inline-block',
        lineHeight: 0 
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  );
};

export default SafeSVG;