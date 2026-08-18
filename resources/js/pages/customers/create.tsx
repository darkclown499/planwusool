import React, { useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, UploadCloud, Image as ImageIcon, X, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import MediaLibraryModal from '@/components/MediaLibraryModal';
import { LocationDropdowns } from '@/components/LocationDropdowns';
import { getImageUrl } from '@/utils/image-helper';
import { toast } from 'sonner';
import InputError from '@/components/input-error';

function AvatarPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toRelative = (url: string) => {
    if (!url || url.startsWith('/storage')) return url;
    const match = url.match(/\/storage\/(.*)$/);
    return match && match[0] ? match[0] : url;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.warning(t('Please select an image file'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append('files[]', file));
      const response = await fetch(route('api.media.batch'), {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      const result = await response.json();
      if (response.ok && result.data && result.data.length > 0) {
        onChange(toRelative((result.data as { url: string }[])[0].url));
        toast.success(result.message || t('Image uploaded successfully'));
      } else {
        toast.error(result.message || t('Upload failed'));
      }
    } catch {
      toast.error(t('Error uploading file'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {value ? (
          <img src={getImageUrl(value)} alt={label} className="h-20 w-20 rounded-full object-cover border shadow-sm" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <User className="h-9 w-9" />
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
            aria-label={t('Remove')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label required>{label}</Label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <UploadCloud className="h-4 w-4 me-2" />}
            {uploading ? t('Uploading...') : t('Upload')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <ImageIcon className="h-4 w-4 me-2" />
            {t('Media Library')}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              uploadFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>
      <MediaLibraryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelect={(url) => onChange(toRelative(url))} />
    </div>
  );
}

export default function CreateCustomer() {
  const { t } = useTranslation();
  const { errors } = usePage().props as { errors: Record<string, string> };
  const [avatar, setAvatar] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    notes: '',
    is_active: true,
    preferred_language: 'ar',
    customer_group: 'regular',
    email_marketing: true,
    sms_notifications: false,
    order_updates: true,
    billing_address: {
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    },
    shipping_address: {
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    },
    same_as_billing: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (type: 'billing_address' | 'shipping_address', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name === 'same_as_billing' && checked) {
      setFormData(prev => ({
        ...prev,
        same_as_billing: checked,
        shipping_address: { ...prev.billing_address }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressSelectChange = (type: 'billing_address' | 'shipping_address', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Add avatar to form data
    const submitData = {
      ...formData,
      avatar
    };
    
    router.post(route('customers.store'), submitData);
  };

  const pageActions = [
    {
      label: t('Save Customer'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleSubmit()
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Customer')}
      url="/customers/create"
      actions={pageActions}
      backUrl={route('customers.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Customer Management'), href: route('customers.index') },
        { title: t('Create Customer') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">{t('Personal Info')}</TabsTrigger>
            <TabsTrigger value="address">{t('Address')}</TabsTrigger>
            <TabsTrigger value="preferences">{t('Preferences')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Personal Information')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <AvatarPicker label={t('Profile Picture')} value={avatar} onChange={setAvatar} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="first_name" required>{t('First Name')}</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder={t('Enter first name')} 
                      aria-invalid={!!errors.first_name}
                    />
                    <InputError message={errors.first_name} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="last_name" required>{t('Last Name')}</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder={t('Enter last name')}
                      aria-invalid={!!errors.last_name}
                    />
                    <InputError message={errors.last_name} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" required>{t('Email Address')}</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      dir="ltr"
                      className="text-end"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('customer@example.com')}
                      aria-invalid={!!errors.email}
                    />
                    <InputError message={errors.email} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">{t('Phone Number')}</Label>
                    <Input 
                      id="phone" 
                      name="phone"
                      dir="ltr"
                      className="text-end"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('+1 (555) 123-4567')} 
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="date_of_birth">{t('Date of Birth')}</Label>
                    <Input 
                      id="date_of_birth" 
                      name="date_of_birth"
                      type="date" 
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="[&::-webkit-datetime-edit]:text-end [&::-webkit-datetime-edit-field]:pe-1"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gender">{t('Gender')}</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleSelectChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('Male')}</SelectItem>
                        <SelectItem value="female">{t('Female')}</SelectItem>
                        <SelectItem value="other">{t('Other')}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t('Prefer not to say')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5 md:col-span-2">
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Textarea 
                      id="notes" 
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder={t('Customer notes...')} 
                    />
                  </div>
                  <div className="flex items-center justify-between md:col-span-2">
                    <div>
                      <Label>{t('Customer Status')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Enable or disable customer account')}</p>
                    </div>
                    <Switch 
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Billing Address')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="billing_address">{t('Street Address')}</Label>
                  <Input 
                    id="billing_address" 
                    value={formData.billing_address.address}
                    onChange={(e) => handleAddressChange('billing_address', 'address', e.target.value)}
                    placeholder={t('123 Main Street')} 
                  />
                </div>
                <LocationDropdowns
                  countryValue={formData.billing_address.country}
                  stateValue={formData.billing_address.state}
                  cityValue={formData.billing_address.city}
                  onCountryChange={(value) => handleAddressSelectChange('billing_address', 'country', value)}
                  onStateChange={(value) => handleAddressSelectChange('billing_address', 'state', value)}
                  onCityChange={(value) => handleAddressSelectChange('billing_address', 'city', value)}
                />
                <div>
                  <Label htmlFor="billing_postal">{t('Postal Code')}</Label>
                  <Input 
                    id="billing_postal" 
                    value={formData.billing_address.postal_code}
                    onChange={(e) => handleAddressChange('billing_address', 'postal_code', e.target.value)}
                    placeholder={t('10001')} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Shipping Address')}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={formData.same_as_billing}
                      onCheckedChange={(checked) => handleSwitchChange('same_as_billing', checked)}
                    />
                    <Label className="text-sm">{t('Same as billing')}</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shipping_address">{t('Street Address')}</Label>
                  <Input 
                    id="shipping_address" 
                    value={formData.shipping_address.address}
                    onChange={(e) => handleAddressChange('shipping_address', 'address', e.target.value)}
                    disabled={formData.same_as_billing}
                    placeholder="123 Main Street" 
                  />
                </div>
                <LocationDropdowns
                  countryValue={formData.shipping_address.country}
                  stateValue={formData.shipping_address.state}
                  cityValue={formData.shipping_address.city}
                  onCountryChange={(value) => handleAddressSelectChange('shipping_address', 'country', value)}
                  onStateChange={(value) => handleAddressSelectChange('shipping_address', 'state', value)}
                  onCityChange={(value) => handleAddressSelectChange('shipping_address', 'city', value)}
                  disabled={formData.same_as_billing}
                />
                <div>
                  <Label htmlFor="shipping_postal">{t('Postal Code')}</Label>
                  <Input 
                    id="shipping_postal" 
                    value={formData.shipping_address.postal_code}
                    onChange={(e) => handleAddressChange('shipping_address', 'postal_code', e.target.value)}
                    disabled={formData.same_as_billing}
                    placeholder="10001" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Communication Preferences')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Email Marketing')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Receive promotional emails')}</p>
                  </div>
                  <Switch 
                    checked={formData.email_marketing}
                    onCheckedChange={(checked) => handleSwitchChange('email_marketing', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('SMS Notifications')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Receive SMS updates')}</p>
                  </div>
                  <Switch 
                    checked={formData.sms_notifications}
                    onCheckedChange={(checked) => handleSwitchChange('sms_notifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Order Updates')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Receive order status updates')}</p>
                  </div>
                  <Switch 
                    checked={formData.order_updates}
                    onCheckedChange={(checked) => handleSwitchChange('order_updates', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="preferred_language">{t('Preferred Language')}</Label>
                  <Select
                    value={formData.preferred_language}
                    onValueChange={(value) => handleSelectChange('preferred_language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('English')}</SelectItem>
                      <SelectItem value="es">{t('Spanish')}</SelectItem>
                      <SelectItem value="fr">{t('French')}</SelectItem>
                      <SelectItem value="de">{t('German')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_group">{t('Customer Group')}</Label>
                  <Select
                    value={formData.customer_group}
                    onValueChange={(value) => handleSelectChange('customer_group', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">{t('Regular Customer')}</SelectItem>
                      <SelectItem value="vip">{t('VIP Customer')}</SelectItem>
                      <SelectItem value="wholesale">{t('Wholesale Customer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </PageTemplate>
  );
}