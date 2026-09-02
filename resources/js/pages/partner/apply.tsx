import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useForm, usePage, router } from '@inertiajs/react';
import { UserPlus, CheckCircle2, XCircle, Clock, Ban, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface PartnerApplyProps {
  partner: {
    id: number;
    status: string;
    company_name: string;
    referral_code: string;
    referral_link: string | null;
    created_at: string | null;
  } | null;
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', variant: 'secondary', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected', variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
  suspended: { label: 'Suspended', variant: 'outline', icon: <Ban className="h-3.5 w-3.5" /> },
};

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
      <PageTemplate title={t('Partner Program')} description={t('Your Wusool partner application')} url={route('partner.apply')}>
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

              {partner.status === 'approved' && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-[13px] font-medium text-muted-foreground">{t('Your referral link')}</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 truncate rounded border bg-background px-3 py-2 text-[13px]">{partner.referral_link}</code>
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
              )}

              {partner.status === 'suspended' && (
                <p className="text-[13px] text-muted-foreground">
                  {t('Your partner account is suspended. Please contact support for more information.')}
                </p>
              )}

              {partner.status === 'rejected' && (
                <p className="text-[13px] text-muted-foreground">
                  {t('Your partner application was not approved. You can re-apply later if your circumstances change.')}
                </p>
              )}

              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://wa.me', '_blank', 'noopener')}>
                <ExternalLink className="h-4 w-4" />
                {t('Contact support')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title={t('Join as a Wusool Partner')}
      description={t('Agencies, freelancers, designers, marketing agencies and IT companies can join the Wusool partner program to refer merchants and grow together.')}
      url={route('partner.apply')}
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t('Partner Application')}</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{t('Tell us about your business. Our team will review your application.')}</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">{t('Company / Name')} *</Label>
                  <Input
                    id="company_name"
                    value={data.company_name}
                    onChange={(e) => setData('company_name', e.target.value)}
                    placeholder={t('e.g. Creative Studio')}
                  />
                  {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="business_type">{t('Business type')} *</Label>
                  <Input
                    id="business_type"
                    value={data.business_type}
                    onChange={(e) => setData('business_type', e.target.value)}
                    placeholder={t('e.g. Web agency')}
                  />
                  {errors.business_type && <p className="text-xs text-destructive">{errors.business_type}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_person">{t('Contact person')}</Label>
                  <Input
                    id="contact_person"
                    value={data.contact_person}
                    onChange={(e) => setData('contact_person', e.target.value)}
                  />
                  {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('Email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t('Phone')}</Label>
                  <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    placeholder="+970"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">{t('Website')}</Label>
                  <Input
                    id="website"
                    value={data.website}
                    onChange={(e) => setData('website', e.target.value)}
                    placeholder="https://"
                  />
                  {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="social">{t('Social profile')}</Label>
                  <Input
                    id="social"
                    value={data.social}
                    onChange={(e) => setData('social', e.target.value)}
                    placeholder={t('Instagram / LinkedIn / Facebook')}
                  />
                  {errors.social && <p className="text-xs text-destructive">{errors.social}</p>}
                </div>
              </div>

              {(errors as Record<string, string>).error && <p className="text-sm text-destructive">{(errors as Record<string, string>).error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.visit(route('dashboard'))}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={processing} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('Submit application')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}