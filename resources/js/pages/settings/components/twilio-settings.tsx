import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('settings.twilio'), {
      preserveScroll: true,
    });
  };

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
      <form id="twilio-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Provider selection */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <Label className="font-medium text-gray-900">{t('SMS Provider')}</Label>
          <RadioGroup
            value={data.sms_provider}
            onValueChange={(value) => setData('sms_provider', value as 'twilio' | 'hotsms')}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="twilio" id="provider-twilio" />
              <Label htmlFor="provider-twilio" className="font-medium">Twilio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hotsms" id="provider-hotsms" />
              <Label htmlFor="provider-hotsms" className="font-medium">HotSMS</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Twilio Configuration */}
        {data.sms_provider === 'twilio' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable/Disable Twilio */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg md:col-span-2">
              <Label htmlFor="is_twilio_enabled" className="font-medium text-gray-900">
                {t('Enable Twilio SMS')}
              </Label>
              <Switch
                id="is_twilio_enabled"
                checked={data.is_twilio_enabled}
                onCheckedChange={(checked) => setData('is_twilio_enabled', checked)}
              />
            </div>

            {data.is_twilio_enabled && (
              <>
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
                      variant="outline"
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
          </div>
        )}

        {/* HotSMS Configuration */}
        {data.sms_provider === 'hotsms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable/Disable HotSMS */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg md:col-span-2">
              <Label htmlFor="is_hotsms_enabled" className="font-medium text-gray-900">
                {t('Enable HotSMS SMS')}
              </Label>
              <Switch
                id="is_hotsms_enabled"
                checked={data.is_hotsms_enabled}
                onCheckedChange={(checked) => setData('is_hotsms_enabled', checked)}
              />
            </div>

            {data.is_hotsms_enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hotsms_user_name">{t('HotSMS Username')}</Label>
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
                  <Label htmlFor="hotsms_password">{t('HotSMS Password')}</Label>
                  <Input
                    id="hotsms_password"
                    type="password"
                    value={data.hotsms_password}
                    onChange={(e) => setData('hotsms_password', e.target.value)}
                    placeholder={t('Leave blank to keep the current password')}
                  />
                  <p className="text-xs text-gray-500">{t('Password is masked for security. Only enter a new value to replace it.')}</p>
                  {errors.hotsms_password && (
                    <p className="text-sm text-red-600">{errors.hotsms_password}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hotsms_sender">{t('HotSMS Sender Name')}</Label>
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

                {/* Owner notification */}
                <div className="md:col-span-2 space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="hotsms_notify_owner" className="font-medium text-gray-900">
                        {t('Notify owner of new orders')}
                      </Label>
                      <p className="text-sm text-gray-500">{t('Send a copy of the SMS to the store owner')}</p>
                    </div>
                    <Switch
                      id="hotsms_notify_owner"
                      checked={data.hotsms_notify_owner}
                      onCheckedChange={(checked) => setData('hotsms_notify_owner', checked)}
                    />
                  </div>
                  {data.hotsms_notify_owner && (
                    <div className="space-y-2">
                      <Label htmlFor="hotsms_owner_phone">{t('Owner Phone Number')}</Label>
                      <Input
                        id="hotsms_owner_phone"
                        type="text"
                        value={data.hotsms_owner_phone}
                        onChange={(e) => setData('hotsms_owner_phone', e.target.value)}
                        placeholder="+97059XXXXXXX"
                      />
                    </div>
                  )}
                </div>

                {/* Test SMS */}
                <div className="md:col-span-2 space-y-4 border-t pt-4">
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
                      variant="outline"
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
          </div>
        )}

        {/* SMS Templates (مشتركة بين المزودين) */}
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
                    disabled={isDisabledBySuperAdmin || (!data.is_twilio_enabled && !data.is_hotsms_enabled)}
                  />
                </div>
                {isEnabled && !isDisabledBySuperAdmin && (
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
