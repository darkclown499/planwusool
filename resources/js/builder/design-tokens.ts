import type { BuilderDesignTokens } from './types';

/**
 * Design System — a single token vocabulary for the whole storefront.
 *
 * Tokens are applied as CSS custom properties on :root so every section,
 * widget and overlay can consume them:
 *   --twc-*  colors        (--twc-primary, --twc-surface, ...)
 *   --twf-*  typography    (--twf-body-font, --twf-heading-font, ...)
 *   --twx-*  extra         (--twx-radius, --twx-spacing, --twx-shadow, ...)
 */

export const toKebab = (str: string): string =>
  str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).toLowerCase();

export const DEFAULT_TOKENS: BuilderDesignTokens = {
  colors: {
    primary: '#0f8a5f',
    primary_foreground: '#ffffff',
    secondary: '#0e7490',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text_primary: '#0f172a',
    text_secondary: '#475569',
    muted: '#94a3b8',
    border: '#e2e8f0',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
  },
  typography: {
    body_font:
      "'Tajawal', 'Cairo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    heading_font:
      "'Tajawal', 'Cairo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    base_size: '16px',
  },
  radius: '1rem',
  spacing: '4px',
  shadows: {
    soft: '0 10px 30px -12px rgba(2, 6, 23, 0.18)',
    card: '0 4px 16px -6px rgba(2, 6, 23, 0.1)',
  },
};

const clone = <T>(v: T): T => (Array.isArray(v) ? ([...v] as T) : typeof v === 'object' && v !== null ? ({ ...v } as T) : v);

export function mergeTokens(
  defaults?: BuilderDesignTokens | null,
  override?: BuilderDesignTokens | null
): BuilderDesignTokens {
  const base: BuilderDesignTokens = clone(DEFAULT_TOKENS);
  if (defaults) {
    base.colors = { ...base.colors, ...(defaults.colors || {}) };
    base.typography = { ...(base.typography || {}), ...(defaults.typography || {}) };
    if (defaults.radius) base.radius = defaults.radius;
    if (defaults.spacing) base.spacing = defaults.spacing;
    if (defaults.shadows) base.shadows = { ...(base.shadows || {}), ...defaults.shadows };
  }
  if (override) {
    base.colors = { ...base.colors, ...(override.colors || {}) };
    base.typography = { ...(base.typography || {}), ...(override.typography || {}) };
    if (override.radius) base.radius = override.radius;
    if (override.spacing) base.spacing = override.spacing;
    if (override.shadows) base.shadows = { ...(base.shadows || {}), ...override.shadows };
  }
  return base;
}

/** Apply tokens to :root as CSS custom properties (idempotent, scoped). */
export function applyTokens(tokens?: BuilderDesignTokens | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const t = mergeTokens(undefined, tokens);
  const set = (name: string, value: string | undefined) => {
    if (value && value.trim()) root.style.setProperty(name, value.trim());
  };

  Object.entries(t.colors || {}).forEach(([key, value]) => {
    if (typeof value === 'string') set(`--twc-${toKebab(key)}`, value);
  });
  Object.entries(t.typography || {}).forEach(([key, value]) => {
    if (typeof value === 'string') set(`--twf-${toKebab(key)}`, value);
  });
  Object.entries(t.shadows || {}).forEach(([key, value]) => {
    if (typeof value === 'string') set(`--twx-shadow-${toKebab(key)}`, value);
  });
  if (t.radius) set('--twx-radius', t.radius);
  if (t.spacing) set('--twx-spacing', t.spacing);

  // Backwards-compat aliases consumed by older helpers/sections.
  set('--twc-background', t.colors.background);
  set('--twc-surface', t.colors.surface);
  set('--twc-text-primary', t.colors.text_primary);
  set('--twc-text-secondary', t.colors.text_secondary);
  set('--twc-primary-500', t.colors.primary);
  set('--twc-primary-600', t.colors.primary);
  set('--twc-primary-700', t.colors.primary);
  set('--twc-primary-50', blend(t.colors.primary || '#0f8a5f', '#ffffff', 0.92));
  set('--twc-border', t.colors.border);
}

/** Convert tokens to an inline style object for scoped containers. */
export function tokensToStyle(tokens?: BuilderDesignTokens | null): React.CSSProperties {
  const t = mergeTokens(undefined, tokens);
  const style: Record<string, string> = {};
  Object.entries(t.colors || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value) style[`--twc-${toKebab(key)}`] = value;
  });
  Object.entries(t.typography || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value) style[`--twf-${toKebab(key)}`] = value;
  });
  style['--twx-radius'] = t.radius || '1rem';
  style['--twx-spacing'] = t.spacing || '4px';
  return style;
}

export function clearTokens(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const props = Array.from(root.style);
  props.forEach((p) => {
    if (
      p.startsWith('--twc-') ||
      p.startsWith('--twf-') ||
      p.startsWith('--twx-') ||
      p.startsWith('--tws-') ||
      p.startsWith('--twb-')
    ) {
      root.style.removeProperty(p);
    }
  });
}

/** Mix two hex colors (percent = 0..1 of `mix`). Used for hover/soft tones. */
export function blend(hex: string, mix: string, percent: number): string {
  const parse = (h: string): number[] => {
    const c = h.replace('#', '');
    const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  try {
    const a = parse(hex);
    const b = parse(mix);
    const out = a.map((x, i) => Math.round(x + (b[i] - x) * percent));
    return '#' + out.map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return hex;
  }
}