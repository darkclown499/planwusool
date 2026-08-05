import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { CheckoutProvider, useCheckoutContext } from '../../../contexts/CheckoutContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  sku: string;
  taxName?: string;
  taxPercentage?: number;
}

interface CartItem extends Product {
  quantity: number;
  variants?: { [key: string]: string } | null;
}

interface CheckoutProps {

  cartItems: CartItem[];
  currency: string;
  onClose: () => void;
  onOrderComplete: () => void;
  onUpdateCart: (items: CartItem[]) => void;
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
  onRemoveFromCart: (index: number) => void;
  onUpdateQuantity: (index: number, change: number) => void;
  onQuantityChange: (index: number, value: string) => void;
  store?: { id: string | number; slug: string };
  showOrderSuccess?: boolean;
  setShowOrderSuccess?: (show: boolean) => void;
  orderNumber?: string;
  setOrderNumber?: (orderNumber: string) => void;
}

const CheckoutContent: React.FC<Omit<CheckoutProps, 'userProfile' | 'isLoggedIn' | 'store'>> = ({ cartItems, currency, onClose, onOrderComplete, onUpdateCart, onRemoveFromCart, onUpdateQuantity, onQuantityChange }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const {
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
    CountryDropdown,
    StateDropdown,
    CityDropdown,
    setCouponCode,
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
    whatsappNumber,
    whatsappError,
    setWhatsappNumber,
    setWhatsappError
  } = useCheckoutContext();

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalTax = cartItems.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const taxAmount = item.taxPercentage ? (itemTotal * item.taxPercentage) / 100 : 0;
    return sum + taxAmount;
  }, 0);
  const couponDiscount = appliedCoupon ? Number(appliedCoupon.discount) || 0 : 0;
  const selectedShippingMethod = shippingMethods.find(method => method.id.toString() === selectedShipping);
  const shippingCost = selectedShippingMethod ?
    (selectedShippingMethod.type === 'percentage_based' ?
      (subtotal * parseFloat(selectedShippingMethod.cost || 0)) / 100 :
      selectedShippingMethod.type === 'free' ? 0 :
        parseFloat(selectedShippingMethod.cost || 0)) : 0;
  const total = subtotal + totalTax - couponDiscount + shippingCost;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white rounded-3xl md:rounded-3xl shadow-2xl w-full max-w-7xl h-full md:h-[95vh] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden border-2 border-amber-200" onClick={(e) => e.stopPropagation()}>

          {/* Left Panel - Form */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-amber-100 bg-amber-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-600 rounded-2xl flex items-center justify-center">
                    <span className="text-xl md:text-2xl">🏠</span>
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-serif font-bold text-amber-900">إتمام الطلب الآمن</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex space-x-1">
                        {[1, 2, 3].map((num) => (
                          <div key={num} className={`w-2 h-2 rounded-full ${step >= num ? 'bg-amber-600' : 'bg-amber-200'}`}></div>
                        ))}
                      </div>
                      <span className="text-xs md:text-sm text-amber-600">الخطوة {step} من 3</span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {step === 1 && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-amber-900 mb-2">معلومات الاتصال</h3>
                    <p className="text-amber-600">سنستخدمها لإرسال تحديثات الطلب إليك</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">الاسم الأول</label>
                        <input
                          type="text"
                          value={customerInfo.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                          placeholder="محمد"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">اسم العائلة</label>
                        <input
                          type="text"
                          value={customerInfo.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                          placeholder="أحمد"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-amber-800 mb-2">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-2 border-2 rounded-xl focus:outline-none bg-amber-50/30 ${emailError ? 'border-red-500 focus:border-red-500' : 'border-amber-200 focus:border-amber-500'
                          }`}
                        placeholder="أدخل بريدك الإلكتروني"
                      />
                      {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-amber-800 mb-2">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-4 py-2 border-2 rounded-xl focus:outline-none bg-amber-50/30 ${phoneError ? 'border-red-500 focus:border-red-500' : 'border-amber-200 focus:border-amber-500'
                          }`}
                        placeholder="+970 59 123 4567"
                      />
                      {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-amber-800 mb-2">عنوان الشحن</label>
                      <textarea
                        value={customerInfo.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                        rows={3}
                        placeholder="أدخل عنوانك الكامل"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">الدولة</label>
                        <Select
                          value={(() => {
                            const countries = (window as any).page?.props?.countries || [];
                            const selectedCountry = countries.find((c: any) => c.name === customerInfo.country);
                            return selectedCountry?.id?.toString() || '';
                          })()}
                          onValueChange={(countryId) => {
                            const countries = (window as any).page?.props?.countries || [];
                            const selectedCountry = countries.find((c: any) => c.id.toString() === countryId);
                            if (selectedCountry) {
                              handleInputChange('country', selectedCountry.name);
                              handleInputChange('state', '');
                              handleInputChange('city', '');
                              setCountryId(selectedCountry.id);
                              setStateId(undefined);
                              setCityId(undefined);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 border-2 border-amber-200 bg-amber-50/30">
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
                        <label className="block text-sm font-semibold text-amber-800 mb-2">المحافظة</label>
                        <StateDropdown
                          countryId={countryId}
                          value={customerInfo.state}
                          onChange={(value, id) => {
                            handleInputChange('state', value);
                            handleInputChange('city', '');
                            setStateId(id);
                            setCityId(undefined);
                          }}
                          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/30"
                          disabled={!countryId}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">المدينة</label>
                        <CityDropdown
                          stateId={stateId}
                          value={customerInfo.city}
                          onChange={(value, id) => {
                            handleInputChange('city', value);
                            setCityId(id);
                          }}
                          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/30"
                          disabled={!stateId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-amber-800 mb-2">الرمز البريدي</label>
                        <input
                          type="text"
                          value={customerInfo.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                          placeholder="أدخل الرمز البريدي"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-amber-900 mb-2">الشحن والعروض</h3>
                    <p className="text-amber-600 text-sm md:text-base">اختر طريقة التوصيل وقم بتطبيق الخصومات</p>
                  </div>

                  {/* Coupon Section */}
                  <div className="bg-amber-50 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-amber-100">
                    <h4 className="font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                      <span className="text-lg md:text-xl">🎟️</span>
                      هل لديك كوبون خصم؟
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="أدخل رمز الكوبون"
                        className="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white text-sm md:text-base"
                      />
                      <button
                        onClick={() => handleApplyCoupon(subtotal)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors text-sm md:text-base whitespace-nowrap"
                      >
                        تطبيق
                      </button>
                    </div>
                    {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
                    {appliedCoupon && <p className="text-green-600 text-sm mt-2">✓ تم تطبيق الكوبون "{appliedCoupon.code}"</p>}
                  </div>

                  {/* Shipping Methods */}
                  <div className="bg-amber-50 rounded-2xl p-4 md:p-6 border-2 border-amber-100">
                    <h4 className="font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                      <span className="text-lg md:text-xl">🚚</span>
                      خيارات التوصيل
                    </h4>

                    {loadingShipping ? (
                      <div className="text-center py-6 md:py-8">
                        <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3 md:mb-4"></div>
                        <p className="text-amber-600 text-sm md:text-base">جاري تحميل خيارات التوصيل...</p>
                      </div>
                    ) : shippingMethods.length > 0 ? (
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <label key={method.id} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedShipping === method.id.toString() ? 'border-amber-500 bg-amber-50' : 'bg-white'
                            }`}>
                            <input
                              type="radio"
                              name="shipping"
                              value={method.id}
                              checked={selectedShipping === method.id.toString()}
                              onChange={(e) => setSelectedShipping(e.target.value)}
                              className="text-amber-600 w-4 h-4 md:w-5 md:h-5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-amber-900 text-sm md:text-base">{method.name}</div>
                              <div className="text-xs md:text-sm text-amber-600">{method.delivery_time || 'توصيل قياسي'}</div>
                            </div>
                            <div className="font-bold text-amber-900 text-sm md:text-base flex-shrink-0">
                              {method.type === 'free' ? 'مجاني' : formatCurrency(parseFloat(method.cost || 0), storeSettings, currencies)}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-amber-600 text-center py-4 text-sm md:text-base">لا تتوفر طرق شحن</p>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-amber-900 mb-2">طريقة الدفع</h3>
                    <p className="text-amber-600">اختر طريقة الدفع التي تفضلها</p>
                  </div>

                  {loadingPayments ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-amber-600">جاري تحميل طرق الدفع...</p>
                    </div>
                  ) : paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <div key={method.name} className={`border-2 rounded-2xl transition-all ${selectedPayment === method.name ? 'border-amber-500 bg-amber-50' : 'border-amber-200'
                          }`}>
                          <label className="flex items-center gap-4 p-6 cursor-pointer">
                            <input
                              type="radio"
                              name="payment"
                              value={method.name}
                              checked={selectedPayment === method.name}
                              onChange={(e) => setSelectedPayment(e.target.value)}
                              className="text-amber-600 w-5 h-5"
                            />
                            <div className="w-8 h-8 text-amber-600">
                              {method.icon ? (
                                <div dangerouslySetInnerHTML={{ __html: method.icon }} />
                              ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-amber-900 text-lg">{method.display_name}</h4>
                              {method.description && (
                                <p className="text-amber-700 text-sm">{method.description}</p>
                              )}
                            </div>
                          </label>

                          {selectedPayment === method.name && method.name === 'bank' && method.details && (
                            <div className="px-4 pb-4 border-t border-gray-200 mt-2 pt-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <h5 className="font-semibold text-blue-900 mb-2">تفاصيل التحويل البنكي</h5>
                                <div className="text-sm text-blue-800 whitespace-pre-line">{method.details}</div>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-amber-800 mb-2">
                                  ارفع إيصال الدفع *
                                </label>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setBankTransferFile(file);
                                    }
                                  }}
                                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                                />
                              </div>
                            </div>
                          )}

                          {selectedPayment === method.name && method.name === 'whatsapp' && (
                            <div className="px-6 pb-6 border-t border-amber-200">
                              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 mt-4">
                                <h5 className="font-bold text-green-900 mb-2">الدفع عبر واتساب</h5>
                                <div className="text-sm text-green-800">سيتم تحويلك إلى واتساب لإتمام عملية الدفع.</div>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-amber-800 mb-2">
                                  رقم واتساب *
                                </label>
                                <input
                                  type="tel"
                                  value={whatsappNumber}
                                  onChange={(e) => {
                                    setWhatsappNumber(e.target.value);
                                    setWhatsappError('');
                                  }}
                                  placeholder="+1234567890"
                                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none bg-amber-50/30 ${whatsappError ? 'border-red-500 focus:border-red-500' : 'border-amber-200 focus:border-green-500'
                                    }`}
                                />
                                {whatsappError && (
                                  <p className="mt-1 text-sm text-red-600">{whatsappError}</p>
                                )}
                                <p className="mt-1 text-sm text-amber-600">
                                  أدخل رقم واتساب مع رمز الدولة (مثال: 970595123456+)
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedPayment === method.name && method.name !== 'bank' && method.form_fields && (
                            <div className="px-6 pb-6 border-t border-amber-200">
                              <div className="space-y-4 pt-4">
                                {method.form_fields.map((field: any, index: number) => (
                                  <div key={index}>
                                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                                      {field.label} {field.required && '*'}
                                    </label>
                                    <input
                                      type={field.type || 'text'}
                                      placeholder={field.placeholder}
                                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-500 bg-amber-50/30"
                                      required={field.required}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-amber-600 text-center py-8">لا تتوفر طرق دفع</p>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-4 md:p-6 border-t border-amber-100 bg-amber-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                {step > 1 ? (
                  <button
                    onClick={handlePrevStep}
                    className="w-full sm:w-auto px-6 py-3 border-2 border-amber-300 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors font-semibold order-2 sm:order-1"
                  >
                    → رجوع
                  </button>
                ) : <div className="hidden sm:block"></div>}

                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                      (step === 2 && !selectedShipping)
                    }
                    className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold rounded-xl transition-colors disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    متابعة ←
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaceOrder(total)}
                    disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                    className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold rounded-xl transition-colors disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    {isPlacingOrder ? 'جاري المعالجة...' : '🛒 تأكيد الطلب'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="w-full md:w-96 bg-amber-50 border-t md:border-t-0 md:border-r border-amber-200 flex flex-col h-full md:h-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-amber-200 flex-shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-amber-900">ملخص الطلب ({cartItems.length} {cartItems.length === 1 ? 'منتج' : 'منتجات'})</h3>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 md:p-4 border border-amber-100">
                    <div className="flex gap-3">
                      <img src={getImageUrl(item.image)} alt={item.name} className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-xl flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-amber-900 text-sm md:text-base leading-tight mb-1">{item.name}</h4>
                        {(() => {
                          const variants: Record<string, any> = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                          return variants && Object.keys(variants).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {Object.entries(variants).map(([key, value], index) => (
                                <span key={key} className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                        <p className="text-amber-900 font-bold text-sm mb-2">{formatCurrency(item.price * item.quantity, storeSettings, currencies)}</p>
                        {item.taxName && item.taxPercentage && (
                          <p className="text-xs text-amber-500 mb-2">
                            {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity and Remove Controls - Full width on mobile */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-100">
                      <div className="flex items-center gap-1 bg-amber-50 rounded-lg p-1">
                        <button
                          onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                          className={`w-8 h-8 flex items-center justify-center rounded text-white text-sm font-bold ${item.quantity > 1 ? 'bg-amber-600 hover:bg-amber-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold text-amber-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(index, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-amber-600 hover:bg-amber-700 rounded text-white text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals - Fixed at bottom */}
            <div className="p-4 md:p-6 border-t border-amber-200 bg-white flex-shrink-0">
              <div className="space-y-3">
                <div className="flex justify-between text-amber-800">
                  <span>المجموع الفرعي</span>
                  <span className="font-semibold">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>الضريبة</span>
                    <span className="font-semibold">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>الخصم</span>
                    <span className="font-semibold">-{formatCurrency(couponDiscount, storeSettings, currencies)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>الشحن</span>
                    <span className="font-semibold">{formatCurrency(shippingCost, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="border-t-2 border-amber-300 pt-3">
                  <div className="flex justify-between text-xl font-bold text-amber-900">
                    <span>الإجمالي</span>
                    <span>{formatCurrency(total, storeSettings, currencies)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Checkout: React.FC<CheckoutProps> = ({ cartItems, currency, onClose, onOrderComplete, onUpdateCart, userProfile, isLoggedIn, onRemoveFromCart, onUpdateQuantity, onQuantityChange, store }) => {
  return (
    <CheckoutProvider userProfile={userProfile} isLoggedIn={isLoggedIn} store={store} onOrderComplete={onOrderComplete}>
      <CheckoutContent
        cartItems={cartItems}
        currency={currency}
        onClose={onClose}
        onOrderComplete={onOrderComplete}
        onUpdateCart={onUpdateCart}
        onRemoveFromCart={onRemoveFromCart}
        onUpdateQuantity={onUpdateQuantity}
        onQuantityChange={onQuantityChange}
      />
    </CheckoutProvider>
  );
};