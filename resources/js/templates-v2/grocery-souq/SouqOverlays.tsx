import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, ShoppingBasket, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { computeCartTotals, discountPercent, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';

/* ===================================================================== */
/* Souq overlays — a working cart drawer and a quick product sheet, both  */
/* built for weekly-grocery runs: big quantity steppers, running totals   */
/* and WhatsApp checkout for the neighborhood souq.                       */
/* ===================================================================== */

const FREE_SHIPPING_AT = 150;

export function SouqCartDrawer({ onClose, onCheckout, onProductClick }: any) {
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

  const remainingForShipping = Math.max(0, FREE_SHIPPING_AT - totals.subtotal);
  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');

  const orderWhatsapp = () => {
    const lines = items.map(
      (i: any) => `• ${i.name} × ${i.quantity} — ${formatPrice((Number(i.price) || 0) * (Number(i.quantity) || 0))}`
    );
    window.open(
      createWhatsAppUrl(waPhone, `طلب مشتريات من ${config?.storeName || 'المتجر'}:\n${lines.join('\n')}\n\nالإجمالي: ${formatPrice(totals.total)}`),
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#16a34a] px-5 py-4 text-white">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <ShoppingBasket className="h-5 w-5" /> سلة المشتريات ({totals.count})
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="bg-[#f0fdf4] px-5 py-2.5 text-center text-xs font-bold text-[#15803d]">
            {remainingForShipping > 0 ? `أضف ${formatPrice(remainingForShipping)} واحصل على توصيل مجاني 🚚` : '🎉 مبروك! التوصيل مجاني لهذا الطلب'}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🧺</span>
              <p className="font-bold text-stone-600">سلّتك فارغة</p>
              <p className="text-sm text-stone-400">ابدأ بإضافة خضار وفواكه طازجة</p>
              <button type="button" onClick={onClose} className="mt-1 rounded-full bg-[#16a34a] px-6 py-2 text-sm font-black text-white hover:bg-[#15803d]">
                تسوّق الآن
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-800">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-stone-500">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="text-sm font-black text-[#16a34a]">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center rounded-lg border border-[#16a34a]/30 bg-[#f0fdf4]">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} className="px-2 py-1 text-[#16a34a]" aria-label="تقليل"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-stone-800">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} className="px-2 py-1 text-[#16a34a]" aria-label="زيادة"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} className="flex items-center gap-1 text-[11px] text-stone-400 transition hover:text-red-500" aria-label="حذف">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-stone-200 bg-stone-50 p-4">
            <div className="mb-1 flex justify-between text-sm font-bold text-stone-700"><span>الإجمالي</span><span className="text-lg font-black text-[#16a34a]">{formatPrice(totals.total)}</span></div>
            {totals.tax > 0 && <div className="mb-2 flex justify-between text-xs text-stone-500"><span>يشمل ضريبة</span><span>{formatPrice(totals.tax)}</span></div>}
            <button type="button" onClick={onCheckout} className="w-full rounded-xl bg-[#f59e0b] py-3 text-base font-black text-white shadow-md transition hover:bg-[#d97706]">
              إتمام الطلب
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-xl border border-[#25D366]/40 py-2 text-sm font-bold text-[#128C4B] transition hover:bg-[#25D366]/10">
                اطلب عبر واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------ Product quick sheet ------------------------ */

export function SouqProductSheet({ product, onClose }: any) {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [qty, setQty] = useState(1);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const variable = isVariableProduct(product);
  const missing = variable ? (product.variants || []).filter((g: any) => !selection[g.name]) : [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!product) return null;
  const discount = discountPercent(product);

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? selection : undefined });
    onClose();
    ui.setShowCart(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="relative h-52 w-full bg-stone-100 sm:h-60">
          <img src={getImageUrl(product.image || '')} alt={product.name} className="h-full w-full object-cover" />
          {discount > 0 && (
            <span className="absolute top-3 right-3 rounded-lg bg-red-600 px-2 py-1 text-xs font-black text-white">خصم {discount}%</span>
          )}
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 rounded-full bg-white/90 p-1.5 text-stone-600 shadow hover:text-stone-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[45vh] overflow-y-auto p-5">
          <h2 className="text-lg font-black leading-snug text-stone-900">{product.name}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#16a34a]">{formatPrice(product.price)}</span>
            {discount > 0 && !!product.originalPrice && (
              <span className="text-sm text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {product.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-600 line-clamp-4">{product.description}</p>
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-4">
              <p className="mb-1.5 text-xs font-black text-stone-500">{group.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelection((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-bold transition ${
                      selection[group.name] === val
                        ? 'border-[#16a34a] bg-[#16a34a] text-white'
                        : 'border-stone-300 text-stone-600 hover:border-[#16a34a]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center rounded-xl border-2 border-[#16a34a]/30 bg-white">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-[#16a34a]" aria-label="أقل"><Minus className="h-4 w-4" /></button>
            <span className="w-9 text-center text-base font-black">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5 text-[#16a34a]" aria-label="أكثر"><Plus className="h-4 w-4" /></button>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={missing.length > 0 || product.availability === 'out_of_stock'}
            className="flex-1 rounded-xl bg-[#f59e0b] py-3 text-base font-black text-white shadow transition hover:bg-[#d97706] disabled:bg-stone-300"
          >
            {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Search overlay --------------------------- */

export function SouqSearchOverlay({ onClose, onProductClick }: any) {
  const { product } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [q, setQ] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return (product?.products || [])
      .filter((p: any) => String(p.name || '').toLowerCase().includes(query))
      .slice(0, 12);
  }, [q, product?.products]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 p-4 pt-20" dir="rtl" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <Search className="h-5 w-5 text-[#16a34a]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="شنو تدور عليه؟"
            className="w-full bg-transparent text-base font-semibold text-stone-800 focus:outline-none" />
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1 text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto">
          {results.map((p: any) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onClose(); onProductClick(p); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-[#f0fdf4]">
                <img src={getImageUrl(p.image || '')} alt="" className="h-11 w-11 rounded-lg object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-700">{p.name}</span>
                <span className="text-sm font-black text-[#16a34a]">{formatPrice(p.price)}</span>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-stone-400">ما لقينا شي مطابق لـ «{q}»</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export const souqOverlays = {
  cart: SouqCartDrawer,
  product_detail: SouqProductSheet,
  search: SouqSearchOverlay,
};
