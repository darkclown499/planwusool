import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';

interface RecaptchaProps {
  onVerify: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

let scriptLoaded = false;
let widgetCounter = 0;

export const executeRecaptcha = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { settings = {} } = (window as any).page?.props || {};
    const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
    const recaptchaVersion = settings.recaptchaVersion || 'v2';
    const recaptchaSiteKey = settings.recaptchaSiteKey || '';

    if (!recaptchaEnabled || !recaptchaSiteKey) {
      resolve('');
      return;
    }

    if (!window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    if (recaptchaVersion === 'v3') {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(recaptchaSiteKey, { action: 'submit' })
          .then(resolve)
          .catch(reject);
      });
    } else {
      // For v2, we need to get the response from the widget
      const response = window.grecaptcha.getResponse();
      if (response) {
        resolve(response);
      } else {
        reject(new Error('Please complete the reCAPTCHA verification'));
      }
    }
  });
};

export default function Recaptcha({ onVerify, onExpired, onError }: RecaptchaProps) {
  const { settings = {} } = usePage().props as any;
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const componentId = useRef(++widgetCounter);

  const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
  const recaptchaVersion = settings.recaptchaVersion || 'v2';
  const recaptchaSiteKey = settings.recaptchaSiteKey || '';

  useEffect(() => {
    if (!recaptchaEnabled || !recaptchaSiteKey) return;

    const loadRecaptchaV2 = () => {
      if (!window.grecaptcha?.render || !recaptchaRef.current) return;
      
      // Clear existing widget if any
      if (recaptchaRef.current.innerHTML) {
        recaptchaRef.current.innerHTML = '';
      }

      try {
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => {
            onVerify(token);
          },
          'expired-callback': () => {
            onVerify('');
            if (onExpired) onExpired();
          },
          'error-callback': () => {
            onVerify('');
            if (onError) onError();
          },
        });
      } catch (error) {
        console.error('ReCaptcha v2 render error:', error);
        if (onError) onError();
      }
    };

    const loadRecaptchaV3 = () => {
      if (!window.grecaptcha?.ready) return;

      try {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(recaptchaSiteKey, { action: 'submit' })
            .then((token: string) => {
              onVerify(token);
            })
            .catch((error: any) => {
              console.error('ReCaptcha v3 execute error:', error);
              if (onError) onError();
            });
        });
      } catch (error) {
        console.error('ReCaptcha v3 ready error:', error);
        if (onError) onError();
      }
    };

    const loadRecaptcha = () => {
      if (recaptchaVersion === 'v2') {
        loadRecaptchaV2();
      } else {
        loadRecaptchaV3();
      }
    };

    if (window.grecaptcha?.render) {
      // Small delay to ensure DOM is ready
      setTimeout(loadRecaptcha, 100);
    } else if (!scriptLoaded) {
      scriptLoaded = true;
      window.onRecaptchaLoad = () => {
        setTimeout(loadRecaptcha, 100);
      };
      
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=${recaptchaVersion === 'v3' ? recaptchaSiteKey : 'explicit'}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('Failed to load ReCaptcha script');
        scriptLoaded = false;
        if (onError) onError();
      };
      document.head.appendChild(script);
    }

    return () => {
      try {
        if (widgetId.current !== null && window.grecaptcha?.reset) {
          window.grecaptcha.reset(widgetId.current);
        }
        if (recaptchaRef.current) {
          recaptchaRef.current.innerHTML = '';
        }
        widgetId.current = null;
      } catch (error) {
        console.error('ReCaptcha cleanup error:', error);
      }
    };
  }, [recaptchaEnabled, recaptchaSiteKey, recaptchaVersion]);

  if (!recaptchaEnabled || !recaptchaSiteKey) {
    return null;
  }

  return recaptchaVersion === 'v2' ? (
    <div 
      ref={recaptchaRef} 
      key={`recaptcha-${componentId.current}`}
      id={`recaptcha-${componentId.current}`}
    ></div>
  ) : null;
}