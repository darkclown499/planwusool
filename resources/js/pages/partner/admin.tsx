import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { CheckCircle2, XCircle, Ban, RotateCcw, Store as StoreIcon, Clock, Users } from 'lucide-react';

interface AdminPartner {
  id: number;
  status: string;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  social: string | null;
  business_type: string | null;
  referral_code: string;
  referral_link: string | null;
  created_at: string | null;
  notes: string | null;
  stores_count: number;
  user: { id: number; name: string; email: string } | null;
}

interface AdminPartnersResponse {
  data: AdminPartner[];
  links?: any[];
  last_page?: number;
  total: number;
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  suspended: { label: 'Suspended', variant: 'outline' },
};

export default function PartnerAdmin({ partners }: { partners: AdminPartnersResponse }) {
  const { t } = useTranslation();
  const [noteTarget, setNoteTarget] = useState<AdminPartner | null>(null);
  const [action, setAction] = useState<'reject' | 'suspend' | null>(null);
  const { data, setData, post, processing, errors } = useForm({ notes: '' });

  const runAction = (p: AdminPartner, actionName: string) => {
    const routes: Record<string, string> = {
      approve: 'partner.approve',
      reject: 'partner.reject',
      suspend: 'partner.suspend',
      reinstate: 'partner.reinstate',
    };
    const routeName = routes[actionName];
    if (!routeName) return;

    if (actionName === 'reject' || actionName === 'suspend') {
      setNoteTarget(p);
      setAction(actionName);
      return;
    }
    post(route(routeName, p.id));
  };

  const submitWithNote = () => {
    if (!noteTarget || !action) return;
    post(route(action === 'reject' ? 'partner.reject' : 'partner.suspend', noteTarget.id), {
      onSuccess: () => {
        setNoteTarget(null);
        setAction(null);
        setData('notes', '');
      },
    });
  };

  return (
    <PageTemplate
      title={t('Partners')}
      description={t('Review and manage partner / agency applications.')}
      url={route('partner.admin')}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('Total partners')}</p>
                <p className="text-2xl font-bold">{partners.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[12px] text-muted-foreground">
                    <th className="px-4 py-3 text-start font-medium">{t('Partner')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('Contact')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('Business type')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('Status')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('Referred stores')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('Created')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.data.map((p) => {
                    const meta = STATUS_META[p.status] ?? STATUS_META.pending;
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.company_name}</p>
                          <p className="text-[12px] text-muted-foreground">@{p.referral_code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="whitespace-nowrap">{p.contact_person || '-'}</p>
                          <p className="whitespace-nowrap text-[12px] text-muted-foreground" dir="ltr">{p.email}</p>
                          {p.phone && <p className="text-[12px] text-muted-foreground" dir="ltr">{p.phone}</p>}
                        </td>
                        <td className="px-4 py-3">{p.business_type || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={meta.variant}>{t(meta.label)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <StoreIcon className="h-4 w-4 text-muted-foreground" />
                            {p.stores_count}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'pending' && (
                              <>
                                <Button size="sm" className="h-8 gap-1" onClick={() => runAction(p, 'approve')}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t('Approve')}
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => runAction(p, 'reject')}>
                                  <XCircle className="h-3.5 w-3.5" />
                                  {t('Reject')}
                                </Button>
                              </>
                            )}
                            {p.status === 'approved' && (
                              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => runAction(p, 'suspend')}>
                                <Ban className="h-3.5 w-3.5" />
                                {t('Suspend')}
                              </Button>
                            )}
                            {p.status === 'suspended' && (
                              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => runAction(p, 'reinstate')}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                {t('Reinstate')}
                              </Button>
                            )}
                            {p.status === 'rejected' && (
                              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => runAction(p, 'approve')}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t('Approve')}
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
          </CardContent>
        </Card>

        {partners.last_page && partners.last_page > 1 && (
          <Pagination>
            <PaginationContent>
              {(partners.links ?? []).map((link: any, index: number) => {
                if (!link.url) {
                  return (
                    <PaginationItem key={index}>
                      <span className="px-3 py-1.5 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: link.label }} />
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={index}>
                    <PaginationLink isActive={link.active} href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                  </PaginationItem>
                );
              })}
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {noteTarget && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg">
            <h3 className="text-base font-semibold">
              {action === 'reject' ? t('Reject application') : t('Suspend partner')}
              {noteTarget.company_name && <> — {noteTarget.company_name}</>}
            </h3>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="admin-note">{t('Note (internal)')}</Label>
              <Input
                id="admin-note"
                value={data.notes}
                onChange={(e) => setData('notes', e.target.value)}
                placeholder={t('Optional reason visible to support only')}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setNoteTarget(null); setAction(null); setData('notes', ''); }}>
                {t('Cancel')}
              </Button>
              <Button size="sm" disabled={processing} onClick={submitWithNote}>
                {action === 'reject' ? t('Reject') : t('Suspend')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}