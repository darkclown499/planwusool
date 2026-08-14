import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Edit, MapPin, Building2, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function ShowCity() {
  const { t } = useTranslation();
  const { city } = usePage().props as any;

  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const pageActions = [
    {
      label: t('Edit City'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('cities.edit', city.id))
    }
  ];

  return (
    <PageTemplate
      title={t('City Details')}
      url={`/cities/${city.id}/show`}
      actions={pageActions}
      backUrl={route('cities.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Location Management'), href: route('cities.index') },
        { title: t(`View ${city.name}`) }
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('City Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{city.name}</h2>
                <Badge variant={city.status ? 'default' : 'secondary'}>
                  {city.status ? t('Active') : t('Inactive')}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {t('State')}
                </div>
                <p className="font-semibold">{city.state?.name || t('Not specified')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  {t('Country')}
                </div>
                <p className="font-semibold">{city.state?.country?.name || t('Not specified')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('Created At')}
                </div>
                <p className="font-semibold">{formatDate(city.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
