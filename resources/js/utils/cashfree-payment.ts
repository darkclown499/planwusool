import { generateStoreUrl } from './store-url-helper';

// Cashfree SDK types
declare global {
  interface Window {
    Cashfree: any;
  }
}

interface OrderData {
  store_id: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  payment_method: string;
  shipping_method_id?: number;
  notes?: string;
  coupon_code?: string;
  whatsapp_number?: string;
}

// Load Cashfree SDK v3
export const loadCashfreeSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const scriptId = 'cashfree-js-sdk';
    if (document.getElementById(scriptId)) {
      const checkInterval = setInterval(() => {
        if (window.Cashfree) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.id = scriptId;
    script.onload = () => {
      if (window.Cashfree) {
        resolve();
      } else {
        reject(new Error('Cashfree SDK object not found'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
};

// Handle Cashfree payment
export const handleCashfreePayment = async (
  orderData: OrderData,
  store: any
): Promise<{ success: boolean; orderNumber?: string; error?: string }> => {
  try {
    // 1. Create order on server
    const formData = new FormData();
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      formData.append('_token', csrfToken);
    }

    Object.entries(orderData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await fetch(generateStoreUrl('store.order.place', store), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create order');
    }

    if (!data.payment_session_id) {
      throw new Error('Invalid response: Missing payment_session_id');
    }

    // 2. Load SDK
    await loadCashfreeSDK();

    if (!window.Cashfree) {
      throw new Error('Cashfree SDK not available');
    }

    // 3. Initialize Cashfree
    const cashfreeMode = data.mode === 'production' ? 'PROD' : 'SANDBOX';
    const cashfree = window.Cashfree({
      mode: cashfreeMode
    });

    // 4. Open Checkout (Mirroring Plan side functionality)
    const storeUrl = generateStoreUrl('store.cashfree.success', store, { orderNumber: data.order_number });

    const checkoutOptions = {
      paymentSessionId: data.payment_session_id,
      returnUrl: storeUrl, // Need to specify return URL for modal
      redirectTarget: "_modal", // The plan side uses _modal perfectly
      mode: cashfreeMode,
      style: {
        zIndex: 999999 // High level to bypass other store overlays
      }
    };

    // Cashfree Modal Redirecting

    return new Promise((resolve) => {
      cashfree.checkout(checkoutOptions).then((result: any) => {
        if (result.error) {
          console.error('Cashfree Modal Error Result:', result.error);
          resolve({ success: false, error: result.error.message || 'Payment failed' });
        } else if (result.paymentDetails) {
          // In _modal mode, when payment is complete, it usually returns paymentdetails.
          // So we manually redirect user to the success URL ourselves since _modal won't redirect by itself.
          window.location.href = storeUrl;
          resolve({ success: true, orderNumber: data.order_number });
        } else {
          resolve({ success: true, orderNumber: data.order_number });
        }
      }).catch((err: any) => {
        console.error('Cashfree Checkout Promise Error:', err);
        resolve({ success: false, error: err.message || 'Payment initiation failed' });
      });
    });

  } catch (error: any) {
    console.error('Cashfree Checkout Error:', error);
    return {
      success: false,
      error: error.message || 'Payment initiation failed',
    };
  }
};

export default {
  handleCashfreePayment,
  loadCashfreeSDK,
};
