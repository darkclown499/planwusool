import 'flag-icons/css/flag-icons.min.css';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface FlagIconProps {
  countryCode: string;
  svg?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a country flag SVGs locally bundled by Vite from the `flag-icons`
 * npm package. Replaces the external `react-country-flag` CDN (<img> from
 * cdnjs.cloudflare.com), which was blocked by tracking prevention and
 * cross-origin storage policies and inflated page loads.
 */
export function FlagIcon({ countryCode, svg, alt, className = '', style }: FlagIconProps) {
  const code = useMemo(
    () => String(countryCode || 'us').toLowerCase().replace(/[^a-z-]/g, '') || 'us',
    [countryCode],
  );

  return (
    <span
      role={alt || svg ? 'img' : undefined}
      aria-label={alt}
      className={`fi fi-${code} ${className}`.trim()}
      style={{ backgroundSize: '100% 100%', ...style }}
    />
  );
}