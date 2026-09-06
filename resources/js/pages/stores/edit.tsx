import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Globe, Link2, Palette, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

function ToggleStatus({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {enabled ? t('Enabled') : t('Disabled')}
    </span>
  );
}

interface EditStoreProps {
 store: any;
 availableThemes: any[];
 planPermissions: any;
 serverIp: string;
}

export default function EditStore({ store, planPermissions }: EditStoreProps) {
 const { errors } = usePage().props as any;
 const { t } = useTranslation();
 const [formData, setFormData] = useState({
 name: store?.name || '',
 description: store?.description || '',
 email: store?.email || '',
 theme: store?.theme || 'core-minimal',
 enable_custom_domain: store?.enable_custom_domain || false,
 enable_custom_subdomain: store?.enable_custom_subdomain || false,
 custom_domain: store?.custom_domain || '',
 custom_subdomain: store?.custom_subdomain || '',
 // PWA fields
 enable_pwa: store?.enable_pwa || false,
 pwa_name: store?.pwa_name || '',
 pwa_short_name: store?.pwa_short_name || '',
 pwa_description: store?.pwa_description || '',
 pwa_theme_color: store?.pwa_theme_color || '#3B82F6',
 pwa_background_color: store?.pwa_background_color || '#ffffff',

 pwa_display: store?.pwa_display || 'standalone',
 pwa_orientation: store?.pwa_orientation || 'portrait',
 });

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const { id, value } = e.target;
 setFormData(prev => ({ ...prev, [id]: value }));
 };

 const handleSwitchChange = (field: string, checked: boolean) => {
 setFormData(prev => ({
 ...prev,
 [field]: checked,
 }));
 };

 const handleSubmit = () => {
 router.put(route('stores.update', store.id), formData);
 };

 const pageActions = [
 {
 label: t('Update Store'),
 icon: <Save className="h-4 w-4" />,
 variant: 'default' as const,
 onClick: handleSubmit
 }
 ];

 return (
 <PageTemplate
 title="معلومات المتجر"
 url="/stores/edit"
 actions={pageActions}
 backUrl={route('stores.index')}
 breadcrumbs={[
 { title: 'لوحة التحكم', href: route('dashboard') },
 { title: 'إدارة المتجر', href: route('stores.index') },
 { title: 'معلومات المتجر' }
 ]}
 >
 <form noValidate onSubmit={handleSubmit} className="space-y-6">
 <Tabs defaultValue="info" className="w-full">
 <TabsList className={`grid w-full ${planPermissions?.pwa_business ? 'grid-cols-2' : 'grid-cols-1'}`}>
   <TabsTrigger value="info">معلومات المتجر</TabsTrigger>
   {planPermissions?.pwa_business && (
   <TabsTrigger value="pwa">{t('PWA Settings')}</TabsTrigger>
   )}
 </TabsList>

   <TabsContent value="info" dir="rtl" className="space-y-4 pt-4">
   <Card>
 <CardHeader>
 <CardTitle>معلومات المتجر</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="grid gap-1 mb-4">
 <Label htmlFor="name" required>{t('Store Name')}</Label>
 <Input
 id="name"
 value={formData.name}
 onChange={handleChange}
 aria-invalid={!!errors.name}
 />
 <InputError message={errors.name} />
 </div>
 <div>
 <Label htmlFor="slug">{t('Store Slug')}</Label>
   <Input id="slug" value={store?.slug || ''} dir="ltr" disabled />
 </div>
 </div>
 <div>
 <Label htmlFor="description">{t('Description')}</Label>
 <Textarea id="description" value={formData.description} onChange={handleChange} />
 </div>
 <div className="grid gap-1 mb-4">
 <Label htmlFor="email" required>{t('Store Email')}</Label>
   <Input
   id="email"
   type="email"
   dir="ltr"
   value={formData.email}
 onChange={handleChange}
 aria-invalid={!!errors.email}
 />
 <InputError message={errors.email} />
 </div>
   </CardContent>
   </Card>

   {/* Store template / design — canonical destination is the Designer (six production templates) */}
   <Card>
 <CardHeader>
 <CardTitle>{t('Store Template')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <p className="text-sm text-muted-foreground">
 قالب المتجر وتخصيص شكله ومحتواه (الألوان، الشعار، الواجهة) يتم من مصمم المتجر.
 </p>
 <Button type="button" variant="outline" asChild className="gap-1.5">
 <a href={route('stores.designer', store.id)}>
 <Palette className="h-4 w-4" />
 فتح مصمم المتجر
 </a>
 </Button>
 </CardContent>
   </Card>

   {/* Store link & domain — canonical destination is the Domains page (subdomain + custom domain + DNS/SSL/verification) */}
   <Card>
 <CardHeader>
 <CardTitle>رابط المتجر والدومين</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <p className="text-sm text-muted-foreground">
 كل متجر يحصل تلقائيًا على رابط فرعي مجاني للعملاء. لإضافة دومين مخصص
 (مثل example.com) وربطه بالمتجر، استخدم صفحة الدومين — يتم هناك إعداد DNS
 والتحقق من الملكية ومتابعة شهادة SSL (حسب الباقة).
 </p>
 <Button type="button" variant="outline" asChild className="gap-1.5">
 <a href={route('stores.domains', store.id)}>
 <Globe className="h-4 w-4" />
 إدارة الدومين (دومين مخصص)
 </a>
 </Button>
 <p className="text-xs text-muted-foreground flex items-start gap-1.5">
 <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
 رابط المتجر الأساسي يُدار من صفحة الدومين لضمان تطابق الرابط المعروض للعملاء مع المتجر الفعلي.
 </p>
 </CardContent>
   </Card>
   </TabsContent>

   {planPermissions?.pwa_business && (
   <TabsContent value="pwa" className="space-y-4 pt-4">
 <Card>
 <CardHeader>
 <CardTitle>{t('PWA Settings')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <Label htmlFor="enable_pwa">{t('Enable PWA')}</Label>
 <p className="text-sm text-muted-foreground">
 {t('Make your store installable as a mobile app')}
 </p>
 </div>
   <div className="flex items-center gap-2">
   <Switch
   id="enable_pwa"
   checked={formData.enable_pwa}
   onCheckedChange={(checked) => handleSwitchChange('enable_pwa', checked)}
   />
   <ToggleStatus enabled={formData.enable_pwa} />
   </div>
   </div>

 {formData.enable_pwa && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="pwa_name" required>{t('App Name')}</Label>
 <Input
 id="pwa_name"
 placeholder={t('My Store App')}
 value={formData.pwa_name}
 onChange={handleChange}
 aria-invalid={!!errors.pwa_name}
 />
 <InputError message={errors.pwa_name} />
 </div>
 <div>
 <Label htmlFor="pwa_short_name" required>{t('Short Name')}</Label>
 <Input
 id="pwa_short_name"
 placeholder={t('MyStore')}
 maxLength={12}
 value={formData.pwa_short_name}
 onChange={handleChange}
 aria-invalid={!!errors.pwa_short_name}
 />
 <InputError message={errors.pwa_short_name} />
 <p className="text-xs text-muted-foreground mt-1">
 {t('Max 12 characters for home screen')}
 </p>
 </div>
 </div>

 <div>
 <Label htmlFor="pwa_description">{t('App Description')}</Label>
 <Textarea
 id="pwa_description"
 placeholder={t('Shop amazing products from our store')}
 value={formData.pwa_description}
 onChange={handleChange}
 />
 </div>



 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="pwa_theme_color">{t('Theme Color')}</Label>
 <Input
 id="pwa_theme_color"
 type="color"
 value={formData.pwa_theme_color}
 onChange={handleChange}
 />
 </div>
 <div>
 <Label htmlFor="pwa_background_color">{t('Background Color')}</Label>
 <Input
 id="pwa_background_color"
 type="color"
 value={formData.pwa_background_color}
 onChange={handleChange}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="pwa_display">{t('Display Mode')}</Label>
 <select
 id="pwa_display"
 value={formData.pwa_display}
 onChange={handleChange}
 className="w-full p-2 border rounded-md"
 >
 <option value="standalone">{t('Standalone')}</option>
 <option value="fullscreen">{t('Fullscreen')}</option>
 <option value="minimal-ui">{t('Minimal UI')}</option>
 <option value="browser">{t('Browser')}</option>
 </select>
 </div>
 <div>
 <Label htmlFor="pwa_orientation">{t('Orientation')}</Label>
 <select
 id="pwa_orientation"
 value={formData.pwa_orientation}
 onChange={handleChange}
 className="w-full p-2 border rounded-md"
 >
 <option value="portrait">{t('Portrait')}</option>
 <option value="landscape">{t('Landscape')}</option>
 <option value="any">{t('Any')}</option>
 </select>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
   </TabsContent>
   )}
 </Tabs>
 </form>
 </PageTemplate>
 );
}