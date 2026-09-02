import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { usePage } from '@inertiajs/react';
import { Printer, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReceiptItem {
    product_name: string;
    sku: string | null;
    variant: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface ReceiptOrder {
    order_number: string | null;
    created_at: string | null;
    status: string | null;
    payment_status: string | null;
    payment_method: string | null;
    subtotal: number | null;
    tax_amount: number | null;
    discount_amount: number | null;
    total_amount: number | null;
    currency: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    items: ReceiptItem[];
    store: { name: string | null };
}

export default function PosReceipt() {
    const { t } = useTranslation();
    const { order } = usePage().props as any;
    const o: ReceiptOrder = order || {};
    const currency = o.currency || 'ILS';
    const [printed, setPrinted] = useState(false);

    const fmt = (n: number | null | undefined) =>
        (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const created = o.created_at ? new Date(o.created_at).toLocaleString() : '';

    const handlePrint = () => {
        window.print();
        setPrinted(true);
    };

    return (
        <>
            <Head title={t('Receipt')} />
            <div className="mx-auto max-w-sm p-6">
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4 border-b pb-3 text-center">
                        <h1 className="text-lg font-bold">{o.store?.name || 'Wusool'}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{t('Sales Receipt')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{created}</p>
                    </div>

                    <div className="mb-3 space-y-0.5 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Order number')}</span><span className="font-medium">{o.order_number}</span></div>
                        {o.customer_name && (
                            <div className="flex justify-between"><span className="text-muted-foreground">{t('Customer')}</span><span className="font-medium">{o.customer_name}</span></div>
                        )}
                        {o.customer_phone && (
                            <div className="flex justify-between"><span className="text-muted-foreground">{t('Phone')}</span><span dir="ltr" className="font-medium">{o.customer_phone}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Payment Method')}</span><span className="font-medium">{o.payment_method || '-'}</span></div>
                    </div>

                    <div className="mb-3 border-y py-2">
                        {o.items?.map((item, i) => (
                            <div key={i} className="py-1 text-sm">
                                <div className="flex justify-between gap-2">
                                    <span className="min-w-0 flex-1">{item.product_name}</span>
                                    <span className="font-medium">{fmt(Number(item.total_price))} {currency}</span>
                                </div>
                                <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                                    <span className="min-w-0 truncate">
                                        {item.variant ? `${item.variant} · ` : ''}{item.sku || ''}
                                    </span>
                                    <span>{item.quantity} × {fmt(Number(item.unit_price))}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Subtotal')}</span><span>{fmt(o.subtotal)} {currency}</span></div>
                        {Number(o.discount_amount) > 0 && (
                            <div className="flex justify-between"><span className="text-muted-foreground">{t('Discount')}</span><span>{fmt(o.discount_amount)} {currency}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('Tax')}</span><span>{fmt(o.tax_amount)} {currency}</span></div>
                        <div className="flex justify-between border-t pt-1 text-base font-bold"><span>{t('Total')}</span><span>{fmt(o.total_amount)} {currency}</span></div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <Button onClick={handlePrint}>
                            <Printer className="h-4 w-4" /> {t('Print')}
                        </Button>
                        {printed && (
                            <p className="flex items-center justify-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {t('Sent to printer')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}