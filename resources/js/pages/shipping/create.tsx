import React, { useEffect, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Bike, Check, ChevronDown, ChevronLeft, ChevronRight, Globe, Home, Save, Search, Truck, X } from 'lucide-react';
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

interface Country {
  id: number;
  name: string;
  code: string;
}

interface State {
  id: number;
  name: string;
  country_id: number;
}

interface City {
  id: number;
  name: string;
  state_id: number;
}

const companyOptions:string[] = [];
export default function CreateShipping() {
  const { t } = useTranslation();
  const { errors, countries: countryList = [], states: stateList = [], cities: cityList = [], auth } = usePage().props as any;
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
  const [shippingType, setShippingType] = useState('flat_rate');
  const [currentStep, setCurrentStep] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [stateOpen, setStateOpen] = useState(false);
  const [stateQuery, setStateQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [customCompanyOpen, setCustomCompanyOpen] = useState(false);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const [selectedCountries, setSelectedCountries] = useState<number[]>([]);

  useEffect(() => {
    if (currentStep === 1) {
      countrySearchRef.current?.focus();
    }
  }, [currentStep]);
  const [fulfillmentType, setFulfillmentType] = useState<'personal'|'connected'|'manual_company'>('personal');
  const [formData, setFormData] = useState({
    name: '',
    type: 'flat_rate',
    description: '',
    cost: 9.99,
    currency: 'ILS',
    min_order_amount: 0,
    delivery_time: '',
    sort_order: 0,
    is_active: true,
    zone_type: 'domestic',
    countries: '',
    country_id: null as number | null,
    state_id: null as number | null,
    city_id: null as number | null,
    all_regions: true,
    postal_codes: '',
    max_distance: null,
    max_weight: null,
    max_dimensions: '',
    delivery_method: 'personal',
    fulfillment_type: 'personal',
    courier_integration_id: null as number | null,
    courier_service_type: '',
    courier_price_mode: 'api',
    delivery_company: '',
    require_signature: false,
    insurance_required: false,
    tracking_available: true,
    handling_fee: 0
  });

  const steps = [
    { title: t('Basic Information') },
    { title: t('Shipping Zones') },
    { title: t('Advanced Settings') }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'type') {
      setShippingType(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const zoneTypes = [
    { value: 'domestic', icon: Home, label: t('Local Shipping'), description: t('Within the country') },
    { value: 'international', icon: Globe, label: t('International Shipping'), description: t('International / Regional Shipping') }
  ];

  const fulfillmentOptions = [
    { value: 'personal', icon: Bike, label: 'توصيل شخصي', description: 'توصيل عبر فريقك الخاص' },
    { value: 'connected', icon: Truck, label: 'شركة توصيل مربوطة', description: 'إرسال تلقائي عبر API' },
    { value: 'manual_company', icon: Home, label: 'توصيل يدوي عبر شركة', description: 'تسجيل اسم الشركة فقط بدون إرسال تلقائي' },
  ];

  const selectedCountry = (countryList as Country[]).find(country => country.id === formData.country_id) || null;
  const filteredStates = (stateList as State[]).filter(state => state.country_id === formData.country_id);
  const filteredCities = (cityList as City[]).filter(city => city.state_id === formData.state_id);

  const sortedCountries = [...(countryList as Country[])].sort((a, b) => a.name.localeCompare(b.name));
  const setState = (state: State) => {
    setFormData(prev => ({
      ...prev,
      state_id: state.id,
      city_id: null
    }));
    setStateQuery('');
    setStateOpen(false);
  };

  const setCity = (city: City) => {
    setFormData(prev => ({
      ...prev,
      city_id: city.id,
      all_regions: false
    }));
    setCityQuery('');
    setCityOpen(false);
  };

  const handleCountryMultiSelect = (countryId: number) => {
    setSelectedCountries(prev => 
      prev.includes(countryId) 
        ? prev.filter(id => id !== countryId)
        : [...prev, countryId]
    );
  };

  const clearAllCountries = () => {
    setSelectedCountries([]);
  };

  const handleCompanyChange = (value: string) => {
    if (value === '__custom__') {
      setCustomCompanyOpen(true);
      setFormData(prev => ({ ...prev, delivery_company: '' }));
    } else {
      setCustomCompanyOpen(false);
      setFormData(prev => ({ ...prev, delivery_company: value }));
    }
  };

  const showCustomCompany = customCompanyOpen || (formData.delivery_company !== '' && !companyOptions.includes(formData.delivery_company));
  const companySelectValue = showCustomCompany
    ? '__custom__'
    : companyOptions.includes(formData.delivery_company)
      ? formData.delivery_company
      : '';

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.name.trim()) {
        nextErrors.name = t('Required');
      }
    }
    setStepErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(step => Math.min(steps.length - 1, step + 1));
    }
  };

  const handlePrevious = () => {
    setStepErrors({});
    setCurrentStep(step => Math.max(0, step - 1));
  };

  const handleSubmit = () => {
    router.post(route('shipping.store'), formData);
  };

  const pageActions = [
    {
      label: t('Save Shipping'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleSubmit()
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Shipping Method')}
      description={t('Create Shipping Method')}
      url="/shipping/create"
      actions={pageActions}
      backUrl={route('shipping.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Shipping Management'), href: route('shipping.index') },
        { title: t('Create Shipping Method') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        {/* Stepper header */}
        <div className="w-full">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="flex items-center justify-end flex-1">
                  <div className={cn('ms-2 hidden text-sm font-medium sm:block', index <= currentStep ? 'text-foreground' : 'text-muted-foreground')}>
                    {step.title}
                  </div>
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      index < currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index === currentStep
                          ? 'border-primary text-primary'
                          : 'border-muted-foreground/30 text-muted-foreground'
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn('mx-2 h-0.5 flex-1 rounded-full', index < currentStep ? 'bg-primary' : 'bg-muted')} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((steps.length - 1 - currentStep) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Basic Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 grid-cols-1">
                <div className="grid gap-1">
                  <Label htmlFor="name" required>{t('Method Name')}</Label>
                  <Input 
                    id="name" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('Enter shipping method name')} 
                    aria-invalid={!!(errors.name || stepErrors.name)}
                  />
                  <InputError message={errors.name || stepErrors.name} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="type" required>{t('Shipping Type')}</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger aria-invalid={!!errors.type}>
                      <SelectValue placeholder={t('Select shipping type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat_rate">{t('Flat Rate')}</SelectItem>
                      <SelectItem value="free_shipping">{t('Free Shipping')}</SelectItem>
                      <SelectItem value="weight_based">{t('Weight Based')}</SelectItem>
                      <SelectItem value="distance_based">{t('Distance Based')}</SelectItem>
                      <SelectItem value="percentage_based">{t('Percentage Based')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <InputError message={errors.type} />
                </div>
              </div>
              {shippingType !== 'free_shipping' && (
                <div className="grid gap-4 md:grid-cols-2 grid-cols-1">
                  <div className="grid gap-1">
                    <Label htmlFor="currency">{t('Currency')}</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleSelectChange('currency', value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder={t('Select currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ILS">{t('Shekel (ILS)')}</SelectItem>
                        <SelectItem value="USD">{t('US Dollar (USD)')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Shipping Zones')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('Define where this shipping method is available.')}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label required>{t('Zone Type')}</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {zoneTypes.map((zone) => (
                    <button
                      type="button"
                      key={zone.value}
                      onClick={() => handleSelectChange('zone_type', zone.value)}
                      className={cn(
                        'relative flex items-start gap-3 rounded-lg border-2 p-4 text-start transition-all',
                        formData.zone_type === zone.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                          formData.zone_type === zone.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <zone.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{zone.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{zone.description}</div>
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          formData.zone_type === zone.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )}
                      >
                        {formData.zone_type === zone.value && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {formData.zone_type === 'domestic' ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  {t('This shipping method applies to all cities and regions within the country.')}
                </p>
              ) : (
                <div>
                  <Label required>{t('Country')}</Label>
                  <div className="mt-3">
                    <SearchableSelect
                      value={selectedCountries.length > 0 ? selectedCountries.join(',') : ''}
                      onChange={(val: string) => {
                        if (!val) {
                          setSelectedCountries([]);
                        } else {
                          const ids = val.split(',').map(Number);
                          setSelectedCountries(ids);
                        }
                      }}
                      options={sortedCountries.map(c => ({
                        value: c.id.toString(),
                        label: c.name,
                        hint: c.code
                      }))}
                      placeholder={t('Search and select countries...')}
                      searchPlaceholder={t('Search countries...')}
                      emptyMessage={t('No countries found')}
                      allowFreeText={false}
                      disabled={false}
                    />
                    {selectedCountries.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedCountries.map(id => {
                          const c = sortedCountries.find(x => x.id === id);
                          return c ? (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1 text-sm font-medium"
                            >
                              {c.name}
                              <button
                                type="button"
                                onClick={() => handleCountryMultiSelect(c.id)}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {selectedCountries.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllCountries}
                        className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {t('Clear all')}
                      </button>
                    )}
                    {formData.all_regions ? (
                      <p className="mt-2 text-xs text-muted-foreground">{t('Method applies to every region within the selected countries.')}</p>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>{t('Region / Governorate')}</Label>
                          <Popover open={stateOpen} onOpenChange={setStateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={stateOpen}
                                className="mt-2 w-full justify-between font-normal"
                              >
                                <span className="flex items-center gap-2">
                                  <Search className="h-4 w-4 opacity-50" />
                                  {formData.state_id ? filteredStates.find(s => s.id === formData.state_id)?.name : t('Select region...')}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder={t('Search regions...')}
                                  value={stateQuery}
                                  onValueChange={setStateQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>{t('No regions found')}</CommandEmpty>
                                  <CommandGroup>
                                    {filteredStates.map((state) => (
                                      <CommandItem
                                        key={state.id}
                                        value={state.name}
                                        onSelect={() => setState(state)}
                                        className="cursor-pointer"
                                      >
                                        <Check className={cn('me-2 h-4 w-4', formData.state_id === state.id ? 'opacity-100' : 'opacity-0')} />
                                        {state.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>{t('City')}</Label>
                          <Popover open={cityOpen} onOpenChange={setCityOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={cityOpen}
                                className="mt-2 w-full justify-between font-normal"
                              >
                                <span className="flex items-center gap-2">
                                  <Search className="h-4 w-4 opacity-50" />
                                  {formData.city_id ? filteredCities.find(c => c.id === formData.city_id)?.name : t('Select city...')}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder={t('Search cities...')}
                                  value={cityQuery}
                                  onValueChange={setCityQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {formData.state_id ? t('No cities found') : t('Select a region first to choose a city.')}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {filteredCities.map((city) => (
                                      <CommandItem
                                        key={city.id}
                                        value={city.name}
                                        onSelect={() => setCity(city)}
                                        className="cursor-pointer"
                                      >
                                        <Check className={cn('me-2 h-4 w-4', formData.city_id === city.id ? 'opacity-100' : 'opacity-0')} />
                                        {city.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label required>من سينفذ التوصيل؟</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {fulfillmentOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => { setFulfillmentType(option.value as any); setFormData(prev=>({ ...prev, fulfillment_type: option.value, delivery_method: option.value==='personal' ? 'personal' : 'company', courier_integration_id: option.value==='personal' || option.value==='manual_company' ? null : prev.courier_integration_id })); }}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
                        fulfillmentType === option.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                      )}
                    >
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', fulfillmentType===option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <option.icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                      {fulfillmentType===option.value && <Check className="h-4 w-4 text-primary absolute top-2 right-2" />}
                    </button>
                  ))}
                </div>

                {fulfillmentType==='connected' && (
                  <div className="mt-4 max-w-md">
                    {connectedIntegrations.length===0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                        <p className="text-sm font-medium">لم تربط أي شركة توصيل بعد.</p>
                        <p className="text-xs text-muted-foreground mt-1">اربط شركة لإرسال الطلبات تلقائياً</p>
                        <Button type="button" size="sm" className="mt-3" onClick={()=>window.location.href=`/stores/${currentStoreId}/shipping/integrations`}>ربط شركة توصيل</Button>
                      </div>
                    ) : (
                      <div>
                        <Label>شركة التوصيل المربوطة</Label>
                        <Select value={formData.courier_integration_id ? String(formData.courier_integration_id) : ''} onValueChange={(v)=>setFormData(prev=>({ ...prev, courier_integration_id: v ? Number(v) : null, delivery_company: connectedIntegrations.find((c:any)=>String(c.id)===v)?.provider || '' }))}>
                          <SelectTrigger className="mt-2"><SelectValue placeholder="اختر شركة متصلة" /></SelectTrigger>
                          <SelectContent>
                            {connectedIntegrations.map((c:any)=>(<SelectItem key={c.id} value={String(c.id)}>{c.provider} — متصل</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">سيتم إرسال الطلب تلقائياً عبر API</p>
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
                    {formData.delivery_company==='أخرى' && (
                      <Input className="mt-2" placeholder="اسم الشركة" value={formData.delivery_company==='أخرى' ? '' : formData.delivery_company} onChange={(e)=>setFormData(prev=>({ ...prev, delivery_company: e.target.value }))} />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Advanced Settings')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('These settings are optional and only needed for special cases.')}</p>
            </CardHeader>
            <CardContent>
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
                  >
                    <span>{t('Optional Advanced Settings')}</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="description">{t('Description')}</Label>
                    <Textarea 
                      id="description" 
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder={t('Shipping method description')} 
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="min_order">{t('Minimum Order Amount')}</Label>
                      <Input 
                        id="min_order" 
                        name="min_order_amount"
                        type="number" 
                        step="0.01" 
                        value={formData.min_order_amount}
                        onChange={handleInputChange}
                        placeholder={t('0.00')} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_time">{t('Estimated Delivery Time')}</Label>
                      <Input 
                        id="delivery_time" 
                        name="delivery_time"
                        value={formData.delivery_time}
                        onChange={handleInputChange}
                        placeholder={t('5-7 business days')} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="max_weight">{t('Maximum Weight (kg)')}</Label>
                      <Input 
                        id="max_weight" 
                        name="max_weight"
                        type="number" 
                        step="0.1" 
                        value={formData.max_weight || ''}
                        onChange={handleInputChange}
                        placeholder={t('10.0')} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_dimensions">{t('Maximum Dimensions (cm)')}</Label>
                      <Input 
                        id="max_dimensions" 
                        name="max_dimensions"
                        value={formData.max_dimensions}
                        onChange={handleInputChange}
                        placeholder={t('50×50×50')} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="postal_codes">{t('Postal Codes')}</Label>
                      <Input
                        id="postal_codes"
                        name="postal_codes"
                        value={formData.postal_codes}
                        onChange={handleInputChange}
                        placeholder={t('e.g., 10001-10299')}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{t('Comma-separated codes or ranges, e.g., 10001-10299')}</p>
                    </div>
                    <div>
                      <Label htmlFor="max_distance" className="flex items-center gap-2">
                        {t('Max Distance (km)')}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          {t('Optional')}
                        </span>
                      </Label>
                      <Input
                        id="max_distance"
                        name="max_distance"
                        type="number"
                        min="0"
                        value={formData.max_distance || ''}
                        onChange={handleInputChange}
                        placeholder={t('e.g., 50')}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{t('Used for local delivery. Leave empty for no limit.')}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="sort_order">{t('Sort Order')}</Label>
                      <Input 
                        id="sort_order" 
                        name="sort_order"
                        type="number" 
                        value={formData.sort_order}
                        onChange={handleInputChange}
                        placeholder={t('0')} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="handling_fee">{t('Handling Fee')}</Label>
                      <Input 
                        id="handling_fee" 
                        name="handling_fee"
                        type="number" 
                        step="0.01" 
                        value={formData.handling_fee}
                        onChange={handleInputChange}
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-4">
          <Switch 
            checked={formData.is_active}
            onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
          />
          <div className="text-right">
            <Label>{t('Method Status')}</Label>
            <p className="text-sm text-muted-foreground">{t('Enable or disable shipping method')}</p>
          </div>
        </div>
                  <div className="flex items-center justify-end gap-4">
          <Switch 
            checked={formData.require_signature}
            onCheckedChange={(checked) => handleSwitchChange('require_signature', checked)}
          />
          <div className="text-right">
            <Label>{t('Require Signature')}</Label>
            <p className="text-sm text-muted-foreground">{t('Require signature on delivery')}</p>
          </div>
        </div>
                  <div className="flex items-center justify-end gap-4">
          <Switch 
            checked={formData.insurance_required}
            onCheckedChange={(checked) => handleSwitchChange('insurance_required', checked)}
          />
          <div className="text-right">
            <Label>{t('Insurance Required')}</Label>
            <p className="text-sm text-muted-foreground">{t('Require shipping insurance')}</p>
          </div>
        </div>
                  <div className="flex items-center justify-end gap-4">
          <Switch 
            checked={formData.tracking_available}
            onCheckedChange={(checked) => handleSwitchChange('tracking_available', checked)}
          />
          <div className="text-right">
            <Label>{t('Tracking Available')}</Label>
            <p className="text-sm text-muted-foreground">{t('Provide tracking information')}</p>
          </div>
        </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-start gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            {t('Previous')}
            <ChevronRight className="h-4 w-4" />
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button type="button" onClick={handleSubmit} className="ml-auto">
              <Save className="h-4 w-4" />
              {t('Save Shipping')}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              <ChevronLeft className="h-4 w-4" />
              {t('Next')}
            </Button>
          )}
        </div>
      </form>
    </PageTemplate>
  );
}
