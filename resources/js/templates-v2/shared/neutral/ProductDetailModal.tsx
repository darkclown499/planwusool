import { toast } from '@/components/custom-toast';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { usePage } from '@inertiajs/react';
import { Gift, Heart, MessageCircle, Minus, PackageCheck, Plus, Share2, ShoppingCart, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useStorefrontCore } from '@/templates-v2/shared/contexts';
import { calcEarnedPoints, getEffectiveLoyaltyPrice, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { ProductReviews } from '@/components/storefront/ProductReviews';

interface TemplateProductDetailModalProps {
    product: any;
    selectedImageIndex?: number;
    onClose: () => void;
    onImageSelect?: (index: number) => void;
}

export const TemplateProductDetailModal: React.FC<TemplateProductDetailModalProps> = ({
    product,
    selectedImageIndex = 0,
    onClose,
    onImageSelect,
}) => {
    const { cart, config, auth, wishlist } = useStorefrontCore();
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const images = product?.images?.length ? product.images : [product?.image];
    const currentImage = images[selectedImageIndex] || images[0];
    const price = Number(product?.price) || 0;
    const originalPrice = product?.originalPrice ? Number(product.originalPrice) : 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    const primary = 'var(--twc-primary-600, #059669)';

    const buildOrderMessage = () => {
        let message = `مرحباً! أرغب بطلب: ${product?.name}`;
        if (Object.keys(selectedVariants).length > 0) {
            message += ` (${Object.entries(selectedVariants)
                .map(([k, v]) => `${k}: ${v}`)
                .join('، ')})`;
        }
        message += ` - الكمية: ${quantity}`;
        if (price) message += ` - السعر: ${price}`;
        return message;
    };

    const whatsappPhone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    const whatsappUrl = whatsappPhone ? createWhatsAppUrl(whatsappPhone, buildOrderMessage()) : '';

    const handleAddToCart = async () => {
        await cart.addToCart({ ...product, quantity, selectedVariants });
        onClose();
    };

    const handleWishlist = async () => {
        if (!auth.isLoggedIn) {
            auth.setShowLoginModal(true);
            return;
        }
        try {
            await wishlist.toggle(product?.id);
            toast.success('تم تحديث المفضلة');
        } catch {
            toast.error('تعذر تحديث المفضلة');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"
                    style={{ background: 'var(--twc-surface, #ffffff)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-sm transition hover:bg-black/5"
                        style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div
                        className="flex items-center border-b p-4 pe-14"
                        style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                    >
                        <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            تفاصيل المنتج
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:flex md:gap-6 md:p-6">
                        {/* Image */}
                        <div className="md:w-1/2">
                            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
                                <img src={getImageUrl(currentImage)} alt={product?.name} className="h-full w-full object-cover" />
                            </div>
                            {images.length > 1 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                    {images.map((img: string, i: number) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => onImageSelect?.(i)}
                                            className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                                                i === selectedImageIndex ? '' : 'border-transparent opacity-70'
                                            }`}
                                            style={{ borderColor: i === selectedImageIndex ? primary : undefined }}
                                        >
                                            <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="mt-4 md:mt-0 md:w-1/2">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                {product?.name}
                            </h3>
                            {product?.category && (
                                <p className="mt-1 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                    {product.category}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="text-2xl font-bold" style={{ color: primary }}>
                                    {formatCurrency(price, storeSettings, currencies)}
                                </span>
                                {originalPrice > price && (
                                    <span className="text-sm text-gray-400 line-through">
                                        {formatCurrency(originalPrice, storeSettings, currencies)}
                                    </span>
                                )}
                                {discount > 0 && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">خصم {discount}%</span>
                                )}
                            </div>
                            {originalPrice > price && (
                                <p className="mt-2 text-sm font-semibold text-emerald-600">
                                    وفري {formatCurrency(originalPrice - price, storeSettings, currencies)}
                                </p>
                            )}
                            {(() => {
                                const ls: any = (storeSettings as any)?.loyalty;
                                const effPrice = getEffectiveLoyaltyPrice(product, selectedVariants);
                                const pts = ls ? calcEarnedPoints(effPrice, { is_enabled: !!ls.is_enabled, points_per_currency: Number(ls.points_per_currency ?? 1), points_value: Number(ls.points_value ?? 0.01), minimum_redemption_points: Number(ls.minimum_redemption_points ?? 100), maximum_discount_percentage: Number(ls.maximum_discount_percentage ?? 50) }) : calcEarnedPoints(effPrice, getLoyaltySettingsFromPage());
                                return pts > 0 ? (
                                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                                        <Gift className="h-3 w-3" /> كسب {pts} نقطة
                                    </p>
                                ) : null;
                            })()}

                            {product?.availability === 'out_of_stock' && (
                                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">غير متوفر حالياً</p>
                            )}

                            {product?.description && (
                                <div
                                    className="prose prose-sm mt-4 max-w-none text-sm leading-relaxed"
                                    style={{ color: 'var(--twc-text-muted, #6b7280)' }}
                                    dangerouslySetInnerHTML={createSafeHtml(product.description)}
                                />
                            )}

                            {Array.isArray(product?.variants) &&
                                product.variants.map((variant: any) => {
                                    const values = variant.values || variant.options || [];
                                    return (
                                        <div key={variant.name} className="mt-4">
                                            <label
                                                className="mb-1.5 block text-sm font-semibold"
                                                style={{ color: 'var(--twc-text-primary, #111827)' }}
                                            >
                                                {variant.name}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {values.map((value: string) => {
                                                    const active = selectedVariants[variant.name] === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedVariants((prev) => ({
                                                                    ...prev,
                                                                    [variant.name]: value,
                                                                }))
                                                            }
                                                            className="rounded-full border px-4 py-1.5 text-sm font-semibold transition"
                                                            style={{
                                                                borderColor: active ? primary : 'var(--twc-border, #e5e7eb)',
                                                                background: active
                                                                    ? 'var(--twc-primary-50, #ecfdf5)'
                                                                    : 'var(--twc-background, #ffffff)',
                                                                color: active ? primary : 'var(--twc-text-primary, #111827)',
                                                            }}
                                                        >
                                                            {value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                            {/* Quantity */}
                            <div className="mt-5 flex items-center gap-3">
                                <span className="text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    الكمية:
                                </span>
                                <div
                                    className="flex items-center gap-2 rounded-full border p-1"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5"
                                        aria-label="إنقاص"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        {quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity((q) => q + 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5"
                                        aria-label="زيادة"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    disabled={product?.availability === 'out_of_stock'}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                    style={{ background: primary }}
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    أضف للسلة
                                </button>
                                <button
                                    type="button"
                                    onClick={handleWishlist}
                                    aria-label="أضف للمفضلة"
                                    className="flex h-12 w-12 items-center justify-center rounded-full border transition hover:bg-red-50"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                >
                                    <Heart className="h-5 w-5 text-red-500" />
                                </button>
                                {/* Share this product on WhatsApp */}
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`${product?.name} — ${window.location.origin}/product/${product?.seoUrlSlug || product?.id}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="شارك المنتج على واتساب"
                                    title="شارك المنتج على واتساب"
                                    className="flex h-12 w-12 items-center justify-center rounded-full border text-white transition hover:opacity-90"
                                    style={{ borderColor: '#25D366', background: '#25D366' }}
                                >
                                    <Share2 className="h-5 w-5" />
                                </a>
                            </div>
                            {whatsappUrl && (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 font-bold text-white transition hover:opacity-90"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    اطلب عبر واتساب
                                </a>
                            )}
                            {product?.sku && (
                                <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                    <PackageCheck className="h-4 w-4" />
                                    SKU: {product.sku}
                                </p>
                            )}
                            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                                <ProductReviews productId={product.id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
