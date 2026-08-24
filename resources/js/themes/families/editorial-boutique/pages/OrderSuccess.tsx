import { toast } from '@/components/custom-toast';
import { Copy, Package, ShoppingBag } from 'lucide-react';
import React from 'react';
import { css } from '@/builder/sections/helpers';
import { ModalShell } from './shared';

interface OrderSuccessProps {
    orderNumber: string;
    onClose: () => void;
    onContinueShopping: () => void;
}

/**
 * editorial-boutique order success — a quiet confirmation plate: the check
 * mark sits bare (no filled green circle), and the order-number pill and
 * CTA follow the family's sharp-corner, blush/black button language.
 */
export const OrderSuccess: React.FC<OrderSuccessProps> = ({ orderNumber, onClose, onContinueShopping }) => {
    const copyOrderNumber = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderNumber);
            toast.success('تم نسخ رقم الطلب!');
        }
    };

    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const border = css('--twc-border', '#ededed');
    const primary = css('--twc-primary', '#f6d7d5');
    const accent = css('--twc-accent', '#a4655f');
    const headingFont = css('--twf-heading-font', 'inherit');
    const radius = css('--twx-radius', '4px');

    return (
        <ModalShell onClose={onClose} title="تم استلام طلبك" icon={<ShoppingBag className="h-5 w-5" />}>
            <div className="p-6 text-center sm:p-8">
                <Package className="mx-auto mb-4 h-12 w-12" style={{ color: accent }} />
                <h3 className="text-xl font-medium" style={{ color: textPrimary, fontFamily: headingFont }}>
                    شكراً لك! تم استلام طلبك بنجاح
                </h3>
                <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                    سنقوم بمراجعة طلبك والتواصل معك قريباً لتأكيد التفاصيل.
                </p>
                <button
                    type="button"
                    onClick={copyOrderNumber}
                    className="mt-5 inline-flex items-center gap-2 border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition hover:opacity-70"
                    style={{ borderColor: border, color: textPrimary, borderRadius: radius }}
                >
                    <Copy className="h-3.5 w-3.5" />
                    رقم الطلب: {orderNumber}
                </button>
                <button
                    type="button"
                    onClick={onContinueShopping}
                    className="mt-5 w-full py-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85"
                    style={{ background: primary, color: '#000000', borderRadius: radius }}
                >
                    متابعة التسوق
                </button>
            </div>
        </ModalShell>
    );
};

export default OrderSuccess;
