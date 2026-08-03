import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/custom-toast';
import { route } from 'ziggy-js';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationPreferencesModalProps {
  storeId: string | number;
  isLoggedIn: boolean;
  onClose: () => void;
}

// أنواع الإشعارات مع وصف عربي
const NOTIFICATION_TYPES: { key: string; label: string; description: string }[] = [
  { key: 'welcome', label: 'رسائل الترحيب', description: 'إشعارات ترحيبية عند إنشاء حسابك' },
  { key: 'order_confirmed', label: 'تأكيد الطلبات', description: 'عند تأكيد طلباتك بنجاح' },
  { key: 'order_shipped', label: 'شحن الطلبات', description: 'عند شحن طلباتك' },
{ key: 'order_delivered', label: 'توصيل الطلبات', description: 'عند وصول طلبك' },
  { key: 'order_cancelled', label: 'إلغاء الطلبات', description: 'عند إلغاء طلبك' },
  { key: 'review_reply', label: 'الردود على التقييمات', description: 'عند رد المتجر على تقييمك' },
  { key: 'back_in_stock', label: 'توفر المنتجات', description: 'تنبيه عند توفر منتج كان غير متوفر' },
  { key: 'price_drop', label: 'انخفاض الأسعار', description: 'تنبيه عند انخفاض سعر منتج' },
  { key: 'abandoned_cart_reminder', label: 'تذكير السلة', description: 'تذكيرك بالمنتجات المتروكة في السلة' },
  { key: 'loyalty_earned', label: 'نقاط الولاء', description: 'عند كسب نقاط ولاء جديدة' },
  { key: 'loyalty_redeemed', label: 'استبدال النقاط', description: 'عند استبدال نقاط الولاء' },
  { key: 'offer_promo', label: 'العروض والتخفيضات', description: 'إشعارات العروض والخصومات الخاصة' },
  { key: 'custom', label: 'إشعارات عامة', description: 'رسائل و تنبيهات عامة من المتجر' },
];

// قنوات الإشعارات المتاحة
const CHANNELS: { key: 'email_enabled' | 'push_enabled' | 'sms_enabled' | 'in_app_enabled'; label: string; icon: string }[] = [
  { key: 'in_app_enabled', label: 'داخل المتجر', icon: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'push_enabled', label: 'إشعارات المتصفح', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'email_enabled', label: 'البريد الإلكتروني', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'sms_enabled', label: 'رسائل نصية', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
];

interface Preferences {
  [type: string]: {
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    in_app_enabled: boolean;
  };
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  storeId,
  isLoggedIn,
  onClose,
}) => {
  const [preferences, setPreferences] = useState<Preferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isSupported: isPushSupported,
    isSubscribed,
    permission: pushPermission,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications(storeId);

  const getCsrfToken = () => {
    const meta = document.head.querySelector('meta[name="csrf-token"]');
    return meta ? (meta as HTMLMetaElement).content : '';
  };

  // تحميل التفضيلات الحالية
  const loadPreferences = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${route('api.notifications.preferences')}?store_id=${storeId}`, {
        headers: { 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        setPreferences(data.preferences || {});
      }
    } catch (e) {
      setError('تعذر تحميل تفضيلات الإشعارات.');
    } finally {
      setIsLoading(false);
    }
  }, [storeId, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      loadPreferences();
    }
  }, [loadPreferences, isLoggedIn]);

  // تحديث تفضيل واحد
  const updatePreference = async (type: string, channel: string, value: boolean) => {
    setSavingType(type);
    setError(null);
    try {
      const res = await fetch(route('api.notifications.preferences.update'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ store_id: storeId, type, [channel]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setPreferences((prev) => ({
          ...prev,
          [type]: { ...prev[type], [channel]: value },
        }));
        toast.success('تم تحديث تفضيلات الإشعارات بنجاح');
      } else {
        setError(data.message || 'تعذر تحديث التفضيلات.');
      }
    } catch (e) {
      setError('حدث خطأ أثناء تحديث التفضيلات.');
    } finally {
      setSavingType(null);
    }
  };

  // تفعيل/تعطيل Web Push
  const handleTogglePush = async () => {
    if (isSubscribed) {
      const ok = await unsubscribePush();
      if (ok) {
        toast.success('تم إيقاف إشعارات المتصفح.');
      }
    } else {
      const ok = await subscribePush();
      if (ok) {
        toast.success('تم تفعيل إشعارات المتصفح بنجاح.');
      }
    }
  };

  const handleResetAll = async () => {
    setError(null);
    try {
      const res = await fetch(route('api.notifications.unsubscribe-all'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (data.success) {
        // إعادة تعيين كل التفضيلات إلى مغلق
        const reset: Preferences = {};
        for (const t of NOTIFICATION_TYPES) {
          reset[t.key] = {
            email_enabled: false,
            push_enabled: false,
            sms_enabled: false,
            in_app_enabled: false,
          };
        }
        setPreferences(reset);
        await unsubscribePush();
        toast.success('تم إلغاء الاشتراك من جميع الإشعارات.');
      } else {
        setError(data.message || 'تعذر إلغاء الاشتراك.');
      }
    } catch (e) {
      setError('حدث خطأ أثناء إلغاء الاشتراك.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* الرأس */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">تفضيلات الإشعارات</h2>
              <p className="text-xs text-gray-500 mt-1">تحكم في كيفية إرسال الإشعارات لك</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* إشعارات المتصفح (Web Push) */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-blue-50/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">إشعارات المتصفح (Web Push)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isPushSupported
                      ? isSubscribed
                        ? 'أنت مشترك في إشعارات المتصفح - ستصل إليك التحديثات فوراً'
                        : 'فعّل الإشعارات لتصلك تنبيهات الطلبات والعروض فوراً'
                      : 'متصفحك لا يدعم إشعارات المتصفح'}
                  </p>
                </div>
              </div>
              {isPushSupported && (
                <button
                  onClick={handleTogglePush}
                  disabled={isPushLoading}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                    isSubscribed
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isPushLoading ? 'جارٍ التحديث...' : isSubscribed ? 'إيقاف' : 'تفعيل'}
                </button>
              )}
            </div>
            {pushPermission === 'denied' && (
              <p className="text-xs text-red-500 mt-2">
                تم رفض الإذن من المتصفح. يرجى تفعيله من إعدادات المتصفح.
              </p>
            )}
          </div>

          {/* المحتوى */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-8 h-8 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm">جارٍ تحميل التفضيلات...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {NOTIFICATION_TYPES.map((type) => {
                  const prefs = preferences[type.key] || {
                    email_enabled: true,
                    push_enabled: true,
                    sms_enabled: false,
                    in_app_enabled: true,
                  };
                  return (
                    <div
                      key={type.key}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{type.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CHANNELS.map((channel) => {
                          const isActive = prefs[channel.key];
                          const isDisabled = channel.key === 'push_enabled' && !isPushSupported;
                          return (
                            <button
                              key={channel.key}
                              onClick={() => updatePreference(type.key, channel.key, !isActive)}
                              disabled={isDisabled || savingType === type.key}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isActive
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={channel.icon} />
                                </svg>
                                {channel.label}
                              </span>
                              <span
                                className={`relative w-8 h-5 rounded-full transition-colors ${
                                  isActive ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                    isActive ? 'left-0.5' : 'left-3.5'
                                  }`}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* التذييل */}
          <div className="px-4 md:px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleResetAll}
              className="text-sm text-red-500 hover:text-red-700 font-medium cursor-pointer"
            >
              إلغاء الاشتراك من جميع الإشعارات
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
