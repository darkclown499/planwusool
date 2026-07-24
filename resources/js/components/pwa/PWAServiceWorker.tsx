import { useEffect } from 'react';

interface PWAServiceWorkerProps {
  store: {
    pwa: {
      sw_url: string;
      manifest_url: string;
    };
  };
}

export default function PWAServiceWorker({ store }: PWAServiceWorkerProps) {
  useEffect(() => {
    if (!store?.pwa?.sw_url || !('serviceWorker' in navigator)) return;

    let criteriaTimeout1: NodeJS.Timeout;
    let criteriaTimeout2: NodeJS.Timeout;
    
    const controllerChangeHandler = () => {
      criteriaTimeout1 = setTimeout(checkPWACriteria, 500);
    };
    
    const checkPWACriteria = () => {
      const hasController = !!navigator.serviceWorker.controller;

      if (!hasController && !window.sessionStorage.getItem('pwa-reload-attempted')) {
        window.sessionStorage.setItem('pwa-reload-attempted', 'true');
        setTimeout(() => window.location.reload(), 1000);
      }
    };
    
    navigator.serviceWorker.register(store.pwa.sw_url)
      .then((registration) => {
        
        if (registration.active && !navigator.serviceWorker.controller) {
          registration.active.postMessage({ action: 'skipWaiting' });
          navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
        } else {
          criteriaTimeout1 = setTimeout(checkPWACriteria, 500);
        }
        
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        criteriaTimeout2 = setTimeout(checkPWACriteria, 1000);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
      
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      if (criteriaTimeout1) clearTimeout(criteriaTimeout1);
      if (criteriaTimeout2) clearTimeout(criteriaTimeout2);
    };
  }, [store?.pwa?.sw_url]);

  return null;
}