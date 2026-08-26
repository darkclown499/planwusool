import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ReceiptText, Search, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';

/* ===================================================================== */
/* Restaurant overlays — an "order ticket" cart drawer and a dish detail  */
/* sheet, both in the menu-board dark language with WhatsApp ordering.    */
/* ===================================================================== */

export function RestaurantCartDrawer({ onClose, onCheckout }: any) {
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
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-[#191410] shadow-2xl ring-1 ring-[#3d332b]">
        <div className="flex items-center justify-between border-b border-dashed border-[#4a3e33] px-5 py-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-black text-[#f5e7c8]">
            <ReceiptText className="h-5 w-5 text-[#f59e0b]" /> فاتورة طلبك
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 text-[#a89478] transition hover:bg-white/5 hover:text-[#fbbf24]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🍽️</span>
              <p className="font-serif text-lg font-bold text-[#e8d9b8]">الطاولة فاضية… لسا ما طلبت</p>
              <button type="button" onClick={onClose} className="mt-1 rounded-full bg-[#f59e0b] px-6 py-2.5 text-sm font-black text-[#191410] transition hover:bg-[#fbbf24]">
                افتح القائمة
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-2xl border border-[#2e2620] bg-[#211a15] p-3">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm font-bold text-[#f5e7c8]">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-[#a89478]">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="text-sm font-black text-[#f59e0b]">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center rounded-lg border border-[#4a3e33] bg-[#191410]">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} aria-label="أقل" className="px-2 py-1 text-[#f59e0b]"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-[#f5e7c8]">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} aria-label="أكثر" className="px-2 py-1 text-[#f59e0b]"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="حذف" className="text-[#6b5c48] transition hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-dashed border-[#4a3e33] bg-[#120e0b] p-5">
            <div className="mb-1 flex justify-between text-sm text-[#a89478]"><span>عدد الأصناف</span><span>{totals.count}</span></div>
            <div className="mb-3 flex justify-between font-serif text-xl font-black"><span className="text-[#e8d9b8]">المجموع</span><span className="text-[#f59e0b]">{formatPrice(totals.total)}</span></div>
            <button type="button" onClick={onCheckout} className="w-full rounded-full bg-[#f59e0b] py-3 font-black text-[#191410] shadow-lg transition hover:bg-[#fbbf24]">
              تأكيد الطلب 🔥
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-full border border-[#25D366]/40 py-2.5 text-sm font-bold text-[#4ade80] transition hover:bg-[#25D366]/10">
                أو أرسل الطلب واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function DishModal({ product, onClose }: any) {
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#211a15] shadow-2xl ring-1 ring-[#3d332b] sm:rounded-3xl">
        <div className="relative h-56 w-full">
          <img src={getImageUrl(product.image || '')} alt={product.name} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#211a15] to-transparent" />
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:text-[#fbbf24]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="-mt-4 p-6">
          <h2 className="font-serif text-2xl font-black leading-snug text-[#f5e7c8]">{product.name}</h2>
          <p className="mt-2 font-serif text-2xl font-black text-[#f59e0b]">{formatPrice(product.price)}</p>

          {product.description && (
            <div
              className="mt-3 whitespace-pre-line border-r-2 border-[#f59e0b]/40 pr-3 text-sm leading-relaxed text-[#c9b896]"
              dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
            />
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-5">
              <p className="mb-2 text-xs font-black tracking-wide text-[#a89478]">— {group.name}</p>
              <div className="flex flex-wrap gap-2">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-bold transition ${
                      pick[group.name] === val
                        ? 'border-[#f59e0b] bg-[#f59e0b] text-[#191410]'
                        : 'border-[#4a3e33] text-[#d8c9a8] hover:border-[#f59e0b]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-[#4a3e33] bg-[#191410]">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="أقل" className="px-3 py-2.5 text-[#f59e0b]"><Minus className="h-4 w-4" /></button>
              <span className="w-9 text-center font-black text-[#f5e7c8]">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="أكثر" className="px-3 py-2.5 text-[#f59e0b]"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={missing.length > 0}
              className="flex-1 rounded-full bg-[#f59e0b] py-3 font-black text-[#191410] shadow-lg transition hover:bg-[#fbbf24] disabled:bg-stone-600 disabled:text-stone-300"
            >
              {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للطلب · ${formatPrice((Number(product.price) || 0) * qty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RestaurantSearchOverlay({ onClose, onProductClick }: any) {
  const { SearchSheet } = require('../shared/SearchSheet');
  return <SearchSheet onClose={onClose} onProductClick={onProductClick} accent="#f59e0b" placeholder="ابحث في القائمة… مشاوي، مقبلات، مشروبات" variant="restaurant" />;
}

export const restaurantOverlays = {
  cart: RestaurantCartDrawer,
  product_detail: DishModal,
  search: RestaurantSearchOverlay,
};
