import React, { useState, useEffect } from 'react';
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
      setCountries(response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadStates = async (countryId: string) => {
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
        <Label>Country {required && '*'}</Label>
        <Select
          value={countryValue}
          onValueChange={onCountryChange}
          disabled={disabled || loading.countries}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading.countries ? "Loading..." : "Select country"} />
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
        <Label>State/Province {required && '*'}</Label>
        <Select
          value={stateValue}
          onValueChange={onStateChange}
          disabled={disabled || !countryValue || loading.states}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !countryValue ? "Select country first" :
              loading.states ? "Loading..." : 
              "Select state"
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
        <Label>City {required && '*'}</Label>
        <Select
          value={cityValue}
          onValueChange={onCityChange}
          disabled={disabled || !stateValue || loading.cities}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !stateValue ? "Select state first" :
              loading.cities ? "Loading..." : 
              "Select city"
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