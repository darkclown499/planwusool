import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, ShieldCheck, ShoppingCart, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';

/* ===================================================================== */
/* Electronics Hub overlays — a spec-sheet product modal and a compact    */
/* tech-dealer cart drawer with warranty notes and WhatsApp ordering.     */
/* ===================================================================== */

export function HubCartDrawer({ onClose, onCheckout }: any) {
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
  const orderWhatsapp = () => {
    const lines = items.map((i: any) => `• ${i.name} × ${i.quantity} — ${formatPrice((Number(i.price) || 0) * i.quantity)}`);
    window.open(createWhatsAppUrl(waPhone, `طلب أجهزة من ${config?.storeName || 'المتجر'}:\n${lines.join('\n')}\n\nالإجمالي: ${formatPrice(totals.total)}\n(أجهزة بضمان رسمي)`), '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-[#0b1220] shadow-2xl ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <ShoppingCart className="h-5 w-5 text-blue-400" /> سلة الأجهزة ({totals.count})
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🔌</span>
              <p className="font-bold text-slate-300">السلة فاضية</p>
              <p className="-mt-1.5 text-sm text-slate-500">اختر جهازك القادم من عروضنا</p>
              <button type="button" onClick={onClose} className="mt-1 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-500">
                تصفح الأجهزة
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#101a2e] p-3">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-slate-900 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-100">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-slate-500">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><ShieldCheck className="h-3 w-3" /> ضمان رسمي</p>
                    <p className="text-sm font-black text-white">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} aria-label="أقل" className="px-2 py-1 text-blue-300"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-white">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} aria-label="أكثر" className="px-2 py-1 text-blue-300"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="حذف" className="text-slate-600 transition hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-800 bg-[#0e1729] p-4">
            <div className="mb-3 flex justify-between font-black"><span className="text-slate-300">الإجمالي</span><span className="text-xl text-white">{formatPrice(totals.total)}</span></div>
            <button type="button" onClick={onCheckout} className="w-full rounded-xl bg-blue-600 py-3 font-black text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500">
              إتمام الشراء
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-xl border border-[#25D366]/40 py-2.5 text-sm font-bold text-[#4ade80] transition hover:bg-[#25D366]/10">
                اطلب عبر واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/** Spec sheet modal — the electronics way to present a device. */
export function HubProductModal({ product, onClose }: any) {
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

  const specs = useMemo(() => {
    if (!product) return [] as Array<[string, string]>;
    return String(product.description || '')
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((line: string, i: number): [string, string] => {
        const [k, ...rest] = line.split(':');
        return rest.length ? [k.trim(), rest.join(':').trim()] : [`ميزة ${i + 1}`, line];
      });
  }, [product]);

  if (!product) return null;

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? pick : undefined });
    onClose();
    ui.setShowCart(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#0b1220] shadow-2xl ring-1 ring-slate-700 sm:rounded-3xl">
        <div className="relative aspect-video w-full bg-slate-900">
          <img src={getImageUrl(product.image || '')} alt={product.name} className="h-full w-full object-cover" />
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 rounded-lg bg-black/60 p-2 text-white backdrop-blur transition hover:text-blue-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-black leading-snug text-white">{product.name}</h2>
            <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-300 ring-1 ring-emerald-500/30">متوفر</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-white">{formatPrice(product.price)}</span>
            {!!product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
              <span className="text-sm text-slate-500 line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {/* Spec table */}
          {specs.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              <p className="border-b border-slate-800 bg-[#101a2e] px-4 py-2 text-xs font-black tracking-wide text-blue-300">المواصفات الرئيسية</p>
              <table className="w-full text-sm">
                <tbody>
                  {specs.map(([k, v], i) => (
                    <tr key={`${k}-${i}`} className={i % 2 === 0 ? 'bg-[#0e1729]' : ''}>
                      <td className="w-32 shrink-0 px-4 py-2 align-top font-bold text-slate-400">{k}</td>
                      <td className="px-4 py-2 leading-relaxed text-slate-200">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-5">
              <p className="mb-2 text-xs font-black tracking-wide text-slate-500">— {group.name}</p>
              <div className="flex flex-wrap gap-2">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-bold transition ${
                      pick[group.name] === val
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="أقل" className="px-3 py-2.5 text-blue-300"><Minus className="h-4 w-4" /></button>
              <span className="w-9 text-center font-black text-white">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="أكثر" className="px-3 py-2.5 text-blue-300"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={missing.length > 0}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-black text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> ضمان رسمي سنة كاملة • فاتورة معتمدة • إرجاع خلال 14 يوم
          </p>
        </div>
      </div>
    </div>
  );
}

export function HubSearchOverlay({ onClose, onProductClick }: any) {
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
    return (product?.products || []).filter((p: any) => String(p.name || '').toLowerCase().includes(query)).slice(0, 12);
  }, [q, product?.products]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 p-4 pt-16 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-[#0b1220] shadow-2xl ring-1 ring-slate-700">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <Search className="h-5 w-5 text-blue-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن جهاز… آيفون، لابتوب، ساعة"
            className="w-full bg-transparent text-base font-bold text-white placeholder:text-slate-600 focus:outline-none" />
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {results.map((p: any) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onClose(); onProductClick(p); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-slate-900">
                <img src={getImageUrl(p.image || '')} alt="" className="h-11 w-11 rounded-lg bg-slate-900 object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-200">{p.name}</span>
                <span className="text-sm font-black text-blue-300">{formatPrice(p.price)}</span>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-slate-500">لا نتائج لـ «{q}» — جرّب اسم الماركة</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export const hubOverlays = {
  cart: HubCartDrawer,
  product_detail: HubProductModal,
  search: HubSearchOverlay,
};
