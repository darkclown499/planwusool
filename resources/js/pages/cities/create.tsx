import { PageTemplate } from '@/components/page-template';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function CreateCity() {
  const { t } = useTranslation();
  const { countries } = usePage().props as any;
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState({
    country_id: '',
    state_id: '',
    name: '',
    status: true
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCountryChange = async (countryId: string) => {
    setFormData(prev => ({ ...prev, country_id: countryId, state_id: '' }));
    
    if (countryId) {
      setLoading(true);
      try {
        const response = await fetch(route('api.locations.states', countryId));
        const data = await response.json();
        setStates(Array.isArray(data) ? data : data.states || []);
      } catch (error) {
        console.error('Failed to load states:', error);
        setStates([]);
      } finally {
        setLoading(false);
      }
    } else {
      setStates([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(route('cities.store'), formData);
  };

  const handleClose = () => {
    router.get(route('cities.index'), {}, { preserveState: false });
  };

  return (
    <PageTemplate title={t('Add City')} url="/cities/create">
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Add New City')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country_id">{t('Country')} *</Label>
              <Select value={formData.country_id} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select Country')} />
                </SelectTrigger>
                <SelectContent className="z-[60000]">
                  {countries?.map((country: any) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state_id">{t('State')} *</Label>
              <Select 
                value={formData.state_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}
                disabled={!formData.country_id || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? t('Loading...') : t('Select State')} />
                </SelectTrigger>
                <SelectContent className="z-[60000]">
                  {states.map((state: any) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('City Name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked }))}
              />
              <Label htmlFor="status">{t('Active')}</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={!formData.country_id || !formData.state_id || !formData.name}>
                {t('Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}