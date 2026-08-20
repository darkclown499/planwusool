import { useTranslation } from 'react-i18next';
import { getImageUrl } from '@/utils/image-helper';
import { ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import type { ThemeConfig } from '@/config/theme.schema';
import { computeCartTotals } from '@/utils/cart-math';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { CoreCommerce } from '../types';
import { QuantityStepper } from '../widgets/QuantityStepper';
import { FreeDeliveryProgress } from '../widgets/FreeDeliveryProgress';

export interface CartRenderProps {
  config: ThemeConfig;
  core: CoreCommerce;
  onClose: () => void;
  onCheckout: () => void;
  onProductClick: (item: any) => void;
}

/** Shared cart line list used by every container so item rows are identical. */
const CartLines: React.FC<{
  core: CoreCommerce;
  onProductClick: (item: any) => void;
}> = ({ core, onProductClick }) => {
  const { cart } = core;

  if (cart.cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--primary-color-soft, #ecfdf5)' }}>
          <ShoppingBag className="h-7 w-7" style={{ color: 'var(--primary-color)' }} />
        </div>
        <h3 className="mb-1 text-base font-bold text-gray-800">سلتك فارغة</h3>
        <p className="text-sm text-gray-500">أضف بعض المنتجات للبدء</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {cart.cartItems.map((item: any, index: number) => (
        <li key={`${item.id}-${index}`} className="flex gap-3 py-3">
          <button type="button" onClick={() => onProductClick(item)} className="shrink-0">
            <img src={getImageUrl(item.image)} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
          </button>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onProductClick(item)} className="line-clamp-1 text-sm font-semibold text-gray-800 hover:underline">
              {item.name}
            </button>
            {item.variants && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                {typeof item.variants === 'string' ? item.variants : Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join('، ')}
              </p>
            )}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <QuantityStepper
                quantity={item.quantity}
                stock={item.stockQuantity || 99}
                onDecrease={() => cart.updateQuantity(index, -1)}
                onIncrease={() => cart.updateQuantity(index, 1)}
                size="sm"
              />
              <div className="text-right">
                <span className="block text-sm font-extrabold text-gray-900">{formatStoreCurrency(item.price * item.quantity)}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => cart.removeFromCart(index)} className="self-start text-gray-300 transition-colors hover:text-rose-500" aria-label="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
};

/** side_drawer - right-anchored overlay panel (fashion-luxe style). */
const SideDrawerCart: React.FC<CartRenderProps & { open: boolean }> = ({ open, config, core, onClose, onCheckout, onProductClick }) => {
  const totals = computeCartTotals(core.cart.cartItems);
  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="سلة التسوق"
      >
        <div className="flex items-center justify-between p-4" style={{ backgroundColor: config.styling.primaryColor }}>
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-bold">سلة التسوق</h2>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{core.cart.cartItems.length}</span>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15" aria-label="إغلاق السلة">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <FreeDeliveryProgress subtotal={totals.subtotal} threshold={config.commerce.freeDeliveryThreshold} currency={core.store.currency} />
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <CartLines
            core={core}
            onProductClick={(item) => {
              onClose();
              onProductClick(item);
            }}
          />
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">الإجمالي ({totals.itemCount} منتج)</span>
            <span className="text-lg font-extrabold text-gray-900">{formatStoreCurrency(totals.total)}</span>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            disabled={core.cart.cartItems.length === 0}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: config.styling.primaryColor }}
          >
            إتمام الطلب
          </button>
        </div>
      </aside>
    </div>
  );
};

/** sticky_bottom_bar - persistent floating checkout bar (market-fast style). */
export const StickyBottomCart: React.FC<CartRenderProps> = ({ config, core, onClose, onCheckout, onProductClick }) => {
  const [expanded, setExpanded] = useState(false);
  const totals = computeCartTotals(core.cart.cartItems);

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setExpanded(false)} />
      )}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t bg-white shadow-2xl"
        style={{ borderColor: 'var(--primary-color-soft, #d1fae5)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={() => (core.cart.cartItems.length > 0 ? setExpanded((v) => !v) : undefined)}
          className="flex w-full items-center justify-between px-4 py-3"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: config.styling.primaryColor }}>
              <ShoppingCart className="h-5 w-5" />
              {core.cart.cartItems.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold" style={{ color: config.styling.primaryColor }}>
                  {totals.itemCount}
                </span>
              )}
            </div>
            <div className="text-right">
              {core.cart.cartItems.length === 0 ? (
                <span className="text-sm font-semibold text-gray-500">سلتك فارغة</span>
              ) : (
                <>
                  <span className="block text-xs text-gray-500">إجمالي الطلب</span>
                  <span className="block text-base font-extrabold text-gray-900">{formatStoreCurrency(totals.total)}</span>
                </>
              )}
            </div>
          </div>
          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">{expanded ? 'إغلاق' : 'عرض السلة'}</span>
        </button>

        {expanded && (
          <div className="max-h-[50vh] overflow-y-auto border-t border-gray-100 px-4">
            <CartLines core={core} onProductClick={(item) => { setExpanded(false); onProductClick(item); }} />
          </div>
        )}

        <div className="flex items-center gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--primary-color-soft, #d1fae5)' }}>
          <button
            type="button"
            onClick={onCheckout}
            disabled={core.cart.cartItems.length === 0}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: config.styling.primaryColor }}
          >
            إتمام الطلب السريع
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-3 py-3 text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
};

/** express_modal - compact checkout-first cart (fresh-produce style). */
const ExpressModalCart: React.FC<CartRenderProps & { open: boolean }> = ({ open, config, core, onClose, onCheckout, onProductClick }) => {
  const { t } = useTranslation();
  const totals = computeCartTotals(core.cart.cartItems);
  return (
    <div className={`fixed inset-0 z-[60] overflow-y-auto bg-black/50 p-4 ${open ? '' : 'hidden'}`} onClick={onClose}>
      <div className="mx-auto mt-8 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ backgroundColor: config.styling.primaryColor, color: config.styling.onPrimary }}>
          <h2 className="text-lg font-bold">{t('سلة الطلبات السريعة')}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 hover:bg-white/15" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4">
          <CartLines core={core} onProductClick={(item) => { onClose(); onProductClick(item); }} />
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-1 flex justify-between text-sm font-semibold text-gray-600">
            <span>الإجمالي</span>
            <span>{formatStoreCurrency(totals.total)}</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-400">اختر وقت التوصيل في خطوة الطلب</p>
          <button
            type="button"
            onClick={onCheckout}
            disabled={core.cart.cartItems.length === 0}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: config.styling.primaryColor }}
          >
            {t('متابعة إلى إتمام الطلب')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * DynamicCart - renders whichever cart container the theme config declares,
 * all backed by the exact same `useCart` context (no per-theme cart logic).
 */
export const DynamicCart: React.FC<CartRenderProps & { type?: string; open?: boolean }> = ({
  type,
  open = true,
  ...rest
}) => {
  switch (type) {
    case 'sticky_bottom_bar':
      return <StickyBottomCart {...rest} />;
    case 'express_modal':
      return <ExpressModalCart {...rest} open={open} />;
    case 'side_drawer':
    default:
      return <SideDrawerCart {...rest} open={open} />;
  }
};

export default DynamicCart;