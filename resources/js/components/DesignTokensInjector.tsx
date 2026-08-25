import React, { useEffect } from 'react';

interface DesignTokens {
    colors?: Record<string, string>;
    radius?: string;
    typography?: Record<string, any>;
    [key: string]: any;
}

interface Props {
    tokens: DesignTokens | null | undefined;
}

function isValidHex(v: unknown): boolean {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

export default function DesignTokensInjector({ tokens }: Props) {
    useEffect(() => {
        const primary = isValidHex(tokens?.colors?.primary) ? String(tokens!.colors!.primary).trim() : '';
        const secondary = isValidHex(tokens?.colors?.secondary) ? String(tokens!.colors!.secondary).trim() : '';
        const accent = isValidHex(tokens?.colors?.accent) ? String(tokens!.colors!.accent).trim() : (primary || '');
        const radiusRaw = tokens?.radius ? String(tokens.radius).trim() : '';
        const radius = radiusRaw ? (radiusRaw.endsWith('px') ? radiusRaw : `${parseInt(radiusRaw, 10) || 16}px`) : '';
        const fontFamily = tokens?.typography?.font_family ? String(tokens.typography.font_family).trim() : '';

        const root = document.documentElement;

        if (primary) {
            root.style.setProperty('--store-primary', primary);
            root.style.setProperty('--twc-primary', primary);
            root.style.setProperty('--twc-primary-600', primary);
            root.style.setProperty('--twc-primary-700', primary);
        } else {
            root.style.removeProperty('--store-primary');
            root.style.removeProperty('--twc-primary');
            root.style.removeProperty('--twc-primary-600');
            root.style.removeProperty('--twc-primary-700');
        }
        if (secondary) {
            root.style.setProperty('--store-secondary', secondary);
            root.style.setProperty('--twc-secondary', secondary);
        } else {
            root.style.removeProperty('--store-secondary');
            root.style.removeProperty('--twc-secondary');
        }
        if (accent) {
            root.style.setProperty('--store-accent', accent);
        } else {
            root.style.removeProperty('--store-accent');
        }
        if (radius) {
            root.style.setProperty('--store-radius', radius);
        } else {
            root.style.removeProperty('--store-radius');
        }
        if (fontFamily) {
            root.style.setProperty('--store-font', fontFamily);
            document.body.style.fontFamily = `${fontFamily}, system-ui, -apple-system, sans-serif`;
            // Load Google Font for Arabic/English families if not already present
            const fontMap: Record<string, string> = {
                'Cairo': 'Cairo:wght@400;500;600;700;800',
                'Tajawal': 'Tajawal:wght@400;500;700;800',
                'Almarai': 'Almarai:wght@400;700;800',
                'IBM Plex Sans Arabic': 'IBM+Plex+Sans+Arabic:wght@400;500;600;700',
            };
            const gf = fontMap[fontFamily];
            if (gf) {
                const id = 'store-font-google';
                let link = document.getElementById(id) as HTMLLinkElement | null;
                const href = `https://fonts.googleapis.com/css2?family=${gf}&display=swap`;
                if (!link) {
                    link = document.createElement('link');
                    link.id = id;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
                if (link.href !== href) link.href = href;
            }
        } else {
            root.style.removeProperty('--store-font');
            document.body.style.removeProperty('font-family');
        }

        // Inject override stylesheet so hardcoded tailwind colors react to tokens
        const STYLE_ID = 'store-design-tokens-overrides';
        let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            document.head.appendChild(styleEl);
        }

        const parts: string[] = [];
        if (primary) {
            parts.push(`
                .bg-teal-600, .bg-emerald-600, .bg-teal-500, .from-teal-600, .from-teal-500, .from-emerald-600 { background-color: var(--store-primary) !important; --tw-gradient-from: var(--store-primary) var(--tw-gradient-from-position) !important; }
                .to-emerald-600, .to-emerald-700, .to-teal-700 { --tw-gradient-to: var(--store-primary) var(--tw-gradient-to-position) !important; }
                .bg-gradient-to-l.from-teal-600, .bg-gradient-to-l.from-emerald-600, .bg-gradient-to-br.from-teal-500 { --tw-gradient-from: var(--store-primary) var(--tw-gradient-from-position) !important; --tw-gradient-to: var(--store-secondary, var(--store-primary)) var(--tw-gradient-to-position) !important; }
                .text-teal-700, .text-teal-600, .hover\\:text-teal-700:hover { color: var(--store-primary) !important; }
                .border-teal-600, .border-teal-500, .ring-teal-200 { border-color: var(--store-primary) !important; --tw-ring-color: var(--store-primary) !important; }
                .shadow-teal-600\\/25, .shadow-teal-600\\/20 { --tw-shadow-color: var(--store-primary) !important; }
            `);
        }
        if (secondary) {
            parts.push(`
                .bg-amber-500, .from-amber-500, .bg-secondary { background-color: var(--store-secondary) !important; }
                .text-amber-700, .text-amber-600 { color: var(--store-secondary) !important; }
            `);
        }
        if (radius) {
            // Apply radius token to common rounded utilities and cards/buttons
            parts.push(`
                .rounded-xl, .rounded-2xl, .rounded-3xl, .rounded-\\[1\\.2rem\\], .rounded-\\[1\\.5rem\\] { border-radius: var(--store-radius) !important; }
                button, .btn, [class*="rounded-"] { border-radius: var(--store-radius); }
            `);
        }
        if (fontFamily) {
            parts.push(`
                body, [dir="rtl"], .font-serif, .font-black, .font-bold { font-family: var(--store-font), system-ui, -apple-system, sans-serif !important; }
            `);
        }

        styleEl.textContent = parts.join('\n');

        return () => {
            // keep style on unmount for SPA nav; do not remove
        };
    }, [tokens]);

    return null;
}
