import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck, AlertTriangle, Search, Inbox } from 'lucide-react';

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
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700',
};

interface MerchantNotification {
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

interface MerchantNotificationsProps {
  notifications: {
    data: MerchantNotification[];
    current_page: number;
    last_page: number;
    from?: number;
    to?: number;
    total?: number;
  };
  filters: Record<string, string>;
  stats: { total: number; unread: number; urgent: number };
  types: string[];
  auth: { user?: { current_store?: number | null } };
}

const getCsrfToken = () => {
  const meta = document.head.querySelector('meta[name="csrf-token"]');
  return meta ? (meta as HTMLMetaElement).content : '';
};

export default function MerchantNotifications() {
  const { t } = useTranslation();
  const page = usePage();
  const { notifications, filters, stats, types, auth } = page.props as unknown as MerchantNotificationsProps;

  const storeId = auth?.user?.current_store || undefined;
  const [search, setSearch] = useState(filters.search || '');
  const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

  const applyFilters = (newParams: Record<string, string | undefined> = {}) => {
    router.get(route('merchant-notifications.index'), {
      search: newParams.search !== undefined ? newParams.search : search,
      type: newParams.type !== undefined ? newParams.type : typeFilter,
      status: newParams.status !== undefined ? newParams.status : statusFilter,
    }, { preserveState: true, replace: true });
  };

  const markAllRead = async () => {
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
    router.reload({ only: ['notifications', 'stats'] });
  };

  const handleNotificationClick = async (notification: MerchantNotification) => {
    if (!notification.is_read) {
      try {
        await fetch(route('api.merchant-notifications.mark-read', notification.id), {
          method: 'POST',
          headers: { 'X-CSRF-TOKEN': getCsrfToken() },
        });
      } catch {
        // تجاهل
      }
    }
    if (notification.action_url) {
      router.visit(notification.action_url);
    } else {
      router.reload({ only: ['notifications', 'stats'] });
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
  const getTypeColor = (color?: string | null) => TYPE_COLORS[color || 'gray'] || TYPE_COLORS.gray;

  return (
    <PageTemplate
      title={t('Notifications')}
      description={t('All merchant notifications and alerts')}
      url="/merchant-notifications"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notifications') },
      ]}
      actions={[
        ...(stats.unread > 0 ? [{
          label: t('Mark all as read'),
          icon: <CheckCheck className="h-4 w-4" />,
          variant: 'outline' as const,
          onClick: markAllRead,
        }] : []),
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Notifications')}</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">{t('all merchant notifications')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Unread')}</CardTitle>
              <BellRing className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.unread || 0}</div>
              <p className="text-xs text-muted-foreground">{t('awaiting your attention')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Urgent Alerts')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.urgent || 0}</div>
              <p className="text-xs text-muted-foreground">{t('high priority alerts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-9 w-56"
                  placeholder={t('Search notifications...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ search }); }}
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); applyFilters({ type: v }); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t('All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  {types.map((type: string) => (
                    <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="unread">{t('Unread')}</SelectItem>
                  <SelectItem value="read">{t('Read')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Notification History')}</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.data.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">{t('No notifications found')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.data.map((notification: MerchantNotification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-start flex items-start gap-4 p-4 border rounded-lg transition-colors cursor-pointer hover:bg-muted/30 ${!notification.is_read ? 'bg-blue-50/40 border-blue-200' : ''}`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getTypeColor(notification.color)}`}>
                      <Bell className="h-5 w-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm truncate">{notification.title}</span>
                        {notification.is_urgent && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                            {t('Urgent')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </span>
                      <span className="block text-sm text-muted-foreground mt-1 line-clamp-2">{notification.body}</span>
                      <span className="block text-xs text-muted-foreground mt-1.5">{formatDate(notification.created_at)}</span>
                    </span>
                    {!notification.is_read && (
                      <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-600 mt-2"></span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {notifications.last_page > 1 && (
              <div className="flex items-center justify-between pt-6 mt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {notifications.from || 0} – {notifications.to || 0} {t('of')} {notifications.total || 0}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: notifications.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={notifications.current_page === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => router.get(route('merchant-notifications.index', { page }), {
                        search,
                        type: typeFilter,
                        status: statusFilter,
                      }, { preserveState: true, preserveScroll: true })}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
