import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Bell, Mail, Smartphone, Globe, ArrowLeft, Trash2, CheckCircle2, Clock, User } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

const CHANNEL_ICONS: Record<string, any> = {
  in_app: Bell,
  push: Globe,
  email: Mail,
  sms: Smartphone,
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'داخل التطبيق',
  push: 'إشعارات المتصفح',
  email: 'البريد',
  sms: 'SMS',
};

const TYPE_LABELS: Record<string, string> = {
  welcome: 'ترحيب',
  order_confirmed: 'تأكيد الطلب',
  order_shipped: 'تم الشحن',
  order_delivered: 'تم التسليم',
  order_cancelled: 'إلغاء الطلب',
  review_reply: 'رد على التقييم',
  back_in_stock: 'توفر المنتج',
  price_drop: 'انخفاض السعر',
  abandoned_cart_reminder: 'السلة المتروكة',
  loyalty_earned: 'اكتساب نقاط الولاء',
  loyalty_redeemed: 'استبدال نقاط الولاء',
  offer_promo: 'عرض / تخفيض',
  custom: 'مخصص',
};

export default function ShowNotification() {
  const { t } = useTranslation();
  const { notification } = usePage().props as any;

  if (!notification) {
    return (
      <PageTemplate title={t('Notification')} description={t('Notification not found')} url="/notifications">
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <p className="mt-2 text-muted-foreground">{t('Notification not found')}</p>
        </div>
      </PageTemplate>
    );
  }

  const ChannelIcon = CHANNEL_ICONS[notification.channel] || Bell;

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (hasPermission('delete-notifications')) {
      router.delete(route('notifications.destroy', notification.id), {
        preserveScroll: true,
        onSuccess: () => router.visit(route('notifications.index')),
      });
    }
  };

  return (
    <PageTemplate
      title={t('Notification Details')}
      description={t('View notification details and delivery status')}
      url={`/notifications/${notification.id}`}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notifications'), href: route('notifications.index') },
        { title: t('Notification Details') }
      ]}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4" />,
          variant: 'outline' as const,
          onClick: () => router.visit(route('notifications.index'))
        },
        ...(hasPermission('delete-notifications') ? [{
          label: t('Delete'),
          icon: <Trash2 className="h-4 w-4" />,
          variant: 'destructive' as const,
          onClick: handleDelete
        }] : [])
      ]}
    >
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ChannelIcon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{notification.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{TYPE_LABELS[notification.type] || notification.type}</Badge>
                  <Badge variant="outline" className="bg-gray-50">
                    {CHANNEL_LABELS[notification.channel] || notification.channel}
                  </Badge>
                  {notification.is_read ? (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 me-1" />
                      {t('Read')}
                    </Badge>
                  ) : notification.is_sent ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                      {t('Sent')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 me-1" />
                      {t('Pending')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Recipient')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notification.customer ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {notification.customer.first_name} {notification.customer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {notification.customer.email || notification.customer.phone || '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('Customer information not available')}</p>
            )}
          </CardContent>
        </Card>

        {/* Message body */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Message')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{notification.body}</p>
          </CardContent>
        </Card>

        {/* Delivery timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Delivery Timeline')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('Created')}</p>
                <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
              </div>
            </div>
            {notification.sent_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('Sent')}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(notification.sent_at)}</p>
                </div>
              </div>
            )}
            {notification.read_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('Read')}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(notification.read_at)}</p>
                </div>
              </div>
            )}
            {notification.clicked_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('Clicked')}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(notification.clicked_at)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action URL */}
        {notification.action_url && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('Action URL')}</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={notification.action_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all text-sm"
              >
                {notification.action_url}
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
