import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useForm, usePage, router } from '@inertiajs/react';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Link as LinkIcon,
  ExternalLink,
  Store as StoreIcon,
  Sparkles,
  Share2,
  LayoutDashboard,
} from 'lucide-react';

interface PartnerApplyProps {
  partner: {
    id: number;
    status: string;
    company_name: string;
    referral_link: string | null;
    created_at: string | null;
  } | null;
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

const BENEFITS = [
  {
    icon: <LayoutDashboard className="h-4 w-4 text-primary" />,
    title: 'لوحة خاصة بالشريك',
    description: 'تقودك إلى لوحة الشريك لمتابعة حالة حسابك وإحالاتك.',
  },
  {
    icon: <Share2 className="h-4 w-4 text-primary" />,
    title: 'رابط إحالة خاص',
    description: 'رابط تسجيل تشاركه مع التجار الذين تخدمهم.',
  },
  {
    icon: <StoreIcon className="h-4 w-4 text-primary" />,
    title: 'متابعة المتاجر المرتبطة',
    description: 'يعرض لك المتاجر التي سجّلت عبر رابط الإحالة الخاص بك.',
  },
  {
    icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
    title: 'تتبّع حالة التفعيل',
    description: 'تعرف المتاجر التي فعّلها التجار وأيها ما زال قيد التفعيل.',
  },
];

export default function PartnerApply({ partner }: PartnerApplyProps) {
  const { t } = useTranslation();
  const { props } = usePage();
  const { auth } = props as any;

  const defaultEmail = auth?.user?.email ?? '';

  const { data, setData, post, processing, errors } = useForm({
    company_name: '',
    contact_person: auth?.user?.name ?? '',
    email: defaultEmail,
    phone: '',
    website: '',
    social: '',
    business_type: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('partner.apply.store'));
  };

  if (partner) {
    const meta = STATUS_META[partner.status] ?? STATUS_META.pending;
    const StatusIcon = meta.icon;

    return (
      <PageTemplate
        title={t('Partner Program')}
        description={t('Your Wusool partner application')}
        url={route('partner.apply')}
      >
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t('Application Status')}</CardTitle>
              <Badge variant={meta.variant} className="gap-1">
                {StatusIcon}
                {t(meta.label)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] text-muted-foreground">{t('Company name')}</p>
                  <p className="text-sm font-medium">{partner.company_name}</p>
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground">{t('Submitted')}</p>
                  <p className="text-sm font-medium">{partner.created_at ? new Date(partner.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              {partner.status === 'pending' && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">طلبك قيد المراجعة</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    تم استلام طلبك وهو قيد المراجعة من قبل فريق وصول. سنُعلمك بنتيجة المراجعة عبر حسابك.
                  </p>
                </div>
              )}

              {partner.status === 'approved' && (
                <>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium">تم قبولك كشريك</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      حسابك كشريك جاهز. يمكنك فتح لوحة الشريك لعرض رابط الإحالة الخاص بك والمتاجر المرتبطة.
                    </p>
                    <Button size="sm" className="mt-3 gap-2" onClick={() => router.visit(route('partner.dashboard'))}>
                      <LayoutDashboard className="h-4 w-4" />
                      فتح لوحة الشريك
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-[13px] font-medium text-muted-foreground">{t('Your referral link')}</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <code className="flex-1 truncate rounded border bg-background px-3 py-2 text-[13px]" dir="ltr">
                        {partner.referral_link}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-2"
                        onClick={() => router.visit(route('partner.dashboard'))}
                      >
                        <LinkIcon className="h-4 w-4" />
                        {t('Open dashboard')}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {partner.status === 'rejected' && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">لم تتم الموافقة على طلب الشراكة</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    لم تتم الموافقة على طلبك في الوقت الحالي. يمكنك التواصل مع الدعم للمزيد من المعلومات.
                  </p>
                </div>
              )}

              {partner.status === 'suspended' && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">حساب الشريك متوقف</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    حسابك كشريك متوقف حاليًا ولا يتم تسجيل إحالات جديدة. تواصل مع الدعم لمزيد من المعلومات.
                  </p>
                </div>
              )}

              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="mailto:support@wusool.ps">
                  <ExternalLink className="h-4 w-4" />
                  {t('Contact support')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="كن شريكًا مع وصول"
      description="إذا كنت تقدم خدمات للتجار، يمكنك التقديم للانضمام إلى برنامج شركاء وصول."
      url={route('partner.apply')}
    >
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">ما هو برنامج شركاء وصول؟</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                برنامج الشركاء مخصص للوكالات ومقدمي الخدمات الذين يعملون مع التجار ويرغبون بالتعاون مع وصول.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-[13px] text-muted-foreground">
            <p>
              برنامج الشركاء موجه لمن يخدمون التجار، مثل وكالات التسويق وشركات البرمجيات ومقدمي خدمات الأعمال. كشريك،
              تحصل على رابط إحالة تشاركه مع التجار لتسجيل متاجرهم، وتتابع المتاجر المرتبطة بحسابك في لوحة الشريك.
            </p>

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">كيف يعمل البرنامج؟</p>
              <ol className="space-y-2">
                <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span> أرسل طلب الانضمام من النموذج أدناه.</li>
                <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span> يراجع فريق وصول طلبك.</li>
                <li className="flex gap-2"><span className="font-semibold text-foreground">3.</span> بعد الموافقة تصبح شريكًا وتظهر لك لوحة الشريك.</li>
                <li className="flex gap-2"><span className="font-semibold text-foreground">4.</span> تشارك رابط الإحالة مع التجار وتتابع المتاجر المرتبطة بك في لوحة الشريك.</li>
              </ol>
            </div>

            <p>
              حساب التجار العادي في وصول يُستخدم لإدارة متجرك الخاص. حساب الشريك مُخصص للمشاركة في برنامج شركاء
              وصول والمزايا المذكورة أعلاه، ولست بحاجة لأن تصبح شريكًا لتشغيل متجرك.
            </p>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">مزايا حساب الشريك</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BENEFITS.map((b) => (
                  <div key={b.title} className="flex gap-3 rounded-lg border p-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{b.title}</p>
                      <p className="mt-0.5 text-[12px]">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">تقديم طلب الانضمام</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                أخبرنا عن نشاطك أو شركتك. سيراجع فريق وصول طلبك.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">اسم الشركة / النشاط *</Label>
                  <Input
                    id="company_name"
                    value={data.company_name}
                    onChange={(e) => setData('company_name', e.target.value)}
                    placeholder="مثال: وكالة تسويق"
                  />
                  {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="business_type">نوع النشاط *</Label>
                  <Input
                    id="business_type"
                    value={data.business_type}
                    onChange={(e) => setData('business_type', e.target.value)}
                    placeholder="مثال: وكالة تسويق"
                  />
                  <p className="text-[11px] text-muted-foreground">مثال: وكالة تسويق، شركة برمجيات، تصميم، خدمات أعمال</p>
                  {errors.business_type && <p className="text-xs text-destructive">{errors.business_type}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_person">اسم الشخص المسؤول</Label>
                  <Input
                    id="contact_person"
                    value={data.contact_person}
                    onChange={(e) => setData('contact_person', e.target.value)}
                  />
                  {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    placeholder="+970"
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">الموقع الإلكتروني (اختياري)</Label>
                  <Input
                    id="website"
                    value={data.website}
                    onChange={(e) => setData('website', e.target.value)}
                    placeholder="https://"
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="social">حساب التواصل الاجتماعي (اختياري)</Label>
                  <Input
                    id="social"
                    value={data.social}
                    onChange={(e) => setData('social', e.target.value)}
                    placeholder="رابط Instagram أو Facebook أو LinkedIn"
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.social && <p className="text-xs text-destructive">{errors.social}</p>}
                </div>
              </div>

              {(errors as Record<string, string>).error && <p className="text-sm text-destructive">{(errors as Record<string, string>).error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.visit(route('dashboard'))}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={processing} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  إرسال طلب الانضمام
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
