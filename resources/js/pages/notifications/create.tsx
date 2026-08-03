import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Send, Bell, Globe, Mail, Smartphone, Users, Search, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

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

export default function CreateNotification() {
  const { t } = useTranslation();
  const { customers = [], types = [] } = usePage().props as any;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('custom');
  const [channel, setChannel] = useState('in_app');
  const [actionUrl, setActionUrl] = useState('');
  const [force, setForce] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  const filteredCustomers = customers.filter((c: any) => {
    const q = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  const toggleCustomer = (id: number) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c: any) => c.id));
    }
  };

  const clearSelection = () => setSelectedCustomers([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error(t('Please fill in both title and body'));
      return;
    }
    if (selectedCustomers.length === 0) {
      toast.error(t('Please select at least one customer'));
      return;
    }

    setSending(true);
    router.post(route('notifications.send'), {
      title,
      body,
      type,
      channel,
      customer_ids: selectedCustomers,
      action_url: actionUrl || null,
      data: null,
      force,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setSending(false);
        toast.success(t('Notification sent successfully'));
      },
      onError: () => {
        setSending(false);
        toast.error(t('Failed to send notification'));
      },
    });
  };

  return (
    <PageTemplate
      title={t('Send Notification')}
      description={t('Send a manual notification to your customers')}
      url="/notifications/create"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notifications'), href: route('notifications.index') },
        { title: t('Send Notification') }
      ]}
    >
      <div className="space-y-4">
        {/* Composition form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Notification Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('Title')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('e.g. Big Summer Sale - Up to 50% Off!')}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">{t('Message')} *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('Write your notification message here...')}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Notification Type')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((tp: string) => (
                      <SelectItem key={tp} value={tp}>{TYPE_LABELS[tp] || tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('Channel')}</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select channel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CHANNEL_ICONS).map((ch) => {
                      const Icon = CHANNEL_ICONS[ch];
                      return (
                        <SelectItem key={ch} value={ch}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {CHANNEL_LABELS[ch] || ch}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {channel === 'push' && t('Web Push notifications are delivered via browser notifications (requires customer to have subscribed).')}
                  {channel === 'in_app' && t('In-App notifications appear in the customer\'s notification center in the store.')}
                  {channel === 'email' && t('Email notifications are sent to the customer\'s email address.')}
                  {channel === 'sms' && t('SMS notifications require an SMS gateway to be configured.')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_url">{t('Action URL (Optional)')}</Label>
              <Input
                id="action_url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder={t('e.g. /collections/sale or https://example.com/offer')}
              />
              <p className="text-xs text-muted-foreground">
                {t('Customers will be redirected to this URL when they click the notification.')}
              </p>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <p className="text-sm font-medium">{t('Send regardless of preferences')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('Bypass the customer notification preferences (useful for important updates).')}
                </p>
              </div>
              <Switch checked={force} onCheckedChange={setForce} />
            </div>
          </CardContent>
        </Card>

        {/* Customer selection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t('Select Customers')}</CardTitle>
            <div className="flex items-center gap-2">
              {selectedCustomers.length > 0 && (
                <>
                  <Badge variant="default" className="mr-1">
                    {selectedCustomers.length} {t('selected')}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-3 w-3 me-1" />
                    {t('Clear')}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={selectAll}>
                <Users className="h-3.5 w-3.5 me-1" />
                {t('Select All')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder={t('Search customers by name, email or phone...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">{t('No customers found yet. Create customers first.')}</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('No customers match your search.')}</p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
                {filteredCustomers.slice(0, 100).map((customer: any) => {
                  const selected = selectedCustomers.includes(customer.id);
                  return (
                    <button
                      type="button"
                      key={customer.id}
                      onClick={() => toggleCustomer(customer.id)}
                      className={`w-full flex items-center gap-3 p-3 text-start transition-colors hover:bg-muted/40 ${
                        selected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-primary border-primary' : 'border-gray-300'
                        }`}
                      >
                        {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {customer.first_name} {customer.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {customer.email || customer.phone || '—'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.visit(route('notifications.index'))}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={sending || selectedCustomers.length === 0}
          >
            <Send className="h-4 w-4 me-2" />
            {sending ? t('Sending...') : t('Send Notification')}
            {selectedCustomers.length > 0 && ` (${selectedCustomers.length})`}
          </Button>
        </div>
      </div>
    </PageTemplate>
  );
}

