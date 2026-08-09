import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useStorefrontCore } from './contexts';

interface TemplateCartDrawerProps {
    onClose: () => void;
    onCheckout: () => void;
    onProductClick: (product: any) => void;
}

/**
 * Token-aware, mobile-first cart drawer shared by all templates.
 * Flows into the auth gate / checkout exactly like the legacy themes.
 */
export const TemplateCartDrawer: React.FC<TemplateCartDrawerProps> = ({ onClose, onCheckout, onProductClick }) => {
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

    const primary = 'var(--twc-primary-600, #059669)';

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
            <div
                className="absolute inset-y-0 end-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
                style={{ background: 'var(--twc-surface, #ffffff)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: primary }}>
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            سلة التسوق ({cartItems.length})
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cartItems.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                            <div
                                className="flex h-16 w-16 items-center justify-center rounded-full"
                                style={{ background: 'var(--twc-primary-50, #ecfdf5)' }}
                            >
                                <ShoppingCart className="h-8 w-8" style={{ color: 'var(--twc-primary-600, #059669)' }} />
                            </div>
                            <p className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                سلتك فارغة
                            </p>
                            <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                أضف بعض المنتجات لتتابع طلبك
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                                style={{ background: primary }}
                            >
                                تصفح المنتجات
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cartItems.map((item: any, index: number) => (
                                <div
                                    key={`${item.id}-${index}`}
                                    className="flex gap-3 rounded-2xl border p-3"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onProductClick(item)}
                                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                                    >
                                        <img src={getImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                                    </button>
                                    <div className="flex flex-1 flex-col justify-between">
                                        <div className="flex items-start justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onProductClick(item)}
                                                className="text-start text-sm font-semibold hover:underline"
                                                style={{ color: 'var(--twc-text-primary, #111827)' }}
                                            >
                                                {item.name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => cart.removeFromCart(index)}
                                                aria-label="حذف"
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => cart.updateQuantity(index, -1)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border"
                                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                                    aria-label="إنقاص"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span
                                                    className="w-8 text-center text-sm font-bold"
                                                    style={{ color: 'var(--twc-text-primary, #111827)' }}
                                                >
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => cart.updateQuantity(index, 1)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border"
                                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                                    aria-label="زيادة"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <span className="text-sm font-bold" style={{ color: primary }}>
                                                {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="border-t p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>المجموع الفرعي</span>
                            <span className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                {formatCurrency(subtotal, storeSettings, currencies)}
                            </span>
                        </div>
                        {totalTax > 0 && (
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <span style={{ color: 'var(--twc-text-muted, #6b7280)' }}>الضريبة</span>
                                <span className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    {formatCurrency(totalTax, storeSettings, currencies)}
                                </span>
                            </div>
                        )}
                        <div className="mb-4 flex items-center justify-between">
                            <span className="font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                الإجمالي
                            </span>
                            <span className="text-lg font-bold" style={{ color: primary }}>
                                {formatCurrency(total, storeSettings, currencies)}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onCheckout}
                            className="w-full rounded-full py-3.5 font-bold text-white transition hover:opacity-90"
                            style={{ background: primary }}
                        >
                            إتمام الطلب
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
