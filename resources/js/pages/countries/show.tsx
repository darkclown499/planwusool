import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Edit, Globe, MapPin, Clock, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function ShowCountry() {
  const { t } = useTranslation();
  const { country } = usePage().props as any;

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
      label: t('Edit Country'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('countries.edit', country.id))
    }
  ];

  return (
    <PageTemplate
      title={t('Country Details')}
      url={`/countries/${country.id}/show`}
      actions={pageActions}
      backUrl={route('countries.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Location Management'), href: route('countries.index') },
        { title: t(`View ${country.name}`) }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Country Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{country.name}</h2>
                  <Badge variant={country.status ? 'default' : 'secondary'}>
                    {country.status ? t('Active') : t('Inactive')}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Country Code')}</p>
                  <p className="font-semibold uppercase">{country.code || t('Not specified')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Total States')}</p>
                  <p className="font-semibold">{country.states?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Total Cities')}</p>
                  <p className="font-semibold">
                    {(country.states || []).reduce((sum: number, s: any) => sum + (s.cities_count || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Created At')}</p>
                  <p className="font-semibold">{formatDate(country.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('States in this Country')}</CardTitle>
            </CardHeader>
            <CardContent>
              {country.states && country.states.length > 0 ? (
                <div className="space-y-3">
                  {country.states.map((state: any) => (
                    <div key={state.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{state.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {state.cities_count || 0} {t('cities')}
                          </p>
                        </div>
                      </div>
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('No states found for this country.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
