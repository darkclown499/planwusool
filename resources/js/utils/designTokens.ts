import type { DesignTokens } from '@/templates/types';

/**
 * Design Tokens Utilities
 * Applies design tokens as CSS custom properties for live preview.
 */

const kebabCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).toLowerCase();
};

/**
 * Apply design tokens to CSS custom properties on :root.
 */
export function applyDesignTokensToCSS(tokens: DesignTokens | null | undefined) {
  if (!tokens) return;
  
  const root = document.documentElement;

  // Colors
  if (tokens.colors) {
    Object.entries(tokens.colors).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        root.style.setProperty(`--twc-${kebabCase(key)}`, value);
      }
    });
  }

  // Typography
  if (tokens.typography) {
    Object.entries(tokens.typography).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        root.style.setProperty(`--twf-${kebabCase(key)}`, value);
      }
    });
  }

  // Spacing
  if (tokens.spacing) {
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        root.style.setProperty(`--tws-${kebabCase(key)}`, value);
      }
    });
  }

  // Borders
  if (tokens.borders) {
    Object.entries(tokens.borders).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        root.style.setProperty(`--twb-${kebabCase(key)}`, value);
      }
    });
  }
}

/**
 * Clear applied design tokens from :root.
 */
export function clearDesignTokens() {
  const root = document.documentElement;
  
  // Remove all custom properties we added
  const props = Array.from(root.style);
  props.forEach((prop) => {
    if (prop.startsWith('--twc-') || prop.startsWith('--twf-') || prop.startsWith('--tws-') || prop.startsWith('--twb-')) {
      root.style.removeProperty(prop);
    }
  });
}

/**
 * Deep merge design tokens with user overrides.
 */
export function mergeDesignTokens(
  defaults: DesignTokens | null | undefined,
  overrides: DesignTokens | null | undefined
): DesignTokens {
  const base: DesignTokens = {
    colors: {},
    typography: {},
    spacing: {},
    borders: {},
    shadows: {},
    ...(defaults || {}),
  };

  if (!overrides) return base;

  return {
    ...base,
    colors: { ...(base.colors || {}), ...(overrides.colors || {}) },
    typography: { ...(base.typography || {}), ...(overrides.typography || {}) },
    spacing: { ...(base.spacing || {}), ...(overrides.spacing || {}) },
    borders: { ...(base.borders || {}), ...(overrides.borders || {}) },
    shadows: { ...(base.shadows || {}), ...(overrides.shadows || {}) },
  };
}

/**
 * Generate CSS variable style string from tokens.
 */
export function tokensToCssVars(tokens: DesignTokens | null | undefined): React.CSSProperties {
  const style: Record<string, string> = {};
  if (!tokens) return style;

  if (tokens.colors) {
    Object.entries(tokens.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        style[`--twc-${kebabCase(key)}`] = value;
      }
    });
  }

  return style;
}