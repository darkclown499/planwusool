import { generateStoreUrl } from './store-url-helper';

interface PaystackPaymentData {
  authorization_url: string;
  reference: string;
  access_code: string;
  order_id: number;
  order_number: string;
}

/**
 * Load Paystack SDK script
 */
const loadPaystackSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    
    script.onload = () => resolve();
    script.onerror = () => {
      console.error('Failed to load Paystack SDK');
      reject(new Error('Failed to load Paystack SDK'));
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Handle Paystack payment for store orders
 */
export const handlePaystackPayment = async (paymentData: PaystackPaymentData): Promise<void> => {
  try {
    // Load Paystack SDK
    await loadPaystackSDK();

    // Open Paystack modal using authorization URL
    window.location.href = paymentData.authorization_url;
    
    // Note: Paystack will redirect back to success URL after payment
    // The success handler in PaystackController will process the payment
    
  } catch (error) {
    console.error('Paystack payment error:', error);
    throw error;
  }
};

/**
 * Alternative: Open Paystack inline modal (if you want modal instead of redirect)
 */
export const handlePaystackInlinePayment = async (
  paymentData: PaystackPaymentData,
  email: string,
  amount: number,
  onSuccess?: () => void,
  onCancel?: () => void
): Promise<void> => {
  try {
    // Load Paystack SDK
    await loadPaystackSDK();

    return new Promise((resolve, reject) => {
      if (!window.PaystackPop) {
        reject(new Error('Paystack SDK not loaded'));
        return;
      }

      const handler = window.PaystackPop.setup({
        key: 'pk_your_public_key', // This should come from backend or config
        email: email,
        amount: amount,
        ref: paymentData.reference,
        metadata: {
          custom_fields: [
            {
              display_name: 'Access Code',
              value: paymentData.access_code
            },
            {
              display_name: 'Order Number',
              value: paymentData.order_number
            }
          ]
        },
        callback: function(response: any) {
          // Payment successful
          console.log('Paystack payment successful:', response);
          
          // Reload page or redirect to success page
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.reload();
          }
          
          resolve();
        },
        onClose: function() {
          // Modal closed
          console.log('Paystack modal closed');
          
          if (onCancel) {
            onCancel();
          }
          
          reject(new Error('Payment cancelled'));
        }
      });

      // Open the modal
      handler.openIframe();
    });
  } catch (error) {
    console.error('Paystack inline payment error:', error);
    throw error;
  }
};

declare global {
  interface Window {
    PaystackPop?: any;
  }
}
