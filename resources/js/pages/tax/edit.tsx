import React, { useState, FormEvent, useEffect } from 'react';
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

export default function EditTax() {
  const { t } = useTranslation();
  const { tax, currencySymbol, errors } = usePage().props as any;

  const [formData, setFormData] = useState({
    name: tax?.name || '',
    rate: tax?.rate ? String(tax.rate) : '',
    type: tax?.type || 'percentage',
    // region: tax?.region || '',
    priority: tax?.priority ? String(tax.priority) : '1',
    compound: tax?.compound || false,
    is_active: tax?.is_active !== undefined ? tax.is_active : true
  });
  
  // Initialize form data from tax prop
  useEffect(() => {
    if (tax) {
      setFormData({
        name: tax.name || '',
        rate: String(tax.rate) || '',
        type: tax.type || 'percentage',
        // region: tax.region || '',
        priority: String(tax.priority) || '1',
        compound: Boolean(tax.compound),
        is_active: tax.is_active !== undefined ? tax.is_active : true
      });
    }
  }, [tax]);

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
    router.put(route('tax.update', tax.id), formData);
  };

  const pageActions = [
    {
      label: t('Update Tax'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleSubmit()
    }
  ];

  return (
    <PageTemplate 
      title={t('Edit Tax')}
      description={t('Update existing tax rule settings')}
      url="/tax/edit"
      actions={pageActions}
      backUrl={route('tax.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('tax.index') },
        { title: t('Tax'), href: route('tax.index') },
        { title: t('Edit Tax') }
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
                  key={tax ? `type-${tax.id}` : 'type-new'}
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
                  key={tax ? `compound-${tax.id}` : 'compound-new'}
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