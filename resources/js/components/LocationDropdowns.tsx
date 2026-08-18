import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import axios from 'axios';

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

interface LocationDropdownsProps {
  countryValue: string;
  stateValue: string;
  cityValue: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Local fallback dataset used when the locations API is unavailable or
 * returns an empty payload, so the dropdowns are never empty.
 */
const FALLBACK_LOCATIONS = (() => {
  const countries: Country[] = [];
  const statesByCountry: Record<string, State[]> = {};
  const citiesByState: Record<string, City[]> = {};

  let nextCountryId = 10000;
  let nextStateId = 20000;
  let nextCityId = 30000;

  const data: Record<string, { code: string; states: Record<string, string[]> }> = {
    فلسطين: {
      code: 'PSE',
      states: {
        القدس: ['القدس', 'بيت ساحور', 'بيت جالا'],
        'رام الله والبيرة': ['رام الله', 'البيرة', 'بيرزيت'],
        الخليل: ['الخليل', 'دورا', 'يطا'],
        نابلس: ['نابلس', 'حوارة', 'بلاطة'],
        جنين: ['جنين', 'يعبد', 'الزبابدة'],
        طولكرم: ['طولكرم', 'عتيل', 'علار'],
        غزة: ['غزة', 'جباليا', 'الشجاعية'],
        خانيونس: ['خانيونس', 'بني سهيلة', 'عبسان'],
        'بيت لحم': ['بيت لحم', 'الدهيشة', 'حوسان'],
      },
    },
    الأردن: {
      code: 'JOR',
      states: {
        عمان: ['عمان', 'ماركا', 'خريبة السوق'],
        إربد: ['إربد', 'الرمثا', 'أيدون'],
        الزرقاء: ['الزرقاء', 'الرصيفة', 'الهاشمية'],
        العقبة: ['العقبة', 'بئر مذكور'],
        مادبا: ['مادبا', 'ذيبان'],
        جرش: ['جرش', 'سوف'],
      },
    },
    السعودية: {
      code: 'SAU',
      states: {
        الرياض: ['الرياض', 'الخرج', 'الدلم'],
        'مكة المكرمة': ['مكة المكرمة', 'جدة', 'الطائف'],
        'المدينة المنورة': ['المدينة المنورة', 'ينبع', 'بدر'],
        'المنطقة الشرقية': ['الدمام', 'الخبر', 'الظهران', 'الأحساء'],
        عسير: ['أبها', 'خميس مشيط', 'بيشة'],
        جازان: ['جازان', 'صبيا', 'أبو عريش'],
      },
    },
    مصر: {
      code: 'EGY',
      states: {
        القاهرة: ['القاهرة', 'مدينة نصر', 'حلوان'],
        الجيزة: ['الجيزة', 'أكتوبر', 'العياط'],
        الإسكندرية: ['الإسكندرية', 'برج العرب'],
        الدقهلية: ['المنصورة', 'طلخا'],
        الشرقية: ['الزقازيق', 'العاشر من رمضان'],
        'البحر الأحمر': ['الغردقة', 'رأس غارب'],
      },
    },
    الإمارات: {
      code: 'ARE',
      states: {
        أبوظبي: ['أبوظبي', 'العين', 'المصفح'],
        دبي: ['دبي', 'ديرة', 'البرشاء'],
        الشارقة: ['الشارقة', 'خورفكان', 'كلباء'],
        عجمان: ['عجمان', 'مسفوت'],
        'رأس الخيمة': ['رأس الخيمة', 'شعم'],
        الفجيرة: ['الفجيرة', 'دبا الفجيرة'],
      },
    },
  };

  Object.entries(data).forEach(([name, cfg]) => {
    const countryId = nextCountryId++;
    countries.push({ id: countryId, name, code: cfg.code });

    const stateList: State[] = [];
    Object.entries(cfg.states).forEach(([stateName, cityNames]) => {
      const stateId = nextStateId++;
      stateList.push({ id: stateId, name: stateName, country_id: countryId });
      citiesByState[stateId] = cityNames.map((cityName) => ({
        id: nextCityId++,
        name: cityName,
        state_id: stateId,
      }));
    });
    statesByCountry[countryId] = stateList;
  });

  return { countries, statesByCountry, citiesByState };
})();

export const LocationDropdowns: React.FC<LocationDropdownsProps> = ({
  countryValue,
  stateValue,
  cityValue,
  onCountryChange,
  onStateChange,
  onCityChange,
  disabled = false,
  required = false
}) => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false
  });

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (countryValue) {
      loadStates(countryValue);
    } else {
      setStates([]);
      setCities([]);
      onStateChange('');
      onCityChange('');
    }
  }, [countryValue]);

  // Load cities when state changes
  useEffect(() => {
    if (stateValue) {
      loadCities(stateValue);
    } else {
      setCities([]);
      onCityChange('');
    }
  }, [stateValue]);

  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const response = await axios.get(route('api.locations.countries'));
      setCountries(response.data?.length ? response.data : FALLBACK_LOCATIONS.countries);
    } catch (error) {
      console.error('Error loading countries:', error);
      setCountries(FALLBACK_LOCATIONS.countries);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadStates = async (countryId: string) => {
    const fallback = FALLBACK_LOCATIONS.statesByCountry[countryId];
    if (fallback) {
      setStates(fallback);
      setCities([]);
      onCityChange('');
      return;
    }
    try {
      setLoading(prev => ({ ...prev, states: true }));
      const response = await axios.get(route('api.locations.states', countryId));
      setStates(response.data);
    } catch (error) {
      console.error('Error loading states:', error);
      setStates([]);
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadCities = async (stateId: string) => {
    const fallback = FALLBACK_LOCATIONS.citiesByState[stateId];
    if (fallback) {
      setCities(fallback);
      return;
    }
    try {
      setLoading(prev => ({ ...prev, cities: true }));
      const response = await axios.get(route('api.locations.cities', stateId));
      setCities(response.data);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>{t("Country")} {required && '*'}</Label>
        <Select
          value={countryValue}
          onValueChange={onCountryChange}
          disabled={disabled || loading.countries}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading.countries ? t('Loading...') : t('Select country')} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id.toString()}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("State/Province")} {required && '*'}</Label>
        <Select
          value={stateValue}
          onValueChange={onStateChange}
          disabled={disabled || !countryValue || loading.states}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !countryValue ? t('Select country first') :
              loading.states ? t('Loading...') : 
              t('Select state')
            } />
          </SelectTrigger>
          <SelectContent>
            {states.map((state) => (
              <SelectItem key={state.id} value={state.id.toString()}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("City")} {required && '*'}</Label>
        <Select
          value={cityValue}
          onValueChange={onCityChange}
          disabled={disabled || !stateValue || loading.cities}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !stateValue ? t('Select state first') :
              loading.cities ? t('Loading...') : 
              t('Select city')
            } />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id.toString()}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};