import { toast } from '@/components/custom-toast';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { usePage } from '@inertiajs/react';
import { Check, Heart, MessageCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';

interface ProductDetailProps {
    product: any;
    selectedImageIndex?: number;
    onClose: () => void;
    onImageSelect?: (index: number) => void;
}

/**
 * editorial-boutique product detail — a lookbook plate blown up full
 * screen: portrait gallery on one side, quiet serif name/price and
 * sharp-cornered blush "أضيفي للحقيبة" bar on the other, matching the
 * family's ProductCard (../ProductCard.tsx) visual language exactly so the
 * transition from grid to detail feels seamless.
 */
export const ProductDetail: React.FC<ProductDetailProps> = ({ product, selectedImageIndex = 0, onClose, onImageSelect }) => {
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
    const outOfStock = product?.availability === 'out_of_stock';
    const inWishlist = wishlist.isInWishlist?.(product?.id) ?? false;

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const primary = css('--twc-primary', '#f6d7d5');
    const accent = css('--twc-accent', '#a4655f');
    const headingFont = css('--twf-heading-font', 'inherit');
    const radius = css('--twx-radius', '4px');

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
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden md:flex-row"
                    style={{ background: css('--twc-background', '#ffffff'), borderRadius: `${radius} ${radius} 0 0` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm md:end-5 md:top-5"
                        style={{ background: 'rgba(255,255,255,.8)', color: textPrimary }}
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>

                    {/* Gallery */}
                    <div className="md:w-1/2">
                        <div className="aspect-[4/5] w-full overflow-hidden" style={{ background: css('--twc-surface', '#faf8f6') }}>
                            <img src={getImageUrl(currentImage)} alt={product?.name} className="h-full w-full object-cover" />
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto p-3">
                                {images.map((img: string, i: number) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => onImageSelect?.(i)}
                                        className="h-16 w-16 shrink-0 overflow-hidden"
                                        style={{ border: `1.5px solid ${i === selectedImageIndex ? accent : 'transparent'}`, opacity: i === selectedImageIndex ? 1 : 0.6 }}
                                    >
                                        <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                        {product?.category && (
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: textSecondary }}>
                                {product.category}
                            </p>
                        )}
                        <h1 className="mt-2 text-2xl font-medium" style={{ color: textPrimary, fontFamily: headingFont }}>
                            {product?.name}
                        </h1>

                        <div className="mt-3 flex items-center gap-3">
                            <span className="text-lg font-semibold" style={{ color: textPrimary }}>
                                {formatCurrency(price, storeSettings, currencies)}
                            </span>
                            {originalPrice > price && (
                                <span className="text-sm" style={{ color: textSecondary, textDecoration: 'line-through' }}>
                                    {formatCurrency(originalPrice, storeSettings, currencies)}
                                </span>
                            )}
                            {discount > 0 && (
                                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                                    خصم {discount}٪
                                </span>
                            )}
                        </div>

                        {outOfStock && (
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: textSecondary }}>
                                نفدت الكمية
                            </p>
                        )}

                        {product?.description && (
                            <p className="mt-5 text-sm leading-relaxed" style={{ color: textSecondary }}>
                                {product.description}
                            </p>
                        )}

                        {Array.isArray(product?.variants) &&
                            product.variants.map((variant: any) => {
                                const values = variant.values || variant.options || [];
                                return (
                                    <div key={variant.name} className="mt-5">
                                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textPrimary }}>
                                            {variant.name}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {values.map((value: string) => {
                                                const active = selectedVariants[variant.name] === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setSelectedVariants((prev) => ({ ...prev, [variant.name]: value }))}
                                                        className="px-4 py-1.5 text-xs font-medium transition"
                                                        style={{
                                                            border: `1px solid ${active ? textPrimary : border}`,
                                                            background: active ? textPrimary : 'transparent',
                                                            color: active ? '#ffffff' : textPrimary,
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

                        <div className="mt-6 flex items-center gap-4">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textPrimary }}>
                                الكمية
                            </span>
                            <div className="flex items-center gap-3 border" style={{ borderColor: border }}>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex h-9 w-9 items-center justify-center transition hover:opacity-60"
                                    aria-label="إنقاص"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold" style={{ color: textPrimary }}>
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="flex h-9 w-9 items-center justify-center transition hover:opacity-60"
                                    aria-label="زيادة"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-7 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={outOfStock}
                                className="flex flex-1 items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85 disabled:opacity-40"
                                style={{ background: primary, color: '#000000', borderRadius: radius }}
                            >
                                {outOfStock ? (
                                    'غير متوفر'
                                ) : (
                                    <>
                                        <ShoppingBag className="h-4 w-4" />
                                        أضيفي للحقيبة
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleWishlist}
                                aria-label="أضف للمفضلة"
                                className="flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center border transition hover:opacity-70"
                                style={{ borderColor: border, borderRadius: radius, color: inWishlist ? accent : textPrimary }}
                            >
                                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                            </button>
                        </div>

                        {whatsappUrl && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2.5 flex w-full items-center justify-center gap-2 border py-3 text-xs font-semibold uppercase tracking-[0.1em] transition hover:opacity-70"
                                style={{ borderColor: border, borderRadius: radius, color: textPrimary }}
                            >
                                <MessageCircle className="h-4 w-4" style={{ color: '#25D366' }} />
                                اطلبي عبر واتساب
                            </a>
                        )}

                        {product?.sku && (
                            <p className="mt-5 flex items-center gap-2 text-[11px]" style={{ color: textSecondary }}>
                                <Check className="h-3.5 w-3.5" />
                                رمز المنتج: {product.sku}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
