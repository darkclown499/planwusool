import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '@/components/settings-section';
import {
  Save,
  Send,
  MessageSquare,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Bell,
  Phone,
  Type,
  Lock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwilioSettingsProps {
  systemSettings: any;
  templates: SmsTemplate[];
}

interface SmsTemplate {
  id: number;
  action: string;
  status: string | number;
}

interface TemplateEntry {
  template: SmsTemplate;
  key: string;
  enabledKey: string;
  contentKey: string;
}

type TwilioFormData = {
  sms_provider: 'twilio' | 'hotsms';
  is_twilio_enabled: boolean;
  twilio_sid: string;
  twilio_token: string;
  twilio_from: string;
  twilio_notify_owner: boolean;
  twilio_owner_phone: string;
  is_hotsms_enabled: boolean;
  hotsms_user_name: string;
  hotsms_password: string;
  hotsms_sender: string;
  hotsms_notify_owner: boolean;
  hotsms_owner_phone: string;
} & Record<string, string | boolean>;

export default function TwilioSettings({ systemSettings, templates }: TwilioSettingsProps) {
  const { t } = useTranslation();

  const templateEntries: TemplateEntry[] = templates.map((template) => {
    const key = template.action.toLowerCase().replace(/\s+/g, '_');
    return {
      template,
      key,
      enabledKey: `twilio_${key}_enabled`,
      contentKey: `twilio_content_${key}`,
    };
  });

  const initialProvider = systemSettings?.sms_provider === 'hotsms' ? 'hotsms' : 'twilio';

  const initialData: TwilioFormData = {
    sms_provider: initialProvider,
    is_twilio_enabled: systemSettings?.is_twilio_enabled === 'on',
    twilio_sid: systemSettings?.twilio_sid || '',
    twilio_token: systemSettings?.twilio_token || '',
    twilio_from: systemSettings?.twilio_from || '',
    twilio_notify_owner: systemSettings?.twilio_notify_owner === 'on',
    twilio_owner_phone: systemSettings?.twilio_owner_phone || '',
    is_hotsms_enabled: systemSettings?.is_hotsms_enabled === 'on',
    hotsms_user_name: systemSettings?.hotsms_user_name || '',
    hotsms_password: systemSettings?.hotsms_password || '',
    hotsms_sender: systemSettings?.hotsms_sender || '',
    hotsms_notify_owner: systemSettings?.hotsms_notify_owner === 'on',
    hotsms_owner_phone: systemSettings?.hotsms_owner_phone || '',
  };
  templateEntries.forEach(({ enabledKey, contentKey }) => {
    initialData[enabledKey] = systemSettings?.[enabledKey] === 'on';
    initialData[contentKey] = systemSettings?.[contentKey] || '';
  });

  const { data, setData, post, processing, errors } = useForm<TwilioFormData>(initialData);

  const twilioTestForm = useForm({
    twilio_sid: systemSettings?.twilio_sid || '',
    twilio_token: systemSettings?.twilio_token || '',
    twilio_from: systemSettings?.twilio_from || '',
    phone: systemSettings?.twilio_owner_phone || '',
  });

  const hotsmsTestForm = useForm({
    hotsms_user_name: systemSettings?.hotsms_user_name || '',
    hotsms_password: systemSettings?.hotsms_password || '',
    hotsms_sender: systemSettings?.hotsms_sender || '',
    phone: systemSettings?.hotsms_owner_phone || '',
  });

  const activeProvider = data.sms_provider;
  const twilioConfigured = Boolean(systemSettings?.twilio_sid);
  const hotsmsConfigured = Boolean(systemSettings?.hotsms_user_name);

  return (
    <SettingsSection
      title={t('SMS Settings')}
      description={t('Choose your SMS provider (Twilio or HotSMS) and configure its settings for your store')}
      action={
        <Button type="submit" form="twilio-form" size="sm" disabled={processing}>
          <Save className="h-4 w-4 me-2" />
          {processing ? t('Saving...') : t('Save Changes')}
        </Button>
      }
    >
      <form id="twilio-form" onSubmit={(e) => { e.preventDefault(); post(route('settings.twilio'), { preserveScroll: true }); }} className="space-y-6">
      {/* Status banner */}
      <Alert
        variant={data.is_twilio_enabled || data.is_hotsms_enabled ? 'success' : 'info'}
        className="mb-6"
      >
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          {data.is_twilio_enabled || data.is_hotsms_enabled ? (
            <>
              <span className="font-medium">
                {t('Active Provider')}: {activeProvider === 'hotsms' ? 'HotSMS' : 'Twilio'}
              </span>
              <span className="ms-2 text-sm">{t('SMS notifications will be delivered to your customers automatically.')}</span>
            </>
          ) : (
            t('SMS is currently disabled. Enable a provider below to start sending notifications.')
          )}
        </AlertDescription>
      </Alert>

      {/* Provider selection */}
      <div className="mb-6">
        <Label className="mb-3 block font-medium text-gray-900">{t('Select your SMS provider')}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setData('sms_provider', 'twilio')}
            className={cn(
              'relative rounded-xl border-2 p-5 text-start transition-all',
              activeProvider === 'twilio'
                ? 'border-violet-500 bg-violet-50/60 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg',
                activeProvider === 'twilio' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-600',
              )}>
                <Globe className="h-5 w-5" />
              </div>
              <Badge
                variant={activeProvider === 'twilio' ? 'success' : 'outline'}
                className={cn('transition-opacity', activeProvider !== 'twilio' && 'opacity-0')}
              >
                <CheckCircle2 className="h-3 w-3" />
                {t('Active')}
              </Badge>
            </div>
            <h4 className="mt-3 text-sm font-semibold text-gray-900">Twilio</h4>
            <p className="mt-1 text-xs text-muted-foreground">{t('Global SMS gateway')}</p>
            {!twilioConfigured && data.is_twilio_enabled && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('Not configured yet')}
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={() => setData('sms_provider', 'hotsms')}
            className={cn(
              'relative rounded-xl border-2 p-5 text-start transition-all',
              activeProvider === 'hotsms'
                ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg',
                activeProvider === 'hotsms' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600',
              )}>
                <MapPin className="h-5 w-5" />
              </div>
              <Badge
                variant={activeProvider === 'hotsms' ? 'success' : 'outline'}
                className={cn('transition-opacity', activeProvider !== 'hotsms' && 'opacity-0')}
              >
                <CheckCircle2 className="h-3 w-3" />
                {t('Active')}
              </Badge>
            </div>
            <h4 className="mt-3 text-sm font-semibold text-gray-900">HotSMS</h4>
            <p className="mt-1 text-xs text-muted-foreground">{t('Local SMS gateway')}</p>
            {!hotsmsConfigured && data.is_hotsms_enabled && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('Not configured yet')}
              </p>
            )}
          </button>
        </div>
      </div>

      {/* Twilio Configuration */}
      {data.sms_provider === 'twilio' && (
        <Card className="border-violet-100 shadow-sm mb-6">
          <CardContent className="p-5 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{t('Twilio Configuration')}</h4>
                  <p className="text-xs text-muted-foreground">{t('Global SMS gateway')}</p>
                </div>
              </div>
              <Switch
                id="is_twilio_enabled"
                checked={data.is_twilio_enabled}
                onCheckedChange={(checked) => setData('is_twilio_enabled', checked)}
              />
            </div>

            {data.is_twilio_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twilio_sid" className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('Twilio SID')}
                    </Label>
                    <Input
                      id="twilio_sid"
                      type="text"
                      value={data.twilio_sid}
                      onChange={(e) => setData('twilio_sid', e.target.value)}
                      placeholder={t('Enter Twilio SID')}
                    />
                    {errors.twilio_sid && (
                      <p className="text-sm text-red-600">{errors.twilio_sid}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twilio_token" className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('Twilio Auth Token')}
                    </Label>
                    <Input
                      id="twilio_token"
                      type="password"
                      value={data.twilio_token}
                      onChange={(e) => setData('twilio_token', e.target.value)}
                      placeholder={t('Leave blank to keep the current token')}
                    />
                    <p className="text-xs text-muted-foreground">{t('Token is masked for security. Only enter a new value to replace it.')}</p>
                    {errors.twilio_token && (
                      <p className="text-sm text-red-600">{errors.twilio_token}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="twilio_from" className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('From Number')}
                    </Label>
                    <Input
                      id="twilio_from"
                      type="text"
                      value={data.twilio_from}
                      onChange={(e) => setData('twilio_from', e.target.value)}
                      placeholder={t('Enter Twilio phone number (e.g., +1234567890)')}
                    />
                    {errors.twilio_from && (
                      <p className="text-sm text-red-600">{errors.twilio_from}</p>
                    )}
                  </div>
                </div>

                {/* Owner notification */}
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="twilio_notify_owner" className="font-medium text-gray-900">
                          {t('Notify owner of new orders')}
                        </Label>
                        <p className="text-xs text-muted-foreground">{t('Send a copy of the SMS to the store owner')}</p>
                      </div>
                    </div>
                    <Switch
                      id="twilio_notify_owner"
                      checked={data.twilio_notify_owner}
                      onCheckedChange={(checked) => setData('twilio_notify_owner', checked)}
                    />
                  </div>
                  {data.twilio_notify_owner && (
                    <div className="mt-3">
                      <Label htmlFor="twilio_owner_phone" className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('Owner Phone Number')}
                      </Label>
                      <Input
                        id="twilio_owner_phone"
                        type="text"
                        value={data.twilio_owner_phone}
                        onChange={(e) => setData('twilio_owner_phone', e.target.value)}
                        placeholder="+97059XXXXXXX"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>

                {/* Test SMS */}
                <div className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{t('Test SMS')}</h5>
                      <p className="text-xs text-muted-foreground">{t('Send a test message to verify your Twilio credentials.')}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="twilio_test_phone">{t('Send Test SMS to')}</Label>
                      <Input
                        id="twilio_test_phone"
                        type="text"
                        value={twilioTestForm.data.phone}
                        onChange={(e) => twilioTestForm.setData('phone', e.target.value)}
                        placeholder="+97059XXXXXXX"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={twilioTestForm.processing}
                      onClick={() => twilioTestForm.post(route('settings.twilio.test'), { preserveScroll: true })}
                    >
                      <Send className="h-4 w-4 me-2" />
                      {twilioTestForm.processing ? t('Sending...') : t('Send Test SMS')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* HotSMS Configuration */}
      {data.sms_provider === 'hotsms' && (
        <Card className="border-emerald-100 shadow-sm mb-6">
          <CardContent className="p-5 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{t('HotSMS Configuration')}</h4>
                  <p className="text-xs text-muted-foreground">{t('Local SMS gateway')}</p>
                </div>
              </div>
              <Switch
                id="is_hotsms_enabled"
                checked={data.is_hotsms_enabled}
                onCheckedChange={(checked) => setData('is_hotsms_enabled', checked)}
              />
            </div>

            {data.is_hotsms_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotsms_user_name" className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('HotSMS Username')}
                    </Label>
                    <Input
                      id="hotsms_user_name"
                      type="text"
                      value={data.hotsms_user_name}
                      onChange={(e) => setData('hotsms_user_name', e.target.value)}
                      placeholder={t('Enter HotSMS username')}
                    />
                    {errors.hotsms_user_name && (
                      <p className="text-sm text-red-600">{errors.hotsms_user_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotsms_password" className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('HotSMS Password')}
                    </Label>
                    <Input
                      id="hotsms_password"
                      type="password"
                      value={data.hotsms_password}
                      onChange={(e) => setData('hotsms_password', e.target.value)}
                      placeholder={t('Leave blank to keep the current password')}
                    />
                    <p className="text-xs text-muted-foreground">{t('Password is masked for security. Only enter a new value to replace it.')}</p>
                    {errors.hotsms_password && (
                      <p className="text-sm text-red-600">{errors.hotsms_password}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hotsms_sender" className="inline-flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('HotSMS Sender Name')}
                    </Label>
                    <Input
                      id="hotsms_sender"
                      type="text"
                      value={data.hotsms_sender}
                      onChange={(e) => setData('hotsms_sender', e.target.value)}
                      placeholder={t('Enter approved sender name (optional)')}
                    />
                    {errors.hotsms_sender && (
                      <p className="text-sm text-red-600">{errors.hotsms_sender}</p>
                    )}
                  </div>
                </div>

                {/* Owner notification */}
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="hotsms_notify_owner" className="font-medium text-gray-900">
                          {t('Notify owner of new orders')}
                        </Label>
                        <p className="text-xs text-muted-foreground">{t('Send a copy of the SMS to the store owner')}</p>
                      </div>
                    </div>
                    <Switch
                      id="hotsms_notify_owner"
                      checked={data.hotsms_notify_owner}
                      onCheckedChange={(checked) => setData('hotsms_notify_owner', checked)}
                    />
                  </div>
                  {data.hotsms_notify_owner && (
                    <div className="mt-3">
                      <Label htmlFor="hotsms_owner_phone" className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('Owner Phone Number')}
                      </Label>
                      <Input
                        id="hotsms_owner_phone"
                        type="text"
                        value={data.hotsms_owner_phone}
                        onChange={(e) => setData('hotsms_owner_phone', e.target.value)}
                        placeholder="+97059XXXXXXX"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>

                {/* Test SMS */}
                <div className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{t('Test SMS')}</h5>
                      <p className="text-xs text-muted-foreground">{t('Send a test message to verify your HotSMS credentials.')}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="hotsms_test_phone">{t('Send Test SMS to')}</Label>
                      <Input
                        id="hotsms_test_phone"
                        type="text"
                        value={hotsmsTestForm.data.phone}
                        onChange={(e) => hotsmsTestForm.setData('phone', e.target.value)}
                        placeholder="+97059XXXXXXX"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={hotsmsTestForm.processing}
                      onClick={() => hotsmsTestForm.post(route('settings.hotsms.test'), { preserveScroll: true })}
                    >
                      <Send className="h-4 w-4 me-2" />
                      {hotsmsTestForm.processing ? t('Sending...') : t('Send Test SMS')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* SMS Templates */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{t('SMS Templates')}</h4>
            <p className="text-xs text-muted-foreground">{t('Customize the message sent for each event.')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {templateEntries.map(({ template, enabledKey, contentKey }) => {
            const isEnabled = data[enabledKey] === true;
            const isDisabledBySuperAdmin = template.status === 'off' || template.status === 0;
            const templateName = template.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

            return (
              <Card
                key={template.id}
                className={cn(
                  'transition-colors',
                  isDisabledBySuperAdmin ? 'bg-gray-100 opacity-60' : 'border-gray-200',
                  isEnabled && !isDisabledBySuperAdmin && 'border-violet-200 bg-violet-50/30',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isEnabled ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400',
                      )}>
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor={enabledKey} className="font-medium text-gray-900">
                          {t(templateName)}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {isDisabledBySuperAdmin
                            ? t('(Disabled by Admin)')
                            : isEnabled
                              ? t('Active')
                              : t('Disabled')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={enabledKey}
                      checked={isDisabledBySuperAdmin ? false : isEnabled}
                      onCheckedChange={(checked) => setData(enabledKey, checked)}
                      disabled={isDisabledBySuperAdmin || (!data.is_twilio_enabled && !data.is_hotsms_enabled)}
                    />
                  </div>
                  {isEnabled && !isDisabledBySuperAdmin && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <Label htmlFor={contentKey} className="text-xs font-medium text-gray-600">
                        {t('SMS Message Content')}
                      </Label>
                      <Textarea
                        id={contentKey}
                        value={(data[contentKey] as string) || ''}
                        onChange={(e) => setData(contentKey, e.target.value)}
                        rows={3}
                        className="mt-1.5"
                        placeholder="Hello {customer_name}, your order #{order_number} at {store_name} has been created."
                      />
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {t('Available variables: {customer_name}, {order_number}, {store_name}, {company_name}, {status}, {total_amount}, {order_date}')}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      </form>
    </SettingsSection>
  );
}
