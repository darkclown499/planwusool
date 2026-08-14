import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Edit, Shield, Users, FileText, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionBadges } from '@/components/PermissionBadges';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function ViewRole() {
  const { t } = useTranslation();
  const { role, auth } = usePage().props as any;

  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const pageActions = auth?.user?.can?.['edit-roles'] ? [
    {
      label: t('Edit Role'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('roles.edit', role.id))
    }
  ] : [];

  return (
    <PageTemplate
      title={t('Role Details')}
      url={`/roles/${role.id}/view`}
      actions={pageActions}
      backUrl={route('roles.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Staff Management'), href: route('users.index') },
        { title: t('Roles'), href: route('roles.index') },
        { title: t(`View ${role.label}`) }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('Role Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{role.label}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="rounded bg-muted px-2 py-0.5 text-xs">{role.name}</code>
                    {role.is_system_role && (
                      <Badge variant="secondary">{t('System Role')}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  {t('Description')}
                </div>
                <p>{role.description || t('No description provided.')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {t('Created By')}
                  </div>
                  <p className="font-semibold">{role.creator?.name || t('System')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {t('Created At')}
                  </div>
                  <p className="font-semibold">{formatDate(role.created_at)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {t('Last Updated')}
                  </div>
                  <p className="font-semibold">{formatDate(role.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Permissions')}</CardTitle>
            </CardHeader>
            <CardContent>
              {role.permissions && role.permissions.length > 0 ? (
                <PermissionBadges permissions={role.permissions} maxDisplay={100} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('No permissions assigned to this role.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
