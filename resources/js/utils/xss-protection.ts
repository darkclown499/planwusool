/**
 * XSS Protection Utilities
 * Sanitizes user-controlled content to prevent Cross-Site Scripting attacks
 */

// Allowed HTML tags and attributes for sanitization
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'a', 'img'
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  all: ['class', 'dir', 'lang'],
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  span: ['style'],
  div: ['style'],
  p: ['style'],
};

/**
 * Sanitize HTML string to prevent XSS
 * Removes dangerous tags, attributes, and javascript: URLs
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // First pass: Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript\s*:/gi, 'removed:')
    .replace(/data\s*:\s*text\/html/gi, 'data:removed')
    .replace(/vbscript\s*:/gi, 'removed:')
    .replace(/expression\s*\(/gi, 'removed(')
    .replace(/@import\s+/gi, 'removed ')
    .replace(/behavior\s*:/gi, 'removed:')
    .replace(/-moz-binding\s*:/gi, 'removed:')
    .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    .replace(/<(object|embed|applet|iframe|frame|frameset)\b[^>]*>/gi, '')
    .replace(/<(form|input|button|textarea|select)\b[^>]*>/gi, '')
    .replace(/<link[^>]*rel\s*=\s*["']?import["']?[^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<base\b[^>]*>/gi, '');

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi;
  
  sanitized = sanitized.replace(tagRegex, (match, tagName, attributes) => {
    const lowerTag = tagName.toLowerCase();
    
    if (!ALLOWED_TAGS.includes(lowerTag)) {
      return '';
    }
    
    let cleanAttrs = '';
    if (attributes.trim()) {
      const attrRegex = /(\w+)\s*=\s*(["'])(.*?)\2/gi;
      let attrMatch;
      const allowedAttrs = ALLOWED_ATTRIBUTES[lowerTag] || ALLOWED_ATTRIBUTES.all || [];
      
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const [, attrName, , attrValue] = attrMatch;
        if (allowedAttrs.includes(attrName.toLowerCase())) {
          if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
            if (!/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(attrValue.trim())) {
              continue;
            }
          }
          if (attrName.toLowerCase() === 'style') {
            const cleanStyle = attrValue
              .replace(/expression\s*\(/gi, '')
              .replace(/behavior\s*:/gi, '')
              .replace(/-moz-binding\s*:/gi, '')
              .replace(/javascript\s*:/gi, '');
            cleanAttrs += ` ${attrName}="${cleanStyle}"`;
          } else {
            cleanAttrs += ` ${attrName}="${attrValue}"`;
          }
        }
      }
    }
    
    return `<${lowerTag}${cleanAttrs}>`;
  });

  return sanitized;
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/\//g, '&#x2F;');
}

/**
 * Safe wrapper for rendering user content
 */
export function createSafeHtml(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}

export default {
  sanitizeHtml,
  sanitizeText,
  createSafeHtml,
};