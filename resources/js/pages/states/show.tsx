import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Edit, MapPin, Globe, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function ShowState() {
  const { t } = useTranslation();
  const { state } = usePage().props as any;

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
      label: t('Edit State'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('states.edit', state.id))
    }
  ];

  return (
    <PageTemplate
      title={t('State Details')}
      url={`/states/${state.id}/show`}
      actions={pageActions}
      backUrl={route('states.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Location Management'), href: route('states.index') },
        { title: t(`View ${state.name}`) }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('State Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{state.name}</h2>
                  <Badge variant={state.status ? 'default' : 'secondary'}>
                    {state.status ? t('Active') : t('Inactive')}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    {t('Country')}
                  </div>
                  <p className="font-semibold">{state.country?.name || t('Not specified')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {t('Total Cities')}
                  </div>
                  <p className="font-semibold">{state.cities?.length || 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t('Created At')}
                  </div>
                  <p className="font-semibold">{formatDate(state.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Cities in this State')}</CardTitle>
            </CardHeader>
            <CardContent>
              {state.cities && state.cities.length > 0 ? (
                <div className="space-y-2">
                  {state.cities.map((city: any) => (
                    <div key={city.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{city.name}</p>
                      </div>
                      <Badge variant={city.status ? 'default' : 'secondary'}>
                        {city.status ? t('Active') : t('Inactive')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('No cities found for this state.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
