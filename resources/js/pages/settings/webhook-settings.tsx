import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import WebhookSettings from '@/pages/settings/components/webhook-settings';

export default function WebhookSettingsPage() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Settings') },
    { title: t('Webhook Settings') },
  ];

  return (
    <PageTemplate
      title={t('Webhook Settings')}
      url="/settings/webhooks"
      description={t('Automate your store by sending event notifications to external URLs')}
      breadcrumbs={breadcrumbs}
    >
      <WebhookSettings />
    </PageTemplate>
  );
}
