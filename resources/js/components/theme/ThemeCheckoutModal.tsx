import { useCheckoutContext } from '@/contexts/CheckoutContext';
import { Check, CreditCard, Package, ShieldCheck, Truck, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { ThemeConfig } from '@/config/theme.schema';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { applyCouponTotals, computeCartTotals } from '@/utils/cart-math';
import { useCoreCommerce } from './useCoreCommerce';
import { DeliverySlotPicker } from './widgets/DeliverySlotPicker';

interface ThemeCheckoutModalProps {
  config: ThemeConfig;
  onClose: () => void;
  onOrderComplete: () => void;
  /** When true, render inside the express modal container (no fixed overlay). */
  inline?: boolean;
}

const inputClass = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClass = 'mb-1 block text-sm font-semibold text-gray-700';

export const ThemeCheckoutModal: React.FC<ThemeCheckoutModalProps> = ({
  config,
  onClose,
  onOrderComplete,
  inline = false,
}) => {
  const core = useCoreCommerce(config);
  const ctx = useCheckoutContext();
  const [deliverySlot, setDeliverySlot] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const { otp, cart } = core;
  const { verifyOtp, sendOtp } = otp;

  const { cartItems } = cart;
  const totals = computeCartTotals(cartItems);
  const withCoupon = applyCouponTotals(totals, ctx.appliedCoupon);

  const stepLabels = ['المعلومات', 'المراجعة', 'الدفع'];
  const stepIcons = [User, Package, CreditCard];

  const phoneNeedsVerification =
    config.commerce.requireOtpVerification &&
    ctx.customerInfo.phone &&
    verifiedPhone !== ctx.customerInfo.phone;

  const sendCode = async () => {
    const ok = await sendOtp(ctx.customerInfo.phone);
    if (ok) setOtpCode('');
  };

  const submitCode = async () => {
    const ok = await verifyOtp(ctx.customerInfo.phone, otpCode);
    if (ok) setVerifiedPhone(ctx.customerInfo.phone);
  };

  const canProceedFromStep1 =
    !phoneNeedsVerification || otp.verifying;

  const handlePlace = () => {
    ctx.handlePlaceOrder(withCoupon.finalTotal).then(onOrderComplete);
  };

  const shell = inline
    ? { className: 'flex h-full flex-col overflow-hidden bg-white' }
    : {
        className:
          'fixed inset-0 z-[60] bg-black/50 flex min-h-full items-end justify-center md:items-center md:p-4',
        onClick: onClose as unknown as React.MouseEventHandler<HTMLDivElement>,
      };

  const panel = inline
    ? {}
    : {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        className:
          'flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl md:h-[88vh] md:rounded-3xl',
      };

  return (
    <div {...shell} onClick={inline ? undefined : onClose}>
      <div {...panel}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: config.styling.primaryColor }}
            >
              {React.createElement(stepIcons[ctx.step - 1], { className: 'h-5 w-5' })}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">إتمام الطلب</h2>
              <p className="text-xs text-gray-500">
                الخطوة {ctx.step} من 3: {stepLabels[ctx.step - 1]}
              </p>
            </div>
          </div>
          {!inline && (
            <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-3">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: i + 1 <= ctx.step ? config.styling.primaryColor : '#e5e7eb',
                  color: i + 1 <= ctx.step ? '#ffffff' : '#9ca3af',
                }}
              >
                {i + 1 < ctx.step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i + 1 <= ctx.step ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {ctx.step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>الاسم الأول</label>
                  <input className={inputClass} value={ctx.customerInfo.firstName} onChange={(e) => ctx.handleInputChange('firstName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>الاسم الأخير</label>
                  <input className={inputClass} value={ctx.customerInfo.lastName} onChange={(e) => ctx.handleInputChange('lastName', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>البريد الإلكتروني</label>
                <input className={inputClass} type="email" value={ctx.customerInfo.email} onChange={(e) => ctx.handleInputChange('email', e.target.value)} />
                {ctx.emailError && <p className="mt-1 text-xs text-rose-600">{ctx.emailError}</p>}
              </div>
              <div>
                <label className={labelClass}>رقم الهاتف</label>
                <div className="flex gap-2">
                  <input className={inputClass} dir="ltr" value={ctx.customerInfo.phone} onChange={(e) => ctx.handleInputChange('phone', e.target.value)} placeholder="+9705XXXXXXXX" />
                  {config.commerce.requireOtpVerification && (
                    <button
                      type="button"
                      disabled={otp.sending || ctx.customerInfo.phone.trim() === ''}
                      onClick={sendCode}
                      className="shrink-0 rounded-xl border border-primary px-3 text-xs font-bold text-primary disabled:opacity-50"
                    >
                      {otp.sending ? '...' : otp.resendIn > 0 ? `أعد بعد ${otp.resendIn}s` : 'أرسل الرمز'}
                    </button>
                  )}
                </div>
                {ctx.phoneError && <p className="mt-1 text-xs text-rose-600">{ctx.phoneError}</p>}

                {config.commerce.requireOtpVerification && phoneNeedsVerification && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <ShieldCheck className="h-4 w-4" />
                      تحقق من رقمك برمز SMS
                    </div>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        dir="ltr"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6 أرقام"
                      />
                      <button
                        type="button"
                        disabled={otp.verifying || otpCode.length !== 6}
                        onClick={submitCode}
                        className="shrink-0 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-50"
                        style={{ backgroundColor: config.styling.primaryColor }}
                      >
                        {otp.verifying ? '...' : 'تحقق'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-amber-700">سيتم إرسال رمز تحقق إلى رقم هاتفك عبر رسالة نصية.</p>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>العنوان</label>
                <input className={inputClass} value={ctx.customerInfo.address} onChange={(e) => ctx.handleInputChange('address', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>البلد</label>
                  <ctx.CountryDropdown value={ctx.customerInfo.country} onChange={(v) => ctx.handleInputChange('country', v)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>المحافظة</label>
                  <ctx.StateDropdown countryId={ctx.countryId} value={ctx.customerInfo.state} onChange={(v) => ctx.handleInputChange('state', v)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>المدينة</label>
                  <ctx.CityDropdown stateId={ctx.stateId} value={ctx.customerInfo.city} onChange={(v) => ctx.handleInputChange('city', v)} className={inputClass} />
                </div>
              </div>

              {config.features.enableDeliverySlots && (
                <DeliverySlotPicker
                  slots={config.commerce.deliverySlots}
                  value={deliverySlot}
                  onChange={setDeliverySlot}
                />
              )}
            </div>
          )}

          {ctx.step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  <Truck className="h-4 w-4" />
                  طرق التوصيل
                </div>
                {ctx.loadingShipping ? (
                  <p className="text-sm text-gray-500">جاري تحميل خيارات التوصيل...</p>
                ) : (
                  <div className="space-y-2">
                    {ctx.shippingMethods.map((method: any) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                          ctx.selectedShipping === method.id.toString() ? 'border-primary bg-primary-soft' : 'border-gray-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                          <input
                            type="radio"
                            name="shipping"
                            checked={ctx.selectedShipping === method.id.toString()}
                            onChange={() => ctx.setSelectedShipping(method.id.toString())}
                            className="accent-primary"
                          />
                          {method.title || method.name}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {method.type === 'free' ? 'مجاني' : formatStoreCurrency(method.cost || 0)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  <User className="h-4 w-4" /> كوبون الخصم
                </div>
                <div className="flex gap-2">
                  <input className={inputClass} value={ctx.couponCode} onChange={(e) => ctx.setCouponCode(e.target.value)} placeholder="أدخل كود الخصم" />
                  <button
                    type="button"
                    onClick={() => ctx.handleApplyCoupon(totals.subtotal)}
                    className="shrink-0 rounded-xl px-4 text-xs font-bold text-white"
                    style={{ backgroundColor: config.styling.primaryColor }}
                  >
                    تطبيق
                  </button>
                </div>
                {ctx.couponError && <p className="mt-1 text-xs text-rose-600">{ctx.couponError}</p>}
                {ctx.appliedCoupon && <p className="mt-1 text-xs font-semibold text-emerald-600">تم تطبيق الخصم: {ctx.appliedCoupon.discount}</p>}
              </div>
            </div>
          )}

          {ctx.step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                  <CreditCard className="h-4 w-4" /> طريقة الدفع
                </div>
                {ctx.loadingPayments ? (
                  <p className="text-sm text-gray-500">جاري تحميل طرق الدفع...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ctx.paymentMethods.map((method: any) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
                          ctx.selectedPayment === method.id ? 'border-primary bg-primary-soft' : 'border-gray-200'
                        }`}
                      >
                        <input type="radio" name="payment" checked={ctx.selectedPayment === method.id} onChange={() => ctx.setSelectedPayment(method.id)} className="accent-primary" />
                        <span className="text-sm font-medium text-gray-800">{method.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {ctx.selectedPayment === 'whatsapp' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <label className={`${labelClass} !text-amber-900`}>رقم الواتساب لتأكيد الطلب</label>
                  <input className={inputClass} dir="ltr" value={ctx.whatsappNumber} onChange={(e) => ctx.setWhatsappNumber(e.target.value)} placeholder="+9705XXXXXXXX" />
                  {ctx.whatsappError && <p className="mt-1 text-xs text-rose-600">{ctx.whatsappError}</p>}
                </div>
              )}
            </div>
          )}

          {/* Totals summary */}
          <div className="mt-5 space-y-1.5 rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>المجموع الفرعي</span>
              <span>{formatStoreCurrency(totals.subtotal)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>الضريبة</span>
                <span>{formatStoreCurrency(totals.tax)}</span>
              </div>
            )}
            {withCoupon.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>الخصم</span>
                <span>-{formatStoreCurrency(withCoupon.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-extrabold text-gray-900">
              <span>الإجمالي</span>
              <span>{formatStoreCurrency(withCoupon.finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-gray-100 p-4">
          {ctx.step > 1 && (
            <button type="button" onClick={ctx.handlePrevStep} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600">
              رجوع
            </button>
          )}
          {ctx.step < 3 ? (
            <button
              type="button"
              disabled={ctx.step === 1 && !canProceedFromStep1}
              onClick={ctx.handleNextStep}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: config.styling.primaryColor }}
            >
              متابعة
            </button>
          ) : (
            <button
              type="button"
              disabled={ctx.isPlacingOrder}
              onClick={handlePlace}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: config.styling.primaryColor }}
            >
              {ctx.isPlacingOrder ? 'جاري إتمام الطلب...' : 'تأكيد الطلب'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};