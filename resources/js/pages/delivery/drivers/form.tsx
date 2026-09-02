import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

export default function DeliveryDriverForm() {
  const { t } = useTranslation();
  const { driver, return_to, errors } = usePage().props as any;
  const isEdit = !!driver;

  const backTarget = typeof return_to === 'string' && return_to ? return_to : route('delivery.drivers.index');

  const [formData, setFormData] = React.useState({
    name: driver?.name || '',
    phone: driver?.phone || '',
    active: driver?.active ?? true,
    notes: driver?.notes || '',
    vehicle_info: driver?.vehicle_info || '',
    code: driver?.code || '',
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name,
      phone: formData.phone || null,
      active: formData.active,
      notes: formData.notes || null,
      vehicle_info: formData.vehicle_info || null,
      code: formData.code || null,
    };

    if (isEdit) {
      router.put(route('delivery.drivers.update', driver.id), payload);
    } else {
      const createPayload = backTarget !== route('delivery.drivers.index')
        ? { ...payload, return_to: backTarget }
        : payload;
      router.post(route('delivery.drivers.store'), createPayload);
    }
  };

  return (
    <PageTemplate
      title={isEdit ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
      description={isEdit ? `تعديل بيانات "${driver.name}"` : 'إضافة سائق توصيل جديد'}
      url={isEdit ? `/delivery/drivers/${driver.id}/edit` : '/delivery/drivers/create'}
      backUrl={backTarget}
      actions={[{
        label: 'حفظ',
        icon: <Save className="h-4 w-4" />,
        variant: 'default' as const,
        onClick: () => {
          document.querySelector('form#driver-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
        },
      }]}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'لوحة التوصيل', href: route('delivery.index') },
        { title: 'السائقون', href: route('delivery.drivers.index') },
        { title: isEdit ? 'تعديل' : 'إضافة' },
      ]}
    >
      <form id="driver-form" onSubmit={handleSubmit} className="max-w-2xl space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>بيانات السائق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <Label htmlFor="name" required>اسم السائق</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInput}
                placeholder="اسم السائق الكامل"
                aria-invalid={!!errors.name}
              />
              <InputError message={errors.name} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInput}
                  placeholder="05xxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">سيتم تطبيع الرقم تلقائياً.</p>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="code">كود السائق</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInput}
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="vehicle_info">معلومات المركبة</Label>
              <Input
                id="vehicle_info"
                name="vehicle_info"
                value={formData.vehicle_info}
                onChange={handleInput}
                placeholder="مثال: دراجة نارية - 12345"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInput}
                placeholder="ملاحظات داخلية اختيارية"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <div>
                <Label>نشط</Label>
                <p className="text-xs text-muted-foreground">السائق النشطون فقط يمكن تعيينهم للطلبات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">
            <Save className="h-4 w-4 me-2" />
            {isEdit ? 'تحديث البيانات' : 'إضافة السائق'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.visit(backTarget)}>إلغاء</Button>
        </div>
      </form>
    </PageTemplate>
  );
}
