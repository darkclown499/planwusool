import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { LayoutProvider } from './contexts/LayoutContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { BrandProvider } from './contexts/BrandContext';
import { ModalStackProvider } from './contexts/ModalStackContext';
import { initializeTheme } from './hooks/use-appearance';
import { CustomToast } from './components/custom-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeGlobalSettings } from './utils/globalSettings';
import './i18n';
import './utils/axios-config';
import { setupFlashMessages } from './utils/flash-messages';

const initializeDirection = () => {
    const savedDirection = localStorage.getItem('layoutDirection');
    if (savedDirection) {
        document.documentElement.dir = savedDirection;
        document.documentElement.setAttribute('dir', savedDirection);
    } else {
        const currentLang = localStorage.getItem('i18nextLng') || 'en';
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        const direction = rtlLanguages.includes(currentLang) ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.setAttribute('dir', direction);
        localStorage.setItem('layoutDirection', direction);
    }
};

createInertiaApp({
    title: (title) => {
        const page = (window as any).page;
        const globalSettings = page?.props?.globalSettings;
        const appName = globalSettings?.titleText || import.meta.env.VITE_APP_NAME || 'Wusool';
        return `${title} - ${appName}`;
    },
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        initializeDirection();
        const root = createRoot(el);

        try {
            (window as any).page = props.initialPage;
        } catch (e) {
            console.warn('Could not set global page data:', e);
        }

        try {
            (window as any).isDemo = props.initialPage.props?.is_demo || false;
        } catch (e) {
            // Ignore
        }

        const globalSettings = props.initialPage.props.globalSettings || {};
        if (Object.keys(globalSettings).length > 0) {
            initializeGlobalSettings(globalSettings);
            if (globalSettings.titleText) {
                const pageTitle = props.initialPage.props.title || 'Dashboard';
                document.title = `${pageTitle} - ${globalSettings.titleText}`;
            }
        }

        initializeTheme(globalSettings);

        const renderApp = (appProps: any) => {
            const currentGlobalSettings = appProps.initialPage.props.globalSettings || {};
            const user = appProps.initialPage.props.auth?.user;

            return (
                <ErrorBoundary>
                    <ModalStackProvider>
                        <LayoutProvider>
                            <SidebarProvider>
                                <BrandProvider globalSettings={currentGlobalSettings} user={user}>
                                    <App {...appProps} />
                                    <CustomToast />
                                </BrandProvider>
                            </SidebarProvider>
                        </LayoutProvider>
                    </ModalStackProvider>
                </ErrorBoundary>
            );
        };

        root.render(renderApp(props));

        router.on('navigate', (event) => {
            try {
                (window as any).page = event.detail.page;

                const updatedGlobalSettings = event.detail.page.props.globalSettings || {};
                if (Object.keys(updatedGlobalSettings).length > 0) {
                    initializeGlobalSettings(updatedGlobalSettings);

                    const pageTitle = event.detail.page.props.title || event.detail.page.component.split('/').pop()?.replace(/([A-Z])/g, ' $1').trim() || 'Dashboard';
                    const appName = updatedGlobalSettings.titleText || 'Wusool';
                    document.title = `${pageTitle} - ${appName}`;
                }

                const savedTheme = localStorage.getItem('themeSettings');
                if (savedTheme) {
                    const themeSettings = JSON.parse(savedTheme);

                    const THEME_COLORS_MAP: Record<string, string> = {
                        blue: '#3b82f6',
                        green: '#10b77f',
                        purple: '#8b5cf6',
                        orange: '#f97316',
                        red: '#ef4444',
                    };
                    const color = themeSettings.themeColor === 'custom'
                        ? themeSettings.customColor
                        : THEME_COLORS_MAP[themeSettings.themeColor] || THEME_COLORS_MAP.green;
                    document.documentElement.style.setProperty('--theme-color', color);
                    document.documentElement.style.setProperty('--primary', color);
                    document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
                    document.documentElement.style.setProperty('--chart-1', color);
                }

                const savedDirection = localStorage.getItem('layoutDirection');
                if (savedDirection === 'rtl' || savedDirection === 'ltr') {
                    document.documentElement.dir = savedDirection;
                    document.documentElement.setAttribute('dir', savedDirection);
                }
            } catch (e) {
                console.error('Navigation error:', e);
            }
        });
    },
    progress: {
        color: '#4B5563',
    },
});

setupFlashMessages();