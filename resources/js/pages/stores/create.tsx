import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { getStoreThemes, storeThemeCategories } from '@/data/storeThemes';
import MediaPicker from '@/components/MediaPicker';
import InputError from '@/components/input-error';

interface PlanPermissions {
 enable_custdomain: boolean;
 enable_custsubdomain: boolean;
 pwa_business: boolean;
}

interface CreateStoreProps {
 availableThemes: string[] | null;
 planPermissions: PlanPermissions;
 serverIp: string;
}

export default function CreateStore({ availableThemes, planPermissions, serverIp }: CreateStoreProps) {
 const { errors } = usePage().props as any;
 const { t } = useTranslation();
 const [formData, setFormData] = useState({
 name: '',
 description: '',
 email: '',
 theme: 'basic',
 enable_custom_domain: false,
 enable_custom_subdomain: false,
 custom_domain: '',
 custom_subdomain: '',
 // PWA fields
 enable_pwa: false,
 pwa_name: '',
 pwa_short_name: '',
 pwa_description: '',
 pwa_theme_color: '#3B82F6',
 pwa_background_color: '#ffffff',

 pwa_display: 'standalone',
 pwa_orientation: 'portrait',
 });

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const { id, value } = e.target;
 setFormData(prev => ({ ...prev, [id]: value }));
 };

 const handleSwitchChange = (field: string, checked: boolean) => {
 setFormData(prev => ({
 ...prev,
 [field]: checked,
 // If enabling one, disable the other
 ...(field === 'enable_custom_domain' && checked ? { enable_custom_subdomain: false } : {}),
 ...(field === 'enable_custom_subdomain' && checked ? { enable_custom_domain: false } : {}),
 }));
 };

 const handleSubmit = () => {
 router.post(route('stores.store'), formData);
 };

 const pageActions = [
 {
 label: t('Save Store'),
 icon: <Save className="h-4 w-4" />,
 variant: 'default' as const,
 onClick: handleSubmit
 }
 ];

 return (
 <PageTemplate
 title={t('Create Store')}
 url="/stores/create"
 actions={pageActions}
 backUrl={route('stores.index')}
 breadcrumbs={[
 { title: t('Dashboard'), href: route('dashboard') },
 { title: t('Store Management'), href: route('stores.index') },
 { title: t('Create Store') }
 ]}
 >
 <form noValidate onSubmit={handleSubmit} className="space-y-6">
 <Tabs defaultValue="info" className="w-full">
 <TabsList className={`grid w-full ${planPermissions?.pwa_business ? 'grid-cols-3' : 'grid-cols-2'}`}>
 <TabsTrigger value="info">{t('Store Information')}</TabsTrigger>
 <TabsTrigger value="theme">{t('Store Theme')}</TabsTrigger>
 {planPermissions?.pwa_business && (
 <TabsTrigger value="pwa">{t('PWA Settings')}</TabsTrigger>
 )}
 </TabsList>

 <TabsContent value="info" className="space-y-4 pt-4">
 <Card>
 <CardHeader>
 <CardTitle>{t('Store Information')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="grid gap-1 mb-4">
 <Label htmlFor="name" required>{t('Store Name')}</Label>
 <Input
 id="name"
 placeholder={t('Enter store name')}
 value={formData.name}
 onChange={handleChange}
 aria-invalid={!!errors.name}
 />
 <InputError message={errors.name} />
 </div>
 <div>
 <Label htmlFor="slug">{t('Store Slug')}</Label>
 <Input id="slug" placeholder={t('store-slug')} />
 </div>
 </div>
 <div>
 <Label htmlFor="description">{t('Description')}</Label>
 <Textarea id="description" placeholder={t('Store description')} value={formData.description} onChange={handleChange} />
 </div>
 <div className="grid gap-1 mb-4">
 <Label htmlFor="email" required>{t('Store Email')}</Label>
 <Input
 id="email"
 type="email"
 placeholder={t('store@example.com')}
 value={formData.email}
 onChange={handleChange}
 aria-invalid={!!errors.email}
 />
 <InputError message={errors.email} />
 </div>
 </CardContent>
 </Card>

 {/* Domain Configuration */}
 <Card>
 <CardHeader>
 <CardTitle>{t('Domain Configuration')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Custom Domain */}
 {planPermissions?.enable_custdomain && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <Label htmlFor="enable_custom_domain">{t('Enable Custom Domain')}</Label>
 <p className="text-sm text-muted-foreground">
 {t('Use your own domain (e.g., example.com)')}
 </p>
 </div>
 <Switch
 id="enable_custom_domain"
 checked={formData.enable_custom_domain}
 onCheckedChange={(checked) => handleSwitchChange('enable_custom_domain', checked)}
 />
 </div>
 {formData.enable_custom_domain && (
 <div className="grid gap-1 mb-4">
 <Label htmlFor="custom_domain">{t('Custom Domain')}</Label>
 <Input
 id="custom_domain"
 placeholder={t('example.com')}
 value={formData.custom_domain}
 onChange={handleChange}
 aria-invalid={!!errors.custom_domain}
 required
 />
 <InputError message={errors.custom_domain} />
 <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
 <p className="text-sm text-blue-800">
 <strong>{t('Your Server IP Is:')} {serverIp}</strong>
 </p>
 <p className="text-xs text-blue-600 mt-1">
 {t('Point your domain A record to this IP address')}
 </p>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Custom Subdomain */}
 {planPermissions?.enable_custsubdomain && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <Label htmlFor="enable_custom_subdomain">{t('Enable Custom Subdomain')}</Label>
 <p className="text-sm text-muted-foreground">
 {t('Use a subdomain (e.g., mystore.yourdomain.com)')}
 </p>
 </div>
 <Switch
 id="enable_custom_subdomain"
 checked={formData.enable_custom_subdomain}
 onCheckedChange={(checked) => handleSwitchChange('enable_custom_subdomain', checked)}
 />
 </div>
 {formData.enable_custom_subdomain && (
 <div className="grid gap-1 mb-4">
 <Label htmlFor="custom_subdomain">{t('Subdomain')}</Label>
 <Input
 id="custom_subdomain"
 placeholder={t('mystore')}
 value={formData.custom_subdomain}
 onChange={handleChange}
 aria-invalid={!!errors.custom_subdomain}
 required
 />
 <InputError message={errors.custom_subdomain} />
 <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
 <p className="text-sm text-green-800">
 <strong>{t('Your Sub Domain IP Is:')} {serverIp}</strong>
 </p>
 <p className="text-xs text-green-600 mt-1">
 {t('Will create: {{subdomain}}.yourdomain.com', { subdomain: formData.custom_subdomain || 'mystore' })}
 </p>
 </div>
 </div>
 )}
 </div>
 )}

 {!planPermissions?.enable_custdomain && !planPermissions?.enable_custsubdomain && (
 <div className="text-center py-8">
 <p className="text-muted-foreground">
 {t('Domain features are not available in your current plan. Your store will be accessible via slug-based URL.')}
 </p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="theme" className="space-y-4 pt-4">
 <Card>
 <CardHeader>
 <CardTitle>{t('Store Theme')}</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground mb-4">
 {t('Choose a theme that best fits your store type and brand.')}
 </p>

 {availableThemes !== null && (
 <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
 <p className="text-sm text-blue-800">
 <strong>{t('Plan Limitation')}:</strong> {t('Your current plan allows access to {{count}} theme(s).', { count: availableThemes.length })}
 </p>
 </div>
 )}

  <div className="space-y-6">
  {storeThemeCategories.map((category) => {
  const categoryThemes = getStoreThemes().filter(theme =>
  theme.category === category && (availableThemes === null || availableThemes.includes(theme.id))
  );
  if (categoryThemes.length === 0) return null;
  return (
  <div key={category}>
  <h3 className="mb-3 font-semibold text-sm text-muted-foreground border-b pb-2">{category}</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {categoryThemes.map((theme) => (
  <div
  key={theme.id}
  className={`cursor-pointer rounded-lg border-2 p-1 transition-all duration-200 ${formData.theme === theme.id ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
  }`}
  onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
  >
  <div className="relative aspect-video overflow-hidden rounded-md theme-preview-container">
  <img
  src={theme.thumbnail}
  alt={theme.name}
  className="h-full w-full object-cover theme-preview-image"
  onError={(e) => {
  (e.target as HTMLImageElement).src = `https://placehold.co/300x180?text=${encodeURIComponent(theme.name)}`;
  }}
  />
  {formData.theme === theme.id && (
  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
  <div className="rounded-full bg-primary p-1">
  <Check className="h-4 w-4 text-white" />
  </div>
  </div>
  )}
  </div>
  <div className="p-2">
  <h3 className="font-medium text-sm">{theme.name}</h3>
  <p className="text-xs text-muted-foreground line-clamp-2">
  {theme.description}
  </p>
  </div>
  </div>
  ))}
  </div>
  </div>
  );
  })}
  </div>
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
 <Switch
 id="enable_pwa"
 checked={formData.enable_pwa}
 onCheckedChange={(checked) => handleSwitchChange('enable_pwa', checked)}
 />
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
 </div>
 </div>

 <div>
 <Label htmlFor="pwa_description">{t('App Description')}</Label>
 <Textarea
 id="pwa_description"
 placeholder={t('Description for your mobile app')}
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