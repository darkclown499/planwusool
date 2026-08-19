import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function EmailNotificationSettings() {
  const { t } = useTranslation();
  const pageProps = usePage().props as any;
  
  // Get settings data from page props
  const settingsData = pageProps.systemSettings || pageProps.settings || pageProps.globalSettings || {};
  
  const emailTemplates = [
    { key: 'Order Created', label: 'تأكيد الطلب للعميل', description: 'إرسال رسالة بريدية تلقائية عند تأكيد الطلب.' },
    { key: 'Order Created For Owner', label: 'إشعار المالك عند استلام طلب جديد', description: 'إرسال رسالة بريدية تلقائية للمالك عند استلام طلب جديد.' },
    { key: 'Owner And Store Created', label: 'إنشاء حساب المالك والمتجر', description: 'إرسال رسالة بريدية تلقائية عند إنشاء حساب جديد.' },
    { key: 'Status Change', label: 'تحديث حالة الطلب', description: 'إرسال رسالة بريدية تلقائية عند تغير حالة الطلب.' },
    { key: 'User Created', label: 'تسجيل مستخدم جديد', description: 'إرسال رسالة بريدية تلقائية عند تسجيل مستخدم جديد.' },
  ];
  
  const [notifications, setNotifications] = useState(() => {
    const initial: Record<string, boolean> = {};
    emailTemplates.forEach(template => {
      initial[template.key] = settingsData[template.key] === 'on';
    });
    return initial;
  });

  const [dirty, setDirty] = useState(false);
  
  // Update state when settings change
  useEffect(() => {
    if (Object.keys(settingsData).length > 0) {
      const updatedNotifications: Record<string, boolean> = {};
      emailTemplates.forEach(template => {
        updatedNotifications[template.key] = settingsData[template.key] === 'on';
      });
      setNotifications(updatedNotifications);
    }
  }, [settingsData]);

  const handleToggle = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
    setDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mailNoti = Object.entries(notifications).reduce((acc, [key, value]) => {
      acc[key] = value ? 'on' : 'off';
      return acc;
    }, {} as Record<string, string>);

    router.post(route('email.notification.setting.store'), {
      mail_noti: mailNoti
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setDirty(false);
      },
      onError: (errors) => {
        // Handle errors if needed
      }
    });
  };

  return (
    <SettingsSection
      title={t('Email Notification Settings')}
      description={t('Configure email notification preferences for your store')}
    >
      <form id="email-notification-form" onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailTemplates.map((template) => (
            <div key={template.key} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300">
              <div className="min-w-0">
                <Label htmlFor={template.key} className="font-medium text-slate-900">
                  {template.label}
                </Label>
                {template.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
                )}
              </div>
              <Switch
                id={template.key}
                checked={notifications[template.key] || false}
                onCheckedChange={(checked) => handleToggle(template.key, checked)}
                className="mt-0.5 flex-shrink-0"
              />
            </div>
          ))}
        </div>
      </form>

      {/* Floating sticky save bar when toggles changed */}
      {dirty && (
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-2 fade-in">
          <p className="text-sm text-muted-foreground">{t('Unsaved changes')}</p>
          <Button type="submit" form="email-notification-form">
            <Save className="h-4 w-4 ms-2" />
            {t('Save Changes')}
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}