import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useBrand } from '@/contexts/BrandContext';
import { usePage } from '@inertiajs/react';
import axios from 'axios';

interface RazorpayPaymentFormProps {
  planId: number;
  planPrice: number;
  couponCode: string;
  billingCycle: 'yearly';
  razorpayKey: string;
  currency?: string;
  titleText?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RazorpayPaymentForm({
  planId,
  planPrice,
  couponCode,
  billingCycle,
  razorpayKey,
  currency = 'INR',
  titleText: propTitleText,
  onSuccess,
  onCancel
}: RazorpayPaymentFormProps) {
  const { t } = useTranslation();
  const { titleText: brandTitleText } = useBrand();
  const { auth } = usePage().props as any;
  const user = auth?.user;
  
  // Use titleText from props (superadmin) if available, otherwise fallback to brand context (company)
  const displayTitle = propTitleText || brandTitleText || 'Wusool';
  // Load Razorpay SDK
  const loadRazorpaySDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window && (window as any).Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => {
        toast.error(t('Failed to load Razorpay checkout. Please try again.'));
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.head.appendChild(script);
    });
  };
  
  const handlePayment = async () => {
    try {
      // Load Razorpay SDK first
      await loadRazorpaySDK();
      
      // Create order on the server
      const response = await axios.post(route('razorpay.create-order'), {
        plan_id: planId,
        billing_cycle: billingCycle,
        coupon_code: couponCode
      });
      
      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }
      
      const { order_id, amount } = response.data;
      
      if (!order_id || !amount) {
        toast.error(t('Invalid response from server'));
        return;
      }
      
      const options = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: displayTitle,
        description: 'Plan Subscription',
        order_id: order_id,
        handler: function(response: any) {
          // Verify payment on server
          axios.post(route('razorpay.verify-payment'), {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            plan_id: planId,
            billing_cycle: billingCycle,
            coupon_code: couponCode
          })
          .then(() => {
            onSuccess();
          })
          .catch((error) => {
            const errorMsg = error.response?.data?.error || t('Payment verification failed');
            toast.error(errorMsg);
          });
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile_no || user?.phone || '9999999999'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: onCancel
        }
      };
      
      const razorpay = new (window as any).Razorpay(options);
      
      // Close the Radix Dialog to prevent focus trap issues with Razorpay
      document.dispatchEvent(new CustomEvent('close-payment-modal'));
      
      razorpay.open();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || t('Failed to initialize payment');
      toast.error(errorMsg);
      console.error('Razorpay error:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('You will be redirected to Razorpay to complete your payment.')}
      </p>
      
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('Cancel')}
        </Button>
        <Button onClick={handlePayment} className="flex-1">
          {t('Pay with Razorpay')}
        </Button>
      </div>
    </div>
  );
}