import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';

interface CartProps {
    onClose: () => void;
    onCheckout: () => void;
    onProductClick: (product: any) => void;
}

/**
 * editorial-boutique cart drawer — flat rows (no bordered card chrome),
 * a bare trash icon instead of a filled danger button, and a sharp-corner
 * blush checkout bar matching the family's ProductCard/ProductDetail CTA.
 */
export const Cart: React.FC<CartProps> = ({ onClose, onCheckout, onProductClick }) => {
    const { cart } = useStorefrontCore();
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const cartItems = cart.cartItems || [];
    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const totalTax = cartItems.reduce((sum: number, item: any) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        return sum + (item.taxPercentage ? (itemTotal * item.taxPercentage) / 100 : 0);
    }, 0);
    const total = subtotal + totalTax;

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const primary = css('--twc-primary', '#f6d7d5');
    const headingFont = css('--twf-heading-font', 'inherit');
    const radius = css('--twx-radius', '4px');

    return (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div
                className="absolute inset-y-0 end-0 flex h-full w-full max-w-md flex-col"
                style={{ background: css('--twc-background', '#ffffff') }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b p-4 sm:p-5" style={{ borderColor: border }}>
                    <h2 className="text-lg font-medium" style={{ color: textPrimary, fontFamily: headingFont }}>
                        حقيبتك ({cartItems.length})
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="flex h-9 w-9 items-center justify-center transition hover:opacity-60"
                        style={{ color: textPrimary }}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {cartItems.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <ShoppingBag className="h-10 w-10" style={{ color: css('--twc-muted', '#d9cfc8') }} />
                            <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                حقيبتك فارغة
                            </p>
                            <p className="text-xs" style={{ color: textSecondary }}>
                                أضيفي بعض القطع لتتابعي طلبك
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition hover:opacity-85"
                                style={{ background: primary, color: '#000000', borderRadius: radius }}
                            >
                                تصفحي المنتجات
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: border }}>
                            {cartItems.map((item: any, index: number) => (
                                <div key={`${item.id}-${index}`} className="flex gap-3 py-4 first:pt-0">
                                    <button
                                        type="button"
                                        onClick={() => onProductClick(item)}
                                        className="h-24 w-20 shrink-0 overflow-hidden"
                                        style={{ background: css('--twc-surface', '#faf8f6') }}
                                    >
                                        <img src={getImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                                    </button>
                                    <div className="flex flex-1 flex-col justify-between">
                                        <div className="flex items-start justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onProductClick(item)}
                                                className="text-start text-sm font-medium hover:opacity-70"
                                                style={{ color: textPrimary }}
                                            >
                                                {item.name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => cart.removeFromCart(index)}
                                                aria-label="حذف"
                                                className="shrink-0 transition hover:opacity-60"
                                                style={{ color: textSecondary }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-3 border" style={{ borderColor: border }}>
                                                <button
                                                    type="button"
                                                    onClick={() => cart.updateQuantity(index, -1)}
                                                    className="flex h-7 w-7 items-center justify-center transition hover:opacity-60"
                                                    aria-label="إنقاص"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="w-5 text-center text-xs font-semibold" style={{ color: textPrimary }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => cart.updateQuantity(index, 1)}
                                                    className="flex h-7 w-7 items-center justify-center transition hover:opacity-60"
                                                    aria-label="زيادة"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                                {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="border-t p-4 sm:p-5" style={{ borderColor: border }}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span style={{ color: textSecondary }}>المجموع الفرعي</span>
                            <span className="font-medium" style={{ color: textPrimary }}>
                                {formatCurrency(subtotal, storeSettings, currencies)}
                            </span>
                        </div>
                        {totalTax > 0 && (
                            <div className="mb-1.5 flex items-center justify-between text-sm">
                                <span style={{ color: textSecondary }}>الضريبة</span>
                                <span className="font-medium" style={{ color: textPrimary }}>
                                    {formatCurrency(totalTax, storeSettings, currencies)}
                                </span>
                            </div>
                        )}
                        <div className="mb-4 flex items-center justify-between border-t pt-3" style={{ borderColor: border }}>
                            <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                الإجمالي
                            </span>
                            <span className="text-base font-semibold" style={{ color: textPrimary }}>
                                {formatCurrency(total, storeSettings, currencies)}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onCheckout}
                            className="w-full py-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85"
                            style={{ background: primary, color: '#000000', borderRadius: radius }}
                        >
                            إتمام الطلب
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
