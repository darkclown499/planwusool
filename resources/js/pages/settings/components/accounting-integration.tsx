import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SettingsSection } from '@/components/settings-section';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import {
  Loader2, Link2, Unlink, RefreshCw, CheckCircle2, XCircle, Plug, Zap,
  Building2, Layers, Calculator, Database, Save, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import InputError from '@/components/input-error';

interface AccountingIntegrationData {
  id?: number;
  base_url: string;
  sync_orders: boolean;
  sync_inventory: boolean;
  last_sync_at?: string;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  is_active: boolean;
}

const INTEGRATIONS = [
  { id: 'bisan', title: 'بيسان', subtitle: 'Bisan', icon: Building2, tint: 'bg-blue-100 text-blue-600', comingSoon: true },
  { id: 'al-shamel', title: 'الشامل', subtitle: 'Al-Shamel', icon: Layers, tint: 'bg-emerald-100 text-emerald-600', comingSoon: true },
  { id: 'quickbooks', title: 'QuickBooks', subtitle: 'Intuit', icon: Calculator, tint: 'bg-violet-100 text-violet-600', comingSoon: true },
  { id: 'odoo', title: 'Odoo', subtitle: 'ERP', icon: Database, tint: 'bg-amber-100 text-amber-700', comingSoon: false },
];

export default function AccountingIntegration() {
  const { t } = useTranslation();
  const [integration, setIntegration] = useState<AccountingIntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    base_url: '',
    api_key: '',
    sync_orders: true,
    sync_inventory: false,
    is_active: true,
  });

  const update = (patch: Partial<typeof formData>) => {
    setDirty(true);
    setFormData(prev => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    try {
      setLoading(true);
      const response = await axios.get(route('settings.accounting.index'));
      if (response.data.integration) {
        const data = response.data.integration;
        setIntegration(data);
        setFormData({
          base_url: data.base_url || '',
          api_key: '',
          sync_orders: data.sync_orders ?? true,
          sync_inventory: data.sync_inventory ?? false,
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch accounting integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToConfig = () => {
    const el = document.getElementById('accounting-config');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const response = await axios.post(route('settings.accounting.store'), formData);
      setIntegration(response.data.integration);
      setFormData(prev => ({ ...prev, api_key: '' }));
      setDirty(false);
      toast.success(response.data.message);
    } catch (error: any) {
      const message = error.response?.data?.message || t('An error occurred');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.delete(route('settings.accounting.destroy'));
      setIntegration(null);
      setFormData({ base_url: '', api_key: '', sync_orders: true, sync_inventory: false, is_active: true });
      setDirty(false);
      setTestResult(null);
      toast.success(t('Accounting integration disconnected'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('An error occurred'));
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post(route('settings.accounting.test-connection'));
      setTestResult(response.data);
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('Connection test failed');
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);

    try {
      const response = await axios.post(route('settings.accounting.sync-now'));
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('Sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = !!integration;

  return (
    <SettingsSection
      title={t("الربط المحاسبي")}
      description={t("ربط متجرك بنظام محاسبي خارجي لمزامنة الطلبات والمخزون تلقائياً")}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/*
            Integrations Card Grid
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTEGRATIONS.map((item) => {
              const Icon = item.icon;
              const connected = !item.comingSoon && isConnected;
              const badgeLabel = item.comingSoon ? t('قريباً') : (isConnected ? t('متصل') : t('غير متصل'));
              const badgeVariant: 'secondary' | 'success' | 'outline' = item.comingSoon
                ? 'secondary'
                : isConnected
                  ? 'success'
                  : 'outline';

              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                  </div>
                  <h5 className="mt-4 text-sm font-semibold text-gray-900">{item.title}</h5>
                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">{item.subtitle}</p>
                  <div className="mt-4 flex-1" />
                  <Button
                    type="button"
                    size="sm"
                    variant={item.comingSoon ? 'outline' : 'default'}
                    disabled={item.comingSoon}
                    onClick={scrollToConfig}
                  >
                    {item.comingSoon ? (
                      <>{t('قريباً')}</>
                    ) : (
                      <>
                        <Plug className="h-4 w-4 me-1.5" />
                        {isConnected ? t('متصل') : t('ربط النظام')}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <div id="accounting-config" className="scroll-mt-20 space-y-6 pt-2">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 pt-4">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-gray-900">{t('إعدادات الاتصال')}</h4>
            </div>

            <form id="accounting-form" onSubmit={handleSubmit} className="space-y-6">
              <div className={`rounded-lg border p-4 ${isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {isConnected ? t('متصل') : t('غير متصل')}
                    </p>
                    {isConnected && integration?.base_url && (
                      <p className="mt-0.5 text-xs font-mono text-muted-foreground" dir="ltr">{integration.base_url}</p>
                    )}
                  </div>
                  {isConnected && (
                    <Button type="button" variant="outline" size="sm" onClick={handleDisconnect}>
                      <Unlink className="h-3.5 w-3.5 me-1.5" />
                      {t('Disconnect')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="base_url">
                    {t('رابط النظام المحاسبي')}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="base_url"
                    type="url"
                    dir="ltr"
                    className="font-mono text-left"
                    placeholder="https://example.com"
                    value={formData.base_url}
                    onChange={(e) => update({ base_url: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="api_key">
                    {t('مفتاح الـ API')}
                    {!isConnected && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="api_key"
                    type="password"
                    dir="ltr"
                    className="font-mono text-left"
                    placeholder={isConnected ? t('اتركه فارغاً للاحتفاظ بالمفتاح الحالي') : t('أدخل مفتاح الـ API')}
                    value={formData.api_key}
                    onChange={(e) => update({ api_key: e.target.value })}
                    required={!isConnected}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('خيارات المزامنة')}</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync_orders" className="text-sm">{t('مزامنة الطلبات')}</Label>
                    <p className="text-xs text-muted-foreground">{t('إرسال الطلبات الجديدة تلقائياً إلى النظام المحاسبي')}</p>
                  </div>
                  <Switch
                    id="sync_orders"
                    checked={formData.sync_orders}
                    onCheckedChange={(checked) => update({ sync_orders: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync_inventory" className="text-sm">{t('مزامنة المخزون')}</Label>
                    <p className="text-xs text-muted-foreground">{t('تحديث كميات المخزون والأسعار تلقائياً من النظام المحاسبي')}</p>
                  </div>
                  <Switch
                    id="sync_inventory"
                    checked={formData.sync_inventory}
                    onCheckedChange={(checked) => update({ sync_inventory: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active" className="text-sm">{t('تفعيل الربط')}</Label>
                    <p className="text-xs text-muted-foreground">{t('تمكين أو تعطيل الربط المحاسبي في المتجر')}</p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => update({ is_active: checked })}
                  />
                </div>
              </div>

              {integration?.last_sync_at && (
                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{t('Last Sync')}:</span>{' '}
                    {new Date(integration.last_sync_at).toLocaleString()}
                  </div>
                  {integration.last_sync_status && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {integration.last_sync_status === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${integration.last_sync_status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                        {integration.last_sync_status === 'success' ? t('Successful') : t('Failed')}
                      </span>
                    </div>
                  )}
                  {integration.last_sync_error && (
                    <p className="mt-1 text-xs font-mono break-all text-red-600" dir="ltr">{integration.last_sync_error}</p>
                  )}
                </div>
              )}

              {testResult && (
                <div className={`rounded-lg border p-3 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4 me-1.5" />
                  )}
                  {isConnected ? t('تحديث الإعدادات') : t('حفظ الاتصال')}
                </Button>

                {isConnected && (
                  <>
                    <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                      {testing ? (
                        <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 me-1.5" />
                      )}
                      {t('Test Connection')}
                    </Button>

                    <Button type="button" variant="outline" onClick={handleSyncNow} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 me-1.5" />
                      )}
                      {t('Sync Now')}
                    </Button>
                  </>
                )}
              </div>

              {isConnected && (
                <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{t('Webhook URL')}</span>
                  </div>
                  <p className="mb-1 text-xs text-blue-600/80">
                    {t('Configure this URL in your accounting system to receive inventory and product updates')}
                  </p>
                  <code className="rounded bg-blue-100 px-2 py-1 text-xs break-all text-blue-800" dir="ltr">
                    {window.location.origin}/webhook/accounting/{/* store slug needed - will be handled at runtime */}
                  </code>
                </div>
              )}
            </form>
          </div>

          {dirty && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
              <div className="flex items-center gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-lg">
                <span className="text-sm text-muted-foreground">{t('لديك تغييرات غير محفوظة')}</span>
                <Button type="submit" form="accounting-form" size="sm" disabled={saving}>
                  <Save className="h-4 w-4 me-2" />
                  {saving ? t('Saving...') : t('Save Changes')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { fetchIntegration(); setDirty(false); }}>
                  {t('Discard')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}