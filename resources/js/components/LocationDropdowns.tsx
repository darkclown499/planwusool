import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import type { SearchableOption } from '@/components/searchable-select';

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

/** Priority country codes to pin at the top of the country list. */
const PRIORITY_COUNTRY_CODES = [
  'PSE', // فلسطين
  'JOR', // الأردن
  'SAU', // السعودية
  'ARE', // الإمارات
  'QAT', // قطر
  'KWT', // الكويت
  'EGY', // مصر
];

/** Sort countries: priority codes first (in order), then rest alphabetically by name. */
function sortCountries(countries: Country[]): Country[] {
  const priority = new Map<string, number>();
  PRIORITY_COUNTRY_CODES.forEach((code, index) => priority.set(code, index));

  return [...countries].sort((a, b) => {
    const aPriority = priority.get(a.code);
    const bPriority = priority.get(b.code);

    if (aPriority !== undefined && bPriority !== undefined) {
      return aPriority - bPriority;
    }
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

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

  // Sorted countries with priority codes pinned at top
  const sortedCountries = useMemo(() => sortCountries(countries), [countries]);

  // Convert to SearchableSelect options with separator after priority countries
  const countryOptions = useMemo((): SearchableOption[] => {
    const options: SearchableOption[] = [];
    sortedCountries.forEach((c, index) => {
      options.push({
        value: c.id.toString(),
        label: c.name,
        hint: c.code,
      });
      // Insert separator after the last priority country
      if (PRIORITY_COUNTRY_CODES.includes(c.code) && index === PRIORITY_COUNTRY_CODES.length - 1) {
        options.push({ value: '', label: '', isSeparator: true });
      }
    });
    return options;
  }, [sortedCountries]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>{t("Country")} {required && '*'}</Label>
        <SearchableSelect
          value={countryValue}
          onChange={onCountryChange}
          options={countryOptions}
          placeholder={loading.countries ? t('Loading...') : t('Select country')}
          searchPlaceholder={t('Search countries...')}
          disabled={disabled || loading.countries}
        />
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