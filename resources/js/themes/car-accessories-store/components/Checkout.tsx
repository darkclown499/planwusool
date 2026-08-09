import { createSafeHtml } from '@/utils/xss-protection';
import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { CheckoutProvider, useCheckoutContext } from '../../../contexts/CheckoutContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ShoppingCart, User, Package, CreditCard, Check, Minus, Plus, Trash2 } from 'lucide-react';

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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const stepIcons = [User, Package, CreditCard];
  const stepLabels = ['المعلومات', 'المراجعة', 'الدفع'];

  return (
    <div className="fixed inset-0 z-50 bg-black/70">
      <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
        <div 
          className="bg-slate-800 w-full h-full md:h-[95vh] md:max-w-5xl overflow-hidden shadow-2xl flex flex-col border-2 border-red-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b-2 border-red-600 bg-black">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">إتمام الطلب</h2>
                <p className="text-sm text-slate-300 font-medium">أكمل طلبك</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-red-400" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-4 md:px-6 py-4 bg-slate-900 border-b-2 border-red-600">
            <div className="flex items-center justify-center max-w-md mx-auto">
              {[1, 2, 3].map((stepNum, index) => {
                const Icon = stepIcons[index];
                const isActive = step >= stepNum;
                const isCompleted = step > stepNum;
                
                return (
                  <div key={stepNum} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 flex items-center justify-center transition-all ${
                        isCompleted ? 'bg-red-600 text-white' :
                        isActive ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={`mt-2 text-xs font-bold ${
                        isActive ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        <span className="hidden sm:inline">{stepLabels[index]}</span>
                        <span className="sm:hidden">{stepLabels[index]}</span>
                      </span>
                    </div>
                    {stepNum < 3 && (
                      <div className={`w-12 md:w-20 h-0.5 mx-2 transition-all ${
                        step > stepNum ? 'bg-red-600' : 'bg-slate-600'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-800">
            {step === 1 && (
              <div className="p-4 md:p-6">
                <div className="mx-auto">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-400" />
                    معلومات العميل / الشحن
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">الاسم الأول *</label>
                        <input
                          type="text"
                          value={customerInfo.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="أدخل الاسم الأول"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">اسم العائلة *</label>
                        <input
                          type="text"
                          value={customerInfo.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="أدخل اسم العائلة"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          emailError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-red-500 focus:border-red-500'
                        }`}
                        placeholder="أدخل بريدك الإلكتروني"
                      />
                      {emailError && <p className="text-red-400 text-sm mt-1 font-medium">{emailError}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">رقم الهاتف *</label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          phoneError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-red-500 focus:border-red-500'
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                      {phoneError && <p className="text-red-400 text-sm mt-1 font-medium">{phoneError}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">العنوان *</label>
                      <textarea
                        value={customerInfo.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        rows={3}
                        placeholder="أدخل عنوانك الكامل"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">الدولة *</label>
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
                          <SelectTrigger className="focus:ring-red-500 focus:border-red-500 bg-slate-800 border-slate-600 text-white">
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
                        <label className="block text-sm font-bold text-white mb-2">المحافظة *</label>
                        <StateDropdown
                          countryId={countryId}
                          value={customerInfo.state}
                          onChange={(value, id) => {
                            handleInputChange('state', value);
                            handleInputChange('city', '');
                            setStateId(id);
                            setCityId(undefined);
                          }}
                          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          disabled={!countryId}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">المدينة *</label>
                        <CityDropdown
                          stateId={stateId}
                          value={customerInfo.city}
                          onChange={(value, id) => {
                            handleInputChange('city', value);
                            setCityId(id);
                          }}
                          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          disabled={!stateId}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">الرمز البريدي *</label>
                        <input
                          type="text"
                          value={customerInfo.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="أدخل الرمز البريدي"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-4 md:p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-400" />
                  مراجعة الطلب
                </h3>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-slate-800 border-2 border-slate-700 p-3 sm:p-4">
                      <div className="flex gap-3 sm:gap-4">
                        <img 
                          src={getImageUrl(item.image)} 
                          alt={item.name} 
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white mb-1 text-sm sm:text-base line-clamp-2">{item.name}</h4>
                          {(() => {
                            let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                            if (typeof item.variants === 'string') {
                              try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                            }
                            return variants && Object.keys(variants).length > 0 && (
                              <div className="text-xs text-slate-400 mb-2 font-medium">
                                {Object.entries(variants).map(([key, value], index) => (
                                  <span key={key}>
                                    {key}: {value}
                                    {index < Object.keys(variants).length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="text-base sm:text-lg font-bold text-red-400">
                                {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                              </div>
                              {item.taxName && item.taxPercentage && (
                                <div className="text-xs text-slate-400 font-medium">
                                  {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                              <div className="flex items-center gap-1 sm:gap-2 bg-slate-700 p-1">
                                <button 
                                  onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center ${
                                    item.quantity > 1 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                  } transition-colors`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 sm:w-8 text-center font-bold text-white text-sm sm:text-base">{item.quantity}</span>
                                <button 
                                  onClick={() => onUpdateQuantity(index, 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button 
                                onClick={() => onRemoveFromCart(index)}
                                className="p-1.5 sm:p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Section */}
                <div className="bg-slate-800 border-2 border-slate-700 p-3 sm:p-4 mb-6">
                  <h4 className="font-bold text-white mb-3 text-sm sm:text-base">تطبيق كوبون الخصم</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="أدخل رمز الكوبون"
                      className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 text-sm sm:text-base ${
                        couponError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-red-500'
                      }`}
                    />
                    <button
                      onClick={() => handleApplyCoupon(subtotal)}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm sm:text-base whitespace-nowrap border-2 border-red-600"
                    >
                      تطبيق
                    </button>
                  </div>
                  {couponError && <p className="text-red-400 text-xs sm:text-sm mt-2 font-medium">{couponError}</p>}
                  {appliedCoupon && <p className="text-green-400 text-xs sm:text-sm mt-2 font-medium">✓ تم تطبيق الكوبون</p>}
                </div>

                {/* Shipping Methods */}
                <div className="bg-slate-800 border-2 border-slate-700 p-4 mb-6">
                  <h4 className="font-bold text-white mb-3">طرق الشحن</h4>
                  {loadingShipping ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shippingMethods.map((method) => (
                        <label key={method.id} className="flex items-center gap-3 p-3 border-2 border-slate-600 cursor-pointer hover:border-red-600">
                          <input
                            type="radio"
                            name="shipping"
                            value={method.id}
                            checked={selectedShipping === method.id.toString()}
                            onChange={(e) => setSelectedShipping(e.target.value)}
                            className="text-red-600"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-white">{method.name}</div>
                            <div className="text-sm text-slate-400 font-medium">{method.delivery_time}</div>
                          </div>
                          <div className="font-bold text-red-400">
                            {method.type === 'free' ? 'مجاني' : formatCurrency(parseFloat(method.cost || 0), storeSettings, currencies)}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="bg-slate-700 border-2 border-slate-600 p-4">
                  <h4 className="font-bold text-white mb-3">ملخص الطلب</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">المجموع الفرعي</span>
                      <span className="font-bold text-white">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                    </div>
                    {totalTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">الضريبة</span>
                        <span className="font-bold text-white">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-400">
                        <span className="font-medium">خصم الكوبون</span>
                        <span className="font-bold">-{formatCurrency(couponDiscount, storeSettings, currencies)}</span>
                      </div>
                    )}
                    {shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium">الشحن</span>
                        <span className="font-bold text-white">{formatCurrency(shippingCost, storeSettings, currencies)}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-slate-600 pt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-white">الإجمالي</span>
                        <span className="text-xl font-bold text-red-400">{formatCurrency(total, storeSettings, currencies)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-4 md:p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-400" />
                  طريقة الدفع
                </h3>
                
                {loadingPayments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.name} className={`border-2 transition-all ${
                        selectedPayment === method.name ? 'border-red-500 bg-slate-800' : 'border-slate-700 hover:border-slate-600'
                      }`}>
                        <label className="flex items-center gap-4 p-4 cursor-pointer">
                          <input
                            type="radio"
                            name="payment"
                            value={method.name}
                            checked={selectedPayment === method.name}
                            onChange={(e) => setSelectedPayment(e.target.value)}
                            className="text-red-600"
                          />
                          <div className="w-6 h-6 text-red-400 flex-shrink-0">
                            {method.icon ? (
                              <div dangerouslySetInnerHTML={createSafeHtml(method.icon)} />
                            ) : (
                              <CreditCard className="w-6 h-6" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-white">{method.display_name}</h4>
                            {method.description && (
                              <p className="text-sm text-slate-400 font-medium">{method.description}</p>
                            )}
                          </div>
                        </label>
                        
                        {selectedPayment === method.name && method.name === 'bank' && method.details && (
                          <div className="px-4 pb-4 border-t border-slate-700 mt-2 pt-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <h5 className="font-semibold text-blue-900 mb-2">تفاصيل التحويل البنكي</h5>
                              <div className="text-sm text-blue-800 whitespace-pre-line">{method.details}</div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-white mb-2">
                                ارفع إيصال الدفع *
                              </label>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setBankTransferFile(file);
                                }}
                                className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg focus:outline-none focus:border-red-500 bg-slate-700 text-white"
                              />
                            </div>
                          </div>
                        )}
                        
                        {selectedPayment === method.name && method.name === 'whatsapp' && (
                          <div className="px-4 pb-4 border-t border-slate-700 mt-2 pt-4">
                            <div className="bg-green-900/20 border border-green-600 p-4 mb-4">
                              <h5 className="font-bold text-green-400 mb-2">الدفع عبر واتساب</h5>
                              <div className="text-sm text-green-300 font-medium">سيتم تحويلك إلى واتساب لإتمام عملية الدفع.</div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-white mb-2">
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
                                className={`w-full px-4 py-3 bg-slate-700 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                                  whatsappError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-green-500 focus:border-green-500'
                                }`}
                              />
                              {whatsappError && (
                                <p className="mt-1 text-sm text-red-400 font-medium">{whatsappError}</p>
                              )}
                              <p className="mt-1 text-sm text-slate-400 font-medium">
                                أدخل رقم واتساب مع رمز الدولة (مثال: +970595123456)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-red-600 bg-black p-4 md:p-6">
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-300 font-medium">الإجمالي</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(total, storeSettings, currencies)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  {step > 1 && (
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-3 border-2 border-slate-600 text-white hover:bg-slate-700 transition-colors text-sm font-bold"
                    >
                      رجوع
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  {step < 3 ? (
                    <button
                      onClick={handleNextStep}
                      disabled={
                        (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                        (step === 2 && !selectedShipping)
                      }
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold transition-colors disabled:cursor-not-allowed text-sm border-2 border-red-600"
                    >
                      متابعة
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlaceOrder(total)}
                      disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold transition-colors disabled:cursor-not-allowed text-sm border-2 border-red-600"
                    >
                      {isPlacingOrder ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
              <div>
                {step > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-6 py-3 border-2 border-slate-600 text-white hover:bg-slate-700 transition-colors font-bold"
                  >
                    رجوع
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-300 font-medium">الإجمالي</p>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(total, storeSettings, currencies)}</p>
                </div>
                
                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (step === 1 && (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.state || !customerInfo.country || !customerInfo.postalCode)) ||
                      (step === 2 && !selectedShipping)
                    }
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold transition-colors disabled:cursor-not-allowed border-2 border-red-600"
                  >
                    متابعة
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaceOrder(total)}
                    disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold transition-colors disabled:cursor-not-allowed border-2 border-red-600"
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