import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Link2,
  Server,
  Star,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Lock,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import { usePage } from '@inertiajs/react';
import { Crown } from 'lucide-react';

interface DomainItem {
  id: number;
  store_id: number;
  domain_name: string;
  url: string;
  is_verified: boolean;
  ssl_status: string;
  verification_token: string | null;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string | null;
}

interface DomainsPayload {
  domains: DomainItem[];
  dns: {
    cnameTarget: string;
    aRecord: string;
    mainDomain: string;
    verificationHost: string;
  };
  store: {
    id: number;
    slug: string;
    default_url: string;
    store_url: string;
  };
}

interface DomainsTabProps {
  storeId: number;
}

/**
 * Detect whether a directly typed domain is a root (apex) domain
 * (example.com) or a subdomain (shop.example.com).
 */
const detectDomainType = (value: string): 'apex' | 'subdomain' | null => {
  const v = value.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  const parts = v.split('.').filter(Boolean);
  if (parts.length >= 3) return 'subdomain';
  if (parts.length === 2) return 'apex';
  return null;
};

/**
 * Derive a human status badge from verification + SSL state:
 *  connected  -> verified & SSL active
 *  error      -> SSL error
 *  propagating-> everything else
 */
const getDomainStatus = (domain: DomainItem): 'connected' | 'propagating' | 'error' => {
  if (domain.ssl_status === 'error') return 'error';
  if (domain.is_verified && domain.ssl_status === 'active') return 'connected';
  return 'propagating';
};

