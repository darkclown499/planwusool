import { useState, useEffect } from 'react';

interface WhatsAppConfig {
  enabled: boolean;
  phone: string;
  message: string;
  position: 'left' | 'right';
  showOnMobile: boolean;
  showOnDesktop: boolean;
}

interface UseWhatsAppReturn {
  config: WhatsAppConfig;
  isLoading: boolean;
  error: string | null;
}

export function useWhatsApp(storeId?: number): UseWhatsAppReturn {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    phone: '',
    message: 'Hello! I need help with...',
    position: 'right',
    showOnMobile: true,
    showOnDesktop: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const globalConfig = (window as any).whatsappConfig;
        
        if (globalConfig) {
          setConfig({
            enabled: globalConfig.enabled || false,
            phone: globalConfig.phone || '',
            message: globalConfig.message || 'Hello! I need help with...',
            position: globalConfig.position || 'right',
            showOnMobile: globalConfig.showOnMobile !== false,
            showOnDesktop: globalConfig.showOnDesktop !== false,
          });
        }
      } catch (err) {
        setError('Failed to load WhatsApp configuration');
        console.error('WhatsApp config error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [storeId]);

  return { config, isLoading, error };
}