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
 * Arabic-first storefront locale provider.
 * The language-switcher system was removed: storefronts are always rendered
 * in Arabic, right-to-left, with no DOM translation engine.
 */
export const StorefrontLocaleProvider: React.FC<StorefrontLocaleProviderProps> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  const value = useMemo<StorefrontLocaleContextValue>(() => ({
    locale: 'ar',
    setLocale: () => {},
    isRTL: true,
    dir: 'rtl',
    t: (key: string) => key,
  }), []);

  return (
    <StorefrontLocaleContext.Provider value={value}>
      <div ref={contentRef}>{children}</div>
    </StorefrontLocaleContext.Provider>
  );
};