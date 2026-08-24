import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { CreditCard, MapPin } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { css } from '@/builder/sections/helpers';
import { ModalShell } from './shared';

interface OrderDetailsProps {
    orderNumber: string;
    storeSlug: string;
    onClose: () => void;
}

/** editorial-boutique order detail — same fetch-on-open flow as the shared modal, flat rows instead of bordered cards. */
export const OrderDetail: React.FC<OrderDetailsProps> = ({ orderNumber, storeSlug, onClose }) => {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    useEffect(() => {
        const loadOrderDetails = async () => {
            try {
                const response = await fetch(`${route('api.orders.show', { orderNumber })}?store_slug=${storeSlug}`);
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data.order);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        loadOrderDetails();
    }, [orderNumber, storeSlug]);

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const radius = css('--twx-radius', '4px');

    return (
        <ModalShell onClose={onClose} title="تفاصيل الطلب" icon={<CreditCard className="h-5 w-5" />}>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: textPrimary }}></div>
                    </div>
                ) : !order ? (
                    <p className="py-10 text-center text-sm" style={{ color: textSecondary }}>
                        تعذر تحميل تفاصيل الطلب.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                رقم الطلب: {order.order_number}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                                الحالة: {order.status}
                            </p>
                        </div>

                        <div className="border p-3" style={{ borderColor: border, borderRadius: radius }}>
                            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: textPrimary }}>
                                <MapPin className="h-3.5 w-3.5" /> عنوان الشحن
                            </p>
                            <p className="text-sm" style={{ color: textSecondary }}>
                                {order.shipping_address || '—'}
                            </p>
                        </div>

                        <div className="divide-y" style={{ borderColor: border }}>
                            {(order.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 py-3 first:pt-0">
                                    <img src={getImageUrl(item.image)} alt={item.name} className="h-12 w-12 object-cover" style={{ borderRadius: radius }} />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium" style={{ color: textPrimary }}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs" style={{ color: textSecondary }}>
                                            {item.quantity} × {formatCurrency(item.price, storeSettings, currencies)}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                        {formatCurrency((item.price || 0) * (item.quantity || 1), storeSettings, currencies)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: border }}>
                            <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                الإجمالي
                            </span>
                            <span className="text-base font-semibold" style={{ color: textPrimary }}>
                                {formatCurrency(order.total, storeSettings, currencies)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default OrderDetail;
