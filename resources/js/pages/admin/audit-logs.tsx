import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ACTION_OPTIONS = [
  { value: 'company.delete', label: 'company.delete' },
  { value: 'company.toggle_status', label: 'company.toggle_status' },
  { value: 'company.upgrade_plan', label: 'company.upgrade_plan' },
  { value: 'company.reset_password', label: 'company.reset_password' },
  { value: 'user.delete', label: 'user.delete' },
  { value: 'user.reset_password', label: 'user.reset_password' },
  { value: 'user.toggle_status', label: 'user.toggle_status' },
  { value: 'impersonation.start', label: 'impersonation.start' },
  { value: 'impersonation.stop', label: 'impersonation.stop' },
  { value: 'plan_order.approve', label: 'plan_order.approve' },
  { value: 'plan_order.reject', label: 'plan_order.reject' },
  { value: 'partner.approve', label: 'partner.approve' },
  { value: 'partner.reject', label: 'partner.reject' },
  { value: 'partner.suspend', label: 'partner.suspend' },
  { value: 'partner.reinstate', label: 'partner.reinstate' },
];

function actionVariant(action: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (action.includes('delete') || action.includes('stop')) return 'destructive';
  if (action.includes('impersonation')) return 'secondary';
  if (action.includes('reset_password') || action.includes('toggle_status') || action.includes('suspend') || action.includes('reject')) return 'outline';
  return 'default';
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { logs, filters: pageFilters = {} } = usePage().props as any;

  const [selectedAction, setSelectedAction] = useState(pageFilters.action || 'all');
  const [startDate, setStartDate] = useState(pageFilters.start_date || '');
  const [endDate, setEndDate] = useState(pageFilters.end_date || '');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = selectedAction !== 'all' || startDate !== '' || endDate !== '';

  const applyFilters = () => {
    const params: any = { page: 1 };

    if (selectedAction !== 'all') {
      params.action = selectedAction;
    }

    if (startDate) {
      params.start_date = startDate;
    }

    if (endDate) {
      params.end_date = endDate;
    }

    router.get(route('admin.audit-logs'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const clearFilters = () => {
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
    router.get(route('admin.audit-logs'), { page: 1 }, { preserveState: true, preserveScroll: true });
  };

  return (
    <PageTemplate
      title={t('Audit Log')}
      description={t('Durable trail of platform-critical superadmin actions. Read-only.')}
      url={route('admin.audit-logs')}
    >
      <div className="flex flex-col gap-4">
        <Card className="bg-white border border-gray-300 rounded-lg shadow">
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-[160px]">
                <Label className="mb-1 block text-xs">{t('Action')}</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('All actions')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All actions')}</SelectItem>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-[150px]">
                <Label className="mb-1 block text-xs">{t('From')}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label={t('From date')} />
              </div>

              <div className="w-full sm:w-[150px]">
                <Label className="mb-1 block text-xs">{t('To')}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label={t('To date')} />
              </div>

              <div className="flex items-end gap-2">
                <Button type="submit" size="sm">
                  <Search className="h-4 w-4 me-1.5" />
                  {t('Filter')}
                </Button>
                {hasActiveFilters && (
                  <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                    {t('Clear')}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </Card>

        <Card className="bg-white border border-gray-300 rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('Action')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('Actor')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('Target')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('Details')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('IP')}</th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600">{t('Date')}</th>
                </tr>
              </thead>
              <tbody>
                {logs?.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {t('No audit records found')}
                    </td>
                  </tr>
                )}
                {logs?.data?.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{log.actor?.name || '—'}</div>
                      {log.actor?.email && <div className="text-xs text-muted-foreground" dir="ltr">{log.actor.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-700">{log.target_type || '—'}</div>
                      {log.target_id && <div className="text-xs text-muted-foreground">#{log.target_id}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[280px] truncate text-xs text-gray-600">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground" dir="ltr">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {window.appSettings?.formatDateTime ? window.appSettings.formatDateTime(log.created_at, true) : new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs?.data?.length > 0 && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t('Showing')} <span className="font-medium">{logs?.from || 0}</span> {t('to')} <span className="font-medium">{logs?.to || 0}</span> {t('of')} <span className="font-medium">{logs?.total || 0}</span>
              </div>
              <div className="flex gap-1">
                {logs?.links?.map((link: any, i: number, arr: any[]) => {
                  const isFirst = i === 0 && link.url;
                  const isLast = i === arr.length - 1 && link.url;
                  const isTextLink = isFirst || isLast;
                  return (
                    <Button
                      key={i}
                      variant={link.active ? 'default' : 'outline'}
                      size={isTextLink ? 'sm' : 'icon'}
                      className={`${isTextLink ? 'px-3 gap-1' : 'h-8 w-8'} min-w-[32px]`}
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                    >
                      {isFirst ? (
                        <>
                          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                          <span className="hidden sm:inline">{t('Previous')}</span>
                        </>
                      ) : isLast ? (
                        <>
                          <span className="hidden sm:inline">{t('Next')}</span>
                          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                        </>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageTemplate>
  );
}