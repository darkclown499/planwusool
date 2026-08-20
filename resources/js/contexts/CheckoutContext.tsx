import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/custom-toast';
import { handleOrderPlacement as handleRazorpayOrder } from '@/utils/razorpay-payment';
import { handleCashfreePayment } from '@/utils/cashfree-payment';
import { handleFlutterwavePayment } from '@/utils/flutterwave-payment';
import { generateStoreUrl } from '@/utils/store-url-helper';

// Country dropdown component
const CountryDropdown: React.FC<{
  value: string;
  onChange: (value: string, id?: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const countries = (window as any).page?.props?.countries || [];
  const selectedCountryId = countries.find((c: any) => c.name === value)?.id || '';

  return (
    <select
      value={selectedCountryId}
      onChange={(e) => {
        const selectedCountry = countries.find((c: any) => c.id.toString() === e.target.value);
        onChange(selectedCountry?.name || '', selectedCountry?.id);
      }}
      className={className}
    >
      <option value="">اختر البلد</option>
      {countries.map((country: any) => (
        <option key={country.id} value={country.id}>
          {country.name}
        </option>
      ))}
    </select>
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
  const [states, setStates] = useState<{ id: number, name: string }[]>([]);
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

  useEffect(() => {
    if (value && states.length > 0 && !states.find(s => s.name === value)) {
      onChange('', undefined);
    }
  }, [states, value, onChange]);

  const store = (window as any).page?.props?.store || {};
  const theme = store?.theme || 'gadgets';
  const focusColors = theme === 'fashion' ? 'focus:ring-rose-300 focus:border-rose-300' :
    theme === 'home-decor' ? 'focus:ring-amber-500 focus:border-amber-500 border-2 border-amber-200 bg-amber-50/30' :
      theme === 'bakery' ? 'focus:ring-stone-600 focus:border-stone-600 border-2 border-stone-300' :
        theme === 'supermarket' ? 'focus:ring-green-500 focus:border-green-500' :
          'focus:ring-blue-500 focus:border-blue-500';

  if (disabled || !countryId) {
    return (
      <Select disabled>
        <SelectTrigger className={`w-full ${focusColors}`}>
          <SelectValue placeholder="اختر البلد أولاً" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="disabled">اختر البلد أولاً</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={`w-full ${focusColors}`}>
          <SelectValue placeholder="جاري تحميل المحافظات..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">جاري تحميل المحافظات...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const selectedState = states.find(s => s.name === value);
  const selectedStateId = selectedState?.id?.toString() || '';

  return (
    <Select
      value={selectedStateId}
      onValueChange={(stateId) => {
        const selectedState = states.find(s => s.id.toString() === stateId);
        onChange(selectedState?.name || '', selectedState?.id);
      }}
    >
      <SelectTrigger className={`w-full ${focusColors}`}>
        <SelectValue placeholder="اختر المحافظة" />
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
  const [cities, setCities] = useState<{ id: number, name: string }[]>([]);
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

  useEffect(() => {
    if (value && cities.length > 0 && !cities.find(c => c.name === value)) {
      onChange('', undefined);
    }
  }, [cities, value, onChange]);

  const store = (window as any).page?.props?.store || {};
  const theme = store?.theme || 'gadgets';
  const focusColors = theme === 'fashion' ? 'focus:ring-rose-300 focus:border-rose-300' :
    theme === 'home-decor' ? 'focus:ring-amber-500 focus:border-amber-500 border-2 border-amber-200 bg-amber-50/30' :
      theme === 'bakery' ? 'focus:ring-stone-600 focus:border-stone-600 border-2 border-stone-300' :
        theme === 'supermarket' ? 'focus:ring-green-500 focus:border-green-500' :
          'focus:ring-blue-500 focus:border-blue-500';

  if (disabled || !stateId) {
    return (
      <Select disabled>
        <SelectTrigger className={`w-full ${focusColors}`}>
          <SelectValue placeholder="اختر المحافظة أولاً" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="disabled">اختر المحافظة أولاً</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={`w-full ${focusColors}`}>
          <SelectValue placeholder="جاري تحميل المدن..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">جاري تحميل المدن...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const selectedCity = cities.find(c => c.name === value);
  const selectedCityId = selectedCity?.id?.toString() || '';

  return (
    <Select
      value={selectedCityId}
      onValueChange={(cityId) => {
        const selectedCity = cities.find(c => c.id.toString() === cityId);
        onChange(selectedCity?.name || '', selectedCity?.id);
      }}
    >
      <SelectTrigger className={`w-full ${focusColors}`}>
        <SelectValue placeholder="اختر المدينة" />
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

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface CheckoutContextType {
  step: number;
  customerInfo: CustomerInfo;
  couponCode: string;
  appliedCoupon: { code: string, discount: number, type?: string, discount_amount?: number } | null;
  couponError: string;
  selectedShipping: string;
  selectedPayment: string;
  shippingMethods: any[];
  loadingShipping: boolean;
  paymentMethods: any[];
  loadingPayments: boolean;
  emailError: string;
  phoneError: string;
  isPlacingOrder: boolean;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  bankTransferFile: File | null;
  whatsappNumber: string;
  whatsappError: string;
  setStep: (step: number) => void;
  setCouponCode: (code: string) => void;
  setCouponError: (error: string) => void;
  setSelectedShipping: (id: string) => void;
  setSelectedPayment: (method: string) => void;
  handleInputChange: (field: string, value: string) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleApplyCoupon: (subtotal: number) => Promise<void>;
  handlePlaceOrder: (total: number) => Promise<void>;
  setCountryId: (id?: number) => void;
  setStateId: (id?: number) => void;
  setCityId: (id?: number) => void;
  setBankTransferFile: (file: File | null) => void;
  setWhatsappNumber: (number: string) => void;
  setWhatsappError: (error: string) => void;
  CountryDropdown: React.FC<{ value: string; onChange: (value: string, id?: number) => void; className?: string; }>;
  StateDropdown: React.FC<{ countryId?: number; value: string; onChange: (value: string, id?: number) => void; className?: string; disabled?: boolean; }>;
  CityDropdown: React.FC<{ stateId?: number; value: string; onChange: (value: string, id?: number) => void; className?: string; disabled?: boolean; }>;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

interface CheckoutProviderProps {
  children: ReactNode;
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
  isLoggedIn?: boolean;
  store?: { id: string | number; slug: string };
  onOrderComplete?: () => void;
}

export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({
  children,
  userProfile,
  isLoggedIn,
  store,
  onOrderComplete
}) => {
  const [step, setStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: isLoggedIn && userProfile ? userProfile.first_name : '',
    lastName: isLoggedIn && userProfile ? userProfile.last_name : '',
    email: isLoggedIn && userProfile ? userProfile.email : '',
    phone: isLoggedIn && userProfile ? userProfile.phone : '',
    address: isLoggedIn && userProfile ? userProfile.address : '',
    city: '',
    state: '',
    country: '',
    postalCode: isLoggedIn && userProfile ? userProfile.postalCode : ''
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number, type?: string, discount_amount?: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [selectedShipping, setSelectedShipping] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [bankTransferFile, setBankTransferFile] = useState<File | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  // Helper function to get proper store URL
  const getStoreUrl = () => {
    const currentStore = (window as any).page?.props?.store;
    if (!currentStore) {
      return generateStoreUrl('store.home', store);
    }

    const protocol = window.location.protocol;
    const host = window.location.hostname;

    // Check if we're on a custom domain
    if (currentStore.enable_custom_domain && currentStore.custom_domain === host) {
      return `${protocol}//${currentStore.custom_domain}`;
    }

    // Check if we're on a custom subdomain
    if (currentStore.enable_custom_subdomain && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (currentStore.custom_subdomain === subdomain) {
        return `${protocol}//${host}`;
      }
    }

    // Default route
    return generateStoreUrl('store.home', store);
  };

  // Initialize location data when user profile is available
  useEffect(() => {
    if (isLoggedIn && userProfile) {
      // Set country
      const countries = (window as any).page?.props?.countries || [];
      const selectedCountry = countries.find((c: any) => c.id.toString() === userProfile.country?.toString());
      if (selectedCountry) {
        setCountryId(selectedCountry.id);
        setCustomerInfo(prev => ({ ...prev, country: selectedCountry.name }));
      }
    }
  }, [isLoggedIn, userProfile]);

  // Load state when country is set
  useEffect(() => {
    if (countryId && userProfile?.state) {
      fetch(route('api.locations.states', countryId))
        .then(res => res.json())
        .then(data => {
          const statesData = Array.isArray(data) ? data : (data.states || []);
          const selectedState = statesData.find((s: any) => s.id.toString() === userProfile.state?.toString());
          if (selectedState) {
            setStateId(selectedState.id);
            setCustomerInfo(prev => ({ ...prev, state: selectedState.name }));
          }
        })
        .catch(() => { });
    }
  }, [countryId, userProfile?.state]);

  // Load city when state is set
  useEffect(() => {
    if (stateId && userProfile?.city) {
      fetch(route('api.locations.cities', stateId))
        .then(res => res.json())
        .then(data => {
          const citiesData = Array.isArray(data) ? data : (data.cities || []);
          const selectedCity = citiesData.find((c: any) => c.id.toString() === userProfile.city?.toString());
          if (selectedCity) {
            setCityId(selectedCity.id);
            setCustomerInfo(prev => ({ ...prev, city: selectedCity.name }));
          }
        })
        .catch(() => { });
    }
  }, [stateId, userProfile?.city]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[0-9]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailError('');
    if (field === 'phone') setPhoneError('');
  };

  const handleNextStep = () => {
    if (step === 1) {
      let hasErrors = false;

      if (!validateEmail(customerInfo.email)) {
        setEmailError('يرجى إدخال بريد إلكتروني صحيح');
        hasErrors = true;
      }

      if (!validatePhone(customerInfo.phone)) {
        setPhoneError('يرجى إدخال رقم هاتف صحيح');
        hasErrors = true;
      }

      if (hasErrors) return;
    }

    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleApplyCoupon = async (subtotal: number) => {
    if (!couponCode.trim()) {
      setCouponError('يرجى إدخال رمز الكوبون');
      return;
    }

    try {
      const response = await fetch(route('api.coupon.validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          code: couponCode,
          store_id: store?.id,
          subtotal: subtotal
        })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discount: data.coupon.discount,
          type: data.coupon.type,
          discount_amount: data.coupon.discount_amount
        });
        setCouponError('');
      } else {
        setCouponError(data.error || 'رمز الكوبون غير صحيح');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponError('تعذر التحقق من الكوبون. حاول مرة أخرى.');
      setAppliedCoupon(null);
    }
  };

  const loadShippingMethods = async () => {
    if (!store?.id) return;

    setLoadingShipping(true);
    try {
      const response = await fetch(`${route('api.shipping.methods')}?store_id=${store.id}`, {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShippingMethods(data.shipping_methods || []);
      }
    } catch (error) {
      console.error('Failed to load shipping methods:', error);
    } finally {
      setLoadingShipping(false);
    }
  };

  const loadPaymentMethods = async () => {
    if (!store?.id) return;

    setLoadingPayments(true);
    try {
      const response = await fetch(`${route('api.payment.methods')}?store_id=${store.id}`, {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePlaceOrder = async (total: number) => {
    if (isPlacingOrder) return;

    // Validate bank transfer file if payment method is bank
    if (selectedPayment === 'bank') {
      if (!bankTransferFile) {
        toast.error('يرجى رفع إيصال الدفع للتحويل البنكي');
        return;
      }

      // Validate file size (max 5MB)
      if (bankTransferFile.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(bankTransferFile.type)) {
        toast.error('يُسمح فقط بملفات JPG و PNG و PDF');
        return;
      }
    }

    // Validate WhatsApp number if payment method is whatsapp
    if (selectedPayment === 'whatsapp') {
      if (!whatsappNumber.trim()) {
        toast.error('رقم واتساب مطلوب');
        return;
      }

      // Basic phone number validation (digits only, 10-15 characters)
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!phoneRegex.test(whatsappNumber.replace(/\s+/g, ''))) {
        toast.error('يرجى إدخال رقم واتساب صحيح');
        return;
      }
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        store_id: parseInt(store?.id?.toString() || '0'),
        customer_first_name: customerInfo.firstName,
        customer_last_name: customerInfo.lastName,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        shipping_address: customerInfo.address,
        shipping_city: (cityId || customerInfo.city)?.toString(),
        shipping_state: (stateId || customerInfo.state)?.toString(),
        shipping_postal_code: customerInfo.postalCode,
        shipping_country: (countryId || customerInfo.country)?.toString(),
        billing_address: customerInfo.address,
        billing_city: (cityId || customerInfo.city)?.toString(),
        billing_state: (stateId || customerInfo.state)?.toString(),
        billing_postal_code: customerInfo.postalCode,
        billing_country: (countryId || customerInfo.country)?.toString(),
        payment_method: selectedPayment,
        shipping_method_id: selectedShipping ? parseInt(selectedShipping) : undefined,
        notes: '',
        coupon_code: appliedCoupon?.code || undefined,
        whatsapp_number: selectedPayment === 'whatsapp' ? whatsappNumber : undefined,
      };

      // Use Razorpay utility for Razorpay payments
      if (selectedPayment === 'razorpay') {
        await handleRazorpayOrder(
          orderData,
          store,
          (orderNumber: string) => {
            // Success callback
            const storeUrl = getStoreUrl();
            window.location.href = storeUrl + '?payment_status=success&order_number=' + orderNumber;
          },
          (error: string) => {
            // Error callback
            toast.error(error);
            setIsPlacingOrder(false);
          }
        );
        return;
      }

      // Use Cashfree utility for Cashfree payments
      if (selectedPayment === 'cashfree') {
        const result = await handleCashfreePayment(orderData, store);
        if (!result.success) {
          toast.error(result.error || 'فشل الدفع عبر كاش فري');
          setIsPlacingOrder(false);
        } else {
          setIsPlacingOrder(false);
        }
        return;
      }

      // Use Flutterwave utility for Flutterwave payments
      if (selectedPayment === 'flutterwave') {
        const formData = new FormData();
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) formData.append('_token', csrfToken);
        Object.entries(orderData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) formData.append(key, value.toString());
        });

        const response = await fetch(generateStoreUrl('store.order.place', store), {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });
        const data = await response.json();

        if (response.ok && data.success && data.payment_method === 'flutterwave') {
          try {
            await handleFlutterwavePayment({
              public_key: data.public_key,
              tx_ref: data.tx_ref,
              amount: data.amount,
              currency: data.currency,
              customer_email: data.customer_email,
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              redirect_url: data.redirect_url,
              order_id: data.order_id,
              order_number: data.order_number,
            });
          } catch (error) {
            toast.error('فشل الدفع عبر فلاورويف');
          }
        } else {
          toast.error(data.message || 'تعذر بدء الدفع عبر فلاورويف');
        }
        setIsPlacingOrder(false);
        return;
      }
      // Handle other payment methods with FormData
      const formData = new FormData();
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        formData.append('_token', csrfToken);
      }

      Object.entries(orderData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      if (selectedPayment === 'bank' && bankTransferFile) {
        formData.append('bank_transfer_receipt', bankTransferFile);
      }

      const response = await fetch(generateStoreUrl('store.order.place', store), {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Handle Skrill payment - build and submit HTML form POST to Skrill endpoint
        if (data.payment_method === 'skrill' && data.skrill_data) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.skrill_endpoint;
          Object.entries(data.skrill_data).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
          return;
        }

        // Handle Paystack payment - open modal
        if (data.payment_method === 'paystack' && data.authorization_url) {
          try {
            const { handlePaystackPayment } = await import('../utils/paystack-payment');
            await handlePaystackPayment({
              authorization_url: data.authorization_url,
              reference: data.reference,
              access_code: data.access_code,
              order_id: data.order_id,
              order_number: data.order_number,
            });
            return; // Don't proceed to success page yet
          } catch (error) {
            console.error('Paystack payment error:', error);
            // Fallback to redirect if modal fails
            window.location.href = data.authorization_url;
          }
        }

        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else if (data.whatsapp_redirect && data.whatsapp_data) {
          // For WhatsApp payment, handle redirect with confirmation
          try {
            const { handleWhatsAppRedirect } = await import('../utils/whatsapp-helper');
            handleWhatsAppRedirect(data.whatsapp_data.url, data.whatsapp_data.order_id.toString());
          } catch (error) {
            console.error('WhatsApp redirect error:', error);
            // Fallback to direct redirect
            window.open(data.whatsapp_data.url, '_blank');
          }

          // Handle success state without page refresh if possible
          if (onOrderComplete) {
            // Update URL silently
            const url = new URL(window.location.href);
            url.searchParams.set('payment_status', 'success');
            url.searchParams.set('order_number', data.order_number);
            window.history.replaceState({}, '', url.toString());

            // Trigger success modal via event
            window.dispatchEvent(new CustomEvent('showOrderSuccess', {
              detail: { orderNumber: data.order_number }
            }));

            // Call the complete callback (usually closes checkout modal)
            onOrderComplete();
          } else {
            // Redirect to success page (legacy/fallback)
            const storeUrl = getStoreUrl();
            window.location.href = storeUrl + '?payment_status=success&order_number=' + data.order_number;
          }
        } else {
          if (onOrderComplete) {
            // Update URL silently
            const url = new URL(window.location.href);
            url.searchParams.set('payment_status', 'success');
            url.searchParams.set('order_number', data.order_number);
            window.history.replaceState({}, '', url.toString());

            // Trigger success modal via event
            window.dispatchEvent(new CustomEvent('showOrderSuccess', {
              detail: { orderNumber: data.order_number }
            }));

            // Call the complete callback (usually closes checkout modal)
            onOrderComplete();
          } else {
            const storeUrl = getStoreUrl();
            window.location.href = storeUrl + '?payment_status=success&order_number=' + data.order_number;
          }
        }
      } else {
        // Handle validation errors
        if (data.errors) {
          // setPaymentErrors(data.errors);
        }
        toast.error(data.message || 'فشل إتمام الطلب');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error('تعذر إتمام الطلب. حاول مرة أخرى.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  useEffect(() => {
    if (step === 2) {
      loadShippingMethods();
    }
    if (step === 3) {
      loadPaymentMethods();
    }
  }, [step, store?.id]);

  const value: CheckoutContextType = {
    step,
    customerInfo,
    couponCode,
    appliedCoupon,
    couponError,
    selectedShipping,
    selectedPayment,
    shippingMethods,
    loadingShipping,
    paymentMethods,
    loadingPayments,
    emailError,
    phoneError,
    isPlacingOrder,
    countryId,
    stateId,
    cityId,
    bankTransferFile,
    whatsappNumber,
    whatsappError,
    setStep,
    setCouponCode,
    setCouponError,
    setSelectedShipping,
    setSelectedPayment,
    handleInputChange,
    handleNextStep,
    handlePrevStep,
    handleApplyCoupon,
    handlePlaceOrder,
    setCountryId,
    setStateId,
    setCityId,
    setBankTransferFile,
    setWhatsappNumber,
    setWhatsappError,
    CountryDropdown,
    StateDropdown,
    CityDropdown
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckoutContext = () => {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error('useCheckoutContext must be used within a CheckoutProvider');
  }
  return context;
};