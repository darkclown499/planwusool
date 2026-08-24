import { useCheckoutContext } from '@/contexts/CheckoutContext';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { Check, CheckCircle2, CreditCard, Gift, Package, Truck, User, Wallet, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';

interface CheckoutProps {
    onClose: () => void;
    onOrderComplete: () => void;
    showOrderSuccess?: boolean;
    setShowOrderSuccess?: (show: boolean) => void;
    orderNumber?: string;
    setOrderNumber?: (orderNumber: string) => void;
}

/**
 * editorial-boutique checkout — same 3-step flow and useCheckoutContext()
 * state machine as the shared checkout (customer info -> review/shipping/
 * coupon -> payment), reskinned to the family's flat, sharp-corner, blush
 * CTA language: panels lose their rounded card chrome for hairline
 * dividers, active radios get a black ring instead of a green tint, and
 * the step indicator is a row of small squares rather than filled circles.
 */
export const Checkout: React.FC<CheckoutProps> = ({ onClose, onOrderComplete }) => {
    const { cart } = useStorefrontCore();
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

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
    } = useCheckoutContext();

    const cartItems = cart.cartItems || [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const totalTax = cartItems.reduce((sum: number, item: any) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        return sum + (item.taxPercentage ? (itemTotal * item.taxPercentage) / 100 : 0);
    }, 0);
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discount) || 0 : 0;
    const selectedShippingMethod = shippingMethods.find((method: any) => method.id.toString() === selectedShipping);
    const shippingCost = selectedShippingMethod
        ? selectedShippingMethod.type === 'percentage_based'
            ? (subtotal * parseFloat(selectedShippingMethod.cost || 0)) / 100
            : selectedShippingMethod.type === 'free'
              ? 0
              : parseFloat(selectedShippingMethod.cost || 0)
        : 0;
    const total = subtotal + totalTax - couponDiscount + shippingCost;

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const primary = css('--twc-primary', '#f6d7d5');
    const accent = css('--twc-accent', '#a4655f');
    const headingFont = css('--twf-heading-font', 'inherit');
    const radius = css('--twx-radius', '4px');

    const inputClass = 'w-full border px-3.5 py-2.5 text-sm outline-none transition focus:opacity-90';
    const inputStyle = { borderColor: border, background: css('--twc-background', '#ffffff'), color: textPrimary, borderRadius: radius };
    const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em]';
    const panelStyle = { borderColor: border, background: css('--twc-background', '#ffffff') };

    const stepIcons = [User, Package, CreditCard];
    const stepLabels = ['المعلومات', 'المراجعة', 'الدفع'];

    const handlePlace = () => {
        handlePlaceOrder(total).then(() => {
            onOrderComplete();
        });
    };

    return (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className="flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden md:h-[92vh]"
                    style={{ background: css('--twc-background', '#ffffff'), borderRadius: `${radius} ${radius} 0 0`, paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b p-4 sm:p-5" style={{ borderColor: border }}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center" style={{ background: primary, borderRadius: radius }}>
                                {stepIcons[step - 1] ? React.createElement(stepIcons[step - 1], { className: 'h-4.5 w-4.5', color: '#000000' }) : null}
                            </div>
                            <div>
                                <h2 className="text-base font-medium" style={{ color: textPrimary, fontFamily: headingFont }}>
                                    إتمام الطلب
                                </h2>
                                <p className="text-xs" style={{ color: textSecondary }}>
                                    الخطوة {step} من 3: {stepLabels[step - 1]}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق"
                            className="flex h-9 w-9 items-center justify-center transition hover:opacity-60"
                            style={{ color: textPrimary }}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 border-b px-4 py-3" style={{ borderColor: border }}>
                        {stepLabels.map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                                <div
                                    className="flex h-6 w-6 items-center justify-center text-[11px] font-bold"
                                    style={{
                                        background: i + 1 <= step ? textPrimary : 'transparent',
                                        border: `1px solid ${i + 1 <= step ? textPrimary : border}`,
                                        color: i + 1 <= step ? '#ffffff' : textSecondary,
                                        borderRadius: radius,
                                    }}
                                >
                                    {i + 1 < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <span className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] sm:inline" style={{ color: i + 1 <= step ? textPrimary : textSecondary }}>
                                    {label}
                                </span>
                                {i < stepLabels.length - 1 && <span className="mx-1 h-px w-6" style={{ background: i + 1 <= step ? textPrimary : border }} />}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            الاسم الأول *
                                        </label>
                                        <input type="text" value={customerInfo.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={inputClass} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            اسم العائلة *
                                        </label>
                                        <input type="text" value={customerInfo.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={inputClass} style={inputStyle} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: textPrimary }}>
                                        البريد الإلكتروني *
                                    </label>
                                    <input type="email" value={customerInfo.email} onChange={(e) => handleInputChange('email', e.target.value)} className={inputClass} style={{ ...inputStyle, borderColor: emailError ? '#dc2626' : border }} />
                                    {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: textPrimary }}>
                                        رقم الهاتف *
                                    </label>
                                    <input type="tel" value={customerInfo.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className={inputClass} style={{ ...inputStyle, borderColor: phoneError ? '#dc2626' : border }} />
                                    {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: textPrimary }}>
                                        العنوان *
                                    </label>
                                    <input type="text" value={customerInfo.address} onChange={(e) => handleInputChange('address', e.target.value)} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            الدولة *
                                        </label>
                                        <CountryDropdown
                                            value={customerInfo.country}
                                            onChange={(value, id) => {
                                                handleInputChange('country', value);
                                                setCountryId(id);
                                            }}
                                            className={`${inputClass} appearance-none`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            المحافظة *
                                        </label>
                                        <StateDropdown
                                            countryId={countryId}
                                            value={customerInfo.state}
                                            onChange={(value, id) => {
                                                handleInputChange('state', value);
                                                setStateId(id);
                                                setCityId(undefined);
                                            }}
                                            className={`${inputClass} appearance-none`}
                                            disabled={!countryId}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            المدينة *
                                        </label>
                                        <CityDropdown
                                            stateId={stateId}
                                            value={customerInfo.city}
                                            onChange={(value, id) => {
                                                handleInputChange('city', value);
                                                setCityId(id);
                                            }}
                                            className={`${inputClass} appearance-none`}
                                            disabled={!stateId}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: textPrimary }}>
                                            الرمز البريدي
                                        </label>
                                        <input type="text" value={customerInfo.postalCode} onChange={(e) => handleInputChange('postalCode', e.target.value)} className={inputClass} style={inputStyle} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="border p-4" style={{ ...panelStyle, borderRadius: radius }}>
                                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: textPrimary }}>
                                        <Package className="h-4 w-4" /> مراجعة الطلب
                                    </h4>
                                    <div className="space-y-3">
                                        {cartItems.map((item: any, index: number) => (
                                            <div key={`${item.id}-${index}`} className="flex items-center gap-3">
                                                <img src={getImageUrl(item.image)} alt={item.name} className="h-12 w-12 object-cover" style={{ borderRadius: radius }} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: textSecondary }}>
                                                        {item.quantity} × {formatCurrency(item.price, storeSettings, currencies)}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                                    {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border p-4" style={{ ...panelStyle, borderRadius: radius }}>
                                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: textPrimary }}>
                                        <Gift className="h-4 w-4" /> كوبون الخصم
                                    </h4>
                                    <div className="flex gap-2">
                                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="أدخل رمز الكوبون" className={inputClass} style={inputStyle} />
                                        <button
                                            type="button"
                                            onClick={() => handleApplyCoupon(subtotal)}
                                            className="whitespace-nowrap px-5 text-xs font-semibold uppercase tracking-[0.08em] transition hover:opacity-85"
                                            style={{ background: primary, color: '#000000', borderRadius: radius }}
                                        >
                                            تطبيق
                                        </button>
                                    </div>
                                    {couponError && <p className="mt-2 text-xs font-medium text-red-500">{couponError}</p>}
                                    {appliedCoupon && (
                                        <p className="mt-2 text-xs font-semibold" style={{ color: accent }}>
                                            ✓ تم تطبيق الكوبون
                                        </p>
                                    )}
                                </div>

                                <div className="border p-4" style={{ ...panelStyle, borderRadius: radius }}>
                                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: textPrimary }}>
                                        <Truck className="h-4 w-4" /> وسيلة الطلب / التوصيل
                                    </h4>
                                    {loadingShipping ? (
                                        <div className="py-4 text-center">
                                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: textPrimary }}></div>
                                        </div>
                                    ) : shippingMethods.length === 0 ? (
                                        <p className="text-sm" style={{ color: textSecondary }}>
                                            لا توجد وسائل توصيل متاحة حالياً.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {shippingMethods.map((method: any) => {
                                                const cost =
                                                    method.type === 'percentage_based'
                                                        ? (subtotal * parseFloat(method.cost || 0)) / 100
                                                        : method.type === 'free'
                                                          ? 0
                                                          : parseFloat(method.cost || 0);
                                                const active = selectedShipping === method.id.toString();
                                                return (
                                                    <label
                                                        key={method.id}
                                                        className="flex cursor-pointer items-center gap-3 border p-3 transition hover:opacity-95"
                                                        style={{ borderColor: active ? textPrimary : border, background: active ? css('--twc-surface', '#faf8f6') : 'transparent', borderRadius: radius }}
                                                    >
                                                        <input type="radio" name="shipping" checked={active} onChange={() => setSelectedShipping(method.id.toString())} />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                                                {method.name}
                                                            </p>
                                                            {method.delivery_time && (
                                                                <p className="text-xs" style={{ color: textSecondary }}>
                                                                    {method.delivery_time}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                                            {cost === 0 ? 'مجاني' : formatCurrency(cost, storeSettings, currencies)}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="border p-4 text-sm" style={{ ...panelStyle, borderRadius: radius }}>
                                    <div className="flex justify-between py-1">
                                        <span style={{ color: textSecondary }}>المجموع الفرعي</span>
                                        <span className="font-medium" style={{ color: textPrimary }}>
                                            {formatCurrency(subtotal, storeSettings, currencies)}
                                        </span>
                                    </div>
                                    {totalTax > 0 && (
                                        <div className="flex justify-between py-1">
                                            <span style={{ color: textSecondary }}>الضريبة</span>
                                            <span className="font-medium" style={{ color: textPrimary }}>
                                                {formatCurrency(totalTax, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    )}
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between py-1">
                                            <span style={{ color: textSecondary }}>الخصم</span>
                                            <span className="font-medium" style={{ color: accent }}>
                                                -{formatCurrency(couponDiscount, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-1">
                                        <span style={{ color: textSecondary }}>الشحن</span>
                                        <span className="font-medium" style={{ color: textPrimary }}>
                                            {shippingCost === 0 ? 'مجاني' : formatCurrency(shippingCost, storeSettings, currencies)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-between border-t pt-3" style={{ borderColor: border }}>
                                        <span className="font-semibold" style={{ color: textPrimary }}>
                                            الإجمالي
                                        </span>
                                        <span className="text-base font-semibold" style={{ color: textPrimary }}>
                                            {formatCurrency(total, storeSettings, currencies)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="border p-4" style={{ ...panelStyle, borderRadius: radius }}>
                                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: textPrimary }}>
                                        <Wallet className="h-4 w-4" /> طريقة الدفع
                                    </h4>
                                    {loadingPayments ? (
                                        <div className="py-4 text-center">
                                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: textPrimary }}></div>
                                        </div>
                                    ) : paymentMethods.length === 0 ? (
                                        <p className="text-sm" style={{ color: textSecondary }}>
                                            لا توجد طرق دفع مفعّلة حالياً.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {paymentMethods.map((method: any) => {
                                                const active = selectedPayment === method.name;
                                                return (
                                                    <div
                                                        key={method.name}
                                                        className="cursor-pointer border p-3 transition hover:opacity-95"
                                                        style={{ borderColor: active ? textPrimary : border, background: active ? css('--twc-surface', '#faf8f6') : 'transparent', borderRadius: radius }}
                                                        onClick={() => setSelectedPayment(method.name)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <input type="radio" name="payment" checked={active} onChange={() => setSelectedPayment(method.name)} />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                                                    {method.display_name || method.name}
                                                                </p>
                                                                {method.description && (
                                                                    <p className="text-xs" style={{ color: textSecondary }}>
                                                                        {method.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {active && <CheckCircle2 className="h-5 w-5" style={{ color: textPrimary }} />}
                                                        </div>

                                                        {active && method.details && (
                                                            <div className="mt-3 p-3 text-sm whitespace-pre-line" style={{ background: css('--twc-surface', '#faf8f6'), color: textSecondary, borderRadius: radius }}>
                                                                {method.details}
                                                            </div>
                                                        )}

                                                        {active && method.name !== 'bank' && method.form_fields && method.form_fields.length > 0 && (
                                                            <div className="mt-3 space-y-3">
                                                                {method.form_fields.map((field: any, idx: number) => (
                                                                    <div key={idx}>
                                                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: textPrimary }}>
                                                                            {field.label}
                                                                            {field.required && <span className="text-red-500"> *</span>}
                                                                        </label>
                                                                        {field.type === 'file' ? (
                                                                            <input type="file" accept={field.accept || 'image/*,.pdf'} onChange={(e) => setBankTransferFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
                                                                        ) : (
                                                                            <input type={field.type === 'textarea' ? 'text' : field.type || 'text'} placeholder={field.placeholder || ''} className={inputClass} style={inputStyle} />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {active && method.name === 'bank' && (
                                                            <div className="mt-3">
                                                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: textPrimary }}>
                                                                    إرفاق إيصال التحويل (اختياري)
                                                                </label>
                                                                <input type="file" accept="image/*,.pdf" onChange={(e) => setBankTransferFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
                                                            </div>
                                                        )}

                                                        {active && method.name === 'whatsapp' && (
                                                            <div className="mt-3">
                                                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: textPrimary }}>
                                                                    رقم واتساب للتواصل *
                                                                </label>
                                                                <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="05xxxxxxxx" className={inputClass} style={inputStyle} />
                                                                {whatsappError && <p className="mt-1 text-xs text-red-500">{whatsappError}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="border p-4 text-sm" style={{ ...panelStyle, borderRadius: radius }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: textSecondary }}>الإجمالي المستحق</span>
                                        <span className="text-base font-semibold" style={{ color: textPrimary }}>
                                            {formatCurrency(total, storeSettings, currencies)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 border-t p-4" style={{ borderColor: border }}>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="border px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] transition hover:opacity-70"
                                style={{ borderColor: border, color: textPrimary, borderRadius: radius }}
                            >
                                السابق
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-1 py-3 text-xs font-semibold uppercase tracking-[0.12em] transition hover:opacity-85"
                                style={{ background: primary, color: '#000000', borderRadius: radius }}
                            >
                                التالي
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                                onClick={handlePlace}
                                className="flex-1 py-3 text-xs font-semibold uppercase tracking-[0.12em] transition hover:opacity-85 disabled:opacity-40"
                                style={{ background: primary, color: '#000000', borderRadius: radius }}
                            >
                                {isPlacingOrder ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
