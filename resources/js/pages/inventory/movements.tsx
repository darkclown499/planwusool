import { PageTemplate } from '@/components/page-template';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { MOVEMENT_TYPES } from './movementTypes';

export default function InventoryMovements() {
    const { t } = useTranslation();
    const page = usePage().props as any;
    const movements: any[] = page.movements || [];
    const filters = page.filters || {};
    const pagination = page.pagination || { current_page: 1, last_page: 1, total: 0 };

    const typeInfo = (type: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } => {
        const meta = MOVEMENT_TYPES[type];
        if (!meta) return { label: type, variant: 'default' };
        return { label: t(meta.en), variant: meta.variant };
    };

    const fmtTime = (iso: string | null) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleString();
    };

    return (
        <PageTemplate
            title={t('Stock Movements')}
            description={t('Audit trail of all inventory changes')}
            url="/inventory/movements"
            breadcrumbs={[
                { title: t('Dashboard'), href: route('dashboard') },
                { title: t('Inventory'), href: route('inventory.index') },
                { title: t('Stock Movements') },
            ]}
        >
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30 text-start text-xs uppercase text-muted-foreground">
                                    <th className="px-4 py-3 text-start font-medium">{t('Date')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('Product')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('Movement Type')}</th>
                                    <th className="px-4 py-3 text-end font-medium">{t('Before')}</th>
                                    <th className="px-4 py-3 text-end font-medium">{t('Delta')}</th>
                                    <th className="px-4 py-3 text-end font-medium">{t('After')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('Reference')}</th>
                                    <th className="px-4 py-3 text-start font-medium">{t('Reason')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map((m) => {
                                    const info = typeInfo(m.type);
                                    return (
                                        <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                                            <td className="px-4 py-3 text-start text-muted-foreground whitespace-nowrap">{fmtTime(m.created_at)}</td>
                                            <td className="px-4 py-3 text-start font-medium">{m.product_name || '-'}</td>
                                            <td className="px-4 py-3 text-start"><Badge variant={info.variant}>{info.label}</Badge></td>
                                            <td className="px-4 py-3 text-end text-muted-foreground">{m.before ?? '-'}</td>
                                            <td className={`px-4 py-3 text-end font-semibold ${m.delta > 0 ? 'text-green-600' : m.delta < 0 ? 'text-destructive' : ''}`}>
                                                {m.delta > 0 ? `+${m.delta}` : m.delta}
                                            </td>
                                            <td className="px-4 py-3 text-end font-semibold">{m.after ?? '-'}</td>
                                            <td className="px-4 py-3 text-start text-muted-foreground">{m.reference_number || '-'}</td>
                                            <td className="px-4 py-3 text-start text-muted-foreground">{m.note || '-'}</td>
                                        </tr>
                                    );
                                })}
                                {movements.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                        {t('No movements recorded yet')}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {pagination.last_page > 1 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Button variant="outline" size="sm" disabled={pagination.current_page <= 1}
                        onClick={() => router.get(route('inventory.movements'), { ...filters, page: pagination.current_page - 1 }, { preserveState: true })}>
                        {t('Previous')}
                    </Button>
                    <span className="mx-2">{pagination.current_page} / {pagination.last_page}</span>
                    <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page}
                        onClick={() => router.get(route('inventory.movements'), { ...filters, page: pagination.current_page + 1 }, { preserveState: true })}>
                        {t('Next')}
                    </Button>
                </div>
            )}
        </PageTemplate>
    );
}