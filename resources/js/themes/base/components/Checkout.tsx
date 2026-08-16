import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CreditCard, Home, User, ShoppingBag, Lock, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { get_image_url } from '@/utils/image-helper';
import { formatStoreCurrency } from '@/utils/currency-helper';
import { Button } from '@/components/ui/button';

interface BaseCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  shippingMethods?: Array<{ id: string; name: string; price: number }>;
  paymentMethods?: Array<{ id: string; name: string; icon?: string }>;
  className?: string;
  onPlaceOrder?: (data: any) => void;
  isProcessing?: boolean;
}

export const BaseCheckout: React.FC<BaseCheckoutProps> = ({
  isOpen,
  onClose,
  shippingMethods = [],
  paymentMethods = [],
  className,
  onPlaceOrder,
  isProcessing = false,
}) => {
  const { t } = useTranslation();
  const { items, itemCount, total, subtotal, shipping, clearCart } = useCart();
  const [step, setStep] = useState<'details' | 'shipping' | 'payment' | 'confirm'>('details');
  const [shippingMethod, setShippingMethod] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    notes: '',
  });

  if (!isOpen) return null;

  const steps: Array<{ id: typeof step; label: string; icon: any }> = [
    { id: 'details', label: t('Details'), icon: User },
    { id: 'shipping', label: t('Shipping'), icon: Home },
    { id: 'payment', label: t('Payment'), icon: CreditCard },
    { id: 'confirm', label: t('Confirm'), icon: ShoppingBag },
  ];

  const currentIndex = steps.findIndex((s) => s.id === step);
  const isDetailsValid = form.firstName && form.lastName && form.email && form.phone && form.address && form.city;

  const handleNext = () => {
    if (step === 'details' && !isDetailsValid) return;
    if (step === 'shipping' && !shippingMethod) return;
    if (step === 'payment' && !paymentMethod) return;

    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      setStep(nextStep.id);
    }
  };

  const handleBack = () => {
    const prevStep = steps[currentIndex - 1];
    if (prevStep) {
      setStep(prevStep.id);
    }
  };

  const handlePlaceOrder = () => {
    if (onPlaceOrder) {
      onPlaceOrder({
        ...form,
        shippingMethod,
        paymentMethod,
        items: Array.from(Object.entries(items)).map(([productId, item]) => ({
          productId,
          quantity: item.quantity,
          name: item.name,
          price: item.price,
        })),
      });
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
        <div className={cn(
          'relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden',
          className
        )}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t('Checkout')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('Close checkout')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 overflow-x-auto">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    index <= currentIndex
                      ? 'text-white'
                      : 'text-gray-400 bg-gray-100'
                  )}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    'text-sm whitespace-nowrap',
                    index <= currentIndex ? 'font-medium text-gray-900' : 'text-gray-400'
                  )}>
                    {s.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn('flex-1 h-px mx-2', index < currentIndex ? 'bg-primary' : 'bg-gray-200')} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 grid lg:grid-cols-2 gap-8">
            {/* Left: Form */}
            <div className="space-y-4">
              {step === 'details' && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">{t('Contact Details')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('First Name')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateForm('firstName', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Last Name')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateForm('lastName', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Phone')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Address')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('City')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateForm('city', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('Postal Code')}</label>
                      <input
                        type="text"
                        value={form.postalCode}
                        onChange={(e) => updateForm('postalCode', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                    placeholder={t('Order notes (optional)')}
                    rows={3}
                    className={cn(inputClass, 'resize-none')}
                  />
                </>
              )}

              {step === 'shipping' && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">{t('Shipping Method')}</h3>
                  {shippingMethods.length === 0 && (
                    <p className="text-sm text-gray-500">{t('Select a shipping method')}</p>
                  )}
                  <div className="space-y-2">
                    {shippingMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setShippingMethod(method.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors',
                          shippingMethod === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={{ borderColor: shippingMethod === method.id ? 'var(--theme-color)' : undefined }}
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{method.name}</span>
                        </div>
                        <span className="text-gray-600">
                          {method.price > 0 ? formatStoreCurrency(method.price) : t('Free')}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 'payment' && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">{t('Payment Method')}</h3>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors',
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={{ borderColor: paymentMethod === method.id ? 'var(--theme-color)' : undefined }}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{method.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                    <Lock className="h-4 w-4" />
                    {t('Your payment information is secure and encrypted')}
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">{t('Confirm Your Order')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="font-medium text-gray-900">{t('Contact Details')}</p>
                    <p className="text-sm text-gray-600">{form.firstName} {form.lastName}</p>
                    <p className="text-sm text-gray-600">{form.email}</p>
                    <p className="text-sm text-gray-600">{form.phone}</p>
                    <p className="text-sm text-gray-600">{form.address}, {form.city}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="font-medium text-gray-900">{t('Payment')}</p>
                    <p className="text-sm text-gray-600">
                      {paymentMethods.find((m) => m.id === paymentMethod)?.name || paymentMethod}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="bg-gray-50 rounded-xl p-6 self-start">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t('Order Summary')} ({itemCount})
              </h3>
              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {Array.from(Object.entries(items)).map(([productId, item]) => (
                  <div key={productId} className="flex items-center gap-3">
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={get_image_url(item.cover_image) || '/images/placeholder-product.png'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatStoreCurrency(item.price)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatStoreCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Subtotal')}</span>
                  <span className="font-medium text-gray-900">{formatStoreCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Shipping')}</span>
                  <span className="font-medium text-gray-900">
                    {shipping > 0 ? formatStoreCurrency(shipping) : t('Free')}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span>{t('Total')}</span>
                  <span className="text-gray-900">{formatStoreCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button variant="ghost" onClick={currentIndex > 0 ? handleBack : onClose}>
              {currentIndex > 0 ? t('Back') : t('Cancel')}
            </Button>
            <div className="flex items-center gap-3">
              {step !== 'confirm' ? (
                <Button
                  onClick={handleNext}
                  disabled={isProcessing || (step === 'details' && !isDetailsValid) || (step === 'shipping' && !shippingMethod) || (step === 'payment' && !paymentMethod)}
                  className="min-w-32"
                  style={{ backgroundColor: 'var(--theme-color)' }}
                >
                  {t('Continue')}
                </Button>
              ) : (
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="min-w-40"
                  style={{ backgroundColor: 'var(--theme-color)' }}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isProcessing ? t('Processing...') : t('Place Order')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseCheckout;
