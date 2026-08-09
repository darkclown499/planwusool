import { createSafeHtml } from '@/utils/xss-protection';
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
  variants?: {[key: string]: string} | null;
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
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-0 md:p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-red-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">إتمام الطلب</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-6 bg-white border-b border-red-100 flex-shrink-0">
            <div className="flex items-center justify-center space-x-8">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className="flex flex-col items-center md:hidden">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 ${
                      step >= stepNum 
                        ? 'bg-red-600 text-white transform scale-110' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}>
                      {step > stepNum ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : stepNum}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${step >= stepNum ? 'text-red-600' : 'text-gray-400'}`}>
                      {stepNum === 1 ? 'المعلومات' : stepNum === 2 ? 'المراجعة' : 'الدفع'}
                    </span>
                  </div>
                  
                  <div className="hidden md:flex md:items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all duration-300 ${
                      step >= stepNum 
                        ? 'bg-red-600 text-white transform scale-110' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}>
                      {step > stepNum ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : stepNum}
                    </div>
                    <span className={`mr-3 font-semibold ${step >= stepNum ? 'text-red-600' : 'text-gray-400'}`}>
                      {stepNum === 1 ? 'المعلومات' : stepNum === 2 ? 'المراجعة' : 'الدفع'}
                    </span>
                  </div>
                  
                  {stepNum < 3 && (
                    <div className={`w-8 md:w-20 h-1 mr-3 md:mr-6 rounded-full transition-all duration-300 ${
                      step > stepNum ? 'bg-red-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {step === 1 && (
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الأول *</label>
                      <input
                        type="text"
                        value={customerInfo.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                        placeholder="أدخل الاسم الأول"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم العائلة *</label>
                      <input
                        type="text"
                        value={customerInfo.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                        placeholder="أدخل اسم العائلة"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 ${
                        emailError ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="أدخل بريدك الإلكتروني"
                    />
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف *</label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 ${
                        phoneError ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="أدخل رقم هاتفك"
                    />
                    {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">العنوان *</label>
                    <textarea
                      value={customerInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                      rows={3}
                      placeholder="أدخل عنوانك الكامل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الدولة *</label>
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
                      <SelectTrigger className="w-full focus:ring-red-300 focus:border-red-300">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">المحافظة *</label>
                    <StateDropdown
                      countryId={countryId}
                      value={customerInfo.state}
                      onChange={(value, id) => {
                        if (value) {
                          handleInputChange('state', value);
                          handleInputChange('city', '');
                          setStateId(id);
                          setCityId(undefined);
                        }
                      }}
                      disabled={!countryId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المدينة *</label>
                    <CityDropdown
                      stateId={stateId}
                      value={customerInfo.city}
                      onChange={(value, id) => {
                        if (value) {
                          handleInputChange('city', value);
                          setCityId(id);
                        }
                      }}
                      disabled={!stateId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الرمز البريدي *</label>
                    <input
                      type="text"
                      value={customerInfo.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
                      placeholder="أدخل الرمز البريدي"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-4 md:p-6">
                <div className="space-y-4 mb-6">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
                      <div className="flex items-start gap-4">
                        <img src={getImageUrl(item.image)} alt={item.name} loading="lazy" className="w-16 h-16 object-cover rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm leading-tight">{item.name}</h4>
                          {(() => {
                            let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                            if (typeof item.variants === 'string') {
                              try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                            }
                            return variants && Object.keys(variants).length > 0 && (
                              <div className="text-xs text-gray-500 mb-1">
                                {Object.entries(variants).map(([key, value], index) => (
                                  <span key={key}>
                                    {key}: {value}
                                    {index < Object.keys(variants).length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-red-600 font-bold text-lg">{formatCurrency(item.price * item.quantity, storeSettings, currencies)}</p>
                            <button 
                              onClick={() => onRemoveFromCart(index)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{formatCurrency(item.price, storeSettings, currencies)} للقطعة</span>
                            <div className="flex items-center gap-3 bg-red-100 rounded-lg p-1">
                              <button 
                                onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-white text-sm shadow-sm font-bold leading-none ${
                                  item.quantity > 1 ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => onQuantityChange(index, e.target.value)}
                                className="w-8 text-sm font-semibold text-gray-900 text-center bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                              />
                              <button 
                                onClick={() => onUpdateQuantity(index, 1)}
                                className="w-7 h-7 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-md text-white text-sm cursor-pointer shadow-sm font-bold leading-none"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {item.taxName && item.taxPercentage && (
                            <p className="text-xs text-gray-400 mt-2">
                              {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Coupon Section */}
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">تطبيق كوبون الخصم</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError('');
                      }}
                      placeholder="أدخل رمز الكوبون"
                      className={`flex-1 px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 text-base bg-white ${
                        couponError ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    <button
                      onClick={() => handleApplyCoupon(subtotal)}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm sm:whitespace-nowrap"
                    >
                      تطبيق
                    </button>
                  </div>
                  {couponError && (
                    <div className="mt-2 text-sm text-red-600">
                      {couponError}
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="mt-2 text-sm text-green-600">
                      ✓ تم تطبيق الكوبون "{appliedCoupon.code}"
                    </div>
                  )}
                </div>

                {/* Shipping Section */}
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">طرق الشحن</h4>
                  
                  {loadingShipping ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">جاري تحميل خيارات الشحن...</p>
                    </div>
                  ) : shippingMethods.length > 0 ? (
                    <div className="space-y-2">
                      {shippingMethods.map((method) => (
                        <label key={method.id} className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                          <input
                            type="radio"
                            name="shipping"
                            value={method.id}
                            checked={selectedShipping === method.id.toString()}
                            onChange={(e) => setSelectedShipping(e.target.value)}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{method.name}</div>
                            <div className="text-xs text-gray-500">{method.delivery_time || 'توصيل قياسي'}</div>
                            {method.description && (
                              <div className="text-xs text-gray-400">{method.description}</div>
                            )}
                          </div>
                          <div className="font-semibold text-sm">
                            {method.type === 'percentage_based' ? 
                              `${parseFloat(method.cost || 0)}%` : 
                            method.type === 'free' ? 'مجاني' :
                              formatCurrency(parseFloat(method.cost || 0), storeSettings, currencies)
                            }
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">لا تتوفر طرق شحن</p>
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">المجموع الفرعي</span>
                      <span className="font-semibold">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                    </div>
                    {totalTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">الضريبة</span>
                        <span className="font-semibold">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600">
                        <span>خصم الكوبون{appliedCoupon.type === 'percentage' ? ` (${appliedCoupon.discount_amount}%)` : ''}</span>
                        <span>-{formatCurrency(couponDiscount, storeSettings, currencies)}</span>
                      </div>
                    )}
                    {shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">الشحن</span>
                        <span className="font-semibold">{formatCurrency(shippingCost, storeSettings, currencies)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-red-200">
                      <span className="text-lg font-bold">الإجمالي</span>
                      <span className="text-xl font-bold text-red-600">{formatCurrency(total, storeSettings, currencies)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-4 md:p-6">
                
                {loadingPayments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">جاري تحميل طرق الدفع...</p>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.name} className={`border-2 rounded-lg transition-all ${
                        selectedPayment === method.name ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <label className="flex items-center gap-4 p-4 cursor-pointer">
                          <input
                            type="radio"
                            name="payment"
                            value={method.name}
                            checked={selectedPayment === method.name}
                            onChange={(e) => setSelectedPayment(e.target.value)}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <div className="w-6 h-6 text-red-600">
                            {method.icon ? (
                              <div dangerouslySetInnerHTML={createSafeHtml(method.icon)} />
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{method.display_name}</h4>
                            {method.description && (
                              <p className="text-sm text-gray-600">{method.description}</p>
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
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
                                ارفع إيصال الدفع *
                              </label>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setBankTransferFile(file);
                                }}
                                className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 bg-white"
                              />
                            </div>
                          </div>
                        )}
                        
                        {selectedPayment === method.name && method.name === 'whatsapp' && (
                          <div className="px-4 pb-4 border-t border-red-200 mt-2 pt-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                              <h5 className="font-semibold text-green-900 mb-2">الدفع عبر واتساب</h5>
                              <div className="text-sm text-green-800">سيتم تحويلك إلى واتساب لإتمام عملية الدفع.</div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none bg-white ${
                                  whatsappError ? 'border-red-500 focus:border-red-500' : 'border-red-300 focus:border-green-500'
                                }`}
                              />
                              {whatsappError && (
                                <p className="mt-1 text-sm text-red-600">{whatsappError}</p>
                              )}
                              <p className="mt-1 text-sm text-gray-600">
                                أدخل رقم واتساب مع رمز الدولة (مثال: 970595123456+)
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPayment === method.name && method.name !== 'bank' && method.form_fields && (
                          <div className="px-4 pb-4 border-t border-red-200 mt-2 pt-4">
                            <div className="space-y-3">
                              {method.form_fields.map((field: any, index: number) => (
                                <div key={index}>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {field.label} {field.required && '*'}
                                  </label>
                                  {field.type === 'file' ? (
                                    <input
                                      type="file"
                                      onChange={(e) => setBankTransferFile(e.target.files?.[0] || null)}
                                      accept={field.accept || "image/*,.pdf"}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                      required={field.required}
                                    />
                                  ) : (
                                    <input
                                      type={field.type || 'text'}
                                      placeholder={field.placeholder}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                      required={field.required}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">لا تتوفر طرق دفع</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-red-100 bg-white flex-shrink-0 shadow-lg">
            <div className="md:hidden">
              <div className="text-right mb-4">
                <p className="text-sm text-gray-600">الإجمالي</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(total, storeSettings, currencies)}</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  {step > 1 && (
                    <button
                      onClick={handlePrevStep}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      رجوع
                    </button>
                  )}
                </div>
                <div>
                  {step < 3 ? (
                    <button
                      onClick={handleNextStep}
                      disabled={
                        (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                        (step === 2 && !selectedShipping)
                      }
                      className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      متابعة
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlaceOrder(total)}
                      disabled={
                        isPlacingOrder ||
                        !selectedPayment ||
                        (selectedPayment === 'whatsapp' && !whatsappNumber.trim())
                      }
                      className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isPlacingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
              <div>
                {step > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    رجوع
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">الإجمالي</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(total, storeSettings, currencies)}</p>
                </div>
                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                      (step === 2 && !selectedShipping)
                    }
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    متابعة
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaceOrder(total)}
                    disabled={
                      isPlacingOrder ||
                      !selectedPayment ||
                      (selectedPayment === 'whatsapp' && !whatsappNumber.trim())
                    }
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isPlacingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                  </button>
                )}
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