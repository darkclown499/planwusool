import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { Search, SlidersHorizontal, ArrowUp, ArrowDown, History, Package } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

interface InvRow {
    product_id: number;
    name: string;
    is_variant: boolean;
    variant_id: string | null;
    variant_uuid: string | null;
    variant_label: string | null;
    sku: string | null;
    barcode: string | null;
    stock: number | null;
    status: string;
}

export const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
    in_stock: { en: 'In Stock', ar: 'متوفر' },
    low_stock: { en: 'Low Stock', ar: 'مخزون منخفض' },
    out_of_stock: { en: 'Out of Stock', ar: 'نفذ المخزون' },
    not_tracked: { en: 'Not Tracked', ar: 'غير متتبع' },
};

export default function InventoryIndex() {
    const { t } = useTranslation();
    const page = usePage().props as any;
    const rows: InvRow[] = page.rows || [];
    const filters = page.filters || {};
    const lowThreshold: number = page.lowStockThreshold || 5;

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const didMount = useRef(false);

    // Adjustment dialog state
    const [open, setOpen] = useState(false);
    const [adjustFreeText, setAdjustFreeText] = useState('');
    const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
    const [qty, setQty] = useState('');
    const [reason, setReason] = useState('');
    const [adjustProduct, setAdjustProduct] = useState<InvRow | null>(null);
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        if (!didMount.current) { return; }
        const debounce = setTimeout(() => {
            router.get(
                route('inventory.index'),
                { search: search.trim() || undefined, status: statusFilter === 'all' ? undefined : statusFilter },
                { preserveState: true, replace: true, preserveScroll: true }
            );
        }, 400);
        return () => clearTimeout(debounce);
    }, [search]);

    useEffect(() => {
        if (!didMount.current) { didMount.current = true; return; }
        router.get(
            route('inventory.index'),
            { search: search.trim() || undefined, status: statusFilter === 'all' ? undefined : statusFilter },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    }, [statusFilter]);

    const canAdjust = hasPermission('manage-pos');

    const statusBadge = (status: string) => {
        const map: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
            in_stock: 'success',
            low_stock: 'secondary',
            out_of_stock: 'destructive',
            not_tracked: 'outline',
        };
        const label = STATUS_LABELS[status];
        return {
            variant: map[status] || 'default',
            label: label ? (filterLabel(label.en) === label.en ? label.en : filterLabel(label.en)) : status,
        };
    };

    // t('In Stock') returns the localized value normally; use a small helper.
    const filterLabel = (key: string) => {
        const v = t(key);
        return v === key ? STATUS_LABELS[key]?.ar || key : v;
    };

    const openAdjust = (row: InvRow) => {
        setAdjustProduct(row);
        setAdjustFreeText('');
        setDirection('increase');
        setQty('');
        setReason('');
        setOpen(true);
    };

    const submitAdjust = () => {
        if (!adjustProduct || !qty) return;
        setAdjusting(true);
        axios.post(route('inventory.adjust'), {
            product_id: adjustProduct.product_id,
            variant_uuid: adjustProduct.variant_uuid,
            variant_id: adjustProduct.variant_id,
            direction,
            quantity: qty,
            reason,
        }).then(() => {
            setOpen(false);
            router.reload({ only: ['rows', 'pagination'] });
        }).catch(() => {
            // flash error handled by backend
            setOpen(false);
        }).finally(() => setAdjusting(false));
    };

    const pagination = page.pagination || { current_page: 1, last_page: 1, total: 0 };

    return (
        <PageTemplate
            title={t('Inventory')}
            description={t('Manage stock levels across your store')}
            url="/inventory"
            actions={[
                { label: t('Stock Movements'), icon: <History className="h-4 w-4" />, onClick: () => window.location.href = route('inventory.movements') },
            ]}
            breadcrumbs={[
                { title: t('Dashboard'), href: route('dashboard') },
                { title: t('Inventory') },
            ]}
        >
            <div className="space-y-4">
                {/* Filter bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative sm:max-w-xs">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="ps-10" placeholder={t('Search products...')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All')}</SelectItem>
                            <SelectItem value="in_stock">{filterLabel('In Stock')}</SelectItem>
                            <SelectItem value="low_stock">{filterLabel('Low Stock')}</SelectItem>
                            <SelectItem value="out_of_stock">{filterLabel('Out of Stock')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground sm:ms-auto">
                        {pagination.total} {t('Items')}
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-start text-xs uppercase text-muted-foreground">
                                        <th className="px-4 py-3 text-start font-medium">{t('Product')}</th>
                                        <th className="px-4 py-3 text-start font-medium">{t('SKU')}</th>
                                        <th className="px-4 py-3 text-start font-medium">{t('Variant')}</th>
                                        <th className="px-4 py-3 text-end font-medium">{t('Stock')}</th>
                                        <th className="px-4 py-3 text-start font-medium">{t('Status')}</th>
                                        {canAdjust && <th className="px-4 py-3 text-end font-medium">{t('Actions')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const b = statusBadge(r.status);
                                        return (
                                            <tr key={`${r.product_id}-${r.variant_uuid ?? r.variant_id ?? i}`} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                                                <td className="px-4 py-3 text-start font-medium">{r.name}</td>
                                                <td className="px-4 py-3 text-start text-muted-foreground">{r.sku || '-'}</td>
                                                <td className="px-4 py-3 text-start text-muted-foreground">{r.variant_label || '-'}</td>
                                                <td className="px-4 py-3 text-end font-semibold">{r.stock === null ? '-' : r.stock}</td>
                                                <td className="px-4 py-3 text-start"><Badge variant={b.variant}>{b.label}</Badge></td>
                                                {canAdjust && (
                                                    <td className="px-4 py-3 text-end">
                                                        <Button variant="outline" size="sm" onClick={() => openAdjust(r)}>
                                                            <SlidersHorizontal className="h-3.5 w-3.5" /> {t('Adjust')}
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {rows.length === 0 && (
                                        <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                            {search || statusFilter !== 'all' ? t('No products matched your search') : t('No items yet')}
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Button variant="outline" size="sm" disabled={pagination.current_page <= 1}
                            onClick={() => router.get(route('inventory.index'), { ...filters, page: pagination.current_page - 1 }, { preserveState: true })}>
                            {t('Previous')}
                        </Button>
                        <span className="mx-2">{pagination.current_page} / {pagination.last_page}</span>
                        <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => router.get(route('inventory.index'), { ...filters, page: pagination.current_page + 1 }, { preserveState: true })}>
                            {t('Next')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Adjust dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    {adjustProduct && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t('Manual Stock Adjustment')}</DialogTitle>
                                <DialogDescription>{adjustProduct.name}{adjustProduct.variant_label ? ` · ${adjustProduct.variant_label}` : ''}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                {adjustProduct.is_variant && (
                                    <>
                                        <Label>{t('Product')}</Label>
                                        <Input value={adjustFreeText} onChange={(e) => setAdjustFreeText(e.target.value)} placeholder={t('Search products...')} />
                                    </>
                                )}
                                <div className="grid gap-2">
                                    <Label>{t('Direction')}</Label>
                                    <div className="flex gap-2">
                                        <Button type="button" variant={direction === 'increase' ? 'default' : 'outline'} className="flex-1" onClick={() => setDirection('increase')}>
                                            <ArrowUp className="h-4 w-4" /> {t('Increase')}
                                        </Button>
                                        <Button type="button" variant={direction === 'decrease' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setDirection('decrease')}>
                                            <ArrowDown className="h-4 w-4" /> {t('Decrease')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Quantity')}</Label>
                                    <Input type="number" min={1} max={1000000} value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        placeholder="1" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Reason')}</Label>
                                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Enter reason...')} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)} disabled={adjusting}>{t('Cancel')}</Button>
                                <Button onClick={submitAdjust} disabled={!qty || adjusting}>
                                    {adjusting ? t('Loading') : t('Adjust Stock')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}