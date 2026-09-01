import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Copy, Check, Store as StoreIcon, Rocket, Ban, Clock, XCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/components/custom-toast';

interface ReferredStore {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
  activated: boolean;
  plan_is_active: boolean;
}

interface PartnerDashboardProps {
  partner: {
    id: number;
    status: string;
    company_name: string;
    referral_code: string;
    referral_link: string | null;
    created_at: string | null;
  };
  referredStores: ReferredStore[];
  stats: {
    referredStores: number;
    activatedStores: number;
  };
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', variant: 'secondary', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected', variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
  suspended: { label: 'Suspended', variant: 'outline', icon: <Ban className="h-3.5 w-3.5" /> },
};

export default function PartnerDashboard({ partner, referredStores, stats }: PartnerDashboardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const meta = STATUS_META[partner.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;

  const copyReferralLink = async () => {
    if (partner.referral_link) {
      await navigator.clipboard.writeText(partner.referral_link);
      setCopied(true);
      toast.success(t('Referral link copied to clipboard'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PageTemplate
      title={t('Partner Dashboard')}
      description={t('Track the stores you referred to Wusool.')}
      url={route('partner.dashboard')}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{partner.company_name}</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{t('Status')}: {t(meta.label)}</p>
            </div>
            <Badge variant={meta.variant} className="gap-1">
              {StatusIcon}
              {t(meta.label)}
            </Badge>
          </CardHeader>
          <CardContent>
            {partner.status === 'approved' ? (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-[13px] font-medium text-muted-foreground">{t('Your referral link')}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded border bg-background px-3 py-2 text-[13px]" dir="ltr">
                    {partner.referral_link}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0 gap-2" onClick={copyReferralLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('Copied') : t('Copy')}
                  </Button>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {t('Share this link with merchants you onboard. When they sign up, the store they create is attributed to you.')}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {partner.status === 'pending' &&
                  t('Your application is under review. Once approved, your referral link will be activated here.')}
                {partner.status === 'suspended' &&
                  t('Your partner account is suspended. Referrals are currently not being recorded. Contact support for more information.')}
                {partner.status === 'rejected' &&
                  t('Your partner application was not approved. You can re-apply later if your circumstances change.')}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Referred Stores')}</CardTitle>
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.referredStores}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Activated Stores')}</CardTitle>
              <Rocket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activatedStores}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">{t('Referred Stores')}</CardTitle>
            {stats.referredStores > 0 && (
              <Badge variant="outline" className="gap-1">
                <LinkIcon className="h-3.5 w-3.5" />
                {stats.referredStores}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-6">
            {referredStores.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <StoreIcon className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t('No referred stores yet.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-start text-[12px] text-muted-foreground">
                      <th className="px-2 py-2 text-start font-medium sm:px-1">{t('Store')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('Signup date')}</th>
                      <th className="px-2 py-2 text-start font-medium">{t('Activation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredStores.map((store) => (
                      <tr key={store.id} className="border-b last:border-0">
                        <td className="px-2 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{store.name}</p>
                            <p className="truncate text-[12px] text-muted-foreground" dir="ltr">
                              {store.slug}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">
                          {store.created_at ? new Date(store.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-2 py-3">
                          {store.activated ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('Active')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {t('Pending')}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}