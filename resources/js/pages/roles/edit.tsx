import { PageTemplate } from '@/components/page-template';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RolePermissionCheckboxGroup } from '@/components/RolePermissionCheckboxGroup';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function EditRole() {
  const { t } = useTranslation();
  const { role, permissions, auth } = usePage().props as any;
  const [isOpen, setIsOpen] = useState(true);

  const [formData, setFormData] = useState({
    label: role.label || '',
    description: role.description || '',
    permissions: (role.permissions || []).map((p: any) => p.name)
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    router.put(route('roles.update', role.id), formData, {
      onSuccess: () => {
        router.get(route('roles.index'));
      },
      onFinish: () => setSubmitting(false)
    });
  };

  const handleClose = () => {
    router.get(route('roles.index'));
  };

  return (
    <PageTemplate title={t('Edit Role')} url={`/roles/${role.id}/edit`}>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Edit Role')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">{t('Role Name')} *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('Manage Permissions')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('Select permissions for this role. You can select all permissions at once or manage them by module.')}
                {auth?.user?.type !== 'superadmin' && (
                  <span className="block mt-1 text-amber-600">
                    {t('Note: Only permissions for modules available to your role are shown.')}
                  </span>
                )}
              </p>
              <RolePermissionCheckboxGroup
                permissions={permissions}
                selectedPermissions={formData.permissions}
                onChange={(selected) => setFormData(prev => ({ ...prev, permissions: selected }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={!formData.label || submitting}>
                {t('Update Role')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
