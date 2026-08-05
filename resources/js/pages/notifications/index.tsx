import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { Bell, Send, Eye, Trash2, MessageSquare, Mail, Smartphone, Globe, CheckCircle, XCircle, AlertCircle, Clock, Filter } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

const CHANNEL_ICONS: Record<string, any> = {
  in_app: Bell,
  push: Globe,
  email: Mail,
  sms: Smartphone,
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  push: 'Web Push',
  email: 'Email',
  sms: 'SMS',
};

const TYPE_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  order_confirmed: 'Order Confirmed',
  order_shipped: 'Order Shipped',
  order_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  review_reply: 'Review Reply',
  back_in_stock: 'Back in Stock',
  price_drop: 'Price Drop',
  abandoned_cart_reminder: 'Abandoned Cart',
  loyalty_earned: 'Loyalty Earned',
  loyalty_redeemed: 'Loyalty Redeemed',
  offer_promo: 'Offer / Promo',
  custom: 'Custom',
};

export default function AdminNotifications() {
  const { t } = useTranslation();
  const {
    notifications = { data: [] },
    filters = {},
    stats = { total: 0, unread: 0, read: 0, sent: 0, push_sent: 0, in_app: 0, last_24h: 0 },
    typeStats = {},
    types = [],
    channels = {},
    auth
  } = usePage().props as any;

  const [search, setSearch] = useState(filters.search || '');
  const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
  const [channelFilter, setChannelFilter] = useState(filters.channel || 'all');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const applyFilters = (newParams: any = {}) => {
    router.get(route('notifications.index'), {
      search: newParams.search !== undefined ? newParams.search : search,
      type: newParams.type !== undefined ? newParams.type : typeFilter,
      channel: newParams.channel !== undefined ? newParams.channel : channelFilter,
      status: newParams.status !== undefined ? newParams.status : statusFilter,
    }, { preserveState: true, replace: true });
  };

  const handleDelete = () => {
    if (deleteId) {
      router.delete(route('notifications.destroy', deleteId), { preserveScroll: true });
      setDeleteId(null);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (notification: any) => {
    if (notification.is_sent && notification.is_read) {
      return <Badge variant="outline" className="text-green-600 border-green-300">{t('Read')}</Badge>;
    }
    if (notification.is_sent) {
      return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">{t('Sent')}</Badge>;
    }
    return <Badge variant="secondary">{t('Pending')}</Badge>;
  };

  const typeStatsArray = Object.entries(typeStats).map(([type, count]) => ({
    type,
    label: TYPE_LABELS[type] || type,
    count: count as number,
  })).sort((a, b) => b.count - a.count);

  return (
    <PageTemplate
      title={t('Notifications')}
      description={t('Manage notifications sent to your customers')}
      url="/notifications"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notifications') }
      ]}
      actions={[
        ...(hasPermission('send-notifications') ? [{
          label: t('Send Notification'),
          icon: <Send className="h-4 w-4" />,
          variant: 'default' as const,
          onClick: () => router.visit(route('notifications.create'))
        }] : [])
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Sent')}</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sent || 0} {t('sent')} · {stats.unread || 0} {t('unread')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Last 24 Hours')}</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.last_24h || 0}</div>
              <p className="text-xs text-muted-foreground">{t('notifications sent today')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Web Push')}</CardTitle>
              <Globe className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.push_sent || 0}</div>
              <p className="text-xs text-muted-foreground">{t('push notifications sent')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Read Rate')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.read || 0} / {stats.total || 0} {t('read')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-9 w-56"
                  placeholder={t('Search notifications...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ search }); }}
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); applyFilters({ type: v }); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  {types.map((type: string) => (
                    <SelectItem key={type} value={type}>{TYPE_LABELS[type] || type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); applyFilters({ channel: v }); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('All Channels')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Channels')}</SelectItem>
                  {Object.keys(channels).map((ch: string) => (
                    <SelectItem key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="sent">{t('Sent')}</SelectItem>
                  <SelectItem value="unsent">{t('Pending')}</SelectItem>
                  <SelectItem value="read">{t('Read')}</SelectItem>
                  <SelectItem value="unread">{t('Unread')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        {typeStatsArray.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('By Notification Type')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {typeStatsArray.slice(0, 8).map((item) => (
                  <Badge key={item.type} variant="secondary" className="text-xs px-3 py-1">
                    {item.label}: {item.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Notification History')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(!notifications || !notifications.data || notifications.data.length === 0) ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">{t('No notifications found')}</p>
                {hasPermission('send-notifications') && (
                  <Button variant="outline" className="mt-4" onClick={() => router.visit(route('notifications.create'))}>
                    <Send className="h-4 w-4 me-2" />
                    {t('Send your first notification')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.data.map((notification: any) => {
                  const ChannelIcon = CHANNEL_ICONS[notification.channel] || Bell;
                  return (
                    <div key={notification.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ChannelIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{notification.title}</h3>
                          {getStatusBadge(notification)}
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[notification.type] || notification.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            {CHANNEL_LABELS[notification.channel] || notification.channel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.body}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {notification.customer && (
                            <span>
                              {t('To')}: {notification.customer.first_name} {notification.customer.last_name}
                              <span className="ms-1 opacity-60">({notification.customer.email})</span>
                            </span>
                          )}
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.sent_at && <span>{t('Sent')}: {formatDate(notification.sent_at)}</span>}
                          {notification.read_at && <span className="text-green-600">{t('Read')}: {formatDate(notification.read_at)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link
                          href={route('notifications.show', notification.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {hasPermission('delete-notifications') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {notifications.links && notifications.links.length > 3 && (
              <div className="flex items-center justify-between pt-6 mt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {notifications.from || 0} – {notifications.to || 0} {t('of')} {notifications.total || 0}
                </p>
                <div className="flex gap-1">
                  {notifications.links.map((link: any, idx: number) => {
                    if (link.url === null) {
                      return (
                        <span
                          key={idx}
                          className="px-2 py-1 text-sm text-muted-foreground cursor-not-allowed"
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      );
                    }
                    return (
                      <Button
                        key={idx}
                        variant={link.active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => router.get(link.url, {}, { preserveScroll: true })}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Notification')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this notification? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}

