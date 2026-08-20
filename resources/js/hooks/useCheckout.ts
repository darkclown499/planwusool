/**
 * `useCheckout` - stable alias over the shared checkout context.
 *
 * The checkout context owns order submission (coupons, shipping, payment
 * handlers such as Stripe/Razorpay/WhatsApp) and the HotSMS-backed verification
 * wiring. Every theme module calls this hook - never a copy - so the order
 * pipeline stays identical across all 20+ niches.
 */
export { useCheckoutContext as useCheckout } from '@/contexts/CheckoutContext';