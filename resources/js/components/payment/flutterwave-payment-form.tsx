import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';
import { usePage } from '@inertiajs/react';

interface FlutterwavePaymentFormProps {
  planId: number;
  planPrice: number;
  couponCode: string;
  billingCycle: string;
  flutterwaveKey: string;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FlutterwavePaymentForm({
  planId,
  planPrice,
  couponCode,
  billingCycle,
  flutterwaveKey,
  currency,
  onSuccess,
  onCancel
}: FlutterwavePaymentFormProps) {
  const { t } = useTranslation();
  const initialized = useRef(false);
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const { processPayment } = usePaymentProcessor({
    onSuccess,
    onError: (error) => toast.error(error)
  });

  const hideOverlays = () => {
    const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    overlays.forEach(overlay => {
      (overlay as HTMLElement).style.display = 'none';
    });
    document.body.style.pointerEvents = 'auto';
  };

  const showOverlays = () => {
    const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    overlays.forEach(overlay => {
      (overlay as HTMLElement).style.display = '';
    });
    document.body.style.pointerEvents = '';
  };

  useEffect(() => {
    if (!flutterwaveKey || initialized.current) return;

    const scriptId = 'flutterwave-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initializeCheckout = () => {
      initialized.current = true;

      hideOverlays();

      window.FlutterwaveCheckout({
        public_key: flutterwaveKey,
        tx_ref: `plan_${planId}_${Date.now()}`,
        amount: planPrice,
        currency: currency.toUpperCase(),
        payment_options: 'card,mobilemoney,ussd',
        customer: {
          email: user?.email || 'customer@example.com',
          phone_number: user?.phone || '',
          name: user?.name || 'Customer',
        },
        customizations: {
          title: t('Plan Subscription'),
          description: t('Payment for subscription plan'),
          logo: '',
        },
        callback: function (data: any) {
          showOverlays();
          if (data.status === 'successful' || data.status === 'success') {
            processPayment('flutterwave', {
              planId,
              billingCycle,
              couponCode,
              paymentMethod: 'flutterwave',
              payment_id: data.transaction_id || data.id,
              tx_ref: data.tx_ref,
            });
          } else {
            toast.error(t('Payment was not completed'));
            onCancel();
          }
        },
        onclose: function () {
          showOverlays();
          onCancel();
        },
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      script.onload = initializeCheckout;
      document.head.appendChild(script);
    } else {
      initializeCheckout();
    }

    return () => {
      // We don't necessarily want to remove the script globally because it might be needed again,
      // but we should ensure overlays are restored if the component unmounts unexpectedly
      showOverlays();
    };
  }, [flutterwaveKey, planId, billingCycle, couponCode, currency, user]);

  if (!flutterwaveKey) {
    return <div className="p-4 text-center text-red-500">{t('Flutterwave not configured')}</div>;
  }

  return (
    <div className="p-4 text-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">{t('Opening Flutterwave payment...')}</p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    FlutterwaveCheckout?: any;
  }
}