const CopyButton = ({
  text,
  copyKey,
  copied,
  onCopy,
}: {
  text: string;
  copyKey: string;
  copied: string;
  onCopy: (text: string, key: string) => void;
}) => {
  const { t } = useTranslation();
  const isCopied = copied === copyKey;
  return (
    <div className="flex items-center justify-end gap-2">
      {isCopied && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 animate-in fade-in">
          <Check className="h-3.5 w-3.5" />
          {t('Copied')}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => onCopy(text, copyKey)}
        aria-label={t('Copy')}
        title={t('Copy')}
      >
        {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default function DomainsTab({ storeId }: DomainsTabProps) {
  const { t } = useTranslation();
  const pageProps: any = (usePage().props as any) ?? {};
  const authUser: any = pageProps?.auth?.user ?? pageProps?.authUser ?? null;
  const pageStore: any = pageProps?.store ?? pageProps?.currentStore ?? null;
  const isSuperAdmin = !!authUser && (authUser.type === 'superadmin' || authUser.type === 'super_admin' || authUser.isSuperAdmin === true || authUser.is_super_admin === true || authUser.role === 'superadmin');
  // Plan feature check – supports both new feature map and legacy enable_custdomain column
  const planFeatureRaw = pageStore?.plan?.features?.custom_domain ?? pageStore?.plan?.enable_custdomain ?? pageStore?.enable_custdomain ?? null;
  const planAllowsDomain = typeof planFeatureRaw === 'string' ? planFeatureRaw === 'on' : typeof planFeatureRaw === 'boolean' ? planFeatureRaw : null;
  const [planRestricted, setPlanRestricted] = useState(false);
  // Task-specified bypass: const canAddDomain = store.plan.features?.custom_domain || currentUser.isSuperAdmin;
  const canAddDomain = (() => {
    if (isSuperAdmin) return true;
    if (planAllowsDomain !== null) return !!planAllowsDomain;
    return !planRestricted;
  })();

  const [data, setData] = useState<DomainsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const [removeTarget, setRemoveTarget] = useState<DomainItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiGet(route('stores.domains', storeId))
      .then((res) => {
        setData(res);
        setPlanRestricted(false);
      })
      .catch((e: any) => {
        const msg: string = String(e?.data?.message || e?.message || '');
        if (e?.status === 403 || msg.includes('خطتك الحالية') || msg.includes('upgrade') || msg.includes('custom domain')) {
          setPlanRestricted(true);
        }
        toast.error(t(msg || 'Failed to load domains'));
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(key);
          setTimeout(() => setCopied(''), 1600);
        },
        () => {}
      );
    }
  };

  const handleAdd = () => {
    if (!canAddDomain) {
      return;
    }
    const value = newDomain.trim();
    if (!value) {
      toast.error(t('Enter a domain name'));
      return;
    }
    setAdding(true);
    apiPost(route('stores.domains.store', storeId), { domain_name: value })
      .then((res) => {
        toast.success(t(res.message || 'Domain added'));
        setNewDomain('');
        load();
      })
      .catch((e: any) => {
        const msg = String(e?.data?.message || e?.message || 'Failed to add domain');
        if (e?.status === 403 || msg.includes('خطتك الحالية')) {
          setPlanRestricted(true);
          toast.error(t('ربط النطاق المخصص غير متاح في خطتك الحالية. يرجى ترقية الخطة لاستخدام نطاقك الخاص.'));
        } else {
          toast.error(t(msg));
        }
      })
      .finally(() => setAdding(false));
  };

  const runAction = (domain: DomainItem, action: () => Promise<any>, successMessage: string) => {
    setBusyId(domain.id);
    action()
      .then((res) => {
        toast.success(t(res?.message || successMessage));
        load();
      })
      .catch((e) => toast.error(t(e.data?.message || e.message)))
      .finally(() => setBusyId(null));
  };

  const handleVerify = (domain: DomainItem) =>
    runAction(domain, () => apiPost(route('stores.domains.verify', [storeId, domain.id])), t('Domain verified'));

  const handleCheckSsl = (domain: DomainItem) =>
    runAction(domain, () => apiPost(route('stores.domains.check-ssl', [storeId, domain.id])), t('SSL check completed'));

  const handleMakePrimary = (domain: DomainItem) =>
    runAction(domain, () => apiPost(route('stores.domains.primary', [storeId, domain.id])), t('Primary domain updated'));

  const handleRemove = () => {
    if (!removeTarget) return;
    setRemoving(true);
    apiDelete(route('stores.domains.destroy', [storeId, removeTarget.id]))
      .then((res) => {
        toast.success(t(res?.message || 'Domain removed'));
        setRemoveTarget(null);
        load();
      })
      .catch((e) => toast.error(t(e.data?.message || e.message || 'Failed to remove domain')))
      .finally(() => setRemoving(false));
  };

  const domainType = useMemo(() => detectDomainType(newDomain), [newDomain]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin me-2" />
        {t('Loading...')}
      </div>
    );
  }

  const domains = data?.domains || [];
  const dns = data?.dns;
  const storeInfo = data?.store;

  return (
    <div className="space-y-4 mt-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('Connect your own domain to the store. Point your DNS records to our servers, then verify ownership. Your store keeps working on its free subdomain while you set everything up.')}
        </AlertDescription>
      </Alert>

      {/* Current subdomain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('Your Store Subdomain')}
          </CardTitle>
          <CardDescription>{t('Your store is always available on this free subdomain.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input readOnly dir="ltr" value={storeInfo?.default_url || ''} className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(storeInfo?.default_url || '', 'default')}
              aria-label={t('Copy')}
            >
              {copied === 'default' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            {storeInfo?.store_url && storeInfo.store_url !== storeInfo.default_url && (
              <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
                <a href={storeInfo.store_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 me-1.5" />
                  {t('Open store')}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('Add a Custom Domain')}
            {!canAddDomain && (
              <Badge variant="outline" className="ms-2 gap-1 border-amber-300 bg-amber-50 text-amber-700">
                <Crown className="h-3 w-3" />
                {t('يتطلب ترقية الخطة')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t('Use your own domain name for your store, for example shop.yourdomain.com or yourdomain.com.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canAddDomain && (
            <Alert className="mb-3 border-amber-200 bg-amber-50">
              <Crown className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {t('ربط النطاق المخصص غير متاح في خطتك الحالية. يرجى ترقية الخطة لاستخدام نطاقك الخاص.')}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              placeholder="shop.yourdomain.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canAddDomain) handleAdd();
              }}
              className="font-mono text-sm"
              disabled={!canAddDomain}
            />
            <Button type="button" onClick={handleAdd} disabled={adding || !canAddDomain} className="shrink-0">
              {adding ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Plus className="h-4 w-4 me-1.5" />}
              {t('Add Domain')}
            </Button>
          </div>
          {!canAddDomain && (
            <p className="mt-2 text-xs text-amber-700">
              ترقية الخطة تفتح لك ربط النطاق المخصص — تواصل مع الدعم أو اختر خطة Professional.
            </p>
          )}
        </CardContent>
      </Card>

      {/* DNS instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t('DNS Configuration')}
          </CardTitle>
          <CardDescription>
            {t('Add one of these records in your domain registrar or DNS provider dashboard.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[28%]">{t('Record Type')}</TableHead>
                  <TableHead className="w-[14%]">{t('Host')}</TableHead>
                  <TableHead>{t('Value')}</TableHead>
                  <TableHead className="w-[24%] text-end">{t('Copy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* A record — apex / root domain */}
                <TableRow className={domainType === 'apex' ? 'bg-primary/5' : domainType ? 'opacity-45' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">A</span>
                          {domainType === 'apex' && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {t('Recommended')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('Apex domain (A record)')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">@</code>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {dns?.aRecord || t('your server IP address')}
                    </code>
                  </TableCell>
                  <TableCell className="text-end">
                    {dns?.aRecord && <CopyButton text={dns.aRecord} copyKey="a" copied={copied} onCopy={copy} />}
                  </TableCell>
                </TableRow>

                {/* CNAME record — subdomain */}
                <TableRow className={domainType === 'subdomain' ? 'bg-primary/5' : domainType ? 'opacity-45' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">CNAME</span>
                          {domainType === 'subdomain' && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {t('Recommended')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('Subdomain (CNAME record)')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">shop</code>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {dns?.cnameTarget || ''}
                    </code>
                  </TableCell>
                  <TableCell className="text-end">
                    <CopyButton text={dns?.cnameTarget || ''} copyKey="cname" copied={copied} onCopy={copy} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {domainType && newDomain.trim() && (
            <div className="flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p className="text-muted-foreground">
                {domainType === 'apex'
                  ? t('"{{domain}}" is a root domain. Use the A record above.', { domain: newDomain.trim().toLowerCase() })
                  : t('"{{domain}}" is a subdomain. Use the CNAME record above.', { domain: newDomain.trim().toLowerCase() })}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <h4 className="text-sm font-medium text-amber-900">{t('DNS propagation')}</h4>
            </div>
            <p className="text-sm text-amber-800">
              {t('After adding the records, DNS changes can take from a few minutes up to 48 hours to propagate worldwide.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Domains list + verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t('Verify & Manage Domains')}
          </CardTitle>
          <CardDescription>
            {t('Verify ownership with a TXT record, then keep your SSL certificate up to date.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t('No custom domains added yet. Add your first domain above.')}
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => {
                const status = getDomainStatus(domain);
                return (
                  <div key={domain.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono text-sm font-medium truncate" dir="ltr">
                          {domain.domain_name}
                        </span>
                        {domain.is_primary && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            {t('Primary')}
                          </Badge>
                        )}
                        {status === 'connected' && (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('Connected')}
                          </Badge>
                        )}
                        {status === 'propagating' && (
                          <Badge variant="secondary" className="gap-1">
                            <RefreshCw className="h-3 w-3 animate-[spin_2s_linear_infinite]" />
                            {t('Propagating')}
                          </Badge>
                        )}
                        {status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {t('SSL Error')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleVerify(domain)}
                          disabled={busyId === domain.id}
                        >
                          {busyId === domain.id ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <RefreshCw className="h-4 w-4 me-1.5" />}
                          {t('Re-verify')}
                        </Button>
                        {!domain.is_primary && (
                          <Button type="button" size="sm" variant="outline" onClick={() => handleMakePrimary(domain)} disabled={busyId === domain.id}>
                            <Star className="h-4 w-4 me-1.5" />
                            {t('Make Primary')}
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" onClick={() => handleCheckSsl(domain)} disabled={busyId === domain.id}>
                          {busyId === domain.id ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Lock className="h-4 w-4 me-1.5" />}
                          {t('Check SSL')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRemoveTarget(domain)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {!domain.is_verified && (
                      <div className="mt-4 rounded-lg bg-muted p-3">
                        <p className="text-sm mb-2 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          {t('Add this TXT record in your DNS provider, then click Verify Domain.')}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('TXT Host')}</Label>
                            <Input readOnly dir="ltr" value={`${dns?.verificationHost || '_wusool-verify'}.${domain.domain_name}`} className="font-mono text-sm mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('TXT Value')}</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input readOnly dir="ltr" value={domain.verification_token || ''} className="font-mono text-sm min-w-0" />
                              <CopyButton text={domain.verification_token || ''} copyKey={`txt-${domain.id}`} copied={copied} onCopy={copy} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Remove Domain?')}</DialogTitle>
            <DialogDescription>
              {t('The domain {{domain}} will be disconnected from your store. This action cannot be undone.', { domain: removeTarget?.domain_name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Trash2 className="h-4 w-4 me-1.5" />}
              {t('Remove Domain')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
