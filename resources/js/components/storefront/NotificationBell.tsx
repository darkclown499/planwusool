import React, { useState, useEffect, useRef, useCallback } from 'react';
import { route } from 'ziggy-js';

interface CustomerNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  icon?: string | null;
  image_url?: string | null;
  action_url?: string | null;
  data?: any;
  channel: string;
  is_read: boolean;
  is_sent: boolean;
  created_at: string;
  read_at?: string | null;
}

interface NotificationBellProps {
  storeId: string | number;
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
}

// الأيقونات حسب نوع الإشعار
const TYPE_LABELS: Record<string, string> = {
  welcome: 'ترحيب',
  order_confirmed: 'تأكيد طلب',
  order_shipped: 'طلب تم شحنه',
  order_delivered: 'طلب تم توصيله',
  order_cancelled: 'إلغاء طلب',
  review_reply: 'رد على تقييمك',
  back_in_stock: 'متوفر مجدداً',
  price_drop: 'انخفاض السعر',
  abandoned_cart_reminder: 'تذكير بسلة التسوق',
  loyalty_earned: 'نقاط ولاء',
  loyalty_redeemed: 'استبدال نقاط',
  offer_promo: 'عرض خاص',
  custom: 'إشعار',
};

const TYPE_COLORS: Record<string, string> = {
  welcome: 'bg-blue-100 text-blue-600',
  order_confirmed: 'bg-green-100 text-green-600',
  order_shipped: 'bg-indigo-100 text-indigo-600',
  order_delivered: 'bg-teal-100 text-teal-600',
  order_cancelled: 'bg-red-100 text-red-600',
  review_reply: 'bg-purple-100 text-purple-600',
  back_in_stock: 'bg-amber-100 text-amber-600',
  price_drop: 'bg-orange-100 text-orange-600',
  abandoned_cart_reminder: 'bg-yellow-100 text-yellow-600',
  loyalty_earned: 'bg-pink-100 text-pink-600',
  loyalty_redeemed: 'bg-fuchsia-100 text-fuchsia-600',
  offer_promo: 'bg-cyan-100 text-cyan-600',
  custom: 'bg-gray-100 text-gray-600',
};

const TYPE_ICONS: Record<string, string> = {
  welcome: 'M13 10V3L4 14h7v7l9-11h-7z',
  order_confirmed: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
  order_shipped: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  order_delivered: 'M3 3h18v18H3V3zm4 12h10m-6-4h6',
  order_cancelled: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  review_reply: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  back_in_stock: 'M12 8c-1.5-2-4-1.5-4 1 0 3 4 2.5 4 5 0 2.5-2.5 3-4 1m4-7c1.5-2 4-1.5 4 1 0 3-4 2.5-4 5 0 2.5 2.5 3 4 1',
  price_drop: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  abandoned_cart_reminder: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5.2a1 1 0 00.9 1.4H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z',
  loyalty_earned: 'M13 10V3L4 14h7v7l9-11h-7z',
  loyalty_redeemed: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2z',
  offer_promo: 'M12 8v13m0 0V6a2 2 0 112 2h-2zm0 0a2 2 0 10-2 2h2z',
  custom: 'M15 17h5l-1.4-1.4M15 17H8m7 0v-9a2 2 0 00-2-2H8a2 2 0 00-2 2v9m0 0H3',
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  const years = Math.floor(months / 12);
  return `منذ ${years} سنة`;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  storeId,
  isLoggedIn,
  onRequireLogin,
}) => {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCsrfToken = () => {
    const meta = document.head.querySelector('meta[name="csrf-token"]');
    return meta ? (meta as HTMLMetaElement).content : '';
  };

  const loadNotifications = useCallback(async (unreadOnly = false) => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${route('api.notifications.index')}?store_id=${storeId}&limit=20${unreadOnly ? '&unread_only=1' : ''}`,
        { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      setError('تعذر تحميل الإشعارات.');
    } finally {
      setIsLoading(false);
    }
  }, [storeId, isLoggedIn]);

  const loadUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(
        `${route('api.notifications.unread-count')}?store_id=${storeId}`,
        { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }
      );
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      // تجاهل
    }
  }, [storeId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    loadNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, isLoggedIn]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      loadNotifications(true);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await fetch(route('api.notifications.mark-read', id), {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrfToken() },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      // تجاهل
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(route('api.notifications.mark-all-read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ store_id: storeId }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (e) {
      // تجاهل
    }
  };

  const handleNotificationClick = async (notification: CustomerNotification) => {
    // تسجيل النقرة
    try {
      await fetch(route('api.notifications.mark-clicked', notification.id), {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrfToken() },
      });
    } catch (e) {
      // تجاهل
    }
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    setIsOpen(false);
    // توجيه العميل إلى الرابط إذا وُجد
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getTypeLabel = (type: string) => TYPE_LABELS[type] || TYPE_LABELS.custom;
  const getTypeColor = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.custom;
  const getTypeIcon = (type: string) => TYPE_ICONS[type] || TYPE_ICONS.custom;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس */}
      <button
        onClick={toggleDropdown}
        className={`relative p-2 rounded-full transition-colors cursor-pointer ${
          isOpen
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        aria-label="الإشعارات"
        title="الإشعارات"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 bg-red-500 text-white text-xs font-semibold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute start-0 mt-2 w-80 max-w-[calc(100vw-2.5rem)] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {/* رأس القائمة */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* محتوى القائمة */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <svg className="w-8 h-8 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm">جارٍ تحميل الإشعارات...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 text-red-400">
                <p className="text-sm">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm font-medium">لا توجد إشعارات</p>
                <p className="text-xs mt-1">ستظهر هنا إشعارات طلباتك وعروض المتجر.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* الأيقونة */}
                      <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTypeIcon(notification.type)} />
                        </svg>
                      </span>

                      {/* النص */}
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{notification.title}</span>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</span>
                        <span className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-gray-400">{timeAgo(notification.created_at)}</span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${getTypeColor(notification.type)}`}>
                            {getTypeLabel(notification.type)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* تذييل القائمة */}
          {!isLoading && notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  loadNotifications(false);
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 font-medium py-1 cursor-pointer"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
