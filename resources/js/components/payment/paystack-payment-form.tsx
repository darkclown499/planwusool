import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';

interface PaystackPaymentFormProps {
  planId: number;
  planPrice: number;
  couponCode: string;
  billingCycle: string;
  paystackKey: string;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaystackPaymentForm({ 
  planId, 
  planPrice,
  couponCode, 
  billingCycle, 
  paystackKey,
  currency,
  onSuccess, 
  onCancel 
}: PaystackPaymentFormProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const userEmail = auth?.user?.email || 'user@example.com';
  const initialized = useRef(false);

  const { processPayment } = usePaymentProcessor({
    onSuccess,
    onError: (error) => toast.error(error)
  });

  useEffect(() => {
    if (!paystackKey || initialized.current) return;

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    
    script.onload = () => {
      initialized.current = true;
      
      // Force close any open modals/dialogs
      document.dispatchEvent(new CustomEvent('close-payment-modal'));
      
      // Aggressively remove all blocking elements
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const content = document.querySelectorAll('[data-radix-dialog-content]');
      
      // Store original styles for restoration
      const originalStyles: Array<{element: HTMLElement, display: string, pointerEvents: string, overflow: string}> = [];
      
      overlays.forEach(overlay => {
        const el = overlay as HTMLElement;
        originalStyles.push({
          element: el,
          display: el.style.display,
          pointerEvents: el.style.pointerEvents,
          overflow: el.style.overflow
        });
        el.style.display = 'none';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '-1';
      });
      
      content.forEach(el => {
        const cEl = el as HTMLElement;
        originalStyles.push({
          element: cEl,
          display: cEl.style.display,
          pointerEvents: cEl.style.pointerEvents,
          overflow: cEl.style.overflow
        });
        cEl.style.display = 'none';
        cEl.style.pointerEvents = 'none';
      });
      
      // Ensure body is completely accessible
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.style.position = '';
      document.body.style.height = '';
      
      // Remove any fixed positioning from parents
      let parent = document.body.parentElement;
      while (parent) {
        parent.style.overflow = '';
        parent.style.position = '';
        parent = parent.parentElement as HTMLHtmlElement;
      }

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: userEmail,
        amount: Math.round(Number(planPrice) * 100), // Convert to kobo/cents as integer
        currency: currency.toUpperCase(),
        callback: function (response: any) {
          // Restore all original styles
          originalStyles.forEach(style => {
            style.element.style.display = style.display;
            style.element.style.pointerEvents = style.pointerEvents;
            style.element.style.overflow = style.overflow;
            style.element.style.zIndex = '';
          });
          
          document.body.style.overflow = '';
          document.body.style.pointerEvents = '';
          
          processPayment('paystack', {
            planId,
            billingCycle,
            couponCode,
            paymentMethod: 'paystack',
            payment_id: response.reference,
          });
        },
        onClose: function () {
          // Restore all original styles
          originalStyles.forEach(style => {
            style.element.style.display = style.display;
            style.element.style.pointerEvents = style.pointerEvents;
            style.element.style.overflow = style.overflow;
            style.element.style.zIndex = '';
          });
          
          document.body.style.overflow = '';
          document.body.style.pointerEvents = '';
          
          onCancel();
        }
      });
      
      // Wait for modal to fully close, then open Paystack
      setTimeout(() => {
        handler.openIframe();
      }, 300); // Increased delay to ensure complete cleanup
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [paystackKey, planId, billingCycle, couponCode, currency]);

  if (!paystackKey) {
    return <div className="p-4 text-center text-red-500">{t('Paystack not configured')}</div>;
  }

  return (
    <div className="p-4 text-center">
      <p>{t('Redirecting to Paystack...')}</p>
    </div>
  );
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}