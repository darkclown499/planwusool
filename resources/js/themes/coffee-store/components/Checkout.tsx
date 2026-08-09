import { createSafeHtml } from '@/utils/xss-protection';
import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { CheckoutProvider, useCheckoutContext } from '../../../contexts/CheckoutContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ShoppingBag, Minus, Plus, Trash2, CreditCard, Truck } from 'lucide-react';

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

const CheckoutContent: React.FC<Omit<CheckoutProps, 'userProfile' | 'isLoggedIn' | 'store'>> = ({ 
  cartItems, currency, onClose, onOrderComplete, onUpdateCart, onRemoveFromCart, onUpdateQuantity, onQuantityChange 
}) => {
  useEffect(() => {
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
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden border-2 border-stone-200" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="relative bg-amber-700 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 left-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center justify-center text-white pl-10">
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold">إتمام الطلب</h2>
                <p className="text-stone-200 text-xs sm:text-sm">أكمل طلبك</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-4 sm:px-6 py-4 bg-stone-50 border-b border-stone-200">
            <div className="flex items-center justify-center gap-2 sm:gap-8">
              {[
                { num: 1, label: 'المعلومات', icon: '👤' },
                { num: 2, label: 'المراجعة', icon: '📋' },
                { num: 3, label: 'الدفع', icon: '💳' }
              ].map((stepItem, index) => (
                <div key={stepItem.num} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold transition-all ${
                      step >= stepItem.num 
                        ? 'bg-amber-700 text-white shadow-lg' 
                        : 'bg-stone-200 text-amber-600'
                    }`}>
                      {stepItem.icon}
                    </div>
                    <span className={`mr-2 sm:mr-3 text-xs sm:text-sm font-medium hidden sm:block ${
                      step >= stepItem.num ? 'text-amber-700' : 'text-amber-500'
                    }`}>
                      {stepItem.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`w-4 sm:w-16 h-1 mr-2 sm:mr-4 rounded-full ${
                      step > stepItem.num ? 'bg-amber-700' : 'bg-stone-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {step === 1 && (
              <div className="p-4 sm:p-6">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-amber-900 mb-4 sm:mb-6 text-center">معلومات العميل / الشحن</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-700 mb-2">الاسم الأول *</label>
                        <input
                          type="text"
                          value={customerInfo.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 transition-colors"
                          placeholder="أدخل الاسم الأول"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-amber-700 mb-2">اسم العائلة *</label>
                        <input
                          type="text"
                          value={customerInfo.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 transition-colors"
                          placeholder="أدخل اسم العائلة"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-amber-700 mb-2">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          emailError ? 'border-red-500 focus:border-red-600' : 'border-stone-300 focus:border-amber-600'
                        }`}
                        placeholder="أدخل بريدك الإلكتروني"
                      />
                      {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-amber-700 mb-2">رقم الهاتف *</label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          phoneError ? 'border-red-500 focus:border-red-600' : 'border-stone-300 focus:border-amber-600'
                        }`}
                        placeholder="أدخل رقم هاتفك"
                      />
                      {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-amber-700 mb-2">العنوان *</label>
                      <textarea
                        value={customerInfo.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 transition-colors"
                        rows={3}
                        placeholder="أدخل عنوانك الكامل"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-700 mb-2">الدولة *</label>
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
                          <SelectTrigger className="w-full px-4 border-2 border-stone-300 focus:border-amber-600 focus:ring-amber-600">
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
                        <label className="block text-sm font-semibold text-amber-700 mb-2">المحافظة *</label>
                        <StateDropdown
                          countryId={countryId}
                          value={customerInfo.state}
                          onChange={(value, id) => {
                            handleInputChange('state', value);
                            handleInputChange('city', '');
                            setStateId(id);
                            setCityId(undefined);
                          }}
                          className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-amber-600 transition-colors"
                          disabled={!countryId}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-amber-700 mb-2">المدينة *</label>
                        <CityDropdown
                          stateId={stateId}
                          value={customerInfo.city}
                          onChange={(value, id) => {
                            handleInputChange('city', value);
                            setCityId(id);
                          }}
                          className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-amber-600 transition-colors"
                          disabled={!stateId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-amber-700 mb-2">الرمز البريدي *</label>
                        <input
                          type="text"
                          value={customerInfo.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          className="w-full px-4 py-1.5 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 transition-colors"
                          placeholder="أدخل الرمز البريدي"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-amber-900 mb-4 sm:mb-6 text-center">مراجعة الطلب</h3>
                
                {/* Cart Items */}
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-stone-50 rounded-xl p-3 sm:p-4 border-2 border-stone-200">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <img src={getImageUrl(item.image)} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-stone-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-amber-900 mb-1 sm:mb-2 text-sm sm:text-base truncate">{item.name}</h4>
                          {(() => {
                            let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                            if (typeof item.variants === 'string') {
                              try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                            }
                            return variants && Object.keys(variants).length > 0 && (
                              <div className="text-xs sm:text-sm text-amber-600 mb-2">
                                {Object.entries(variants).map(([key, value], index) => (
                                  <span key={key}>
                                    {key}: {value}
                                    {index < Object.keys(variants).length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          <div className="mb-2">
                            <p className="text-sm text-amber-600">السعر: {formatCurrency(item.price, storeSettings, currencies)} × {item.quantity}</p>
                            {item.taxPercentage && (
                              <p className="text-xs text-amber-500">
                                الضريبة ({item.taxName || 'الضريبة'}): {item.taxPercentage}% = {formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-base sm:text-lg font-bold text-amber-800">{formatCurrency(item.price * item.quantity, storeSettings, currencies)}</p>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex items-center bg-white rounded-lg border-2 border-stone-300">
                                <button 
                                  onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                                  className={`p-1.5 sm:p-2 rounded-r-lg transition-colors ${
                                    item.quantity > 1 ? 'hover:bg-stone-100 cursor-pointer' : 'cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => onQuantityChange(index, e.target.value)}
                                  className="w-8 sm:w-12 text-center font-bold text-amber-900 bg-transparent border-0 focus:outline-none text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  min="1"
                                />
                                <button 
                                  onClick={() => onUpdateQuantity(index, 1)}
                                  className="p-1.5 sm:p-2 hover:bg-stone-100 rounded-l-lg transition-colors"
                                >
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                                </button>
                              </div>
                              <button 
                                onClick={() => onRemoveFromCart(index)}
                                className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Coupon & Shipping */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border-2 border-stone-200">
                    <h4 className="font-serif font-bold text-amber-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                      🎟️ تطبيق كوبون الخصم
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="أدخل رمز الكوبون"
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 text-sm sm:text-base"
                      />
                      <button
                        onClick={() => handleApplyCoupon(subtotal)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-colors font-semibold text-sm sm:text-base"
                      >
                        تطبيق
                      </button>
                    </div>
                    {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
                    {appliedCoupon && <p className="text-green-600 text-sm mt-2">✓ تم تطبيق الكوبون "{appliedCoupon.code}"</p>}
                  </div>

                  <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border-2 border-stone-200">
                    <h4 className="font-serif font-bold text-amber-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5" /> طرق الشحن
                    </h4>
                    {loadingShipping ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700 mx-auto"></div>
                        <p className="text-sm text-amber-500 mt-2">جاري تحميل خيارات الشحن...</p>
                      </div>
                    ) : shippingMethods.length > 0 ? (
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <label key={method.id} className="flex items-center gap-3 p-3 border-2 border-stone-300 rounded-lg cursor-pointer bg-white hover:bg-stone-50 transition-colors">
                            <input
                              type="radio"
                              name="shipping"
                              value={method.id}
                              checked={selectedShipping === method.id.toString()}
                              onChange={(e) => setSelectedShipping(e.target.value)}
                              className="text-amber-700 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{method.name}</div>
                              <div className="text-xs text-amber-500 truncate">{method.delivery_time || 'توصيل قياسي'}</div>
                            </div>
                            <div className="font-bold text-sm whitespace-nowrap">
                              {method.type === 'free' ? 'مجاني' : formatCurrency(parseFloat(method.cost || 0), storeSettings, currencies)}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-500 text-center py-4">لا تتوفر طرق شحن</p>
                    )}
                  </div>
                  
                  {/* Order Summary */}
                  <div className="bg-stone-50 rounded-xl p-4 sm:p-6 border-2 border-stone-200">
                    <h4 className="font-serif font-bold text-amber-900 mb-4 text-sm sm:text-base">ملخص الطلب</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-amber-600">المجموع الفرعي:</span>
                        <span className="font-semibold">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                      </div>
                      {totalTax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-600">الضريبة:</span>
                          <span className="font-semibold">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>خصم الكوبون:</span>
                          <span className="font-semibold">-{formatCurrency(couponDiscount, storeSettings, currencies)}</span>
                        </div>
                      )}
                      {shippingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-600">الشحن:</span>
                          <span className="font-semibold">{formatCurrency(shippingCost, storeSettings, currencies)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-stone-300 pt-2 mt-3">
                        <div className="flex justify-between text-base sm:text-lg font-bold text-amber-900">
                          <span>الإجمالي:</span>
                          <span>{formatCurrency(total, storeSettings, currencies)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-4 sm:p-6">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-amber-900 mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" /> طريقة الدفع
                  </h3>
                  {loadingPayments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto"></div>
                      <p className="text-sm text-amber-500 mt-2">جاري تحميل طرق الدفع...</p>
                    </div>
                  ) : paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <div key={method.name} className={`border-2 rounded-xl transition-all ${
                          selectedPayment === method.name ? 'border-amber-700 bg-stone-50' : 'border-stone-300 hover:border-amber-400'
                        }`}>
                          <label className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 cursor-pointer">
                            <input
                              type="radio"
                              name="payment"
                              value={method.name}
                              checked={selectedPayment === method.name}
                              onChange={(e) => setSelectedPayment(e.target.value)}
                              className="text-amber-700 flex-shrink-0"
                            />
                            <div className="w-6 h-6 sm:w-8 sm:h-8 text-amber-700 flex-shrink-0">
                              {method.icon ? (
                                <div dangerouslySetInnerHTML={createSafeHtml(method.icon)} />
                              ) : (
                                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif font-bold text-amber-900 text-base sm:text-lg truncate">{method.display_name}</h4>
                              {method.description && <p className="text-sm text-amber-600 mt-1">{method.description}</p>}
                            </div>
                          </label>
                          
                          {selectedPayment === method.name && method.name === 'bank' && method.details && (
                            <div className="px-4 pb-4 border-t border-stone-200 mt-2 pt-4">
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
                                    if (file) setBankTransferFile(file);
                                  }}
                                  className="w-full px-4 py-3 border-2 border-stone-300 rounded-xl focus:outline-none focus:border-amber-700 bg-stone-50/30"
                                />
                              </div>
                            </div>
                          )}
                          
                          {selectedPayment === method.name && method.name === 'whatsapp' && (
                            <div className="px-4 pb-4 border-t border-stone-200 mt-2 pt-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <h5 className="font-serif font-bold text-green-900 mb-2">الدفع عبر واتساب</h5>
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
                                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none bg-stone-50/30 ${
                                    whatsappError ? 'border-red-500 focus:border-red-500' : 'border-stone-300 focus:border-green-500'
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-amber-500 text-center py-8">لا تتوفر طرق دفع</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t-2 border-stone-200 bg-gradient-to-r from-stone-50 to-stone-100">
            {/* Mobile Layout */}
            <div className="sm:hidden">
              <div className="text-center mb-4">
                <p className="text-sm text-amber-600 font-medium">الإجمالي</p>
                <p className="text-xl font-bold text-amber-800">{formatCurrency(total, storeSettings, currencies)}</p>
              </div>
              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="flex-1 px-4 py-3 border-2 border-stone-300 text-amber-700 rounded-lg hover:bg-stone-100 transition-colors font-semibold text-sm"
                  >
                    رجوع
                  </button>
                )}
                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                      (step === 2 && !selectedShipping)
                    }
                    className="flex-1 px-4 py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed shadow-lg text-sm"
                  >
                    متابعة
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaceOrder(total)}
                    disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                    className="flex-1 px-4 py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed shadow-lg text-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isPlacingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div>
                {step > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-6 py-3 border-2 border-stone-300 text-amber-700 rounded-lg hover:bg-stone-100 transition-colors font-semibold"
                  >
                    رجوع
                  </button>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <p className="text-sm text-amber-600 font-medium">الإجمالي</p>
                  <p className="text-2xl font-bold text-amber-800">{formatCurrency(total, storeSettings, currencies)}</p>
                </div>
                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                      (step === 2 && !selectedShipping)
                    }
                    className="px-8 py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed shadow-lg"
                  >
                    متابعة
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaceOrder(total)}
                    disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                    className="px-8 py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
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

export const Checkout: React.FC<CheckoutProps> = ({ 
  cartItems, currency, onClose, onOrderComplete, onUpdateCart, userProfile, isLoggedIn, onRemoveFromCart, onUpdateQuantity, onQuantityChange, store 
}) => {
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