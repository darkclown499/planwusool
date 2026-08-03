import { useState, useEffect, useCallback } from 'react';
import { route } from 'ziggy-js';

interface PushSubscriptionDetails {
  endpoint: string;
  publicKey?: string;
  authToken?: string;
  contentEncoding?: string;
}

/**
 * تنسيق Key إلى Base64 URL-safe (كما يتطلبه المتصفح).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arrayBuffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook لإدارة إشعارات المتصفح (Web Push).
 * - طلب إذن المتصفح
 * - تسجيل اشتراك push عبر API
 * - جلب مفتاح VAPID العام
 * - إلغاء الاشتراك
 * - تتبع الحالة (مشترك / غير مدعوم / بانتظار الإذن)
 */
export function usePushNotifications(storeId?: string | number) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // التحقق من دعم المتصفح
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // جلب مفتاح VAPID العام
  useEffect(() => {
    if (!storeId) return;
    fetch(route('api.push-subscriptions.vapid-public-key'))
      .then((res) => res.json())
      .then((data) => {
        if (data?.public_key) setVapidKey(data.public_key);
      })
      .catch(() => {
        // تجاهل أخطاء جلب المفتاح بلطف
      });
  }, [storeId]);

  // التحقق من حالة الاشتراك الحالية
  useEffect(() => {
    if (!storeId || !isSupported) return;
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, isSupported]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${route('api.push-subscriptions.status')}?store_id=${storeId}`);
      const data = await res.json();
      setIsSubscribed(!!data.has_active_subscription);
    } catch (e) {
      // تجاهل
    }
  }, [storeId]);

  /**
   * تسجيل اشتراك Web Push.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!storeId || !isSupported) return false;
    setError(null);
    setIsLoading(true);
    try {
      // 1. طلب إذن المتصفح
      if (Notification.permission === 'denied') {
        setError('تم رفض الإشعارات من المتصفح. يرجى تفعيلها من إعدادات المتصفح.');
        return false;
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') {
          return false;
        }
      }

      // 2. تسجيل Service Worker
      const swUrl = (window as any).page?.props?.store?.pwa?.sw_url;
      let registration: ServiceWorkerRegistration;
      if (swUrl) {
        registration = await navigator.serviceWorker.register(swUrl);
      } else {
        // fallback: تسجيل default service worker
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // 3. الحصول على الاشتراك الحالي أو إنشاء جديد
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        if (!vapidKey) {
          setError('تعذر تحميل مفتاح التشفير. يرجى المحاولة لاحقاً.');
          return false;
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // 4. إرسال الاشتراك إلى الخادم
      const details: PushSubscriptionDetails = {
        endpoint: subscription.endpoint,
        publicKey: subscription.getKey('p256dh')
          ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
          : undefined,
        authToken: subscription.getKey('auth')
          ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          : undefined,
        contentEncoding: subscription.options?.applicationServerKey ? 'aes128gcm' : 'aesgcm',
      };

      const res = await fetch(route('api.push-subscriptions.subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          ...details,
          device_name: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSubscribed(true);
        return true;
      }
      setError(data.message || 'تعذر تسجيل الاشتراك.');
      return false;
    } catch (e: any) {
      console.error('Push subscription failed:', e);
      setError(e?.message || 'حدث خطأ أثناء تفعيل الإشعارات.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeId, isSupported, vapidKey]);

  /**
   * إلغاء اشتراك Web Push.
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!storeId || !isSupported) return false;
    setError(null);
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // إبلاغ الخادم
        await fetch(route('api.push-subscriptions.unsubscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        // إلغاء محلياً
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (e) {
      console.error('Push unsubscribe failed:', e);
      setError('تعذر إلغاء الاشتراك.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeId, isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkStatus,
  };
}
