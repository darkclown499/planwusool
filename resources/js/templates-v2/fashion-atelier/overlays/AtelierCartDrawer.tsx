import React, { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { toast } from '@/components/custom-toast';
import { computeCartTotals, freeShippingProgress, resolveFreeShippingThreshold, usePriceFormatter, useStorefrontCore } from '../../shared/hooks';

interface AtelierCartDrawerProps {
  onClose: () => void;
  onCheckout: () => void;
  onProductClick: (product: any) => void;
}

const FALLBACK_FREE_SHIPPING: number | null = null;

/**
 * The Atelier cart drawer. Slides in with an ivory panel, shows live
 * free-shipping progress, per-item variant chips and quiet qty steppers.
 */
export const AtelierCartDrawer: React.FC<AtelierCartDrawerProps> = ({ onClose, onCheckout, onProductClick }) => {
  const { cart, config, content, behavior } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const items = cart.cartItems || [];
  const totals = computeCartTotals(items);
  const effectiveThreshold = resolveFreeShippingThreshold(content, FALLBACK_FREE_SHIPPING, behavior);
  const shipping = effectiveThreshold ? freeShippingProgress(totals.subtotal, effectiveThreshold) : null;
  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');

  const orderViaWhatsApp = () => {
    // Canonical: open checkout which creates a real Order server-side then redirects to WhatsApp.
    // The checkout modal validates cart, creates order, gives order number, then opens WhatsApp with snapshot.
    // Helper text explains: "أنشئ طلبك ثم تابع التفاصيل مع المتجر عبر واتساب"
    onClose();
    // Defer to allow drawer close animation before checkout opens
    setTimeout(() => onCheckout(), 120);
  };

  const changeQty = async (index: number, delta: number) => {
    await cart.updateQuantity(index, delta);
  };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-[#faf7f2] shadow-2xl" style={{ animation: 'atelierSlideLeft .35s cubic-bezier(.22,.9,.3,1)' }}>
        {/* Head */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
            <ShoppingBag className="h-5 w-5 text-[#9d7463]" strokeWidth={1.8} />
            سلّة التسوّق
            <span className="text-sm font-medium text-stone-400">({totals.count})</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free shipping progress — hidden when cart empty or threshold disabled (prevents green-segment ghost on empty state) */}
        {shipping && items.length > 0 && (
          <div className="border-b border-stone-200/80 bg-white px-6 py-4" dir="rtl">
            <p className="mb-2 text-[13px] leading-relaxed text-stone-600">
              {shipping.qualified ? (
                <>🎉 رائع! حصلتِ على <strong className="text-[#9d7463]">شحن مجاني</strong></>
              ) : (
                <>أضيفي بقيمة <strong className="text-stone-800">{formatPrice(shipping.remaining)}</strong> لتحصلي على شحن مجاني</>
              )}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={shipping.percent} aria-valuemin={0} aria-valuemax={100}>
              {/* RTL-aware fill: in RTL the bar should grow from the right edge — flex+margin handles via dir=rtl and inline start */}
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, shipping.percent))}%`, background: 'linear-gradient(90deg,#b08d57,#9d7463)', marginInlineStart: 'auto' as any, marginInlineEnd: '0' }} />
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400">حد الشحن المجاني: {formatPrice(effectiveThreshold)}</p>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="rounded-full bg-white p-5 shadow-sm ring-1 ring-stone-200">
                <ShoppingBag className="h-7 w-7 text-stone-300" />
              </span>
              <p className="font-serif text-lg font-semibold text-stone-600">سلّتك ما زالت فارغة</p>
              <p className="-mt-2 text-sm text-stone-400">تشكيلاتنا الجديدة بانتظارك</p>
              <button type="button" onClick={onClose} className="mt-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#9d7463]">
                تابعي التسوق
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200/80">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex gap-4 py-4">
                  <button type="button" onClick={() => onProductClick(item)} className="shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-stone-200" aria-label={item.name}>
                    <img src={getImageUrl(item.image)} alt={item.name} className="h-24 w-20 object-cover" />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800">{item.name}</p>
                      <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="إزالة" className="shrink-0 rounded p-1 text-stone-400 transition hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {!!item.selectedVariants && Object.values(item.selectedVariants || {}).length > 0 && (
                      <p className="mt-1 text-xs text-stone-500">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-stone-300 bg-white">
                        <button type="button" onClick={() => changeQty(index, -1)} className="p-1.5 text-stone-500 transition hover:text-[#9d7463]" aria-label="تقليل">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(index, 1)} className="p-1.5 text-stone-500 transition hover:text-[#9d7463]" aria-label="زيادة">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-stone-900">{formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Totals + CTAs */}
        {items.length > 0 && (
          <div className="border-t border-stone-200 bg-white px-6 py-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600"><span>المجموع الجزئي</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.tax > 0 && (
                <div className="flex justify-between text-stone-600"><span>الضريبة</span><span>{formatPrice(totals.tax)}</span></div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
                <span>الإجمالي</span><span>{formatPrice(totals.total)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-4 w-full rounded-full bg-stone-900 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition hover:bg-[#9d7463]"
            >
              إتمام الطلب
            </button>
            {waPhone && (
              <button type="button" onClick={orderViaWhatsApp} className="mt-2 flex w-full flex-col items-center justify-center gap-0.5 rounded-full border border-[#25D366]/40 py-2.5 text-sm font-semibold text-[#128C4B] transition hover:bg-[#25D366]/10">
                <span>أكمل طلبك عبر واتساب</span>
                <span className="text-[11px] font-normal text-stone-500">أنشئ طلبك ثم تابع التفاصيل مع المتجر عبر واتساب</span>
              </button>
            )}
          </div>
        )}
      </aside>
      <style>{`@keyframes atelierSlideLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
};
