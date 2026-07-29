import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save, Facebook, Instagram, X, Youtube, Phone, Mail, Code, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';

interface Props {
 store: any;
 settings: any;
 currencies: any[];
 timezones: Record<string, string>;
}

export default function StoreSettings({ store, settings, currencies, timezones }: Props) {
 const { t } = useTranslation();
 const [formData, setFormData] = useState(settings || {});
 const [activeTab, setActiveTab] = useState('general');

 const handleSave = () => {
 router.put(route('stores.settings.update', store.id), {
 settings: formData
 });
 };

 const updateSetting = (key: string, value: any) => {
 setFormData(prev => ({ ...prev, [key]: value }));
 };

 const pageActions = [
 {
 label: t('Save Settings'),
 icon: <Save className="h-4 w-4" />,
 variant: 'default' as const,
 onClick: handleSave
 }
 ];

 return (
 <PageTemplate 
 title={t('Store Settings')}
 url="/stores/settings"
 actions={pageActions}
 backUrl={route('stores.index')}
 breadcrumbs={[
 { title: t('Dashboard'), href: route('dashboard') },
 { title: t('Store Management'), href: route('stores.index') },
 { title: t('Store Settings') }
 ]}
 >
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="grid w-full grid-cols-2">
 <TabsTrigger value="general" className="flex items-center gap-2">
 {t('General')}
 </TabsTrigger>
 <TabsTrigger value="advanced" className="flex items-center gap-2">
 {t('Advanced')}
 </TabsTrigger>
 </TabsList>
 
 <TabsContent value="general" className="space-y-6 mt-6">
 <Card>
 <CardHeader>
 <CardTitle>{t('General Settings')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <Label>{t('Store Status')}</Label>
 <p className="text-sm text-muted-foreground">{t('Enable or disable store')}</p>
 </div>
 <Switch 
 checked={formData.store_status === true || formData.store_status === 'true'}
 onCheckedChange={(checked) => updateSetting('store_status', checked)}
 />
 </div>
 <div className="flex items-center justify-between">
 <div>
 <Label>{t('Maintenance Mode')}</Label>
 <p className="text-sm text-muted-foreground">{t('Put store in maintenance mode')}</p>
 </div>
 <Switch 
 checked={formData.maintenance_mode === true || formData.maintenance_mode === 'true'}
 onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
 />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('Store Configuration')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">

 <div className="grid grid-cols-2 gap-4">
 <div>
 <MediaPicker
 label={t('Store Logo')}
 value={formData.logo || ''}
 onChange={(value) => updateSetting('logo', value)}
 placeholder={t('Select store logo...')}
 showPreview={true}
 />
 </div>
 <div>
 <MediaPicker
 label={t('Store Favicon')}
 value={formData.favicon || ''}
 onChange={(value) => updateSetting('favicon', value)}
 placeholder={t('Select store favicon...')}
 showPreview={true}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('Store Homepage Content')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="welcome_message">{t('Welcome Message')}</Label>
 <Input
 id="welcome_message"
 value={formData.welcome_message || ''}
 onChange={(e) => updateSetting('welcome_message', e.target.value)}
 placeholder={t('Welcome to our store!')}
 />
 </div>
 <div>
 <Label htmlFor="store_description">{t('Store Description')}</Label>
 <Textarea
 id="store_description"
 value={formData.store_description || ''}
 onChange={(e) => updateSetting('store_description', e.target.value)}
 placeholder={t('Brief description of your store...')}
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="copyright_text">{t('Copyright Text')}</Label>
 <Input
 id="copyright_text"
 value={formData.copyright_text || ''}
 onChange={(e) => updateSetting('copyright_text', e.target.value)}
 placeholder={t('© 2026 Your Store Name. All rights reserved.')}
 />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('Store Address')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <Label htmlFor="address">{t('Address')}</Label>
 <Input
 id="address"
 value={formData.address || ''}
 onChange={(e) => updateSetting('address', e.target.value)}
 placeholder={t('123 Main Street')}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="city">{t('City')}</Label>
 <Input
 id="city"
 value={formData.city || ''}
 onChange={(e) => updateSetting('city', e.target.value)}
 placeholder={t('New York')}
 />
 </div>
 <div>
 <Label htmlFor="state">{t('State/Province')}</Label>
 <Input
 id="state"
 value={formData.state || ''}
 onChange={(e) => updateSetting('state', e.target.value)}
 placeholder={t('NY')}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="country">{t('Country')}</Label>
 <Input
 id="country"
 value={formData.country || ''}
 onChange={(e) => updateSetting('country', e.target.value)}
 placeholder={t('United States')}
 />
 </div>
 <div>
 <Label htmlFor="postal_code">{t('Postal Code')}</Label>
 <Input
 id="postal_code"
 value={formData.postal_code || ''}
 onChange={(e) => updateSetting('postal_code', e.target.value)}
 placeholder={t('10001')}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('Social Media Links')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Facebook className="h-4 w-4 text-blue-600" />
 <Label htmlFor="facebook_url">{t('Facebook URL')}</Label>
 </div>
 <Input
 id="facebook_url"
 value={formData.facebook_url || ''}
 onChange={(e) => updateSetting('facebook_url', e.target.value)}
 placeholder="https://facebook.com/yourstore"
 />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Instagram className="h-4 w-4 text-pink-600" />
 <Label htmlFor="instagram_url">{t('Instagram URL')}</Label>
 </div>
 <Input
 id="instagram_url"
 value={formData.instagram_url || ''}
 onChange={(e) => updateSetting('instagram_url', e.target.value)}
 placeholder="https://instagram.com/yourstore"
 />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-2">
 <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24">
 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
 </svg>
 <Label htmlFor="twitter_url">{t('Twitter URL')}</Label>
 </div>
 <Input
 id="twitter_url"
 value={formData.twitter_url || ''}
 onChange={(e) => updateSetting('twitter_url', e.target.value)}
 placeholder="https://x.com/yourstore"
 />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Youtube className="h-4 w-4 text-red-600" />
 <Label htmlFor="youtube_url">{t('YouTube URL')}</Label>
 </div>
 <Input
 id="youtube_url"
 value={formData.youtube_url || ''}
 onChange={(e) => updateSetting('youtube_url', e.target.value)}
 placeholder="https://youtube.com/yourstore"
 />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-2">
 <svg className="w-4 h-4 fill-green-500" viewBox="0 0 24 24">
 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
 </svg>
 <Label htmlFor="whatsapp_url">{t('WhatsApp URL')}</Label>
 </div>
 <Input
 id="whatsapp_url"
 value={formData.whatsapp_url || ''}
 onChange={(e) => updateSetting('whatsapp_url', e.target.value)}
 placeholder="https://wa.me/1234567890"
 />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Mail className="h-4 w-4 text-gray-600" />
 <Label htmlFor="email">{t('Email')}</Label>
 </div>
 <Input
 id="email"
 type="email"
 value={formData.email || ''}
 onChange={(e) => updateSetting('email', e.target.value)}
 placeholder="contact@yourstore.com"
 />
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 
 <TabsContent value="advanced" className="space-y-6 mt-6">
 {/* WhatsApp Widget Settings */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 {t('WhatsApp Widget')}
 </CardTitle>
 <p className="text-sm text-muted-foreground">
 {t('Add a floating WhatsApp button to your store for customer support. This is separate from order notifications.')}
 </p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <Label>{t('Enable WhatsApp Widget')}</Label>
 <p className="text-sm text-muted-foreground">{t('Show floating WhatsApp button on storefront')}</p>
 </div>
 <Switch 
 checked={formData.whatsapp_widget_enabled === true || formData.whatsapp_widget_enabled === 'true'}
 onCheckedChange={(checked) => updateSetting('whatsapp_widget_enabled', checked)}
 />
 </div>
 
 {(formData.whatsapp_widget_enabled === true || formData.whatsapp_widget_enabled === 'true') && (
 <>
 <div>
 <Label htmlFor="whatsapp_widget_phone">{t('WhatsApp Phone Number')}</Label>
 <Input
 id="whatsapp_widget_phone"
 value={formData.whatsapp_widget_phone || ''}
 onChange={(e) => updateSetting('whatsapp_widget_phone', e.target.value)}
 placeholder="+919876543210"
 />
 <p className="text-xs text-muted-foreground">
 {t('Enter phone number with country code (e.g., +919876543210, +1234567890)')}
 </p>
 </div>
 
 <div>
 <Label htmlFor="whatsapp_widget_message">{t('Default Message')}</Label>
 <Textarea
 id="whatsapp_widget_message"
 value={formData.whatsapp_widget_message || ''}
 onChange={(e) => updateSetting('whatsapp_widget_message', e.target.value)}
 placeholder="Hello! I need help with..."
 rows={3}
 />
 <p className="text-xs text-muted-foreground">
 {t('Pre-filled message when customers click the widget')}
 </p>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="whatsapp_widget_position">{t('Widget Position')}</Label>
 <Select value={formData.whatsapp_widget_position || 'right'} onValueChange={(value) => updateSetting('whatsapp_widget_position', value)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="left">{t('Left')}</SelectItem>
 <SelectItem value="right">{t('Right')}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 
 <div className="space-y-3">
 <Label>{t('Display Options')}</Label>
 <div className="flex items-center justify-between">
 <div>
 <Label>{t('Show on Mobile')}</Label>
 <p className="text-sm text-muted-foreground">{t('Display widget on mobile devices')}</p>
 </div>
 <Switch 
 checked={formData.whatsapp_widget_show_on_mobile === true || formData.whatsapp_widget_show_on_mobile === 'true'}
 onCheckedChange={(checked) => updateSetting('whatsapp_widget_show_on_mobile', checked)}
 />
 </div>
 <div className="flex items-center justify-between">
 <div>
 <Label>{t('Show on Desktop')}</Label>
 <p className="text-sm text-muted-foreground">{t('Display widget on desktop devices')}</p>
 </div>
 <Switch 
 checked={formData.whatsapp_widget_show_on_desktop === true || formData.whatsapp_widget_show_on_desktop === 'true'}
 onCheckedChange={(checked) => updateSetting('whatsapp_widget_show_on_desktop', checked)}
 />
 </div>
 </div>
 </>
 )}
 </CardContent>
 </Card>
 
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 {t('Custom CSS & JavaScript')}
 </CardTitle>
 <p className="text-sm text-muted-foreground">
 {t('Add custom CSS and JavaScript to customize your store appearance and functionality.')}
 </p>
 </CardHeader>
 <CardContent className="space-y-6">
 <div>
 <Label htmlFor="custom_css" className="flex items-center gap-2 mb-2">
 <Palette className="h-4 w-4" />
 {t('Custom CSS')}
 </Label>
 <p className="text-sm text-muted-foreground mb-3">
 {t('Add custom CSS styles to modify your store appearance. Maximum 50,000 characters.')}
 </p>
 <Textarea
 id="custom_css"
 value={formData.custom_css || ''}
 onChange={(e) => updateSetting('custom_css', e.target.value)}
 placeholder={t('/* Add your custom CSS here */\n.custom-style {\n color: #333;\n font-size: 16px;\n}')}
 rows={10}
 className="font-mono text-sm"
 maxLength={50000}
 />
 <div className="text-xs text-muted-foreground mt-1">
 {(formData.custom_css || '').length}/50,000 {t('characters')}
 </div>
 </div>
 
 <div>
 <Label htmlFor="custom_javascript" className="flex items-center gap-2 mb-2">
 <Code className="h-4 w-4" />
 {t('Custom JavaScript')}
 </Label>
 <p className="text-sm text-muted-foreground mb-3">
 {t('Add custom JavaScript code to enhance your store functionality. Maximum 50,000 characters.')}
 </p>
 <Textarea
 id="custom_javascript"
 value={formData.custom_javascript || ''}
 onChange={(e) => updateSetting('custom_javascript', e.target.value)}
 placeholder={t('// Add your custom JavaScript here\n\n')}
 rows={10}
 className="font-mono text-sm"
 maxLength={50000}
 />
 <div className="text-xs text-muted-foreground mt-1">
 {(formData.custom_javascript || '').length}/50,000 {t('characters')}
 </div>
 </div>
 
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <div className="text-yellow-600 mt-0.5">
 <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
 </svg>
 </div>
 <div>
 <h4 className="text-sm font-medium text-yellow-800 mb-1">
 {t('Important Security Notice')}
 </h4>
 <p className="text-sm text-yellow-700">
 {t('Only add trusted CSS and JavaScript code. Malicious code can compromise your store security and user data. Test thoroughly before applying to production.')}
 </p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </PageTemplate>
 );
}