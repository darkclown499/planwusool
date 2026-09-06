import React, { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Search, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { router, usePage, Link } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { tReturnStatus, tReturnRefundStatus } from '@/utils/order-status';

const RETURN_STATUS_TABS = [
  { key: '', label: 'الكل' },
  { key: 'requested', label: 'جديد' },
  { key: 'approved', label: 'مقبول' },
  { key: 'rejected', label: 'مرفوض' },
  { key: 'in_transit', label: 'قيد الشحن' },
  { key: 'received', label: 'مستلم' },
  { key: 'completed', label: 'مكتمل' },
  { key: 'cancelled', label: 'ملغي' },
];

export default function ReturnsIndex() {
  const { returns, filters: initialFilters } = usePage().props as any;
  const list = returns?.data ?? [];
  const pagination = returns ? { current_page: returns.current_page, last_page: returns.last_page, total: returns.total, per_page: returns.per_page } : null;
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [activeStatus, setActiveStatus] = useState(initialFilters?.status || '');

  const applyFilter = useCallback((newStatus: string) => {
    setActiveStatus(newStatus);
    const params: Record<string, string> = {};
    if (newStatus) params.status = newStatus;
    if (search) params.search = search;
    router.get(route('returns.index'), params, { preserveState: true, replace: true });
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (activeStatus) params.status = activeStatus;
    if (search) params.search = search;
    router.get(route('returns.index'), params, { preserveState: true, replace: true });
  };

  const goToPage = (page: number) => {
    const params: Record<string, string> = { page: String(page) };
    if (activeStatus) params.status = activeStatus;
    if (search) params.search = search;
    router.get(route('returns.index'), params, { preserveState: true, replace: true });
  };

  const getStatusVariant = (status: string): string => {
    switch (status) {
      case 'completed': return 'default';
      case 'approved': case 'received': return 'secondary';
      case 'rejected': case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getReasonText = (reason: string | null | undefined): string => {
    if (!reason) return '';
    const reasons: Record<string, string> = {
      not_suitable: 'المنتج غير مناسب',
      wrong_size: 'المقاس غير مناسب',
      damaged: 'وصل المنتج تالفاً',
      different_description: 'المنتج مختلف عن الوصف',
      wrong_product: 'وصل منتج خاطئ',
      other: 'سبب آخر',
    };
    return reasons[reason] ?? reason;
  };

  const formatDateValue = (value?: string | null): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const customerName = (r: any): string => {
    const name = r.customer?.full_name || (r.customer?.first_name ? r.customer.first_name : '');
    return name || r.customer_email || '-';
  };

  return (
    <PageTemplate
      title="المرتجعات"
      url="/returns"
      breadcrumbs={[{ title: 'الطلبات', href: route('orders.index') }, { title: 'المرتجعات' }]}
    >
      <div className="space-y-4">
        {/* Page explanation */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4 text-sm text-muted-foreground">
            من هنا تتابع طلبات إرجاع المنتجات من العملاء، من وقت تقديم الطلب حتى استلام المنتج وإنهاء الإرجاع. يمكنك قبول طلب الإرجاع أو رفضه، ثم متابعة استلام المنتج وإعادة تخزينه أو تسجيل الاسترداد المالي.
          </CardContent>
        </Card>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الإرجاع أو رقم الطلب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 pe-9"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); applyFilter(activeStatus); }} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="default" className="shrink-0">
            <Search className="h-4 w-4 me-1" /> بحث
          </Button>
        </form>

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {RETURN_STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => applyFilter(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStatus === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {pagination && (
          <p className="text-xs text-muted-foreground ltr-num">{pagination.total} مرتجع</p>
        )}

        {/* Returns list */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 px-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <RotateCcw className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">لا توجد مرتجعات حالياً</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  ستظهر هنا طلبات الإرجاع عند إنشائها.
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  عندما يقدّم أحد العملاء طلب إرجاع، سيظهر هنا لتتمكن من مراجعته ومتابعته حتى استلام المنتج وإنهاء الإرجاع.
                </p>
              </CardContent>
            </Card>
          ) : (
            list.map((r: any) => (
              <div
                key={r.id}
                className="border rounded-xl p-3 sm:p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => router.visit(route('returns.show', r.id))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm ltr-num">{r.return_number}</h3>
                      <Badge variant={getStatusVariant(r.status) as any} className="text-[10px]">
                        {tReturnStatus(r.status)}
                      </Badge>
                      {r.refund_status && String(r.refund_status) !== 'none' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          String(r.refund_status).toLowerCase() === 'refunded' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {tReturnRefundStatus(r.refund_status)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-muted-foreground">الطلب الأصلي:</span>
                      <Link
                        href={route('orders.show', r.order_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-primary hover:underline ltr-num"
                      >
                        {r.order?.order_number || `#${r.order_id}`}
                      </Link>
                      <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-slate-300" />
                      <span className="text-muted-foreground">العميل:</span>
                      <span className="font-medium">{customerName(r)}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs">
                      {r.refund_amount > 0 && (
                        <span className="font-bold">{formatCurrency(r.refund_amount)}</span>
                      )}
                      {r.items?.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{r.items.length} منتج</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateValue(r.requested_at || r.created_at)}
                      </span>
                      {getReasonText(r.reason) && (
                        <span className="text-[10px] text-muted-foreground">سبب الإرجاع: {getReasonText(r.reason)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1"
                    onClick={(e) => { e.stopPropagation(); router.visit(route('returns.show', r.id)); }}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden xl:inline">عرض التفاصيل</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground ltr-num">صفحة {pagination.current_page} من {pagination.last_page}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={pagination.current_page <= 1} onClick={() => goToPage(pagination.current_page - 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page} onClick={() => goToPage(pagination.current_page + 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
