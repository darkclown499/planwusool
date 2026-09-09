import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/utils/permissions';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { router, usePage } from '@inertiajs/react';
import { format, subDays } from 'date-fns';
import {
    CalendarRange,
    CheckCircle,
    ChevronDown,
    DollarSign,
    Download,
    Loader2,
    MessageCircle,
    Search,
    Send,
    ShoppingBag,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    new: { label: 'جديدة', variant: 'default' },
    draft: { label: 'مسودة', variant: 'secondary' },
    abandoned: { label: 'متروكة', variant: 'destructive' },
    reminder_sent: { label: 'تم إرسال تذكير', variant: 'outline' },
    recovered: { label: 'مستردة', variant: 'default' },
    expired: { label: 'منتهية', variant: 'destructive' },
    unsubscribed: { label: 'إلغاء الاشتراك', variant: 'destructive' },
};

type PresetKey = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function DateRangePicker({
    preset,
    from,
    to,
    indexRoute,
    search,
    status,
}: {
    preset: string;
    from?: string | null;
    to?: string | null;
    indexRoute: string;
    search: string;
    status: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<PresetKey>((preset as PresetKey) || 'last_30_days');
    const [customFrom, setCustomFrom] = useState<string>(from || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [customTo, setCustomTo] = useState<string>(to || todayStr());

    useEffect(() => {
        if (preset) setSelected(preset as PresetKey);
        if (from) setCustomFrom(from);
        if (to) setCustomTo(to);
    }, [preset, from, to]);

    const applyRange = (presetKey: string, f?: Date, tDate?: Date) => {
        const params: Record<string, string> = { preset: presetKey };
        if (presetKey === 'custom' && f && tDate) {
            params.from = format(f, 'yyyy-MM-dd');
            params.to = format(tDate, 'yyyy-MM-dd');
            setSelected('custom');
        }
        if (search.trim()) params.search = search.trim();
        if (status && status !== 'all') params.status = status;
        setOpen(false);
        router.get(indexRoute, params, { preserveScroll: true });
    };

    const presets: { key: PresetKey; label: string }[] = [
        { key: 'today', label: t('Today') },
        { key: 'yesterday', label: t('Yesterday') },
        { key: 'last_7_days', label: t('Last 7 Days') },
        { key: 'last_30_days', label: t('Last 30 Days') },
        { key: 'this_month', label: t('This Month') },
        { key: 'last_month', label: t('Last Month') },
        { key: 'custom', label: t('Custom Range') },
    ];

    const summary = selected === 'custom' && from && to ? `${from} → ${to}` : presets.find((p) => p.key === selected)?.label || t('Date Range');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 justify-start gap-2">
                    <CalendarRange className="text-muted-foreground h-4 w-4" />
                    <span className="max-w-40 truncate font-normal">{summary}</span>
                    <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
                <div className="grid grid-cols-2 gap-1.5">
                    {presets.map((p) => {
                        const active = p.key === selected && (p.key !== 'custom' || !!(from && to));
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() =>
                                    p.key === 'custom'
                                        ? setSelected('custom')
                                        : applyRange(
                                              p.key,
                                              p.key === 'today' ? new Date() : p.key === 'yesterday' ? subDays(new Date(), 1) : undefined,
                                              undefined,
                                          )
                                }
                                className={cn(
                                    'rounded-lg px-3 py-2 text-xs font-medium transition',
                                    active ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted',
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
                {selected === 'custom' && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-muted-foreground mb-1 block text-xs">{t('From date')}</label>
                                <Input
                                    type="date"
                                    dir="ltr"
                                    value={customFrom}
                                    max={customTo || undefined}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-muted-foreground mb-1 block text-xs">{t('To date')}</label>
                                <Input
                                    type="date"
                                    dir="ltr"
                                    value={customTo}
                                    min={customFrom || undefined}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                if (!customFrom || !customTo) return;
                                applyRange('custom', new Date(customFrom), new Date(customTo));
                            }}
                        >
                            {t('Apply')}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

export default function AbandonedCarts() {
    const { t } = useTranslation();
    const {
        carts = { data: [] },
        stats = {
            total: 0,
            new: 0,
            draft: 0,
            abandoned: 0,
            reminder_sent: 0,
            recovered: 0,
            expired: 0,
            pending: 0,
            recovered_amount: 0,
            total_abandoned_amount: 0,
            recovery_rate: 0,
        },
        filters = {},
        currency_symbol,
        activeStoreId,
        errors = {},
        preset,
        from,
        to,
    } = usePage().props as any;
    const [cartToDelete, setCartToDelete] = useState<number | null>(null);
    const [cartToRecover, setCartToRecover] = useState<number | null>(null);
    const [waCart, setWaCart] = useState<any>(null);
    const [waMessage, setWaMessage] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [loadingActions, setLoadingActions] = useState<Record<number, string>>({});
    const didMount = useRef(false);
    const periodRef = useRef({ preset, from, to });

    useEffect(() => {
        periodRef.current = { preset, from, to };
    }, [preset, from, to]);

    const hasActiveFilters = !!(
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        (filters.preset && filters.preset !== 'last_30_days') ||
        filters.from ||
        filters.to
    );

    const currencySymbol: string = typeof currency_symbol === 'string' && currency_symbol ? currency_symbol : '₪';

    useEffect(() => {
        if (errors?.error) {
            toast.error(errors.error);
        }
    }, [errors]);

    const formatCurrency = (amount: number) => {
        const value = (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${currencySymbol} ${value}`;
    };

    const getStatusBadge = (status: string) => {
        const info = STATUS_MAP[status] || { label: status, variant: 'default' as const };
        return { variant: info.variant, label: info.label };
    };

    const getIndexRoute = () => {
        try {
            if (activeStoreId && route().has('stores.abandoned-carts.index')) {
                return route('stores.abandoned-carts.index', activeStoreId);
            }
        } catch {}
        return route('abandoned-carts.index');
    };

    const setLoading = useCallback((cartId: number, action: string) => {
        setLoadingActions((prev) => ({ ...prev, [cartId]: action }));
    }, []);

    const clearLoading = useCallback((cartId: number) => {
        setLoadingActions((prev) => {
            const next = { ...prev };
            delete next[cartId];
            return next;
        });
    }, []);

    const handleSendReminder = (cartId: number) => {
        setLoading(cartId, 'reminder');
        try {
            if (activeStoreId && route().has('stores.abandoned-carts.send-reminder')) {
                router.post(
                    route('stores.abandoned-carts.send-reminder', [activeStoreId, cartId]),
                    {},
                    {
                        preserveScroll: true,
                        onFinish: () => clearLoading(cartId),
                        onSuccess: () => toast.success('تم إرسال التذكير بنجاح'),
                        onError: (errs) => toast.error(errs?.error || 'حدث خطأ أثناء إرسال التذكير'),
                    },
                );
                return;
            }
        } catch {}
        router.post(
            route('abandoned-carts.send-reminder', cartId),
            {},
            {
                preserveScroll: true,
                onFinish: () => clearLoading(cartId),
                onSuccess: () => toast.success('تم إرسال التذكير بنجاح'),
                onError: (errs) => toast.error(errs?.error || 'حدث خطأ أثناء إرسال التذكير'),
            },
        );
    };

    const confirmMarkRecovered = (cartId: number) => {
        setCartToRecover(cartId);
    };

    const handleMarkRecovered = () => {
        if (!cartToRecover) return;
        const cartId = cartToRecover;
        setLoading(cartId, 'recover');
        setCartToRecover(null);
        try {
            if (activeStoreId && route().has('stores.abandoned-carts.mark-recovered')) {
                router.post(
                    route('stores.abandoned-carts.mark-recovered', [activeStoreId, cartId]),
                    {},
                    {
                        preserveScroll: true,
                        onFinish: () => clearLoading(cartId),
                        onSuccess: () => toast.success('تم تحديد السلة كمستردة'),
                        onError: (errs) => toast.error(errs?.error || 'حدث خطأ أثناء التحديد'),
                    },
                );
                return;
            }
        } catch {}
        router.post(
            route('abandoned-carts.mark-recovered', cartId),
            {},
            {
                preserveScroll: true,
                onFinish: () => clearLoading(cartId),
                onSuccess: () => toast.success('تم تحديد السلة كمستردة'),
                onError: (errs) => toast.error(errs?.error || 'حدث خطأ أثناء التحديد'),
            },
        );
    };

    const buildListParams = () => {
        const params: Record<string, string | undefined> = {
            search: search.trim() || undefined,
            status: status === 'all' ? undefined : status,
        };
        const { preset: p, from: f, to: t } = periodRef.current;
        if (p) params.preset = p;
        if (p === 'custom') {
            if (f) params.from = f;
            if (t) params.to = t;
        }
        return params;
    };

    const handleExport = () => {
        const query: Record<string, string> = {};
        if (preset) query.preset = preset;
        if (preset === 'custom') {
            if (from) query.from = from;
            if (to) query.to = to;
        }
        try {
            if (activeStoreId && route().has('stores.abandoned-carts.export')) {
                window.open(route('stores.abandoned-carts.export', { store: activeStoreId, ...query }), '_blank');
                return;
            }
        } catch {}
        window.open(route('abandoned-carts.export', query), '_blank');
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        router.get(getIndexRoute(), {}, { preserveState: true, replace: true, preserveScroll: true });
    };

    const openWhatsAppAutomation = () => {
        try {
            if (activeStoreId && route().has('stores.notifications.whatsapp')) {
                router.visit(route('stores.notifications.whatsapp', activeStoreId));
            }
        } catch {}
    };

    const handleDelete = () => {
        if (!cartToDelete) return;
        const cartId = cartToDelete;
        setLoading(cartId, 'delete');
        setCartToDelete(null);
        try {
            if (activeStoreId && route().has('stores.abandoned-carts.destroy')) {
                router.delete(route('stores.abandoned-carts.destroy', [activeStoreId, cartId]), {
                    onFinish: () => clearLoading(cartId),
                    onSuccess: () => toast.success('تم حذف السلة بنجاح'),
                    onError: () => toast.error('حدث خطأ أثناء حذف السلة'),
                });
                return;
            }
        } catch {}
        router.delete(route('abandoned-carts.destroy', cartId), {
            onFinish: () => clearLoading(cartId),
            onSuccess: () => toast.success('تم حذف السلة بنجاح'),
            onError: () => toast.error('حدث خطأ أثناء حذف السلة'),
        });
    };

    useEffect(() => {
        if (!didMount.current) {
            return;
        }
        const debounce = setTimeout(() => {
            router.get(getIndexRoute(), buildListParams(), { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(debounce);
    }, [search]);

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }
        router.get(getIndexRoute(), buildListParams(), { preserveState: true, replace: true, preserveScroll: true });
    }, [status]);

    const pageUrl = activeStoreId ? `/stores/${activeStoreId}/abandoned-carts` : '/abandoned-carts';
    const pendingCount = (stats.new || 0) + (stats.draft || 0) + (stats.abandoned || 0) + (stats.reminder_sent || 0);

    return (
        <PageTemplate
            title={t('Abandoned Cart Recovery')}
            description={t('Track and recover abandoned shopping carts')}
            url={pageUrl}
            breadcrumbs={[{ title: t('Dashboard'), href: route('dashboard') }, { title: t('Abandoned Carts') }]}
        >
            <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-start justify-between gap-4 pt-6">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">{t('Total Carts')}</p>
                                <div className="text-foreground mt-2 text-2xl font-bold">{stats.total || 0}</div>
                            </div>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex flex-col gap-4 pt-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">{t('Recovered')}</p>
                                    <div className="mt-2 text-2xl font-bold text-green-600">{stats.recovered || 0}</div>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-green-600">{stats.recovery_rate || 0}%</span>
                                <span className="text-muted-foreground text-xs font-medium">{t('recovery rate')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex flex-col gap-4 pt-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">{t('Pending Recovery')}</p>
                                    <div className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</div>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                    <ShoppingCart className="h-6 w-6" />
                                </div>
                            </div>
                            <p className="text-muted-foreground text-xs font-medium">
                                {stats.new || 0} {t('new')}, {stats.reminder_sent || 0} {t('reminder sent')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex flex-col gap-4 pt-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">{t('Recovered Revenue')}</p>
                                    <div className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(stats.recovered_amount || 0)}</div>
                                </div>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                            </div>
                            <p className="text-muted-foreground text-xs font-medium">
                                {formatCurrency(stats.total_abandoned_amount || 0)} {t('in abandoned carts')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search by customer name or phone...')}
                                className="ps-9"
                                aria-label={t('Search by customer name or phone...')}
                            />
                        </div>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full sm:w-52">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                <SelectItem value="new">{t('New')}</SelectItem>
                                <SelectItem value="draft">{t('Draft')}</SelectItem>
                                <SelectItem value="abandoned">{t('Abandoned')}</SelectItem>
                                <SelectItem value="reminder_sent">{t('Reminder Sent')}</SelectItem>
                                <SelectItem value="recovered">{t('Recovered')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <DateRangePicker
                            preset={preset || 'last_30_days'}
                            from={from}
                            to={to}
                            indexRoute={getIndexRoute()}
                            search={search}
                            status={status}
                        />
                    </div>
                    {hasPermission('export-abandoned-carts') && (
                        <Button type="button" variant="outline" onClick={handleExport} className="shrink-0">
                            <Download className="me-2 h-4 w-4" />
                            {t('Export Data')}
                        </Button>
                    )}
                </div>

                {/* Carts List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{t('Abandoned Carts')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {carts.data.length === 0 ? (
                                hasActiveFilters ? (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                                        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                                            <Search className="text-muted-foreground h-8 w-8" />
                                        </div>
                                        <h3 className="mt-4 text-base font-semibold">لا توجد سلال متروكة تطابق البحث أو الفلاتر الحالية</h3>
                                        <p className="text-muted-foreground mt-2 max-w-md text-sm">
                                            جرّب تعديل البحث أو اختيار حالة أخرى لعرض النتائج.
                                        </p>
                                        <Button type="button" variant="outline" className="mt-6" onClick={clearFilters}>
                                            <Search className="me-2 h-4 w-4" />
                                            مسح الفلاتر
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                                        <div className="relative">
                                            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                                                <ShoppingBag className="text-muted-foreground h-8 w-8" />
                                            </div>
                                            <span className="bg-primary text-primary-foreground absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full">
                                                <span className="text-[10px] font-bold">!</span>
                                            </span>
                                        </div>
                                        <h3 className="mt-4 text-base font-semibold">{t('No abandoned carts yet')}</h3>
                                        <p className="text-muted-foreground mt-2 max-w-md text-sm">
                                            {t(
                                                'Abandoned carts will appear here when customers leave without completing checkout, so you can remind them and win them back.',
                                            )}
                                        </p>
                                        {activeStoreId && (
                                            <Button type="button" className="mt-6" onClick={openWhatsAppAutomation}>
                                                <MessageCircle className="me-2 h-4 w-4" />
                                                {t('Set up WhatsApp reminder automation')}
                                            </Button>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="relative overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-start font-medium">{t('Customer')}</th>
                                                <th className="px-4 py-3 text-start font-medium">{t('Contact')}</th>
                                                <th className="px-4 py-3 text-end font-medium">{t('Cart Total')}</th>
                                                <th className="px-4 py-3 text-start font-medium">{t('Items')}</th>
                                                <th className="px-4 py-3 text-start font-medium">{t('Status')}</th>
                                                <th className="px-4 py-3 text-start font-medium">{t('Last Activity')}</th>
                                                <th className="px-4 py-3 text-start font-medium">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carts.data.map((cart: any) => {
                                                const badge = getStatusBadge(cart.status);
                                                const items = Array.isArray(cart.cart_items) ? cart.cart_items : [];
                                                const hasEmailOrPhone = cart.customer_email || cart.customer_phone;
                                                const isLoading = !!loadingActions[cart.id];
                                                const loadingAction = loadingActions[cart.id];

                                                return (
                                                    <tr key={cart.id} className="hover:bg-muted/50 border-b">
                                                        <td className="px-4 py-3 font-medium">
                                                            {cart.customer_name || cart.customer_id ? `#${cart.customer_id}` : t('Guest')}
                                                        </td>
                                                        <td className="text-muted-foreground px-4 py-3">
                                                            {cart.customer_email && <div>{cart.customer_email}</div>}
                                                            {cart.customer_phone && <div>{cart.customer_phone}</div>}
                                                            {!cart.customer_email && !cart.customer_phone && <span className="text-xs">-</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-end font-semibold">{formatCurrency(cart.cart_total)}</td>
                                                        <td className="px-4 py-3">
                                                            {items.length} {t('items')}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant={badge.variant}>{badge.label}</Badge>
                                                        </td>
                                                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                                                            {cart.last_activity_at ? new Date(cart.last_activity_at).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center space-x-1">
                                                                {hasPermission('send-abandoned-cart-reminders') &&
                                                                    cart.status !== 'recovered' &&
                                                                    cart.status !== 'expired' &&
                                                                    hasEmailOrPhone && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            disabled={isLoading}
                                                                            onClick={() => handleSendReminder(cart.id)}
                                                                            title={t('Send reminder')}
                                                                        >
                                                                            {loadingAction === 'reminder' ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                                            ) : (
                                                                                <Send className="h-4 w-4 text-blue-600" />
                                                                            )}
                                                                        </Button>
                                                                    )}
                                                                {cart.status !== 'recovered' && cart.status !== 'expired' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={isLoading}
                                                                        onClick={() => confirmMarkRecovered(cart.id)}
                                                                        title={t('Mark as recovered')}
                                                                    >
                                                                        {loadingAction === 'recover' ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                                                        ) : (
                                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                {cart.whatsapp_action && cart.status !== 'recovered' && cart.status !== 'expired' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setWaCart(cart.whatsapp_action);
                                                                            setWaMessage(cart.whatsapp_action.message || '');
                                                                        }}
                                                                        title={t('Send via WhatsApp')}
                                                                    >
                                                                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                                    </Button>
                                                                )}
                                                                {hasPermission('delete-abandoned-carts') && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={isLoading}
                                                                        onClick={() => setCartToDelete(cart.id)}
                                                                        title={t('Delete cart')}
                                                                    >
                                                                        {loadingAction === 'delete' ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                                                        ) : (
                                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Dialog */}
            <Dialog open={!!cartToDelete} onOpenChange={(open) => !open && setCartToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Delete Cart')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete this abandoned cart record? This action cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCartToDelete(null)}>
                            {t('Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark Recovered Confirmation Dialog */}
            <Dialog open={!!cartToRecover} onOpenChange={(open) => !open && setCartToRecover(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Mark as Recovered')}</DialogTitle>
                        <DialogDescription>{t('Are you sure you want to mark this cart as recovered?')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCartToRecover(null)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleMarkRecovered}>{t('Confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* WhatsApp compose — deep link only, never auto-sends */}
            <Dialog open={!!waCart} onOpenChange={(open) => !open && setWaCart(null)}>
                <DialogContent dir="rtl" className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-emerald-600" /> {t('Send via WhatsApp')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Opens a WhatsApp chat with a ready-to-edit recovery message — nothing is sent automatically.')}
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea dir="rtl" value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows={6} placeholder="نص الرسالة..." />
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="outline" onClick={() => setWaCart(null)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            disabled={!waMessage?.trim()}
                            onClick={() => {
                                const url = createWhatsAppUrl(String(waCart?.phone ?? ''), waMessage);
                                window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            <MessageCircle className="h-4 w-4" /> {t('Open WhatsApp')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
