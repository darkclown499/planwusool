import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

export default function CreateCoupon() {
  const { t } = useTranslation();
  const { errors } = usePage().props as any;
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    discount_amount: '',
    minimum_spend: '',
    maximum_spend: '',
    start_date: '',
    expiry_date: '',
    use_limit_per_coupon: '',
    use_limit_per_user: '',
    status: true,
    code_type: 'manual'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handleSubmit = () => {
    // Format dates properly before submission
    const submissionData = {
      ...formData,
      start_date: formData.start_date || null,
      expiry_date: formData.expiry_date || null
    };
    router.post(route('coupon-system.store'), submissionData);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({
      ...formData,
      code: result
    });
  };

  const pageActions = [
    {
      label: t('Save Coupon'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Coupon')}
      url="/coupon-system/create"
      actions={pageActions}
      backUrl={route('coupon-system.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Coupon System'), href: route('coupon-system.index') },
        { title: t('Create Coupon') }
      ]}
    >
      <form noValidate className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="restrictions">{t('Restrictions')}</TabsTrigger>
            <TabsTrigger value="usage">{t('Usage Limits')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Coupon Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="name" required>{t('Coupon Name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('Enter coupon name')}
                      aria-invalid={!!errors.name}
                    />
                    <InputError message={errors.name} />
                  </div>
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="code" required>{t('Coupon Code')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="code" 
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder={t('SAVE20')}
                        aria-invalid={!!errors.code}
                      />
                      <button 
                        type="button"
                        onClick={generateCode}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary shrink-0"
                      >
                        {t('Generate')}
                      </button>
                    </div>
                    <InputError message={errors.code} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">{t('Description')}</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={t('Coupon description')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="type" required>{t('Discount Type')}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange('type', value)}
                    >
                      <SelectTrigger aria-invalid={!!errors.type}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t('Percentage Discount')}</SelectItem>
                        <SelectItem value="flat">{t('Fixed Amount')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <InputError message={errors.type} />
                  </div>
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="discount_amount" required>
                      {formData.type === 'percentage' ? t('Discount Percentage (%)') : t('Discount Amount ($)')}
                    </Label>
                    <Input 
                      id="discount_amount" 
                      name="discount_amount"
                      type="number" 
                      step={formData.type === 'percentage' ? '1' : '0.01'} 
                      value={formData.discount_amount}
                      onChange={handleChange}
                      placeholder={formData.type === 'percentage' ? t('20') : t('10.00')}
                      aria-invalid={!!errors.discount_amount}
                    />
                    <InputError message={errors.discount_amount} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">{t('Start Date')}</Label>
                    <Input 
                      id="start_date" 
                      name="start_date"
                      type="date" 
                      value={formData.start_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">{t('End Date')}</Label>
                    <Input 
                      id="expiry_date" 
                      name="expiry_date"
                      type="date" 
                      value={formData.expiry_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Coupon Status')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Enable or disable coupon')}</p>
                  </div>
                  <Switch 
                    checked={formData.status}
                    onCheckedChange={(checked) => handleSwitchChange('status', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Usage Restrictions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_spend">{t('Minimum Spend Amount')}</Label>
                    <Input 
                      id="minimum_spend" 
                      name="minimum_spend"
                      type="number" 
                      step="0.01" 
                      value={formData.minimum_spend}
                      onChange={handleChange}
                      placeholder="0.00" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="maximum_spend">{t('Maximum Spend Amount')}</Label>
                    <Input 
                      id="maximum_spend" 
                      name="maximum_spend"
                      type="number" 
                      step="0.01" 
                      value={formData.maximum_spend}
                      onChange={handleChange}
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Usage Limits')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="use_limit_per_coupon">{t('Usage Limit per Coupon')}</Label>
                    <Input 
                      id="use_limit_per_coupon" 
                      name="use_limit_per_coupon"
                      type="number" 
                      value={formData.use_limit_per_coupon}
                      onChange={handleChange}
                      placeholder={t('Unlimited')} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="use_limit_per_user">{t('Usage Limit per User')}</Label>
                    <Input 
                      id="use_limit_per_user" 
                      name="use_limit_per_user"
                      type="number" 
                      value={formData.use_limit_per_user}
                      onChange={handleChange}
                      placeholder={t('1')} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </PageTemplate>
  );
}
