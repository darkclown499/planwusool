import React, { useEffect, useState } from 'react';
import { X, User, Mail, Phone, MapPin, Lock, Save, Edit3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { toast } from '@/components/custom-toast';

// State dropdown component
const StateDropdown: React.FC<{
  countryId?: number;
  value: string;
  onChange: (value: string, id?: number) => void;
  disabled?: boolean;
}> = ({ countryId, value, onChange, disabled }) => {
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
        <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl">
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
        <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl">
          <SelectValue placeholder="Loading states..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Loading states...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const selectedStateId = value || '';

  return (
    <Select
      value={selectedStateId}
      onValueChange={(stateId) => {
        const selectedState = states.find(s => s.id.toString() === stateId);
        if (selectedState) {
          onChange(selectedState.name, selectedState.id);
        }
      }}
    >
      <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600">
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
  disabled?: boolean;
}> = ({ stateId, value, onChange, disabled }) => {
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
        <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl">
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
        <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl">
          <SelectValue placeholder="Loading cities..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Loading cities...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const selectedCityId = value || '';

  return (
    <Select
      value={selectedCityId}
      onValueChange={(cityId) => {
        const selectedCity = cities.find(c => c.id.toString() === cityId);
        if (selectedCity) {
          onChange(selectedCity.name, selectedCity.id);
        }
      }}
    >
      <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600">
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
  userProfile?: {
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
  onUpdateProfile: () => void;
  onUpdatePassword: () => void;
  storeSlug: string;
}

const ProfileModalContent: React.FC<ProfileModalProps> = ({
  onClose,
  userProfile,
  onUpdateProfile,
  onUpdatePassword,
  storeSlug
}) => {
  const {
    profile,
    setProfile,
    activeTab,
    setActiveTab,
    passwords,
    setPasswords,
    isLoading,
    handleProfileUpdate,
    handlePasswordUpdate
  } = useAuthForm();
  
  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  
  useEffect(() => {
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
      
      // Set country ID and load states
      const countries = (window as any).page?.props?.countries || [];
      const selectedCountry = countries.find(c => c.id.toString() === userProfile.country.toString());
      if (selectedCountry) {
        setCountryId(selectedCountry.id);
        
        // Load states and set state ID
        if (userProfile.state) {
          fetch(route('api.locations.states', selectedCountry.id))
            .then(res => res.json())
            .then(data => {
              const statesData = Array.isArray(data) ? data : (data.states || []);
              const selectedState = statesData.find(s => s.id.toString() === userProfile.state.toString());
              if (selectedState) {
                setStateId(selectedState.id);
                
                // Load cities and set city ID
                if (userProfile.city) {
                  fetch(route('api.locations.cities', selectedState.id))
                    .then(res => res.json())
                    .then(data => {
                      const citiesData = Array.isArray(data) ? data : (data.cities || []);
                    })
                    .catch(err => console.error('Error loading cities:', err));
                }
              }
            })
            .catch(err => console.error('Error loading states:', err));
        }
      }
    }
  }, [userProfile, setProfile]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);



  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-2 sm:p-4">
        <div className="bg-stone-50 w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="relative bg-stone-700 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">My Profile</h2>
              <p className="text-stone-200 text-xs sm:text-sm">Manage your account information</p>
            </div>
          </div>

          {/* Tab Design */}
          <div className="bg-stone-100 border-b border-stone-200 flex-shrink-0">
            <div className="flex p-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 mx-1 py-3 px-4 rounded-xl font-serif font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-stone-700 text-white shadow-md'
                    : 'bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">Personal Info</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 mx-1 py-3 px-4 rounded-xl font-serif font-semibold transition-all ${
                  activeTab === 'password'
                    ? 'bg-stone-700 text-white shadow-md'
                    : 'bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Security</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white min-h-0">
            {activeTab === 'profile' ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleProfileUpdate(storeSlug, (updatedProfile) => {
                  toast.success('Profile updated successfully!');
                  onUpdateProfile();
                  onClose();
                });
              }} className="space-y-5">
                {/* Name Section */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-stone-600" />
                    Full Name
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">First Name *</label>
                      <input
                        type="text"
                        value={profile.firstName || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter your first name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        value={profile.lastName || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter your last name"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-stone-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        value={profile.email || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-stone-600" />
                    Address Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Street Address</label>
                      <textarea
                        value={profile.address || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors resize-none"
                        placeholder="Enter your street address"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Country</label>
                      <Select
                        value={(() => {
                          const countries = (window as any).page?.props?.countries || [];
                          const selectedCountry = countries.find(c => c.id.toString() === profile.country?.toString());
                          return selectedCountry?.id?.toString() || '';
                        })()} 
                        onValueChange={(countryId) => {
                          const countries = (window as any).page?.props?.countries || [];
                          const selectedCountry = countries.find(c => c.id.toString() === countryId);
                          if (selectedCountry) {
                            setProfile(prev => ({ ...prev, country: selectedCountry.id, state: '', city: '' }));
                            setCountryId(selectedCountry.id);
                            setStateId(undefined);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600">
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {((window as any).page?.props?.countries || []).map(country => (
                            <SelectItem key={country.id} value={country.id.toString()}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">State</label>
                        <StateDropdown
                          countryId={countryId}
                          value={profile.state?.toString() || ''}
                          onChange={(value, id) => {
                            setProfile(prev => ({ ...prev, state: id, city: '' }));
                            setStateId(id);
                          }}
                          disabled={!countryId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">City</label>
                        <CityDropdown
                          stateId={stateId}
                          value={profile.city?.toString() || ''}
                          onChange={(value, id) => {
                            setProfile(prev => ({ ...prev, city: id }));
                          }}
                          disabled={!stateId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Postal Code</label>
                        <input
                          type="text"
                          value={profile.postalCode || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, postalCode: e.target.value }))}
                          className="w-full px-4 py-1.5 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                          placeholder="Enter postal code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stone-700 hover:bg-stone-800 disabled:bg-stone-400 text-white font-serif font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {isLoading ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                handlePasswordUpdate(storeSlug, () => {
                  toast.success('Password updated successfully!');
                  onUpdatePassword();
                });
              }} className="space-y-5">
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                  <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-stone-600" />
                    Change Password
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Current Password *</label>
                      <input
                        type="password"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter your current password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">New Password *</label>
                      <input
                        type="password"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Enter new password (min 8 characters)"
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Confirm New Password *</label>
                      <input
                        type="password"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-stone-300 rounded-xl focus:outline-none focus:border-stone-600 transition-colors"
                        placeholder="Confirm your new password"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stone-700 hover:bg-stone-800 disabled:bg-stone-400 text-white font-serif font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-lg"
                >
                  <Lock className="w-5 h-5" />
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = (props) => {
  return (
    <AuthFormProvider initialProfile={props.userProfile}>
      <ProfileModalContent {...props} />
    </AuthFormProvider>
  );
};