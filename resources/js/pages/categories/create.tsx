import React, { useState, FormEvent } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import InputError from '@/components/input-error';

export default function CreateCategory() {
  const { t } = useTranslation();
  const { parentCategories } = usePage().props as any;
  const { errors } = usePage().props as any;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    parent_id: '',
    sort_order: 0,
    is_active: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    // Convert 'none' to empty string for parent_id
    const finalValue = name === 'parent_id' && value === 'none' ? '' : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleImageChange = (value: string) => {
    setFormData(prev => ({ ...prev, image: value }));
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    router.post(route('categories.store'), formData);
  };

  const pageActions = [
    {
      label: t('Save Category'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Category')}
      url="/categories/create"
      actions={pageActions}
      backUrl={route('categories.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Categories'), href: route('categories.index') },
        { title: t('Create Category') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>{t('Category Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name" required>{t('Category Name')}</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder={t('Enter category name')} 
                aria-invalid={!!errors.name}
              />
              <InputError message={errors.name} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">{t('Description')}</Label>
              <Textarea
                id="description" 
                name="description" 
                rows={3}
                value={formData.description} 
                onChange={handleChange} 
                placeholder={t('Category description')} 
                aria-invalid={!!errors.description}
              />
              <InputError message={errors.description} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('Category Image')}</Label>
              <MediaPicker
                label={t('Category Image')}
                value={formData.image}
                onChange={handleImageChange}
                placeholder={t('Select category image...')}
                required
                dragDrop
                showPreview
              />
              <InputError message={errors.image} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="parent_id">{t('Parent Category (optional)')}</Label>
                <Select 
                  value={formData.parent_id} 
                  onValueChange={(value) => handleSelectChange('parent_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select parent category (subcategory hint)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('None (Root Category)')}</SelectItem>
                    {parentCategories && parentCategories.map((category: any) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sort_order">{t('Sort Order (Display)')}</Label>
                <Input 
                  id="sort_order" 
                  name="sort_order" 
                  type="number" 
                  value={formData.sort_order} 
                  onChange={handleChange} 
                  placeholder="0" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="text-start">
                <Label>{t('Category Status')}</Label>
                <p className="text-sm text-muted-foreground">{t('Enable or disable category')}</p>
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