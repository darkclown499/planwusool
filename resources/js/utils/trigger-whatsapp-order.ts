/**
 * WhatsApp Order Trigger
 * ----------------------
 * The single function every theme module calls to hand an order over to
 * WhatsApp. It composes a human-readable order message (items + variants +
 * totals) and opens wa.me in a new tab.
 *
 * Kept in the core bridge so Fashion, Supermarket and Fresh Produce share the
 * exact same ordering behaviour - no theme re-implements this.
 */
import { createWhatsAppUrl } from './whatsapp-helper';
import { formatStoreCurrency } from './currency-formatter';

export interface WhatsAppOrderItem {
  name: string;
  quantity: number;
  price?: number;
  variants?: Record<string, string> | string | null;
  unitLabel?: string;
}

export interface TriggerWhatsAppOrderOptions {
  /** Cart items to serialize into the message. */
  items: WhatsAppOrderItem[];
  /** Store phone number (raw digits, country code) or wa.me link. */
  phone: string;
  /** Shop name for the header line. */
  shopName?: string;
  /** Optional currency symbol for line totals. */
  currency?: string;
  /** Extra message appended after the order summary (e.g. delivery slot). */
  footer?: string;
  /** Compute-specific values that should be echoed into the message. */
  meta?: Record<string, string>;
  /** Total override (when totals are computed upstream, e.g. weighted items). */
  total?: number;
}

function cleanPhone(value?: string): string {
  if (!value) return '';
  const waMe = value.match(/wa\.me\/([0-9+]+)/);
  if (waMe) return waMe[1].replace(/\D/g, '');
  return value.replace(/[^0-9+]/g, '');
}

function serializeVariants(variants?: WhatsAppOrderItem['variants']): string {
  if (!variants) return '';
  if (typeof variants === 'string') return variants;
  const entries = Object.entries(variants).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}: ${v}`).join('، ');
}

export function triggerWhatsAppOrder(options: TriggerWhatsAppOrderOptions): boolean {
  const phone = cleanPhone(options.phone);
  if (!phone) return false;

  const lines: string[] = [];
  lines.push(`مرحباً! أرغب بطلب من ${options.shopName || 'المتجر'}:`);

  let subtotal = 0;
  options.items.forEach((item) => {
    const variantsText = serializeVariants(item.variants);
    const unit = item.unitLabel ? ` ${item.unitLabel}` : '';
    const line = `• ${item.name}${unit} × ${item.quantity}`;
    lines.push(variantsText ? `${line} (${variantsText})` : line);
    if (typeof item.price === 'number') {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      lines.push(`   ${formatStoreCurrency(lineTotal, undefined /* store currency from window */)}`);
    }
  });

  const closing: string[] = [];
  if (typeof options.total === 'number') {
    closing.push(`الإجمالي: ${formatStoreCurrency(options.total)}`);
  } else if (subtotal > 0) {
    closing.push(`الإجمالي: ${formatStoreCurrency(subtotal)}`);
  }
  if (options.meta) {
    Object.entries(options.meta).forEach(([k, v]) => v && closing.push(`${k}: ${v}`));
  }
  if (options.footer) closing.push(options.footer);

  const message = [...lines, ...closing].join('\n');
  const url = createWhatsAppUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}