import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'custom';

export interface ThemeSettings {
    appearance: Appearance;
    themeColor: ThemeColor;
    customColor: string;
}

const DEFAULT_THEME: ThemeSettings = {
    appearance: 'light',
    themeColor: 'green',
    customColor: '#10b77f',
};

// Preset theme colors
export const THEME_COLORS = {
    blue: '#3b82f6',
    green: '#10b77f',
    purple: '#8b5cf6',
    orange: '#f97316',
    red: '#ef4444',
};

const prefersDark = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (error) {
        return false;
    }
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (settings: ThemeSettings) => {
    if (typeof document === 'undefined') {
        return;
    }

    const { appearance, themeColor, customColor } = settings;
    const isDark = appearance === 'dark';

    // Apply dark mode class
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);

    // Apply theme color
    const color = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor];
    document.documentElement.style.setProperty('--theme-color', color);

    // Also update CSS variables that depend on theme color
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--chart-1', color);

    // Force a small repaint to ensure colors are applied
    const tempClass = 'theme-color-updating';
    document.documentElement.classList.add(tempClass);
    setTimeout(() => {
        document.documentElement.classList.remove(tempClass);
    }, 10);
};

const mediaQuery = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = () => {
    const themeSettings = getThemeSettings();
    applyTheme(themeSettings);
};

const getThemeSettings = (brandSettings?: any): ThemeSettings => {
    if (typeof localStorage === 'undefined') {
        return brandSettings ? {
            appearance: brandSettings.themeMode === 'system' ? 'light' : (brandSettings.themeMode || 'light'),
            themeColor: brandSettings.themeColor || DEFAULT_THEME.themeColor,
            customColor: brandSettings.customColor || DEFAULT_THEME.customColor,
        } : DEFAULT_THEME;
    }

    try {
        const savedTheme = localStorage.getItem('themeSettings');
        if (savedTheme) {
            const parsed = JSON.parse(savedTheme);
            return {
                ...parsed,
                appearance: parsed.appearance === 'system' ? 'light' : (parsed.appearance || 'light')
            };
        }

        if (brandSettings) {
            return {
                appearance: brandSettings.themeMode === 'system' ? 'light' : (brandSettings.themeMode || 'light'),
                themeColor: brandSettings.themeColor || DEFAULT_THEME.themeColor,
                customColor: brandSettings.customColor || DEFAULT_THEME.customColor,
            };
        }

        return DEFAULT_THEME;
    } catch (error) {
        return DEFAULT_THEME;
    }
};

export function initializeTheme(brandSettings?: any) {
    const themeSettings = getThemeSettings(brandSettings);
    applyTheme(themeSettings);

    // Add the event listener for system theme changes...
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME);

    const updateAppearance = useCallback((mode: Appearance) => {
        setThemeSettings(prev => {
            const newSettings = { ...prev, appearance: mode };

            // Store in localStorage for client-side persistence...
            localStorage.setItem('themeSettings', JSON.stringify(newSettings));

            // Store in cookie for SSR...
            setCookie('appearance', mode);

            applyTheme(newSettings);
            return newSettings;
        });
    }, []);

    const updateThemeColor = useCallback((color: ThemeColor) => {
        setThemeSettings(prev => {
            const newSettings = { ...prev, themeColor: color };

            // Store in localStorage
            localStorage.setItem('themeSettings', JSON.stringify(newSettings));

            applyTheme(newSettings);
            return newSettings;
        });
    }, []);

    const updateCustomColor = useCallback((hexColor: string, setAsActive = false) => {
        setThemeSettings(prev => {
            const newSettings = {
                ...prev,
                customColor: hexColor,
                ...(setAsActive && { themeColor: 'custom' })
            };

            // Store in localStorage
            localStorage.setItem('themeSettings', JSON.stringify(newSettings));

            applyTheme(newSettings);
            return newSettings;
        });
    }, []);

    useEffect(() => {
        const savedSettings = getThemeSettings();
        setThemeSettings(savedSettings);
        applyTheme(savedSettings);

        return () => mediaQuery()?.removeEventListener('change', handleSystemThemeChange);
    }, []);

    // Method to initialize theme with brand settings
    const initializeWithBrandSettings = (brandSettings: any) => {
        const themeSettings = getThemeSettings(brandSettings);
        setThemeSettings(themeSettings);
        applyTheme(themeSettings);
    };

    return {
        appearance: themeSettings.appearance,
        themeColor: themeSettings.themeColor,
        customColor: themeSettings.customColor,
        updateAppearance,
        updateThemeColor,
        updateCustomColor,
        initializeWithBrandSettings
    } as const;
}