
import { toast } from '@/components/custom-toast';

declare global {
    interface Window {
        FlutterwaveCheckout?: any;
    }
}

export interface FlutterwavePaymentData {
    public_key: string;
    tx_ref: string;
    amount: number;
    currency: string;
    customer_email: string;
    customer_name: string;
    customer_phone: string;
    customer_date_of_birth?: string | null;
    customer_phone_area_code?: string | null;
    redirect_url: string;
    order_id: number;
    order_number: string;
}

/**
 * Load Flutterwave SDK script
 */
const loadFlutterwaveSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.FlutterwaveCheckout) {
            resolve();
            return;
        }

        const scriptId = 'flutterwave-js-sdk';
        if (document.getElementById(scriptId)) {
            const checkInterval = setInterval(() => {
                if (window.FlutterwaveCheckout) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.async = true;
        script.id = scriptId;

        script.onload = () => resolve();
        script.onerror = () => {
            console.error('Failed to load Flutterwave SDK');
            reject(new Error('Failed to load Flutterwave SDK'));
        };

        document.head.appendChild(script);
    });
};

/**
 * Handle Flutterwave payment for store orders
 */
export const handleFlutterwavePayment = async (paymentData: FlutterwavePaymentData): Promise<void> => {
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

    try {
        // Load Flutterwave SDK
        await loadFlutterwaveSDK();

        if (!window.FlutterwaveCheckout) {
            throw new Error('Flutterwave SDK not available');
        }

        hideOverlays();

        const meta: Record<string, string> = {};
        if (paymentData.customer_date_of_birth) {
            meta.custdateofbirth = paymentData.customer_date_of_birth;
        }
        if (paymentData.customer_phone_area_code) {
            meta.custphoneareacode = paymentData.customer_phone_area_code;
        }

        // Open Flutterwave modal
        window.FlutterwaveCheckout({
            public_key: paymentData.public_key,
            tx_ref: paymentData.tx_ref,
            amount: Number(paymentData.amount), // Force as Number
            currency: (paymentData.currency || 'USD').toUpperCase(),
            payment_options: 'card',
            customer: {
                email: paymentData.customer_email || 'customer@example.com',
                phonenumber: paymentData.customer_phone || '',
                phone_number: paymentData.customer_phone || '',
                name: paymentData.customer_name || 'Customer',
            },
            meta,
            customizations: {
                title: 'Payment',
                description: 'Order Payment',
                logo: '',
            },
            callback: function (data: any) {
                showOverlays();

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = paymentData.redirect_url;

                // Add CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                if (csrfToken) {
                    const csrfInput = document.createElement('input');
                    csrfInput.type = 'hidden';
                    csrfInput.name = '_token';
                    csrfInput.value = csrfToken;
                    form.appendChild(csrfInput);
                }

                // Add payment data
                const inputs = {
                    transaction_id: data.transaction_id,
                    tx_ref: data.tx_ref,
                    status: data.status,
                    order_id: paymentData.order_id,
                    order_number: paymentData.order_number
                };

                Object.entries(inputs).forEach(([key, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = String(value);
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
            },
            onclose: function () {
                showOverlays();
            },
        });

    } catch (error: any) {
        showOverlays();
        console.error('Flutterwave payment execution error:', error);
        toast.error(error.message || 'Payment initiation failed');
        throw error;
    }
};
