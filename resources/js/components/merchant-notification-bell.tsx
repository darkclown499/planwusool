import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { Bell, CheckCheck, ShoppingCart, Package, XCircle, Boxes, AlertTriangle, Star, Timer, FileText, CheckCircle, DollarSign, ShoppingBag, ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MerchantNotificationItem {
    id: number;
    type: string;
    title: string;
    body: string;
    icon?: string | null;
    color?: string | null;
    action_url?: string | null;
    is_read: boolean;
    is_urgent: boolean;
    created_at?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
    new_order: 'طلب جديد',
    order_status_changed: 'تحديث حالة الطلب',
    order_cancelled: 'إلغاء طلب',
    low_stock: 'مخزون منخفض',
    out_of_stock: 'نفد المخزون',
    new_review: 'تقييم جديد',
    plan_expiring: 'اشتراك ينتهي',
    plan_request: 'طلب خطة',
    plan_approved: 'تمت الموافقة على الخطة',
    cod_collected: 'تحصيل الدفع',
    abandoned_cart: 'سلة متروكة',
    system: 'نظام',
};

const TYPE_COLORS: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    gray: 'bg-gray-100 text-gray-600',
};

const TYPE_ICONS: Record<string, LucideIcon> = {
    new_order: ShoppingCart,
    order_status_changed: Package,
    order_cancelled: XCircle,
    low_stock: Boxes,
    out_of_stock: AlertTriangle,
    new_review: Star,
    plan_expiring: Timer,
    plan_request: FileText,
    plan_approved: CheckCircle,
    cod_collected: DollarSign,
    abandoned_cart: ShoppingBag,
    system: Bell,
};

function timeAgo(dateStr?: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
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
    return `منذ ${Math.floor(months / 12)} سنة`;
}

const getCsrfToken = () => {
    const meta = document.head.querySelector('meta[name="csrf-token"]');
    return meta ? (meta as HTMLMetaElement).content : '';
};

export function MerchantNotificationBell() {
    const { props } = usePage();
    const auth = (props as { auth?: { user?: { current_store?: number | null } } }).auth;
    const storeId = auth?.user?.current_store || undefined;

    const [notifications, setNotifications] = useState<MerchantNotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = useCallback(async (unreadOnly = false) => {
        setIsLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams({ limit: '20' });
            if (storeId) query.set('store_id', String(storeId));
            if (unreadOnly) query.set('unread_only', '1');
            const res = await fetch(`${route('api.merchant-notifications.index')}?${query.toString()}`, {
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch {
            setError('تعذر تحميل الإشعارات.');
        } finally {
            setIsLoading(false);
        }
    }, [storeId]);

    const loadUnreadCount = useCallback(async () => {
        try {
            const query = new URLSearchParams();
            if (storeId) query.set('store_id', String(storeId));
            const res = await fetch(`${route('api.merchant-notifications.unread-count')}?${query.toString()}`, {
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
            const data = await res.json();
            if (data.success) {
                setUnreadCount(data.unread_count || 0);
            }
        } catch {
            // تجاهل أخطاء العدّاد
        }
    }, [storeId]);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(() => {
            loadUnreadCount();
        }, 60000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

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
        const next = !isOpen;
        setIsOpen(next);
        if (next) {
            loadNotifications(true);
            loadUnreadCount();
        }
    };

    const handleMarkRead = async (id: number) => {
        try {
            await fetch(route('api.merchant-notifications.mark-read', id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
        } catch {
            // تجاهل
        }
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        try {
            const query = new URLSearchParams();
            if (storeId) query.set('store_id', String(storeId));
            await fetch(`${route('api.merchant-notifications.mark-all-read')}?${query.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
            });
        } catch {
            // تجاهل
        }
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const handleNotificationClick = async (notification: MerchantNotificationItem) => {
        if (!notification.is_read) {
            handleMarkRead(notification.id);
        }
        setIsOpen(false);
        if (notification.action_url) {
            try {
                router.visit(notification.action_url);
            } catch {
                window.location.href = notification.action_url;
            }
        }
    };

    const getTypeLabel = (type: string) => TYPE_LABELS[type] || 'إشعار';
    const getTypeColor = (color?: string | null) => TYPE_COLORS[color || 'gray'] || TYPE_COLORS.gray;
    const getTypeIcon = (type: string) => TYPE_ICONS[type] || Bell;

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleDropdown}
                className={cn('relative h-9 w-9 cursor-pointer', isOpen && 'bg-accent')}
                aria-label="الإشعارات"
                title="الإشعارات"
            >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border bg-white text-neutral-900 shadow-2xl md:w-96">
                    <div className="flex items-center justify-between border-b bg-neutral-50 px-4 py-3">
                        <h3 className="text-sm font-bold">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                تحديد الكل كمقروء
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                                <p className="mt-3 text-sm">جارٍ تحميل الإشعارات...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-10 text-red-400">
                                <p className="text-sm">{error}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <Bell className="mb-3 h-10 w-10 opacity-40" />
                                <p className="text-sm font-medium text-neutral-500">لا توجد إشعارات</p>
                                <p className="mt-1 text-xs">ستظهر هنا إشعارات طلباتك وتنبيهات مخزونك.</p>
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {notifications.map((notification) => {
                                    const Icon = getTypeIcon(notification.type);
                                    return (
                                        <li key={notification.id}>
                                            <button
                                                onClick={() => handleNotificationClick(notification)}
                                                className={cn(
                                                    'flex w-full cursor-pointer gap-3 px-4 py-3 text-start transition-colors hover:bg-neutral-50',
                                                    !notification.is_read && 'bg-blue-50/50',
                                                )}
                                            >
                                                <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', getTypeColor(notification.color))}>
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center justify-between gap-2">
                                                        <span className="truncate text-sm font-semibold text-neutral-900">{notification.title}</span>
                                                        {!notification.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />}
                                                    </span>
                                                    <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-500">{notification.body}</span>
                                                    <span className="mt-1.5 flex items-center gap-2">
                                                        <span className="text-[11px] text-neutral-400">{timeAgo(notification.created_at)}</span>
                                                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
                                                            {getTypeLabel(notification.type)}
                                                        </span>
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {!isLoading && notifications.length > 0 && (
                        <div className="border-t bg-neutral-50 px-4 py-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    router.visit(route('merchant-notifications.index'));
                                }}
                                className="flex w-full cursor-pointer items-center justify-center gap-1 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
                            >
                                {document.documentElement.dir === 'rtl' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                عرض جميع الإشعارات
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
