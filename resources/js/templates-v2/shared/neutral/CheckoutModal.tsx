import { useCheckoutContext } from '@/contexts/CheckoutContext';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { Check, CheckCircle2, CreditCard, Gift, Package, Truck, User, Wallet, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useStorefrontCore } from '@/templates-v2/shared/contexts';

interface TemplateCheckoutProps {
    onClose: () => void;
    onOrderComplete: () => void;
    showOrderSuccess?: boolean;
    setShowOrderSuccess?: (show: boolean) => void;
    orderNumber?: string;
    setOrderNumber?: (orderNumber: string) => void;
}

/**
 * Token-aware, mobile-first full checkout shared by all templates.
 * Wiring: customer info -> review (delivery/shipping methods + coupons)
 * -> payment methods (loaded from the owner's dashboard payment settings).
 */
const CheckoutContent: React.FC<TemplateCheckoutProps> = ({ onClose, onOrderComplete }) => {
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

    const primary = 'var(--twc-primary-600, #059669)';
    const inputClass = 'w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2';
    const labelClass = 'mb-1.5 block text-sm font-semibold';

    const stepIcons = [User, Package, CreditCard];
    const stepLabels = ['المعلومات', 'المراجعة', 'الدفع'];

    const handlePlace = () => {
        handlePlaceOrder(total).then(() => {
            onOrderComplete();
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className="flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl md:h-[92vh] md:rounded-3xl"
                    style={{ background: 'var(--twc-surface, #ffffff)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: primary }}>
                                {stepIcons[step - 1] ? React.createElement(stepIcons[step - 1], { className: 'h-5 w-5' }) : null}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    إتمام الطلب
                                </h2>
                                <p className="text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                    الخطوة {step} من 3: {stepLabels[step - 1]}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق"
                            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Steps indicator */}
                    <div className="flex items-center justify-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                        {stepLabels.map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                                <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                        i + 1 < step ? 'text-white' : i + 1 === step ? 'text-white' : ''
                                    }`}
                                    style={{
                                        background: i + 1 <= step ? primary : 'var(--twc-border, #e5e7eb)',
                                        color: i + 1 <= step ? '#ffffff' : 'var(--twc-text-muted, #6b7280)',
                                    }}
                                >
                                    {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
                                </div>
                                <span
                                    className={`hidden text-xs font-semibold sm:inline ${i + 1 === step ? '' : ''}`}
                                    style={{ color: i + 1 <= step ? 'var(--twc-text-primary, #111827)' : 'var(--twc-text-muted, #6b7280)' }}
                                >
                                    {label}
                                </span>
                                {i < stepLabels.length - 1 && (
                                    <span className="mx-1 h-px w-6" style={{ background: i + 1 <= step ? primary : 'var(--twc-border, #e5e7eb)' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            الاسم الأول *
                                        </label>
                                        <input
                                            type="text"
                                            value={customerInfo.firstName}
                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            className={inputClass}
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            اسم العائلة *
                                        </label>
                                        <input
                                            type="text"
                                            value={customerInfo.lastName}
                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            className={inputClass}
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        البريد الإلكتروني *
                                    </label>
                                    <input
                                        type="email"
                                        value={customerInfo.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={`${inputClass} ${emailError ? 'border-red-400' : ''}`}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                    {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        رقم الهاتف *
                                    </label>
                                    <input
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className={`${inputClass} ${phoneError ? 'border-red-400' : ''}`}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                    {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        العنوان *
                                    </label>
                                    <input
                                        type="text"
                                        value={customerInfo.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className={inputClass}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
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
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
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
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
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
                                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            الرمز البريدي
                                        </label>
                                        <input
                                            type="text"
                                            value={customerInfo.postalCode}
                                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                                            className={inputClass}
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                {/* Items review */}
                                <div
                                    className="rounded-2xl border p-4"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <h4 className="mb-3 flex items-center gap-2 font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        <Package className="h-4 w-4" /> مراجعة الطلب
                                    </h4>
                                    <div className="space-y-3">
                                        {cartItems.map((item: any, index: number) => (
                                            <div key={`${item.id}-${index}`} className="flex items-center gap-3">
                                                <img src={getImageUrl(item.image)} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                                        {item.quantity} × {formatCurrency(item.price, storeSettings, currencies)}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: primary }}>
                                                    {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coupon */}
                                <div
                                    className="rounded-2xl border p-4"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <h4 className="mb-3 flex items-center gap-2 font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        <Gift className="h-4 w-4" /> كوبون الخصم
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            placeholder="أدخل رمز الكوبون"
                                            className={inputClass}
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleApplyCoupon(subtotal)}
                                            className="rounded-xl px-5 text-sm font-bold whitespace-nowrap text-white transition hover:opacity-90"
                                            style={{ background: primary }}
                                        >
                                            تطبيق
                                        </button>
                                    </div>
                                    {couponError && <p className="mt-2 text-xs font-medium text-red-500">{couponError}</p>}
                                    {appliedCoupon && <p className="mt-2 text-xs font-bold text-green-600">✓ تم تطبيق الكوبون</p>}
                                </div>

                                {/* Delivery / shipping methods */}
                                <div
                                    className="rounded-2xl border p-4"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <h4 className="mb-3 flex items-center gap-2 font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        <Truck className="h-4 w-4" /> وسيلة الطلب / التوصيل
                                    </h4>
                                    {loadingShipping ? (
                                        <div className="py-4 text-center">
                                            <div
                                                className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                                                style={{ borderColor: primary }}
                                            ></div>
                                        </div>
                                    ) : shippingMethods.length === 0 ? (
                                        <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
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
                                                        className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:opacity-95"
                                                        style={{
                                                            borderColor: active ? primary : 'var(--twc-border, #e5e7eb)',
                                                            background: active ? 'var(--twc-primary-50, #ecfdf5)' : 'var(--twc-background, #ffffff)',
                                                        }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="shipping"
                                                            checked={active}
                                                            onChange={() => setSelectedShipping(method.id.toString())}
                                                            className="accent-green-600"
                                                        />
                                                        <div className="flex-1">
                                                            <p
                                                                className="text-sm font-semibold"
                                                                style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                            >
                                                                {method.name}
                                                            </p>
                                                            {method.delivery_time && (
                                                                <p className="text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                                                    {method.delivery_time}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold" style={{ color: primary }}>
                                                            {cost === 0 ? 'مجاني' : formatCurrency(cost, storeSettings, currencies)}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Totals */}
                                <div
                                    className="rounded-2xl border p-4 text-sm"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <div className="flex justify-between py-1">
                                        <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>المجموع الفرعي</span>
                                        <span className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            {formatCurrency(subtotal, storeSettings, currencies)}
                                        </span>
                                    </div>
                                    {totalTax > 0 && (
                                        <div className="flex justify-between py-1">
                                            <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>الضريبة</span>
                                            <span className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                                {formatCurrency(totalTax, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    )}
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between py-1">
                                            <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>الخصم</span>
                                            <span className="font-semibold text-green-600">
                                                -{formatCurrency(couponDiscount, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-1">
                                        <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>الشحن</span>
                                        <span className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            {shippingCost === 0 ? 'مجاني' : formatCurrency(shippingCost, storeSettings, currencies)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-between border-t pt-3" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                                        <span className="font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            الإجمالي
                                        </span>
                                        <span className="text-lg font-bold" style={{ color: primary }}>
                                            {formatCurrency(total, storeSettings, currencies)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div
                                    className="rounded-2xl border p-4"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <h4 className="mb-3 flex items-center gap-2 font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        <Wallet className="h-4 w-4" /> طريقة الدفع
                                    </h4>
                                    {loadingPayments ? (
                                        <div className="py-4 text-center">
                                            <div
                                                className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                                                style={{ borderColor: primary }}
                                            ></div>
                                        </div>
                                    ) : paymentMethods.length === 0 ? (
                                        <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                            لا توجد طرق دفع مفعّلة حالياً.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {paymentMethods.map((method: any) => {
                                                const active = selectedPayment === method.name;
                                                return (
                                                    <div
                                                        key={method.name}
                                                        className={`cursor-pointer rounded-xl border p-3 transition ${active ? '' : 'hover:opacity-95'}`}
                                                        style={{
                                                            borderColor: active ? primary : 'var(--twc-border, #e5e7eb)',
                                                            background: active ? 'var(--twc-primary-50, #ecfdf5)' : 'var(--twc-background, #ffffff)',
                                                        }}
                                                        onClick={() => setSelectedPayment(method.name)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="radio"
                                                                name="payment"
                                                                checked={active}
                                                                onChange={() => setSelectedPayment(method.name)}
                                                                className="accent-green-600"
                                                            />
                                                            <div className="flex-1">
                                                                <p
                                                                    className="text-sm font-semibold"
                                                                    style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                                >
                                                                    {method.display_name || method.name}
                                                                </p>
                                                                {method.description && (
                                                                    <p className="text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                                                        {method.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {active && <CheckCircle2 className="h-5 w-5" style={{ color: primary }} />}
                                                        </div>

                                                        {active && method.name === 'bank' && method.details && (
                                                            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm whitespace-pre-line text-blue-800">
                                                                {method.details}
                                                            </div>
                                                        )}

                                                        {active && method.name !== 'bank' && method.details && (
                                                            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm whitespace-pre-line text-blue-800">
                                                                {method.details}
                                                            </div>
                                                        )}

                                                        {active && method.name !== 'bank' && method.form_fields && method.form_fields.length > 0 && (
                                                            <div className="mt-3 space-y-3">
                                                                {method.form_fields.map((field: any, idx: number) => (
                                                                    <div key={idx}>
                                                                        <label
                                                                            className="mb-1.5 block text-xs font-semibold"
                                                                            style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                                        >
                                                                            {field.label}
                                                                            {field.required && <span className="text-red-500"> *</span>}
                                                                        </label>
                                                                        {field.type === 'file' ? (
                                                                            <input
                                                                                type="file"
                                                                                accept={field.accept || 'image/*,.pdf'}
                                                                                onChange={(e) => setBankTransferFile(e.target.files?.[0] || null)}
                                                                                className="block w-full text-sm"
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                type={field.type === 'textarea' ? 'text' : field.type || 'text'}
                                                                                placeholder={field.placeholder || ''}
                                                                                className={inputClass}
                                                                                style={{
                                                                                    borderColor: 'var(--twc-border, #e5e7eb)',
                                                                                    background: 'var(--twc-background, #ffffff)',
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {active && method.name === 'bank' && (
                                                            <div className="mt-3">
                                                                <label
                                                                    className="mb-1.5 block text-xs font-semibold"
                                                                    style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                                >
                                                                    إرفاق إيصال التحويل (اختياري)
                                                                </label>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,.pdf"
                                                                    onChange={(e) => setBankTransferFile(e.target.files?.[0] || null)}
                                                                    className="block w-full text-sm"
                                                                />
                                                            </div>
                                                        )}

                                                        {active && method.name === 'whatsapp' && (
                                                            <div className="mt-3">
                                                                <label
                                                                    className="mb-1.5 block text-xs font-semibold"
                                                                    style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                                >
                                                                    رقم واتساب للتواصل *
                                                                </label>
                                                                <input
                                                                    type="tel"
                                                                    value={whatsappNumber}
                                                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                                                    placeholder="05xxxxxxxx"
                                                                    className={inputClass}
                                                                    style={{
                                                                        borderColor: 'var(--twc-border, #e5e7eb)',
                                                                        background: 'var(--twc-background, #ffffff)',
                                                                    }}
                                                                />
                                                                {whatsappError && <p className="mt-1 text-xs text-red-500">{whatsappError}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="rounded-2xl border p-4 text-sm"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>الإجمالي المستحق</span>
                                        <span className="text-lg font-bold" style={{ color: primary }}>
                                            {formatCurrency(total, storeSettings, currencies)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 border-t p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="rounded-xl border px-6 py-3 font-semibold transition hover:opacity-90"
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', color: 'var(--twc-text-primary, #111827)' }}
                            >
                                السابق
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-1 rounded-xl py-3 font-bold text-white transition hover:opacity-90"
                                style={{ background: primary }}
                            >
                                التالي
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isPlacingOrder || !selectedPayment || (selectedPayment === 'whatsapp' && !whatsappNumber.trim())}
                                onClick={handlePlace}
                                className="flex-1 rounded-xl py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                style={{ background: primary }}
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

export const TemplateCheckout: React.FC<TemplateCheckoutProps> = (props) => {
    return <CheckoutContent {...props} />;
};
