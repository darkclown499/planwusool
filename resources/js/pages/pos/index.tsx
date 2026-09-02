import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Barcode, CheckCircle2, X, Loader2, User as UserIcon } from 'lucide-react';

interface PosRow {
    product_id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    cover_image: string | null;
    is_variant: boolean;
    variant_id?: string | null;
    variant_uuid?: string | null;
    variant_label?: string | null;
    price: number;
    stock: number | null;
    tax_rate?: number;
}

interface CartLine {
    key: string;
    product_id: number;
    name: string;
    sku: string | null;
    variant_uuid?: string | null;
    variant_id?: string | null;
    variant_label: string | null;
    qty: number;
    unit_price: number;
    tax_rate: number;
    stock_limit: number | null;
}

export default function PosIndex() {
    const { t } = useTranslation();
    const page = usePage().props as any;
    const storeCurrency: string = page.storeCurrency || 'ILS';

    const [q, setQ] = useState('');
    const [rows, setRows] = useState<PosRow[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<{ id: number; name: string; phone: string | null }[]>([]);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [saleResult, setSaleResult] = useState<{ order_number: string; order_id: number } | null>(null);
    const [saleError, setSaleError] = useState<string | null>(null);
    const barcodeRef = useRef<HTMLInputElement>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fmt = (n: number) =>
        (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totals = useMemo(() => {
        let subtotal = 0;
        let tax = 0;
        for (const line of cart) {
            const lt = line.unit_price * line.qty;
            subtotal += lt;
            tax += (lt * (line.tax_rate || 0)) / 100;
        }
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }, [cart]);

    const runSearch = (term: string) => {
        setLoadingSearch(true);
        axios.get(route('pos.search'), { params: { q: term, per_page: 20 } })
            .then((res: { data: { success: boolean; rows?: PosRow[] } }) => {
                if (res.data && res.data.success) setRows(res.data.rows || []);
                else setRows([]);
            })
            .catch(() => setRows([]))
            .finally(() => setLoadingSearch(false));
    };

    useEffect(() => {
        runSearch('');
    }, []);

    const onQuery = (val: string) => {
        setQ(val);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => runSearch(val), 300);
    };

    // Enter in barcode field triggers immediate search (barcode scanners type fast).
    const onBarcodeEnter = () => {
        const val = q.trim();
        if (val === '') return;
        clearTimeout(searchDebounce.current!);
        runSearch(val);
        // Best-effort: if a barcode exactly matches, it appears in rows.
        const found = rows.find((r) => r.barcode && r.barcode.toLowerCase() === val.toLowerCase());
        if (found) addToCart(found);
    };

    const canSell = (line: Pick<CartLine, 'stock_limit' | 'qty'>): boolean =>
        line.stock_limit === null || line.qty <= line.stock_limit;

    const addToCart = (row: PosRow) => {
        if (row.stock !== null && row.stock <= 0) return;
        const key = row.is_variant ? `${row.product_id}::${row.variant_uuid ?? row.variant_id ?? ''}` : `${row.product_id}`;
        setCart((prev) => {
            const existing = prev.find((l) => l.key === key);
            if (existing) {
                const newQty = existing.qty + 1;
                if (existing.stock_limit !== null && newQty > existing.stock_limit) return prev;
                return prev.map((l) => (l.key === key ? { ...l, qty: newQty } : l));
            }
            return [...prev, {
                key,
                product_id: row.product_id,
                name: row.name,
                sku: row.sku ?? null,
                variant_uuid: row.variant_uuid ?? null,
                variant_id: row.variant_id ?? null,
                variant_label: row.is_variant ? (row.variant_label ?? null) : null,
                qty: 1,
                unit_price: row.price,
                tax_rate: row.tax_rate ?? 0,
                stock_limit: row.stock,
            }];
        });
    };

    const changeQty = (key: string, delta: number) => {
        setCart((prev) =>
            prev.flatMap((l) => {
                if (l.key !== key) return [l];
                const qty = l.qty + delta;
                if (qty <= 0) return [];
                if (l.stock_limit !== null && qty > l.stock_limit) return [l];
                return [{ ...l, qty }];
            })
        );
    };

    const loadCustomers = (term: string) => {
        axios.get(route('pos.customers'), { params: { q: term, per_page: 20 } })
            .then((res: { data: { success: boolean; customers?: { id: number; name: string; phone: string | null }[] } }) => {
                if (res.data && res.data.success) setCustomers(res.data.customers || []);
                else setCustomers([]);
            })
            .catch(() => setCustomers([]));
    };

    const openCustomerPicker = () => {
        setCustomerOpen(true);
        loadCustomers('');
    };

    const submitSale = () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        setSaleError(null);
        axios.post(route('pos.sale'), {
            items: cart.map((l) => ({
                product_id: l.product_id,
                variant_id: l.variant_id,
                variant_uuid: l.variant_uuid,
                quantity: l.qty,
            })),
            payment_method: paymentMethod,
            customer_id: customerId ? Number(customerId) : null,
            notes: notes || null,
        })
            .then((res: { data: { order_number: string; order_id: number } }) => {
                setSaleResult({ order_number: res.data.order_number, order_id: res.data.order_id });
                setCart([]);
                setNotes('');
                setCustomerId(null);
            })
            .catch((err: { response?: { data?: { message?: string } } }) => {
                const msg = err?.response?.data?.message;
                setSaleError(msg || t('Failed to complete the sale'));
            })
            .finally(() => setSubmitting(false));
    };

    const payment: Record<string, string> = {
        cash: t('Cash'),
        bank: t('Bank'),
        bank_transfer: t('Bank Transfer'),
    };

    return (
        <PageTemplate title={t('POS System')} description={t('Point of sale register')} url="/pos">
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Left: product search + grid */}
                <div className="space-y-3 lg:col-span-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={barcodeRef}
                            className="ps-10"
                            placeholder={t('Scan or search for a product...')}
                            value={q}
                            onChange={(e) => onQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onBarcodeEnter()}
                            autoFocus
                        />
                    </div>
                    {loadingSearch && <p className="text-xs text-muted-foreground">{t('Loading')}...</p>}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                        {rows.map((r, i) => (
                            <button
                                key={`${r.product_id}-${r.variant_uuid ?? r.variant_id ?? i}`}
                                type="button"
                                onClick={() => addToCart(r)}
                                disabled={r.stock !== null && r.stock <= 0}
                                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-start shadow-xs transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <div className="flex h-20 items-center justify-center bg-muted/40">
                                    {r.cover_image ? (
                                        <img src={r.cover_image} alt={r.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 p-2">
                                    <span className="line-clamp-2 text-[13px] font-medium leading-tight">{r.name}</span>
                                    {r.variant_label && <span className="text-[11px] text-muted-foreground">{r.variant_label}</span>}
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-sm font-semibold">{fmt(r.price)} {storeCurrency}</span>
                                        {r.stock !== null && (
                                            <Badge variant={r.stock <= 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                                                {r.stock}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                        {!loadingSearch && rows.length === 0 && (
                            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                                {t('No products matched your search')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: cart + checkout */}
                <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">{t('Items')}</h2>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                                    <Trash2 className="h-3.5 w-3.5" /> {t('Clear Cart')}
                                </Button>
                            )}
                        </div>
                        {cart.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t('No items yet')}</p>
                        ) : (
                            <ul className="max-h-72 space-y-2 overflow-y-auto">
                                {cart.map((l) => (
                                    <li key={l.key} className="flex items-center justify-between gap-2 rounded-md border border-border/70 p-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-[13px] font-medium">{l.name}</p>
                                            {l.variant_label && <p className="text-[11px] text-muted-foreground">{l.variant_label}</p>}
                                            <p className="text-[11px] text-muted-foreground">
                                                {fmt(l.unit_price)} {storeCurrency} × {l.qty}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(l.key, -1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(l.key, 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">{t('Subtotal')}</span><span>{fmt(totals.subtotal)} {storeCurrency}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{t('Tax')}</span><span>{fmt(totals.tax)} {storeCurrency}</span></div>
                            <div className="flex justify-between border-t pt-1.5 text-base font-bold"><span>{t('Total')}</span><span>{fmt(totals.total)} {storeCurrency}</span></div>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                        <div className="grid gap-2">
                            <Label>{t('Payment Method')}</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="w-full"><SelectValue placeholder={t('Payment Method')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">{t('Cash')}</SelectItem>
                                    <SelectItem value="bank">{t('Bank')}</SelectItem>
                                    <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Customer')}</Label>
                            {customerId ? (
                                <div className="flex items-center justify-between rounded-md border border-border/70 p-2 text-sm">
                                    <span className="truncate">
                                        {customers.find((c) => String(c.id) === customerId)?.name || t('Walk-in Customer')}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomerId(null)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" className="w-full" onClick={openCustomerPicker}>
                                        <UserIcon className="h-3.5 w-3.5" /> {t('Add Customer')}
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => setCustomerId('0')}>
                                        {t('Walk-in Customer')}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Notes')}</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('optional')} />
                        </div>
                        {saleError && <p className="text-sm text-destructive">{saleError}</p>}
                        <Button className="w-full" size="lg" disabled={cart.length === 0 || submitting} onClick={submitSale}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {t('Complete Sale')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Customer picker */}
            <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Add Customer')}</DialogTitle>
                        <DialogDescription>{t('Search and link a customer to this sale (optional)')}</DialogDescription>
                    </DialogHeader>
                    <Input value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); loadCustomers(e.target.value); }} placeholder={t('Search')} />
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        <button
                            type="button"
                            className="w-full rounded-md border border-border/70 p-2 text-start text-sm hover:bg-accent"
                            onClick={() => { setCustomerId('0'); setCustomerOpen(false); }}
                        >
                            {t('Walk-in Customer')}
                        </button>
                        {customers.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-md border border-border/70 p-2 text-start text-sm hover:bg-accent"
                                onClick={() => { setCustomerId(String(c.id)); setCustomerOpen(false); }}
                            >
                                <span className="truncate">{c.name}</span>
                                {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                            </button>
                        ))}
                        {customers.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">{t('No results')}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomerOpen(false)}>{t('Close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success */}
            <Dialog open={!!saleResult} onOpenChange={(o) => !o && setSaleResult(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> {t('Order completed')}</DialogTitle>
                        <DialogDescription>
                            {t('Order number')}: <span className="font-semibold text-foreground">{saleResult?.order_number}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        {saleResult?.order_id && (
                            <Button
                                onClick={() => window.open(route('pos.receipt', saleResult.order_id), '_blank')}
                            >
                                {t('Receipt')}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => { barcodeRef.current?.focus(); setSaleResult(null); }}>{t('Continue')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}