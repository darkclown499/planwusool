import { toast } from '@/components/custom-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutProvider } from '@/contexts/CheckoutContext';
import { useOrder } from '@/contexts/OrderContext';
import { useStore } from '@/contexts/StoreContext';
import { useUI } from '@/contexts/UIContext';
import React, { ReactNode } from 'react';
import { ThemeEngineProvider, useThemeEngine } from './ThemeEngineContext';
import { ThemeEngineStorefront } from './ThemeEngineStorefront';

/**
 * ThemeEngine
 * -----------
 * The schema-driven storefront root for the multi-theme architecture.
 *
 * It resolves `theme.config.json` (server prop -> runtime fetch -> bundled
 * preset), applies the design tokens as CSS root variables, and then mounts the
 * full storefront feature stack on top of the shared ThemeProvider contexts:
 * checkout (with payment methods + HotSMS OTP), WhatsApp ordering, cart, auth
 * and orders. Niche modules only render their own visuals inside this shell.
 */
export interface ThemeEngineProps {
  themeId: string;
  /** Optional store-saved `theme.config.json` already serialized by the server. */
  serverConfig?: unknown;
  /** Optional runtime `theme.config.json` URL (previews / storage overrides). */
  configUrl?: string;
  children: ReactNode;
  /** Preview-mode helpers passed through from the route. */
  isPreview?: boolean;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional' | null;
  isSuperAdmin?: boolean;
}

/** Shared order-complete behaviour: close overlays, clear cart, notify. */
const useOrderComplete = () => {
  const cart = useCart();
  const ui = useUI();
  const order = useOrder();
  const auth = useAuth();

  const handle = React.useCallback(() => {
    ui.setShowCheckout(false);
    ui.setShowCart(false);
    cart.clearCart?.();
    if (auth.isLoggedIn) order.loadUserOrders();
    toast.success('تم إتمام الطلب بنجاح!');
  }, [auth.isLoggedIn, cart, order, ui]);

  return handle;
};

/** Wraps the engine UI in the single shared CheckoutProvider for the whole tree. */
const CommerceShell: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { config } = useThemeEngine();
  const auth = useAuth();
  const { store } = useStore();
  const handleOrderComplete = useOrderComplete();

  // Keep the whole engine tree inside one CheckoutProvider so `useCheckout` is
  // always available to every module/slot (strict single-pipeline binding).
  return (
    <CheckoutProvider
      userProfile={auth.userProfile}
      isLoggedIn={auth.isLoggedIn}
      store={{ id: store?.id, slug: store?.slug }}
      onOrderComplete={handleOrderComplete}
    >
      <ThemeEngineStorefront>{children}</ThemeEngineStorefront>
    </CheckoutProvider>
  );
};

export const ThemeEngine: React.FC<ThemeEngineProps> = ({
  themeId,
  serverConfig,
  configUrl,
  children,
}) => (
  <ThemeEngineProvider themeId={themeId} serverConfig={serverConfig} configUrl={configUrl}>
    <CommerceShell>{children}</CommerceShell>
  </ThemeEngineProvider>
);

export default ThemeEngine;