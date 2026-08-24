import { formatCurrency } from '@/utils/currency-formatter';
import { usePage } from '@inertiajs/react';
import { Calendar, Package } from 'lucide-react';
import React from 'react';
import { css } from '@/builder/sections/helpers';
import { ModalShell } from './shared';

interface MyOrdersProps {
    orders: any[];
    loading: boolean;
    onClose: () => void;
    onViewOrder: (orderNumber: string) => void;
    storeSlug: string;
}

/** editorial-boutique order list — flat rows, no card chrome, status as a quiet uppercase label instead of a filled pill. */
export const Orders: React.FC<MyOrdersProps> = ({ orders, loading, onClose, onViewOrder }) => {
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const accent = css('--twc-accent', '#a4655f');
    const radius = css('--twx-radius', '4px');

    return (
        <ModalShell onClose={onClose} title="طلباتي" icon={<Package className="h-5 w-5" />}>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: textPrimary }}></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-sm font-medium" style={{ color: textPrimary }}>
                            لا توجد طلبات بعد
                        </p>
                        <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                            عندما تقومين بطلب منتجات، ستظهر طلباتك هنا.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: border }}>
                        {orders.map((order: any) => (
                            <div key={order.order_number || order.id} className="py-4 first:pt-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: textPrimary }}>
                                            <Calendar className="h-3.5 w-3.5" />
                                            {order.created_at || order.date}
                                        </p>
                                        <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                                            رقم الطلب: {order.order_number}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                        {formatCurrency(order.total, storeSettings, currencies)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onViewOrder(order.order_number)}
                                        className="border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:opacity-70"
                                        style={{ borderColor: border, color: textPrimary, borderRadius: radius }}
                                    >
                                        عرض التفاصيل
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default Orders;
