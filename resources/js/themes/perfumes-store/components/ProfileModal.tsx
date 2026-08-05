import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [states, setStates] = useState<{id: number, name: string}[]>([]);
  const [cities, setCities] = useState<{id: number, name: string}[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const {
    profile, setProfile,
    activeTab, setActiveTab,
    passwords, setPasswords,
    isLoading,
    errors,
    handleProfileUpdate,
    handlePasswordUpdate
  } = useAuthForm();

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
      
      if (userProfile.country && !isNaN(Number(userProfile.country))) {
        const countryIdNum = parseInt(userProfile.country);
        setCountryId(countryIdNum);
      }
    }
  }, [userProfile, setProfile]);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return;
    }

    setLoadingStates(true);
    fetch(route('api.locations.states', countryId))
      .then(res => res.json())
      .then(data => {
        const statesData = Array.isArray(data) ? data : (data.states || []);
        setStates(statesData);
        setLoadingStates(false);
        
        if (userProfile?.state && !isNaN(Number(userProfile.state))) {
          const stateIdNum = parseInt(userProfile.state);
          setStateId(stateIdNum);
        }
      })
      .catch((error) => {
        console.error('Error loading states:', error);
        setStates([]);
        setLoadingStates(false);
      });
  }, [countryId, userProfile?.state]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    fetch(route('api.locations.cities', stateId))
      .then(res => res.json())
      .then(data => {
        const citiesData = Array.isArray(data) ? data : (data.cities || []);
        setCities(citiesData);
        setLoadingCities(false);
      })
      .catch((error) => {
        console.error('Error loading cities:', error);
        setCities([]);
        setLoadingCities(false);
      });
  }, [stateId]);

  const handleInputChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
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
    setPasswords((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-slate-800 w-full max-w-lg overflow-hidden shadow-2xl border-2 border-amber-600 flex flex-col max-h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-amber-600 bg-black">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ملفي الشخصي</h2>
                <p className="text-sm text-slate-300 font-medium">إدارة إعدادات الحساب</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-amber-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-slate-700 bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                <span>معلومات الملف الشخصي</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>كلمة المرور</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                    <User className="w-5 h-5 text-amber-400" />
                    المعلومات الشخصية
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">الاسم الأول</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          errors.first_name ? 'border-amber-500' : 'border-slate-600'
                        }`}
                        placeholder="أدخل اسمك الأول"
                        required
                      />
                      {errors.first_name && <p className="text-amber-400 text-xs mt-1 font-medium">{errors.first_name}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">اسم العائلة</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          errors.last_name ? 'border-amber-500' : 'border-slate-600'
                        }`}
                        placeholder="أدخل اسم عائلتك"
                        required
                      />
                      {errors.last_name && <p className="text-amber-400 text-xs mt-1 font-medium">{errors.last_name}</p>}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                    <Mail className="w-5 h-5 text-amber-400" />
                    معلومات الاتصال
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full pr-10 pl-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          errors.email ? 'border-amber-500' : 'border-slate-600'
                        }`}
                        placeholder="أدخل بريدك الإلكتروني"
                        required
                      />
                    </div>
                    {errors.email && <p className="text-amber-400 text-xs mt-1 font-medium">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">رقم الهاتف</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="+91 1234567890"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    معلومات العنوان
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">العنوان</label>
                    <textarea
                      value={profile.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="أدخل عنوانك الكامل"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">الدولة</label>
                    <Select
                      value={profile.country || undefined}
                      onValueChange={(countryId) => {
                        const countries = (window as any).page?.props?.countries || [];
                        const selectedCountry = countries.find((c: any) => c.id.toString() === countryId);
                        if (selectedCountry) {
                          handleInputChange('country', selectedCountry.id.toString());
                          handleInputChange('state', '');
                          handleInputChange('city', '');
                          setCountryId(selectedCountry.id);
                          setStateId(undefined);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="اختر الدولة" />
                      </SelectTrigger>
                      <SelectContent>
                        {((window as any).page?.props?.countries || []).map((country: any) => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">المحافظة</label>
                    <Select
                      value={profile.state || undefined}
                      onValueChange={(stateId) => {
                        const selectedState = states.find(s => s.id.toString() === stateId);
                        if (selectedState) {
                          handleInputChange('state', selectedState.id.toString());
                          handleInputChange('city', '');
                          setStateId(selectedState.id);
                        }
                      }}
                      disabled={!countryId || loadingStates}
                    >
                      <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder={loadingStates ? "جارٍ تحميل المحافظات..." : "اختر المحافظة"} />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(state => (
                          <SelectItem key={state.id} value={state.id.toString()}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">المدينة</label>
                    <Select
                      value={profile.city || undefined}
                      onValueChange={(cityId) => {
                        const selectedCity = cities.find(c => c.id.toString() === cityId);
                        if (selectedCity) {
                          handleInputChange('city', selectedCity.id.toString());
                        }
                      }}
                      disabled={!stateId || loadingCities}
                    >
                      <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder={loadingCities ? "جارٍ تحميل المدن..." : "اختر المدينة"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">الرمز البريدي</label>
                    <input
                      type="text"
                      value={profile.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="أدخل الرمز البريدي"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 sm:px-6 transition-colors border-2 border-slate-600 text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 font-bold py-3 px-4 sm:px-6 transition-colors flex items-center justify-center gap-2 border-2 text-sm sm:text-base ${
                      isLoading 
                        ? 'bg-slate-600 cursor-not-allowed border-slate-600' 
                        : 'bg-amber-600 hover:bg-amber-700 border-amber-600'
                    } text-white`}
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">{isLoading ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
                    <span className="sm:hidden">{isLoading ? 'جارٍ الحفظ...' : 'حفظ'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-600 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">تغيير كلمة المرور</h3>
                  <p className="text-slate-300 text-sm font-medium">قم بتأمين حسابك</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">كلمة المرور الحالية</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwords.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className={`w-full pr-10 pl-12 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        errors.current_password ? 'border-amber-500' : 'border-slate-600'
                      }`}
                      placeholder="أدخل كلمة المرور الحالية"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.current_password && <p className="text-amber-400 text-sm mt-1 font-medium">{errors.current_password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-white mb-2">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwords.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className={`w-full pr-10 pl-12 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        errors.password ? 'border-amber-500' : 'border-slate-600'
                      }`}
                      placeholder="أدخل كلمة مرور جديدة (8 أحرف على الأقل)"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-amber-400 text-sm mt-1 font-medium">{errors.password}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-white mb-2">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwords.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className={`w-full pr-10 pl-12 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        errors.password_confirmation ? 'border-amber-500' : 'border-slate-600'
                      }`}
                      placeholder="أكد كلمة المرور الجديدة"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-amber-400"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password_confirmation && <p className="text-amber-400 text-sm mt-1 font-medium">{errors.password_confirmation}</p>}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 sm:px-6 transition-colors border-2 border-slate-600 text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 font-bold py-3 px-4 sm:px-6 transition-colors flex items-center justify-center gap-2 border-2 text-sm sm:text-base ${
                      isLoading 
                        ? 'bg-slate-600 cursor-not-allowed border-slate-600' 
                        : 'bg-amber-600 hover:bg-amber-700 border-amber-600'
                    } text-white`}
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">{isLoading ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</span>
                    <span className="sm:hidden">{isLoading ? 'جارٍ التحديث...' : 'تحديث'}</span>
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