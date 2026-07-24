import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { getImageUrl } from '../utils/image-helper';

interface StoreConfig {
  storeName: string;
  logo?: string;
  favicon?: string;
  phoneNumber: string;
  currency: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email?: string;
  description?: string;
  copyrightText?: string;
  welcomeMessage?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    email?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

interface Store {
  id: string | number;
  name: string;
  slug: string;
  email?: string;
  logo?: string;
  description?: string;
  theme?: string;
  custom_css?: string;
  custom_javascript?: string;
}

interface StoreContextType {
  config: StoreConfig;
  store: Store;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
  config: StoreConfig;
  store: Store;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ 
  children, 
  config, 
  store 
}) => {
  // Set dynamic favicon once on mount
  useEffect(() => {
    if (config.favicon) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/x-icon';
        document.head.appendChild(favicon);
      }
      
      favicon.href = getImageUrl(config.favicon);
    }
  }, [config.favicon]);

  const value: StoreContextType = {
    config,
    store
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};