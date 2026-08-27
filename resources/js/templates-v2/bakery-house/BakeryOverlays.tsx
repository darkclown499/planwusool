import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { SearchSheet } from '../shared/SearchSheet';
import { createSafeHtml } from '@/utils/xss-protection';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';

/* ===================================================================== */
/* Bakery House overlays — cream-toned cart drawer and a warm product     */
/* modal with prominent weight/format pickers and WhatsApp ordering.      */
/* ===================================================================== */

export function BakeryCartDrawer({ onClose, onCheckout }: any) {
  const { cart, config } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const items = cart.cartItems || [];
  const totals = computeCartTotals(items);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');
  const orderWhatsapp = () => { onClose(); setTimeout(() => onCheckout(), 120); };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#3b2412]/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-[#fdf6ec] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eaddcf] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-black text-[#78350f]">
            <ShoppingBag className="h-5 w-5 text-[#b45309]" /> سلّة المخبوزات ({totals.count})
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 text-[#92603a] transition hover:bg-[#f5e7d3]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🥖</span>
              <p className="font-serif text-lg font-bold text-[#78350f]">سلّتك ما فيها شي لسا</p>
              <p className="-mt-1.5 text-sm text-[#b08d6a]">الفرن ساخن والرفوف ممتلئة…</p>
              <button type="button" onClick={onClose} className="mt-2 rounded-full bg-[#b45309] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#92400e]">
                تصفح المخبوزات
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#f0e2d0]">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm font-bold text-[#5d3a21]">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-[#b08d6a]">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="text-sm font-black text-[#b45309]">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center rounded-full border border-[#eaddcf] bg-[#fffaf2]">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} className="px-2 py-1 text-[#b45309]" aria-label="أقل"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-[#5d3a21]">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} className="px-2 py-1 text-[#b45309]" aria-label="أكثر"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="حذف" className="text-[#c8a887] transition hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#eaddcf] bg-white p-4">
            <div className="mb-3 flex justify-between font-black text-[#5d3a21]"><span>الإجمالي</span><span className="text-lg text-[#b45309]">{formatPrice(totals.total)}</span></div>
            <button type="button" onClick={onCheckout} className="w-full rounded-full bg-[#b45309] py-3 font-black text-white shadow-md transition hover:bg-[#92400e]">
              إتمام الطلب
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-full border border-[#25D366]/40 py-2 text-sm font-bold text-[#128C4B] transition hover:bg-[#25D366]/10">
                أو اطلب عبر واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function BakeryProductModal({ product, onClose }: any) {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [qty, setQty] = useState(1);
  const [pick, setPick] = useState<Record<string, string>>({});
  const variable = isVariableProduct(product);
  const missing = variable ? (product.variants || []).filter((g: any) => !pick[g.name]) : [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!product) return null;

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? pick : undefined });
    onClose();
    ui.setShowCart(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#3b2412]/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#fdf6ec] shadow-2xl sm:rounded-3xl">
        <div className="relative h-60 w-full">
          <img src={getImageUrl(product.image || '')} alt={product.name} className="h-full w-full object-cover" />
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 rounded-full bg-white/95 p-2 text-[#78350f] shadow transition hover:bg-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <h2 className="font-serif text-2xl font-black leading-snug text-[#5d3a21]">{product.name}</h2>
          <p className="mt-2 text-2xl font-black text-[#b45309]">{formatPrice(product.price)}</p>

          {product.description && (
            <div
              className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#8a6a4f]"
              dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
            />
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-5">
              <p className="mb-2 text-xs font-black tracking-wide text-[#b08d6a]">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                      pick[group.name] === val
                        ? 'border-[#b45309] bg-[#b45309] text-white'
                        : 'border-[#eaddcf] bg-white text-[#92603a] hover:border-[#b45309]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border-2 border-[#eaddcf] bg-white">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-[#b45309]" aria-label="أقل"><Minus className="h-4 w-4" /></button>
              <span className="w-9 text-center font-black text-[#5d3a21]">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5 text-[#b45309]" aria-label="أكثر"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={missing.length > 0}
              className="flex-1 rounded-full bg-[#b45309] py-3 font-black text-white shadow-md transition hover:bg-[#92400e] disabled:bg-stone-300"
            >
              {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلّة · ${formatPrice((Number(product.price) || 0) * qty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BakerySearchOverlay({ onClose, onProductClick }: any) {
  return <SearchSheet onClose={onClose} onProductClick={onProductClick} accent="#b45309" placeholder="ابحث في رفوف المخبز… خبز، كعك، كنافة" variant="bakery" />;
}

export const bakeryOverlays = {
  cart: BakeryCartDrawer,
  product_detail: BakeryProductModal,
  search: BakerySearchOverlay,
};