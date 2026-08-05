import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallPopup from './PWAInstallPopup';
import PWAMetaTags from './PWAMetaTags';
import PWAServiceWorker from './PWAServiceWorker';

interface PWAProviderProps {
  children: React.ReactNode;
  store?: {
    favicon?: string;
    pwa?: {
      enabled: boolean;
      name: string;
      short_name: string;
      description: string;
      theme_color: string;
      background_color: string;
      icon?: string;
      manifest_url: string;
      sw_url: string;
    };
  };
}

export default function PWAProvider({ children, store }: PWAProviderProps) {
  const { canInstall, install } = usePWAInstall();
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [hasShownPopup, setHasShownPopup] = useState(false);

  useEffect(() => {
    if (!store?.pwa?.enabled) return;
    
    // Check if PWA is already installed
    const isPWAInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://') ||
             window.matchMedia('(display-mode: minimal-ui)').matches ||
             window.matchMedia('(display-mode: fullscreen)').matches;
    };

    // Show popup after delay
    const timer = setTimeout(() => {
      // Check if user permanently dismissed or app is installed
      const permanentlyDismissed = localStorage.getItem('pwa-install-dismissed');
      const appInstalled = localStorage.getItem('pwa-app-installed');
      
      if (!hasShownPopup && !permanentlyDismissed && !appInstalled) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (canInstall || isLocalhost) {
          setShowInstallPopup(true);
          setHasShownPopup(true);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [store?.pwa, canInstall, hasShownPopup]);

  const handleInstall = async () => {
    
    const result = await install();
    
    if (result === 'accepted') {
      localStorage.setItem('pwa-app-installed', 'true');
      setShowInstallPopup(false);
    } else if (result === 'dismissed') {
      setShowInstallPopup(false);
    } else {
      // Check if localhost - show different message
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        alert('Development Mode: PWA install not fully supported on localhost.\n\nFor full PWA testing:\n1. Deploy to HTTPS domain\n2. Or use Chrome DevTools > Application > Manifest > "Add to homescreen"');
      } else {
        // Production install instructions
        const isChrome = /Chrome/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        if (isChrome) {
          alert('To install ' + store?.pwa?.name + ':\n\n1. Click the install icon in address bar\n2. Or go to Menu (⋮) > "Install ' + store?.pwa?.name + '"');
        } else if (isSafari) {
          alert('To install ' + store?.pwa?.name + ':\n\n1. Tap Share button (□↑)\n2. Select "Add to Home Screen"');
        } else {
          alert('To install ' + store?.pwa?.name + ':\n\nLook for install option in your browser menu');
        }
      }
      setShowInstallPopup(false);
    }
  };

  const handleClosePopup = () => {
    setShowInstallPopup(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <>
      {store?.pwa?.enabled && (
        <>
          <PWAMetaTags store={store as any} />
          <PWAServiceWorker store={store as any} />
          <PWAInstallPopup
            isVisible={showInstallPopup}
            onInstall={handleInstall}
            onClose={handleClosePopup}
            storeName={store.pwa.name}
            storeIcon={store.favicon}
            themeColors={{
              primary: store.pwa.theme_color,
              background: store.pwa.background_color
            }}
          />
        </>
      )}
      {children}
    </>
  );
}