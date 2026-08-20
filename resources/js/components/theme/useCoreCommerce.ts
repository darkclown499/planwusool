import { ThemeConfig } from '@/config/theme.schema';
import { useCart } from '@/contexts/CartContext';
import { useCheckout } from '@/hooks/useCheckout';
import { useStore } from '@/contexts/StoreContext';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import { triggerWhatsAppOrder } from '@/utils/trigger-whatsapp-order';
import { useMemo } from 'react';
import { CoreCommerce, ThemeProduct } from './types';

/**
 * useCoreCommerce
 * ---------------
 * The one commerce entry-point for every theme module.
 *
 * It binds the shared cart context, the shared checkout context, the WhatsApp
 * order trigger and the HotSMS OTP flow to the current store. Modules only ever
 * consume this object - they can change their visuals endlessly without ever
 * re-implementing checkout or order submission.
 *
 * The caller must render inside a `<CheckoutProvider>` (the ThemeEngineStorefront
 * does this for the whole engine tree) so `useCheckout` is always available.
 *
 * @param config Resolved theme config; used for WhatsApp/OTP defaults.
 */
export function useCoreCommerce(config: ThemeConfig): CoreCommerce {
  const cart = useCart();
  const checkout = useCheckout();
  const { store } = useStore();
  const otp = useOtpVerification({ storeId: store?.id });

  const storePhone = useMemo(() => {
    const cfg = (window as any).page?.props?.config as
      | { phoneNumber?: string; socialMedia?: { whatsapp?: string } }
      | undefined;
    return (
      cfg?.phoneNumber ||
      (cfg?.socialMedia?.whatsapp as string | undefined) ||
      ''
    );
  }, []);

  const whats = (items: ThemeProduct[], meta?: Record<string, string>) =>
    triggerWhatsAppOrder({
      items: items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: (item as any).quantity || 1,
        variants: (item as any).selectedVariants || item.variants,
      })),
      phone: storePhone,
      shopName: store?.name,
      meta,
    });

  return {
    cart,
    checkout,
    otp,
    triggerWhatsAppOrder: whats,
    store: {
      id: store?.id,
      slug: store?.slug,
      phone: storePhone,
      shopName: store?.name,
      currency: (window as any).page?.props?.config?.currency as string | undefined,
    },
    config,
  };
}