import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import WebhookSettings from '@/pages/settings/components/webhook-settings';

export default function WebhooksIndex() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Webhooks') },
  ];

  return (
    <PageTemplate
      title={t('Webhooks')}
      url="/webhooks"
      description={t('Automate your store by sending event notifications to external URLs')}
      breadcrumbs={breadcrumbs}
    >
      <WebhookSettings />
    </PageTemplate>
  );
}
