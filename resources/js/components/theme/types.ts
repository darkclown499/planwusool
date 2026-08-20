import type { ThemeConfig } from '@/config/theme.schema';
import type { useCart } from '@/contexts/CartContext';
import type { CheckoutContextType } from '@/contexts/CheckoutContext';

/** Product shape accepted by the theme cards (subset of the catalog payload). */
export interface ThemeProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  short_description?: string;
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  customFields?: { name: string; value: string }[];
  taxName?: string;
  taxPercentage?: number;
  [key: string]: unknown;
}

export interface SelectedVariant {
  name: string;
  value: string;
  /** Weighted quantity when the product is priced per unit of weight (fresh-produce). */
  weightQty?: number;
  weightUnit?: string;
}

/** Payload shape given to `addToCart` by every card (matches CartContext). */
export type AddToCartPayload = ThemeProduct & {
  quantity: number;
  selectedVariants?: Record<string, string> | SelectedVariant[];
};

/**
 * The single commerce surface every niche module is allowed to touch.
 * Wrapping the shared contexts here guarantees Fashion, Supermarket and Fresh
 * Produce all trigger the exact same `useCart`, `useCheckout`, WhatsApp order
 * and HotSMS OTP pipeline.
 */
export interface CoreCommerce {
  cart: ReturnType<typeof useCart>;
  checkout: CheckoutContextType;
  /** HotSMS-backed phone OTP helpers for the express checkout. */
  otp: {
    sending: boolean;
    verifying: boolean;
    resendIn: number;
    sendOtp: (phone: string) => Promise<boolean>;
    verifyOtp: (phone: string, code: string) => Promise<boolean>;
    resendOtp: (phone: string) => Promise<boolean>;
  };
  /** Open a WhatsApp conversation with the current cart contents. */
  triggerWhatsAppOrder: (items: any[], meta?: Record<string, string>) => boolean;
  store: {
    id?: string | number;
    slug?: string;
    phone?: string;
    currency?: string;
    shopName?: string;
  };
  /** Resolved theme config governing the currently rendered slot. */
  config: ThemeConfig;
}

export interface ThemeCardProps {
  product: ThemeProduct;
  onProductClick: (product: ThemeProduct) => void;
  onAddToCart: (payload: AddToCartPayload) => void | Promise<void>;
  onWhatsAppOrder?: (payload: AddToCartPayload) => void;
  showWhatsApp?: boolean;
  showUrgencyBadge?: boolean;
  showQuickVariantPicker?: boolean;
  accentColor?: string;
  swatchStyle?: 'round' | 'square';
  currency?: string;
  className?: string;
}