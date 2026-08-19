import React, { createContext, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';

export type StorefrontLocale = 'ar' | 'he' | 'en';

interface StorefrontLocaleContextValue {
  locale: StorefrontLocale;
  setLocale: (locale: StorefrontLocale) => void;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const StorefrontLocaleContext = createContext<StorefrontLocaleContextValue>({
  locale: 'ar',
  setLocale: () => {},
  isRTL: true,
  dir: 'rtl',
  t: (key) => key,
});

export const useStorefrontLocale = () => useContext(StorefrontLocaleContext);

interface StorefrontLocaleProviderProps {
  children: ReactNode;
  defaultLocale?: string;
}

/**
 * Storefront locale provider. Defaults to Arabic (RTL); honors the store's
 * saved language (config.locale) when it is one of the supported locales so a
 * merchant-set language actually reflects on the storefront.
 */
export const StorefrontLocaleProvider: React.FC<StorefrontLocaleProviderProps> = ({ children, defaultLocale = 'ar' }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const locale = (defaultLocale === 'en' || defaultLocale === 'he' ? defaultLocale : 'ar') as StorefrontLocale;
  const isRTL = locale !== 'en';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale, isRTL]);

  const value = useMemo<StorefrontLocaleContextValue>(() => ({
    locale,
    setLocale: () => {},
    isRTL,
    dir: isRTL ? 'rtl' : 'ltr',
    t: (key: string) => key,
  }), [locale, isRTL]);

  return (
    <StorefrontLocaleContext.Provider value={value}>
      <div ref={contentRef}>{children}</div>
    </StorefrontLocaleContext.Provider>
  );
};