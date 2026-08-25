import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Bike, Check, ChevronDown, Globe, Home, Save, Search, Truck, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SearchableSelect } from '@/components/searchable-select';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { apiGet } from '@/utils/api';

export default function EditShipping() {
  const { t } = useTranslation();
  const { shipping, errors, countries: countryList = [], states: stateList = [], cities: cityList = [], auth } = usePage().props as any;
  const currentStoreId = (auth as any)?.user?.current_store;
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  const [manualCatalog, setManualCatalog] = useState<any[]>([]);
  useEffect(() => {
    if (!currentStoreId) return;
    apiGet(`/api/stores/${currentStoreId}/courier-integrations`).then((r:any)=>{
      const connected = (r.integrations||[]).filter((i:any)=>i.status==='connected' && i.is_active);
      setConnectedIntegrations(connected);
      const cat = r.catalog||[];
      const manual = cat.filter((c:any)=>c.region==='local');
      setManualCatalog(manual.length ? manual : [
        {slug:'wassel', name_ar:'واصل لوجستيك'},
        {slug:'bosta', name_ar:'بوستا إكسبرس'},
        {slug:'united_express', name_ar:'يونايتد إكسبرس'},
        {slug:'city_express', name_ar:'سيتي إكسبرس'},
        {slug:'togo', name_ar:'TOGO'},
      ]);
    }).catch(()=>{
      setManualCatalog([
        {slug:'wassel', name_ar:'واصل لوجستيك'},
        {slug:'bosta', name_ar:'بوستا إكسبرس'},
        {slug:'united_express', name_ar:'يونايتد إكسبرس'},
        {slug:'city_express', name_ar:'سيتي إكسبرس'},
        {slug:'togo', name_ar:'TOGO'},
      ]);
    });
  }, [currentStoreId]);

  // Infer fulfillment type from legacy record
  const inferFulfillment = (): 'personal'|'connected'|'manual_company' => {
    if (shipping.courier_integration_id) return 'connected';
    if (shipping.delivery_company && shipping.fulfillment_type !== 'personal') return 'manual_company';
    if (shipping.delivery_method === 'company' && shipping.delivery_company) return 'manual_company';
    return 'personal';
  };
  const [fulfillmentType, setFulfillmentType] = useState<'personal'|'connected'|'manual_company'>(inferFulfillment());
  const [shippingType, setShippingType] = useState(shipping.type || 'flat_rate');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [stateQuery, setStateQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: shipping.name || '',
    type: shipping.type || 'flat_rate',
    description: shipping.description || '',
    cost: shipping.cost || 0,
    currency: shipping.currency || 'ILS',
    min_order_amount: shipping.min_order_amount || 0,
    delivery_time: shipping.delivery_time || '',
    sort_order: shipping.sort_order || 0,
    is_active: shipping.is_active !== undefined ? shipping.is_active : true,
    zone_type: shipping.zone_type || 'domestic',
    countries: shipping.countries || '',
    country_id: shipping.country_id || null,
    state_id: shipping.state_id || null,
    city_id: shipping.city_id || null,
    all_regions: shipping.all_regions !== undefined ? shipping.all_regions : true,
    postal_codes: shipping.postal_codes || '',
    max_distance: shipping.max_distance || null,
    max_weight: shipping.max_weight || null,
    max_dimensions: shipping.max_dimensions || '',
    delivery_method: shipping.delivery_method || 'personal',
    fulfillment_type: shipping.fulfillment_type || inferFulfillment(),
    courier_integration_id: shipping.courier_integration_id || null,
    courier_service_type: shipping.courier_service_type || '',
    courier_price_mode: shipping.courier_price_mode || 'api',
    delivery_company: shipping.delivery_company || '',
    require_signature: shipping.require_signature || false,
    insurance_required: shipping.insurance_required || false,
    tracking_available: shipping.tracking_available !== undefined ? shipping.tracking_available : true,
    handling_fee: shipping.handling_fee || 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  const handleSelectChange = (name: string, value: string) => {
    if (name === 'type') setShippingType(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const zoneTypes = [
    { value: 'domestic', icon: Home, label: 'محلي', description: 'داخل الدولة' },
    { value: 'international', icon: Globe, label: 'دولي', description: 'خارج الدولة' },
  ];
  const fulfillmentOptions = [
    { value: 'personal', icon: Bike, label: 'توصيل شخصي', description: 'توصيل عبر فريقك أو مندوبك الخاص' },
    { value: 'connected', icon: Truck, label: 'شركة توصيل مربوطة', description: 'إرسال الطلبات تلقائياً عبر شركة مرتبطة بحسابك' },
    { value: 'manual_company', icon: Home, label: 'توصيل يدوي عبر شركة', description: 'تسجيل شركة التوصيل فقط بدون إرسال تلقائي' },
  ];

  const filteredStates = (stateList as any[]).filter((s:any) => s.country_id === formData.country_id);
  const filteredCities = (cityList as any[]).filter((c:any) => c.state_id === formData.state_id);
  const sortedCountries = [...(countryList as any[])].sort((a,b)=>a.name.localeCompare(b.name));

  const handleSubmit = () => {
    // Clear stale fields when switching fulfillment
    const payload:any = { ...formData };
    if (fulfillmentType === 'personal') {
      payload.courier_integration_id = null;
      payload.delivery_company = '';
      payload.fulfillment_type = 'personal';
      payload.delivery_method = 'personal';
    } else if (fulfillmentType === 'connected') {
      payload.fulfillment_type = 'courier';
      payload.delivery_method = 'company';
      // keep courier_integration_id, clear manual company if needed
      if (!payload.courier_integration_id) {
        // if no connected selected, don't submit stale
      }
    } else if (fulfillmentType === 'manual_company') {
      payload.courier_integration_id = null;
      payload.fulfillment_type = 'manual';
      payload.delivery_method = 'company';
    }
    router.put(route('shipping.update', shipping.id), payload);
  };

  return (
    <PageTemplate
      title="تعديل طريقة الشحن"
      description="تعديل طريقة الشحن — نفس نموذج الإنشاء"
      url={`/shipping/${shipping.id}/edit`}
      actions={[{ label: 'حفظ التغييرات', icon: <Save className="h-4 w-4" />, variant: 'default' as const, onClick: handleSubmit }]}
      backUrl={route('shipping.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'الشحن والتوصيل', href: route('shipping.index') },
        { title: 'تعديل' },
      ]}
    >
      <form noValidate onSubmit={(e)=>{e.preventDefault(); handleSubmit();}} className="space-y-6" dir="rtl">
        {/* Basic */}
        <Card>
          <CardHeader><CardTitle>معلومات أساسية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="name" required>اسم طريقة الشحن</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} aria-invalid={!!errors.name} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-1">
                <Label required>نوع التسعير</Label>
                <Select value={formData.type} onValueChange={(v)=>handleSelectChange('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat_rate">سعر ثابت</SelectItem>
                    <SelectItem value="free_shipping">مجاني</SelectItem>
                    <SelectItem value="percentage_based">نسبة مئوية</SelectItem>
                    <SelectItem value="weight_based">حسب الوزن</SelectItem>
                    <SelectItem value="distance_based">حسب المسافة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {shippingType !== 'free_shipping' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <Label>العملة</Label>
                  <Select value={formData.currency} onValueChange={(v)=>handleSelectChange('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ILS">شيكل (ILS)</SelectItem><SelectItem value="USD">دولار (USD)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>السعر</Label>
                  <Input name="cost" type="number" step="0.01" value={formData.cost} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zones + Fulfillment unified */}
        <Card>
          <CardHeader><CardTitle>مناطق الشحن</CardTitle><p className="text-sm text-muted-foreground">حدد أين تطبق طريقة الشحن ومن سينفذها.</p></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label required>أين توصل؟</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {zoneTypes.map((zone)=>(
                  <button type="button" key={zone.value} onClick={()=>handleSelectChange('zone_type', zone.value)} className={cn('relative flex items-start gap-3 rounded-lg border-2 p-4 text-start', formData.zone_type===zone.value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/40')}>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', formData.zone_type===zone.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><zone.icon className="h-5 w-5" /></div>
                    <div><div className="text-sm font-medium">{zone.label}</div><div className="text-xs text-muted-foreground">{zone.description}</div></div>
                    {formData.zone_type===zone.value && <Check className="h-4 w-4 text-primary absolute top-2 left-2" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label required>من سينفذ التوصيل؟</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {fulfillmentOptions.map((opt)=>(
                  <button type="button" key={opt.value} onClick={()=>{ setFulfillmentType(opt.value as any); setFormData(prev=>({ ...prev, fulfillment_type: opt.value, delivery_method: opt.value==='personal' ? 'personal' : 'company', courier_integration_id: opt.value==='personal' || opt.value==='manual_company' ? null : prev.courier_integration_id })); }} className={cn('relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center', fulfillmentType===opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/40')}>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', fulfillmentType===opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><opt.icon className="h-5 w-5" /></div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                    {fulfillmentType===opt.value && <Check className="h-4 w-4 text-primary absolute top-2 right-2" />}
                  </button>
                ))}
              </div>

              {fulfillmentType==='connected' && (
                <div className="mt-4 max-w-md">
                  {connectedIntegrations.length===0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm font-medium">لم تربط أي شركة توصيل بعد.</p>
                      <Button type="button" size="sm" className="mt-3" onClick={()=>window.location.href=`/stores/${currentStoreId}/shipping/integrations`}>ربط شركة توصيل</Button>
                    </div>
                  ) : (
                    <div>
                      <Label>شركة التوصيل المربوطة</Label>
                      <Select value={formData.courier_integration_id ? String(formData.courier_integration_id) : ''} onValueChange={(v)=>setFormData(prev=>({ ...prev, courier_integration_id: v ? Number(v) : null }))}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="اختر شركة متصلة" /></SelectTrigger>
                        <SelectContent>
                          {connectedIntegrations.map((c:any)=>(<SelectItem key={c.id} value={String(c.id)}>{c.provider} — متصل</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {fulfillmentType==='manual_company' && (
                <div className="mt-4 max-w-md">
                  <Label>شركة التوصيل (يدوي)</Label>
                  <Select value={formData.delivery_company} onValueChange={(v)=>setFormData(prev=>({ ...prev, delivery_company: v }))}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="اختر شركة" /></SelectTrigger>
                    <SelectContent>
                      {manualCatalog.map((c:any)=>(<SelectItem key={c.slug} value={c.name_ar || c.slug}>{c.name_ar || c.slug}</SelectItem>))}
                      <SelectItem value="أخرى">شركة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">سيتم تسجيل اسم الشركة فقط، ولن يتم إرسال الطلب تلقائياً.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced collapsed */}
        <Card>
          <CardHeader><CardTitle>إعدادات إضافية</CardTitle><p className="text-sm text-muted-foreground">اختيارية — للحالات الخاصة فقط</p></CardHeader>
          <CardContent>
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">
                  <span>إعدادات متقدمة</span><ChevronDown className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div><Label>الوصف</Label><Textarea name="description" value={formData.description} onChange={handleInputChange} /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>الحد الأدنى للطلب</Label><Input name="min_order_amount" type="number" step="0.01" value={formData.min_order_amount} onChange={handleInputChange} /></div>
                  <div><Label>مدة التوصيل</Label><Input name="delivery_time" value={formData.delivery_time} onChange={handleInputChange} placeholder="1-2 يوم" /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>الوزن الأقصى (كغ)</Label><Input name="max_weight" type="number" step="0.1" value={formData.max_weight || ''} onChange={handleInputChange} /></div>
                  <div><Label>الأبعاد القصوى</Label><Input name="max_dimensions" value={formData.max_dimensions} onChange={handleInputChange} /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>رسوم إضافية</Label><Input name="handling_fee" type="number" step="0.01" value={formData.handling_fee} onChange={handleInputChange} /></div>
                  <div><Label>ترتيب العرض</Label><Input name="sort_order" type="number" value={formData.sort_order} onChange={handleInputChange} /></div>
                </div>
                <div className="flex items-center justify-between"><div><Label>تفعيل</Label></div><Switch checked={formData.is_active} onCheckedChange={(c)=>handleSwitchChange('is_active', c)} /></div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit}><Save className="h-4 w-4 me-2" /> حفظ التغييرات</Button>
        </div>
      </form>
    </PageTemplate>
  );
}
