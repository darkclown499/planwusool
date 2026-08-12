import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '@/components/settings-section';
import { Save, Send } from 'lucide-react';

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
  is_twilio_enabled: boolean;
  twilio_sid: string;
  twilio_token: string;
  twilio_from: string;
  twilio_notify_owner: boolean;
  twilio_owner_phone: string;
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

  const initialData: TwilioFormData = {
    is_twilio_enabled: systemSettings?.is_twilio_enabled === 'on',
    twilio_sid: systemSettings?.twilio_sid || '',
    twilio_token: systemSettings?.twilio_token || '',
    twilio_from: systemSettings?.twilio_from || '',
    twilio_notify_owner: systemSettings?.twilio_notify_owner === 'on',
    twilio_owner_phone: systemSettings?.twilio_owner_phone || '',
  };
  templateEntries.forEach(({ enabledKey, contentKey }) => {
    initialData[enabledKey] = systemSettings?.[enabledKey] === 'on';
    initialData[contentKey] = systemSettings?.[contentKey] || '';
  });

  const { data, setData, post, processing, errors } = useForm<TwilioFormData>(initialData);

  const testForm = useForm({
    twilio_sid: systemSettings?.twilio_sid || '',
    twilio_token: systemSettings?.twilio_token || '',
    twilio_from: systemSettings?.twilio_from || '',
    phone: systemSettings?.twilio_owner_phone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('settings.twilio'), {
      preserveScroll: true,
    });
  };

  return (
    <SettingsSection
      title={t('Twilio Settings')}
      description={t('Configure Twilio SMS settings for your store')}
      action={
        <Button type="submit" form="twilio-form" size="sm" disabled={processing}>
          <Save className="h-4 w-4 me-2" />
          {processing ? t('Saving...') : t('Save Changes')}
        </Button>
      }
    >
      <form id="twilio-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Enable/Disable Twilio */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <Label htmlFor="is_twilio_enabled" className="font-medium text-gray-900">
            {t('Enable Twilio SMS')}
          </Label>
          <Switch
            id="is_twilio_enabled"
            checked={data.is_twilio_enabled}
            onCheckedChange={(checked) => setData('is_twilio_enabled', checked)}
          />
        </div>

        {/* Twilio Configuration */}
        {data.is_twilio_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twilio_sid">{t('Twilio SID')}</Label>
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
              <Label htmlFor="twilio_token">{t('Twilio Auth Token')}</Label>
              <Input
                id="twilio_token"
                type="password"
                value={data.twilio_token}
                onChange={(e) => setData('twilio_token', e.target.value)}
                placeholder={t('Leave blank to keep the current token')}
              />
              <p className="text-xs text-gray-500">{t('Token is masked for security. Only enter a new value to replace it.')}</p>
              {errors.twilio_token && (
                <p className="text-sm text-red-600">{errors.twilio_token}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="twilio_from">{t('From Number')}</Label>
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

            {/* Owner notification */}
            <div className="md:col-span-2 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="twilio_notify_owner" className="font-medium text-gray-900">
                    {t('Notify owner of new orders')}
                  </Label>
                  <p className="text-sm text-gray-500">{t('Send a copy of the SMS to the store owner')}</p>
                </div>
                <Switch
                  id="twilio_notify_owner"
                  checked={data.twilio_notify_owner}
                  onCheckedChange={(checked) => setData('twilio_notify_owner', checked)}
                />
              </div>
              {data.twilio_notify_owner && (
                <div className="space-y-2">
                  <Label htmlFor="twilio_owner_phone">{t('Owner Phone Number')}</Label>
                  <Input
                    id="twilio_owner_phone"
                    type="text"
                    value={data.twilio_owner_phone}
                    onChange={(e) => setData('twilio_owner_phone', e.target.value)}
                    placeholder="+97059XXXXXXX"
                  />
                </div>
              )}
            </div>

            {/* Test SMS */}
            <div className="md:col-span-2 space-y-4 border-t pt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="test_phone">{t('Send Test SMS to')}</Label>
                  <Input
                    id="test_phone"
                    type="text"
                    value={testForm.data.phone}
                    onChange={(e) => testForm.setData('phone', e.target.value)}
                    placeholder="+97059XXXXXXX"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testForm.processing}
                  onClick={() => testForm.post(route('settings.twilio.test'), { preserveScroll: true })}
                >
                  <Send className="h-4 w-4 me-2" />
                  {testForm.processing ? t('Sending...') : t('Send Test SMS')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SMS Templates */}
        <div className="grid grid-cols-1 gap-4">
          {templateEntries.map(({ template, enabledKey, contentKey }) => {
            const isEnabled = data[enabledKey] === true;
            const isDisabledBySuperAdmin = template.status === 'off' || template.status === 0;
            const templateName = template.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

            return (
              <div key={template.id} className={`p-4 rounded-lg border ${
                isDisabledBySuperAdmin ? 'bg-gray-200 opacity-60' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <Label htmlFor={enabledKey} className={`font-medium ${
                    isDisabledBySuperAdmin ? 'text-gray-500' : 'text-gray-900'
                  }`}>
                    {t(templateName)}
                    {isDisabledBySuperAdmin && (
                      <span className="text-xs text-red-600 block">{t('(Disabled by Admin)')}</span>
                    )}
                  </Label>
                  <Switch
                    id={enabledKey}
                    checked={isDisabledBySuperAdmin ? false : isEnabled}
                    onCheckedChange={(checked) => setData(enabledKey, checked)}
                    disabled={!data.is_twilio_enabled || isDisabledBySuperAdmin}
                  />
                </div>
                {data.is_twilio_enabled && isEnabled && !isDisabledBySuperAdmin && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={contentKey} className="text-xs text-gray-600">
                      {t('SMS Message Content')}
                    </Label>
                    <Textarea
                      id={contentKey}
                      value={(data[contentKey] as string) || ''}
                      onChange={(e) => setData(contentKey, e.target.value)}
                      rows={3}
                      placeholder="Hello {customer_name}, your order #{order_number} at {store_name} has been created."
                    />
                    <p className="text-xs text-gray-500">
                      {t('Available variables: {customer_name}, {order_number}, {store_name}, {company_name}, {status}, {total_amount}, {order_date}')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </form>
    </SettingsSection>
  );
}