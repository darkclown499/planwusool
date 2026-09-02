import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Copy, Check, Store as StoreIcon, Rocket, Ban, Clock, XCircle, CheckCircle2, Link as LinkIcon, Share2 } from 'lucide-react';
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

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
> = {
  pending: { label: 'قيد المراجعة', variant: 'secondary', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'شريك معتمد', variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: 'لم تتم الموافقة', variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
  suspended: { label: 'متوقف', variant: 'outline', icon: <Ban className="h-3.5 w-3.5" /> },
};

export default function PartnerDashboard({ partner, referredStores, stats }: PartnerDashboardProps) {
  const [copied, setCopied] = useState(false);

  const meta = STATUS_META[partner.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;

  const copyReferralLink = async () => {
    if (partner.referral_link) {
      await navigator.clipboard.writeText(partner.referral_link);
      setCopied(true);
      toast.success('تم نسخ رابط الإحالة');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PageTemplate
      title="لوحة الشريك"
      description="تابع المتاجر التي أحلتها إلى وصول."
      url={route('partner.dashboard')}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{partner.company_name}</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">الحالة: {meta.label}</p>
            </div>
            <Badge variant={meta.variant} className="gap-1">
              {StatusIcon}
              {meta.label}
            </Badge>
          </CardHeader>
          <CardContent>
            {partner.status === 'approved' ? (
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <p className="text-[13px] font-medium">رابط الإحالة الخاص بك</p>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded border bg-background px-3 py-2 text-[13px]" dir="ltr">
                    {partner.referral_link}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0 gap-2" onClick={copyReferralLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'تم النسخ' : 'نسخ'}
                  </Button>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  شارك هذا الرابط مع التجار. عند تسجيلهم من خلاله، تُربط المتاجر التي ينشئونها بحسابك وستظهر لك هنا.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  {partner.status === 'pending' &&
                    'طلبك قيد المراجعة. بعد موافقة فريق وصول، سيظهر هنا رابط الإحالة الخاص بك وتبدأ بمتابعة المتاجر المرتبطة.'}
                  {partner.status === 'suspended' &&
                    'حسابك كشريك متوقف حاليًا ولا يتم تسجيل إحالات جديدة. تواصل مع الدعم لمزيد من المعلومات.'}
                  {partner.status === 'rejected' &&
                    'لم تتم الموافقة على طلب الشراكة. تواصل مع الدعم لمزيد من المعلومات.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المتاجر المرتبطة</CardTitle>
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.referredStores}</div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">عدد المتاجر التي سجّلت عبر رابط الإحالة</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المتاجر المفعّلة</CardTitle>
              <Rocket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activatedStores}</div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">عدد المتاجر المرتبطة التي أكمل التجار تفعيلها</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">المتاجر المرتبطة</CardTitle>
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
                <p className="text-sm text-muted-foreground">لا توجد متاجر مرتبطة بعد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-start text-[12px] text-muted-foreground">
                      <th className="px-2 py-2 text-start font-medium sm:px-1">المتجر</th>
                      <th className="px-2 py-2 text-start font-medium">تاريخ التسجيل</th>
                      <th className="px-2 py-2 text-start font-medium">التفعيل</th>
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
                              مفعّل
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              قيد التفعيل
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
