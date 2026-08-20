import type { ThemeConfig } from '@/config/theme.schema';
import type { CoreCommerce } from '../../types';
import { computeCartTotals } from '@/utils/cart-math';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import React from 'react';

interface MarketFastStickyCartBarProps {
  config: ThemeConfig;
  core: CoreCommerce;
  onCheckout: () => void;
}

/**
 * Floating checkout bar for the market-fast (grocery) storefront.
 *
 * Appears only while the cart has items, slides up smoothly, and shows the
 * running item count + total (in ₪) with a high-contrast express checkout CTA.
 * All totals derive from the shared cart context (single source of truth).
 */
export const MarketFastStickyCartBar: React.FC<MarketFastStickyCartBarProps> = ({ config, core, onCheckout }) => {
  const totals = computeCartTotals(core.cart.cartItems);
  if (totals.itemCount === 0) return null;

  const primary = config.styling.primaryColor;

  return (
    <div className="mf-bar-in fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-white shadow-2xl">
      {/* Left: count + total */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: primary }}>
          <ShoppingCart className="h-4 w-4 text-white" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-300 px-1 text-[10px] font-extrabold text-emerald-950">
            {totals.itemCount}
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-400">إجمالي الطلب</p>
          <p className="truncate text-sm font-extrabold text-white">{formatStoreCurrency(totals.total)}</p>
        </div>
      </div>

      {/* Right: express checkout CTA */}
      <button
        type="button"
        onClick={onCheckout}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
      >
        إتمام الطلب السريع
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default MarketFastStickyCartBar;