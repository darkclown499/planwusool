import React, { useState, FormEvent } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

export default function CreateTax() {
  const { t } = useTranslation();
  const { currencySymbol, errors } = usePage().props as any;

  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    type: 'percentage',
    // region: '',
    priority: '1',
    compound: false,
    is_active: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };
  
  const handleCompoundChange = (value: string) => {
    setFormData(prev => ({ ...prev, compound: value === 'yes' }));
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    router.post(route('tax.store'), formData);
  };

  const pageActions = [
    {
      label: t('Save Tax'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleSubmit()
    }
  ];

  return (
    <PageTemplate
      title={t('Create Tax')}
      description={t('Create a new tax rule for your store')}
      url="/tax/create"
      actions={pageActions}
      backUrl={route('tax.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('tax.index') },
        { title: t('Tax'), href: route('tax.index') },
        { title: t('Create Tax') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>{t('Tax Rule Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name" required>{t('Tax Name')}</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('Tax Name Placeholder')}
                aria-invalid={!!errors.name}
              />
              <InputError message={errors.name} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="type">{t('Tax Type')}</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select tax type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('Percentage')}</SelectItem>
                    <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rate" required>{t('Tax Rate')} ({formData.type === 'percentage' ? '%' : (currencySymbol || '₪')})</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={handleChange}
                  placeholder="0.00"
                  aria-invalid={!!errors.rate}
                />
                <InputError message={errors.rate} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="priority">{t('Priority')}</Label>
                <Input 
                  id="priority" 
                  name="priority" 
                  type="number" 
                  value={formData.priority} 
                  onChange={handleChange} 
                  placeholder="1" 
                />
                <p className="text-sm text-muted-foreground">{t('Priority Helper')}</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="compound">{t('Compound Tax')}</Label>
                <Select 
                  value={formData.compound ? 'yes' : 'no'} 
                  onValueChange={(value) => handleCompoundChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select compound option')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">{t('No')}</SelectItem>
                    <SelectItem value="yes">{t('Yes')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{t('Compound Tax Helper')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="text-start">
                <Label>{t('Tax Status')}</Label>
                <p className="text-sm text-muted-foreground">{t('Enable or disable tax rule')}</p>
              </div>
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={handleSwitchChange} 
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </PageTemplate>
  );
}