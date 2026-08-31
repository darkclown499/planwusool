import React, { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';
import { SearchSheet } from '../shared/SearchSheet';

/* ===================================================================== */
/* الهيئة overlays — light commerce sheets                                */
/* ===================================================================== */

export function HayahCartDrawer({ onClose, onCheckout }: any) {
  const { cart, config } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const items = cart.cartItems || [];
  const totals = computeCartTotals(items);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');
  const orderWhatsapp = () => { onClose(); setTimeout(() => onCheckout(), 120); };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
            <ShoppingBag className="h-5 w-5 text-[var(--store-primary,#2563eb)]" /> سلتك
            {items.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{items.length}</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">🛒</span>
              <p className="text-sm font-bold text-slate-600">سلتك فارغة</p>
              <p className="text-xs text-slate-400">ابدأ التسوق وأضف منتجاتك المفضلة</p>
              <button type="button" onClick={onClose} className="mt-1 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-black text-white">تصفح المنتجات</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover bg-white" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-slate-500">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="text-sm font-black text-slate-900">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center rounded-full border border-slate-200 bg-white">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} aria-label="أقل" className="px-2 py-1 text-slate-600"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} aria-label="أكثر" className="px-2 py-1 text-slate-600"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="حذف" className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 bg-white p-5">
            <div className="mb-1 flex justify-between text-sm text-slate-500"><span>المجموع</span><span className="font-black text-slate-900">{formatPrice(totals.total)}</span></div>
            <div className="mb-1 flex justify-between text-xs text-slate-400"><span>عدد القطع</span><span>{totals.count}</span></div>
            <button type="button" onClick={onCheckout} className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-black text-white hover:bg-black">
              متابعة الطلب
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-full border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
                أو اطلب عبر واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function HayahProductModal({ product, onClose }: any) {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [qty, setQty] = useState(1);
  const [pick, setPick] = useState<Record<string, string>>({});
  const variable = isVariableProduct(product);
  const missing = variable ? (product.variants || []).filter((g: any) => !pick[g.name]) : [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!product) return null;

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? pick : undefined });
    onClose();
    ui.setShowCart(true);
  };

  const images: string[] = product.images && Array.isArray(product.images) && product.images.length ? product.images : [product.image].filter(Boolean);
  const [activeImg, setActiveImg] = useState(0);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl sm:flex-row sm:max-h-[85vh]">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 z-10 rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 text-slate-600 hover:text-slate-900 sm:left-auto sm:right-3">
          <X className="h-5 w-5" />
        </button>

        {/* Images */}
        <div className="w-full sm:w-[48%] bg-slate-50 p-3">
          <div className="aspect-square overflow-hidden rounded-2xl bg-white">
            <img src={getImageUrl(images[activeImg] || product.image || '')} alt={product.name} className="h-full w-full object-contain p-2" />
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {images.slice(0, 6).map((img: string, i: number) => (
                <button key={i} type="button" onClick={() => setActiveImg(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ${i === activeImg ? 'ring-slate-900' : 'ring-slate-200'}`}>
                  <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-6">
          <h2 className="text-lg font-black leading-snug text-slate-900">{product.name}</h2>
          <p className="mt-2 text-xl font-black text-slate-900">{formatPrice(product.price)}</p>
          {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
            <p className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
          )}

          {product.description && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600" dangerouslySetInnerHTML={createSafeHtml(product.description || '')} />
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-4">
              <p className="mb-2 text-xs font-black text-slate-700">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${pick[group.name] === val ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-slate-200 bg-white">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="أقل" className="px-3 py-2.5 text-slate-600"><Minus className="h-4 w-4" /></button>
              <span className="w-9 text-center font-black text-slate-900">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="أكثر" className="px-3 py-2.5 text-slate-600"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={missing.length > 0}
              className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-black text-white shadow hover:bg-black disabled:bg-slate-200 disabled:text-slate-400"
            >
              {missing.length > 0 ? `اختر ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HayahSearchOverlay({ onClose, onProductClick }: any) {
  return <SearchSheet onClose={onClose} onProductClick={onProductClick} accent="#2563eb" placeholder="ابحث عن منتج..." variant="default" />;
}

// Keep backwards compat names for overlays registry
export const RestaurantCartDrawer = HayahCartDrawer;
export const DishModal = HayahProductModal;
export const RestaurantSearchOverlay = HayahSearchOverlay;

export const restaurantOverlays = {
  cart: HayahCartDrawer,
  product_detail: HayahProductModal,
  search: HayahSearchOverlay,
};
export const hayahOverlays = restaurantOverlays;
