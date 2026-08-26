import React, { useEffect, useMemo, useState } from 'react';
import { Check, Gift, Heart, Minus, Plus, RefreshCcw, ShieldCheck, Truck, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { discountPercent, isVariableProduct, lowStockRemaining, usePriceFormatter, useStorefrontCore } from '../../shared/hooks';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { ProductReviews } from '@/components/storefront/ProductReviews';

interface AtelierProductDetailProps {
  product: any;
  selectedImageIndex?: number;
  onClose: () => void;
  onImageSelect?: (index: number) => void;
}

const COLOR_HINTS = ['لون', 'اللون', 'color'];

/**
 * The Atelier product detail overlay — an editorial spread: portrait gallery
 * on one side, the story (name serif large, price with saving badge,
 * breathing-room variant selectors, quantity) on the other, closed by a
 * quiet trust row and a WhatsApp "اسألي عن القطعة" line.
 */
export const AtelierProductDetail: React.FC<AtelierProductDetailProps> = ({ product, onClose }) => {
  const { cart, ui, wishlist, config } = useStorefrontCore();
  const formatPrice = usePriceFormatter();

  const images: string[] = useMemo(() => {
    const list = [product?.image, ...(product?.images || [])].filter(Boolean);
    return Array.from(new Set(list as string[]));
  }, [product]);

  const [active, setActive] = useState(0);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!product) return null;

  const outOfStock = product.availability === 'out_of_stock';
  const discount = discountPercent(product);
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;
  const missingGroups = (product.variants || []).filter((g: any) => !selection[g.name]);

  // Variant-aware price: if all groups selected, resolve variant combination price
  const selectedCombo = (() => {
    if (!variable || missingGroups.length > 0) return null;
    const combos: any[] = product.variantCombinations || product.variant_combinations || [];
    if (!combos.length) return null;
    const selVals = Object.values(selection).map((v) => String(v).trim());
    return combos.find((c: any) => {
      const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
      if (vals.length !== selVals.length) return false;
      return selVals.every((sv) => vals.includes(sv));
    }) || null;
  })();
  const displayPrice = selectedCombo && selectedCombo.price && String(selectedCombo.price).trim() !== '' ? Number(selectedCombo.price) : Number(product.price);
  const isSelectedOOS = (() => {
    if (!selectedCombo) return false;
    if (product.allowBackorder) return false;
    const stock = selectedCombo.stock !== undefined ? Number(selectedCombo.stock) : NaN;
    if (Number.isFinite(stock)) return stock <= 0;
    return false;
  })();

  const handleAdd = async () => {
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      await cart.addToCart({
        ...product,
        quantity: qty,
        selectedVariants: variable ? selection : undefined,
      });
      onClose();
      ui.setShowCart(true);
    } finally {
      setAdding(false);
    }
  };

  const waPhone = String((config as any)?.socialMedia?.whatsapp || '').replace(/[^0-9]/g, '');
  const askUrl = createWhatsAppUrl(
    waPhone,
    `مرحباً، لدي استفسار عن القطعة: ${product.name}${variable ? ` (${Object.values(selection).join(' / ')})` : ''}`
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-[#faf7f2] shadow-2xl sm:rounded-xl">
        <button type="button" onClick={onClose} aria-label="إغلاق"
          className="absolute left-4 top-4 z-10 rounded-full bg-white/90 p-2 text-stone-600 shadow transition hover:text-stone-900">
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-2 md:gap-10">
          {/* Gallery */}
          <div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200/80">
              <img src={getImageUrl(images[active])} alt={product.name} className="h-full w-full object-cover" />
              {discount > 0 && (
                <span className="absolute top-4 right-4 rounded-sm bg-[#9d7463] px-2.5 py-1.5 text-xs font-bold text-white shadow">-{discount}%</span>
              )}
              {outOfStock && (
                <span className="absolute top-4 left-4 border border-stone-400 bg-white/85 px-3 py-1 text-xs font-bold tracking-widest text-stone-500">نفذت</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((img, i) => (
                  <button key={i} type="button" onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`}
                    className={`h-20 w-16 shrink-0 overflow-hidden rounded-md ring-1 transition ${i === active ? 'ring-2 ring-[#9d7463]' : 'ring-stone-200 opacity-70 hover:opacity-100'}`}>
                    <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Story */}
          <div className="flex flex-col">
            <h1 className="font-serif text-2xl font-bold leading-snug text-stone-900 sm:text-3xl">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-stone-900">{formatPrice(displayPrice)}</span>
              {discount > 0 && !!product.originalPrice && !selectedCombo && (
                <>
                  <span className="text-base text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="rounded-sm bg-[#f3ece4] px-2 py-0.5 text-xs font-bold text-[#9d7463]">
                    وفري {formatPrice(Number(product.originalPrice) - Number(product.price))}
                  </span>
                </>
              )}
              {isSelectedOOS && <span className="rounded-sm border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">غير متوفر</span>}
            </div>

            {!!remaining && !outOfStock && (
              <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fdf6ec] px-3 py-1.5 text-xs font-semibold text-[#a16207] ring-1 ring-[#e7d8c9]">
                ⏳ آخر {remaining} قطع في المخزون
              </p>
            )}
            {(() => {
              const loyalty = getLoyaltySettingsFromPage();
              if (!loyalty || !loyalty.is_enabled) return null;
              const pts = calcEarnedPoints(Number(displayPrice) || 0, loyalty);
              return pts > 0 ? (
                <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                  <Gift className="h-3.5 w-3.5" /> كسب {pts} نقطة
                </span>
              ) : null;
            })()}

            {product.description && (
              <div
                className="mt-5 break-words text-sm leading-relaxed text-stone-600 [overflow-wrap:anywhere] line-clamp-6 whitespace-pre-line"
                dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
              />
            )}

            {/* Variants */}
            {(product.variants || []).map((group: any) => {
              const isColor = COLOR_HINTS.some((h) => group.name.includes(h));
              const combos: any[] = product.variantCombinations || product.variant_combinations || [];
              return (
                <div key={group.name} className="mt-5">
                  <p className="mb-2 text-xs font-bold tracking-wide text-stone-500">
                    {group.name}: <span className="font-semibold text-stone-800">{selection[group.name] || `اختاري ${group.name}`}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(group.values || group.options || []).map((val: string) => {
                      const isActive = selection[group.name] === val;
                      // Disable unavailable combinations (stock 0 without backorder)
                      const isUnavailable = (() => {
                        if (!combos.length || product.allowBackorder) return false;
                        const testSel = { ...selection, [group.name]: val };
                        const hasCompleteCombo = combos.some((c: any) => {
                          const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
                          return Object.values(testSel).every((sv) => vals.includes(String(sv).trim()));
                        });
                        if (!hasCompleteCombo && Object.keys(testSel).length < (product.variants || []).length) return false;
                        const match = combos.find((c: any) => {
                          const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
                          return String(val).trim() === vals.find((vv) => vals.includes(String(val).trim())) && Object.entries(testSel).every(([k,vv]) => {
                            // only check values that are selected; partial match requires at least one combo containing val with finite stock
                            return vals.includes(String(vv).trim());
                          });
                        });
                        if (!match) return false;
                        const st = match.stock !== undefined ? Number(match.stock) : NaN;
                        return Number.isFinite(st) && st <= 0;
                      })();
                      return (
                        <button key={val} type="button" title={val} disabled={isUnavailable}
                          onClick={() => !isUnavailable && setSelection((s) => ({ ...s, [group.name]: val }))}
                          className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[13px] font-medium transition-all ${
                            isUnavailable ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through' : isActive ? 'border-[#9d7463] bg-[#9d7463] text-white shadow' : 'border-stone-300 bg-white text-stone-700 hover:border-[#9d7463]'
                          }`}>
                          {isColor ? (
                            <span className={`block h-5 w-5 rounded-full border ${isActive ? 'ring-2 ring-white' : 'border-black/10'}`} style={{ background: colorDot(val) }} />
                          ) : val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantity + Add */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-stone-300 bg-white">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 text-stone-500 hover:text-[#9d7463]" aria-label="تقليل الكمية"><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} className="p-2.5 text-stone-500 hover:text-[#9d7463]" aria-label="زيادة الكمية"><Plus className="h-4 w-4" /></button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={outOfStock || isSelectedOOS || adding || (variable && missingGroups.length > 0)}
                className="flex-1 rounded-full bg-stone-900 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition hover:bg-[#9d7463] disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {outOfStock || isSelectedOOS ? 'غير متوفرة حالياً' : variable && missingGroups.length > 0 ? `اختاري ${missingGroups.map((g: any) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضيفي للسلّة'}
              </button>
              <button
                type="button"
                onClick={() => wishlist.toggle(product.id)}
                aria-label="المفضلة"
                className={`rounded-full border p-3 transition ${wished ? 'border-[#9d7463] bg-[#9d7463] text-white' : 'border-stone-300 bg-white text-stone-500 hover:border-[#9d7463] hover:text-[#9d7463]'}`}
              >
                <Heart className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            {adding && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check className="h-3.5 w-3.5" /> أُضيفت للسلّة
              </p>
            )}

            {/* Trust */}
            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-stone-200 pt-5 text-center">
              {[
                { icon: Truck, label: 'توصيل سريع' },
                { icon: ShieldCheck, label: 'دفع عند الاستلام' },
                { icon: RefreshCcw, label: 'استبدال سهل' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <Icon className="h-4.5 w-4.5 text-[#b08d57]" strokeWidth={1.6} />
                  <span className="text-[11px] text-stone-500">{label}</span>
                </div>
              ))}
            </div>

            {waPhone && (
              <a href={askUrl} target="_blank" rel="noreferrer"
                className="mt-5 text-center text-[13px] font-semibold text-[#128C4B] underline-offset-4 hover:underline">
                لستِ متأكدة من المقاس؟ اسألينا عبر واتساب
              </a>
            )}
            {/* Reviews — REUSE existing ProductReviews (approved only, is_verified_purchase, admin_reply, loyalty bonus idempotent) */}
            <div className="mt-8 border-t border-stone-200 pt-6">
              <ProductReviews productId={product.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function colorDot(val: string): string {
  const map: Record<string, string> = {
    أسود: '#111111', ابيض: '#ffffff', أبيض: '#ffffff', بيج: '#d9c9b6', رمادي: '#8a8a8a',
    زيتي: '#6b6b3a', أحمر: '#b91c1c', احمر: '#b91c1c', وردي: '#ec4899', زهري: '#f9a8d4',
    أزرق: '#1d4ed8', ازرق: '#1d4ed8', أخضر: '#15803d', اخضر: '#15803d', بني: '#78350f',
    ذهبي: '#d4af37', فضي: '#c0c0c0', كحلي: '#1e3a5f', موف: '#9333ea', نبيتي: '#7f1d1d',
  };
  return map[String(val).trim()] || '#cbd5e1';
}
