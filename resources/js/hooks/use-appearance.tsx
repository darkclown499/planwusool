import { useCallback, useEffect, useState } from 'react';

export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'custom';

export interface ThemeSettings {
    themeColor: ThemeColor;
    customColor: string;
}

const DEFAULT_THEME: ThemeSettings = {
    themeColor: 'green',
    customColor: '#10b77f',
};

export const THEME_COLORS: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b77f',
    purple: '#8b5cf6',
    orange: '#f97316',
    red: '#ef4444',
};

const applyTheme = (settings: ThemeSettings) => {
    if (typeof document === 'undefined') return;

    const { themeColor, customColor } = settings;
    const color = (themeColor === 'custom' ? customColor : THEME_COLORS[themeColor]) || THEME_COLORS.green;
    document.documentElement.style.setProperty('--theme-color', color);
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
    document.documentElement.style.setProperty('--chart-1', color);
};

const getThemeSettings = (brandSettings?: any): ThemeSettings => {
    if (typeof localStorage === 'undefined') {
        return brandSettings ? {
            themeColor: brandSettings.themeColor || DEFAULT_THEME.themeColor,
            customColor: brandSettings.customColor || DEFAULT_THEME.customColor,
        } : DEFAULT_THEME;
    }

    try {
        const savedTheme = localStorage.getItem('themeSettings');
        if (savedTheme) {
            const parsed = JSON.parse(savedTheme);
            return {
                themeColor: parsed.themeColor || DEFAULT_THEME.themeColor,
                customColor: parsed.customColor || DEFAULT_THEME.customColor,
            };
        }

        if (brandSettings) {
            return {
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
}

export function useAppearance() {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME);

    const updateThemeColor = useCallback((color: ThemeColor) => {
        setThemeSettings(prev => {
            const newSettings = { ...prev, themeColor: color };
            localStorage.setItem('themeSettings', JSON.stringify(newSettings));
            applyTheme(newSettings);
            return newSettings;
        });
    }, []);

    const updateCustomColor = useCallback((hexColor: string, setAsActive = false) => {
        setThemeSettings(prev => {
            const newSettings: ThemeSettings = {
                ...prev,
                customColor: hexColor,
                ...(setAsActive ? { themeColor: 'custom' as const } : {})
            };
            localStorage.setItem('themeSettings', JSON.stringify(newSettings));
            applyTheme(newSettings);
            return newSettings;
        });
    }, []);

    useEffect(() => {
        const savedSettings = getThemeSettings();
        setThemeSettings(savedSettings);
        applyTheme(savedSettings);
    }, []);

    const initializeWithBrandSettings = (brandSettings: any) => {
        const themeSettings = getThemeSettings(brandSettings);
        setThemeSettings(themeSettings);
        applyTheme(themeSettings);
    };

    return {
        themeColor: themeSettings.themeColor,
        customColor: themeSettings.customColor,
        updateThemeColor,
        updateCustomColor,
        initializeWithBrandSettings
    } as const;
}
