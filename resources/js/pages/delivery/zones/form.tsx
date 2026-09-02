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

export default function DeliveryZoneForm() {
  const { t } = useTranslation();
  const { zone, errors } = usePage().props as any;
  const isEdit = !!zone;

  const [formData, setFormData] = React.useState({
    name: zone?.name || '',
    description: zone?.description || '',
    fee: zone?.fee ?? '',
    is_active: zone?.is_active ?? true,
    sort_order: zone?.sort_order ?? 0,
    est_time_text: zone?.est_time_text || '',
    free_delivery_threshold: zone?.free_delivery_threshold ?? '',
    min_order_amount: zone?.min_order_amount ?? '',
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name,
      description: formData.description || null,
      fee: Number(formData.fee),
      is_active: formData.is_active,
      sort_order: Number(formData.sort_order),
      est_time_text: formData.est_time_text || null,
      free_delivery_threshold: formData.free_delivery_threshold !== '' ? Number(formData.free_delivery_threshold) : null,
      min_order_amount: formData.min_order_amount !== '' ? Number(formData.min_order_amount) : null,
    };

    if (isEdit) {
      router.put(route('delivery.zones.update', zone.id), payload);
    } else {
      router.post(route('delivery.zones.store'), payload);
    }
  };

  return (
    <PageTemplate
      title={isEdit ? 'تعديل منطقة التوصيل' : 'إضافة منطقة توصيل'}
      description={isEdit ? `تعديل "${zone.name}"` : 'إنشاء منطقة توصيل جديدة'}
      url={isEdit ? `/delivery/zones/${zone.id}/edit` : '/delivery/zones/create'}
      backUrl={route('delivery.zones.index')}
      actions={[{
        label: 'حفظ',
        icon: <Save className="h-4 w-4" />,
        variant: 'default' as const,
        onClick: () => {
          document.querySelector('form#zone-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
        },
      }]}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'لوحة التوصيل', href: route('delivery.index') },
        { title: 'مناطق التوصيل', href: route('delivery.zones.index') },
        { title: isEdit ? 'تعديل' : 'إضافة' },
      ]}
    >
      <form id="zone-form" onSubmit={handleSubmit} className="max-w-2xl space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>بيانات المنطقة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <Label htmlFor="name" required>اسم المنطقة</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInput}
                placeholder="مثال: وسط المدينة"
                aria-invalid={!!errors.name}
              />
              <InputError message={errors.name} />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInput}
                placeholder="وصف اختياري للمنطقة"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="fee" required>رسوم التوصيل</Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fee}
                  onChange={handleInput}
                  placeholder="0.00"
                  aria-invalid={!!errors.fee}
                />
                <InputError message={errors.fee} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="est_time_text">الوقت المتوقع</Label>
                <Input
                  id="est_time_text"
                  name="est_time_text"
                  value={formData.est_time_text}
                  onChange={handleInput}
                  placeholder="مثال: 30-45 دقيقة"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="free_delivery_threshold">حد الشحن المجاني</Label>
                <Input
                  id="free_delivery_threshold"
                  name="free_delivery_threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.free_delivery_threshold}
                  onChange={handleInput}
                  placeholder="اتركه فارغاً للتعطيل"
                />
                <p className="text-xs text-muted-foreground">عند تجاوز هذا المبلغ يصبح التوصيل مجاني.</p>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="min_order_amount">الحد الأدنى للطلب</Label>
                <Input
                  id="min_order_amount"
                  name="min_order_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={handleInput}
                  placeholder="اتركه فارغاً للتعطيل"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="sort_order">الترتيب</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={handleInput}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <div>
                  <Label>نشطة</Label>
                  <p className="text-xs text-muted-foreground">تنشيط أو تعطيل المنطقة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">
            <Save className="h-4 w-4 me-2" />
            {isEdit ? 'تحديث المنطقة' : 'إنشاء المنطقة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.visit(route('delivery.zones.index'))}>إلغاء</Button>
        </div>
      </form>
    </PageTemplate>
  );
}
