/**
 * Fashion Atelier — small premium design system
 * Warm editorial, tactile, calm, mobile-native.
 * Reuse > Refactor > Rebuild — centralize only where useful.
 */
export const AtelierTokens = {
  color: {
    bgPage: '#faf7f2',
    bgCard: '#fffdf9',
    bgWarm: '#f3ece4',
    accent: '#9d7463',
    accentHover: '#8a6a59',
    accentPressed: '#85604f',
    accentLight: '#e8cfa8',
    accentBorder: '#d8b48a',
    gold: '#b08d57',
    goldLight: '#e8cfa8',
    text: '#1c1917',
    textMuted: '#57534e',
    border: '#e7e5e4',
  },
  radius: {
    card: '20px',
    pill: '9999px',
    control: '12px',
    sheet: '30px',
    circle: '9999px',
  },
  shadow: {
    outerFloating: '0 4px 14px rgba(60,45,35,0.06), 0 18px 36px rgba(60,45,35,0.09)',
    card: '0 2px 8px rgba(40,30,20,0.04), 0 10px 24px rgba(40,30,20,0.07)',
    cardHover: '0 4px 12px rgba(40,30,20,0.05), 0 14px 32px rgba(40,30,20,0.08)',
    sheet: '0 -2px 8px rgba(40,30,20,0.04), 0 -12px 28px rgba(40,30,20,0.06)',
    subtle: '0 1px 8px rgba(40,30,20,0.04)',
  },
  motion: {
    micro: '160ms',
    normal: '220ms',
    overlay: '280ms',
    sheet: '320ms',
    easing: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
    easingSoft: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
  focusRing: '0 0 0 2px rgba(157,116,99,0.35)',
  pressScale: 0.98,
  category: {
    sizeMobile: 74,
    sizeDesktop: 78,
  },
} as const;

export const atelierMotion = {
  // utility class snippets for consistent motion
  fadeIn: 'animate-[atelierFadeIn_220ms_cubic-bezier(0.22,0.9,0.3,1)]',
  reduceMotion: '@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }',
} as const;
