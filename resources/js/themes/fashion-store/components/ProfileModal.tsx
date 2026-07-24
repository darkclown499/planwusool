import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Country dropdown component
const CountryDropdown: React.FC<{
  value: string;
  onChange: (value: string, id?: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const countries = (window as any).page?.props?.countries || [];

  return (
    <Select
      value={value || undefined}
      onValueChange={(countryId) => {
        const selectedCountry = countries.find(c => c.id.toString() === countryId);
        onChange(selectedCountry?.name || '', selectedCountry?.id);
      }}
    >
      <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
        <SelectValue placeholder="Select Country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map(country => (
          <SelectItem key={country.id} value={country.id.toString()}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// State dropdown component
const StateDropdown: React.FC<{
  countryId?: number;
  value: string;
  onChange: (value: string, id?: number) => void;
  className?: string;
  disabled?: boolean;
}> = ({ countryId, value, onChange, className, disabled }) => {
  const [states, setStates] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }

    setLoading(true);
    fetch(route('api.locations.states', countryId))
      .then(res => res.json())
      .then(data => {
        const statesData = Array.isArray(data) ? data : (data.states || []);
        setStates(statesData);
        setLoading(false);
      })
      .catch(() => {
        setStates([]);
        setLoading(false);
      });
  }, [countryId]);

  if (disabled || !countryId) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
          <SelectValue placeholder="Select Country First" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="disabled">Select Country First</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
          <SelectValue placeholder="Loading states..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Loading states...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(stateId) => {
        const selectedState = states.find(s => s.id.toString() === stateId);
        onChange(selectedState?.name || '', selectedState?.id);
      }}
    >
      <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
        <SelectValue placeholder="Select State" />
      </SelectTrigger>
      <SelectContent>
        {states.map(state => (
          <SelectItem key={state.id} value={state.id.toString()}>
            {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// City dropdown component
const CityDropdown: React.FC<{
  stateId?: number;
  value: string;
  onChange: (value: string, id?: number) => void;
  className?: string;
  disabled?: boolean;
}> = ({ stateId, value, onChange, className, disabled }) => {
  const [cities, setCities] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }

    setLoading(true);
    fetch(route('api.locations.cities', stateId))
      .then(res => res.json())
      .then(data => {
        const citiesData = Array.isArray(data) ? data : (data.cities || []);
        setCities(citiesData);
        setLoading(false);
      })
      .catch(() => {
        setCities([]);
        setLoading(false);
      });
  }, [stateId]);

  if (disabled || !stateId) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
          <SelectValue placeholder="Select State First" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="disabled">Select State First</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
          <SelectValue placeholder="Loading cities..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Loading cities...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(cityId) => {
        const selectedCity = cities.find(c => c.id.toString() === cityId);
        onChange(selectedCity?.name || '', selectedCity?.id);
      }}
    >
      <SelectTrigger className="w-full focus:ring-rose-300 focus:border-rose-300">
        <SelectValue placeholder="Select City" />
      </SelectTrigger>
      <SelectContent>
        {cities.map(city => (
          <SelectItem key={city.id} value={city.id.toString()}>
            {city.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface ProfileModalProps {
  onClose: () => void;
  userProfile: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  onUpdateProfile: (profile: any) => void;
  onUpdatePassword: (passwords: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  storeSlug?: string;
}

const ProfileModalContent: React.FC<ProfileModalProps> = ({ onClose, userProfile, onUpdateProfile, onUpdatePassword, storeSlug }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const {
    profile, setProfile,
    activeTab, setActiveTab,
    passwords, setPasswords,
    isLoading,
    errors,
    handleProfileUpdate,
    handlePasswordUpdate
  } = useAuthForm();

  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();

  // Set state ID from stored ID
  React.useEffect(() => {
    if (countryId && userProfile?.state) {
      setStateId(parseInt(userProfile.state));
    }
  }, [countryId, userProfile?.state]);

  // Set city ID from stored ID
  React.useEffect(() => {
    if (stateId && userProfile?.city) {
      setCityId(parseInt(userProfile.city));
    }
  }, [stateId, userProfile?.city]);

  // Initialize profile with userProfile data
  React.useEffect(() => {
    if (userProfile) {
      setProfile({
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        email: userProfile.email,
        phone: userProfile.phone,
        address: userProfile.address,
        city: userProfile.city,
        state: userProfile.state,
        country: userProfile.country,
        postalCode: userProfile.postalCode
      });
      
      // Set country ID from stored ID
      if (userProfile.country) {
        setCountryId(parseInt(userProfile.country));
      }
    }
  }, [userProfile, setProfile]);

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProfileUpdate(storeSlug!, (updatedProfile) => {
      onUpdateProfile(updatedProfile);
      onClose();
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePasswordUpdate(storeSlug!, () => {
      onUpdatePassword(passwords);
      onClose();
    });
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mx-4 md:mx-6 mt-4 md:mt-6 mb-4 bg-gray-100 rounded-xl p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 px-2 md:px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-white text-rose-600 shadow-md transform scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2.5 px-2 md:px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'password'
                  ? 'bg-white text-rose-600 shadow-md transform scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Password
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
            {activeTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                      errors.first_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your first name"
                    required
                  />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                      errors.last_name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your last name"
                    required
                  />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter your email address"
                  required
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={profile.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  placeholder="Enter your full address"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <CountryDropdown
                  value={profile.country}
                  onChange={(value, id) => {
                    if (id) {
                      handleInputChange('country', id.toString());
                      handleInputChange('state', '');
                      handleInputChange('city', '');
                      setCountryId(id);
                      setStateId(undefined);
                      setCityId(undefined);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <StateDropdown
                  countryId={countryId}
                  value={profile.state}
                  onChange={(value, id) => {
                    if (id) {
                      handleInputChange('state', id.toString());
                      handleInputChange('city', '');
                      setStateId(id);
                      setCityId(undefined);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  disabled={!countryId}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <CityDropdown
                  stateId={stateId}
                  value={profile.city}
                  onChange={(value, id) => {
                    handleInputChange('city', id?.toString() || '');
                    setCityId(id);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  disabled={!stateId}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={profile.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  placeholder="Enter postal code"
                  required
                />
              </div>
              
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Update
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                      errors.current_password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter current password"
                    required
                  />
                  {errors.current_password && <p className="text-red-500 text-xs mt-1">{errors.current_password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    minLength={8}
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Confirm your new password"
                    required
                    minLength={8}
                  />
                  {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                    } text-white`}
                  >
                    {isLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = (props) => {
  const initialProfile = {
    ...props.userProfile,
    firstName: props.userProfile?.first_name || '',
    lastName: props.userProfile?.last_name || '',
  };
  
  return (
    <AuthFormProvider initialProfile={initialProfile}>
      <ProfileModalContent {...props} />
    </AuthFormProvider>
  );
};