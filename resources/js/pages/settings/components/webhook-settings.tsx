import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Link2, Webhook as WebhookIcon, KeyRound, RefreshCw, Loader2 } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import axios from 'axios';
import InputError from '@/components/input-error';

const EVENT_OPTIONS = [
  { value: 'order.created', label: 'إنشاء طلب جديد' },
  { value: 'order.status_changed', label: 'تغيير حالة الطلب' },
  { value: 'product.stock_low', label: 'انخفاض المخزون' },
  { value: 'customer.registered', label: 'تسجيل عميل جديد' },
];

interface Webhook {
  id: number;
  module: string;
  method: string;
  url: string;
  is_active: boolean;
  created_at: string;
  events?: string[];
  secret?: string;
}

interface WebhookSettingsProps {
  webhooks?: Webhook[];
  availableModules?: Record<string, string>;
}

const generateSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export default function WebhookSettings({
  webhooks = [],
  errors = {},
  availableModules = {
    'New User': 'New User',
    'New Product': 'New Product',
    'New Order': 'New Order',
    'Status Change': 'Status Change',
    'New Customer': 'New Customer'
  }
}: WebhookSettingsProps & { errors?: Record<string, string> }) {
  const { t } = useTranslation();
  const [webhookList, setWebhookList] = useState<Webhook[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    module: '',
    method: 'POST',
    url: '',
    events: [] as string[],
    secret: '',
    is_active: true
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(route('settings.webhooks.index'));
      setWebhookList(response.data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ module: '', method: 'POST', url: '', events: [], secret: generateSecret(), is_active: true });
    setEditingWebhook(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (webhook: Webhook) => {
    const events = Array.isArray(webhook.events) && webhook.events.length
      ? webhook.events
      : webhook.module.split(',').map((m) => m.trim()).filter(Boolean);
    setFormData({
      module: webhook.module,
      method: webhook.method,
      url: webhook.url,
      events,
      secret: webhook.secret || (webhook.module ? '' : generateSecret()),
      is_active: webhook.is_active
    });
    setEditingWebhook(webhook);
    setIsDialogOpen(true);
  };

  const toggleEvent = (value: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(value)
        ? prev.events.filter((e) => e !== value)
        : [...prev.events, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      url: formData.url,
      method: formData.method,
      module: formData.events.length > 0 ? formData.events.join(',') : (formData.module || Object.keys(availableModules)[0]),
      events: formData.events,
      secret: formData.secret,
      is_active: formData.is_active
    };

    try {
      if (editingWebhook) {
        const response = await axios.put(route('settings.webhooks.update', editingWebhook.id), payload);
        setWebhookList(prev => prev.map(w => w.id === editingWebhook.id ? response.data.webhook : w));
        toast.success(response.data.message);
      } else {
        const response = await axios.post(route('settings.webhooks.store'), payload);
        setWebhookList(prev => [...prev, response.data.webhook]);
        toast.success(response.data.message);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('An error occurred');
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (webhook: Webhook) => {
    setWebhookToDelete(webhook);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!webhookToDelete) return;

    try {
      const response = await axios.delete(route('settings.webhooks.destroy', webhookToDelete.id));
      setWebhookList(prev => prev.filter(w => w.id !== webhookToDelete.id));
      toast.success(response.data.message);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('An error occurred');
      toast.error(errorMessage);
    } finally {
      setDeleteModalOpen(false);
      setWebhookToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setWebhookToDelete(null);
  };

  const toggleWebhookStatus = async (webhook: Webhook) => {
    try {
      const response = await axios.put(route('settings.webhooks.update', webhook.id), {
        ...webhook,
        is_active: !webhook.is_active
      });
      setWebhookList(prev => prev.map(w => w.id === webhook.id ? response.data.webhook : w));
      toast.success(webhook.is_active ? t('Webhook disabled') : t('Webhook enabled'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('An error occurred');
      toast.error(errorMessage);
    }
  };

  return (
    <SettingsSection
      title={t("Webhook Settings")}
      description={t("Manage webhooks for external integrations")}
      action={
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 me-2" />
          {t("Add Webhook")}
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ms-2 text-sm text-muted-foreground">{t("Loading...")}</span>
          </div>
        ) : webhookList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <WebhookIcon className="h-8 w-8" />
            </div>
            <h5 className="mt-5 text-base font-semibold text-gray-900">{t('لا توجد وحدات Webhook بعد')}</h5>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t('قم بربط نداءات Webhook لمزامنة البيانات تلقائياً مع تطبيقاتك الخاصة')}
            </p>
            <Button onClick={handleCreate} className="mt-6" size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t("Add Webhook")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b">
                <TableHead className="py-2.5 font-semibold">{t("Module")}</TableHead>
                <TableHead className="py-2.5 font-semibold">{t("Method")}</TableHead>
                <TableHead className="py-2.5 font-semibold">{t("URL")}</TableHead>
                <TableHead className="py-2.5 font-semibold">{t("Status")}</TableHead>
                <TableHead className="w-24 py-2.5 font-semibold text-end">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookList.map((webhook) => (
                <TableRow key={webhook.id} className="hover:bg-gray-50 border-b">
                  <TableCell className="py-2.5">
                    <div className="flex items-center">
                      <Link2 className="h-4 w-4 me-2 text-muted-foreground" />
                      <span className="text-sm font-medium">{webhook.module}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      webhook.method === 'GET'
                        ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                        : 'bg-green-50 text-green-700 ring-green-700/10'
                    }`}>
                      {webhook.method}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="max-w-xs truncate text-sm font-mono text-muted-foreground">
                      {webhook.url}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <button
                      onClick={() => toggleWebhookStatus(webhook)}
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset cursor-pointer hover:opacity-80 transition-opacity ${
                        webhook.is_active
                          ? 'bg-green-50 text-green-700 ring-green-700/10'
                          : 'bg-red-50 text-red-700 ring-red-700/10'
                      }`}
                      title={webhook.is_active ? t('Click to disable') : t('Click to enable')}
                    >
                      {webhook.is_active ? t('Active') : t('Inactive')}
                    </button>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 hover:text-amber-700"
                              onClick={() => handleEdit(webhook)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Edit")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteClick(webhook)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Delete")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? t("Edit Webhook") : t("Add New Webhook")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="url" required>{t("Endpoint URL")}</Label>
                <Input
                  id="url"
                  type="url"
                  dir="ltr"
                  className="font-mono text-left"
                  placeholder="https://api.yourdomain.com/webhooks"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  required
                  aria-invalid={!!errors.url}
                />
                <InputError message={errors.url} />
              </div>

              <div className="grid gap-2">
                <Label>{t("Events")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  {EVENT_OPTIONS.map((event) => (
                    <label
                      key={event.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        formData.events.includes(event.value)
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Checkbox
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.label}</p>
                        <p className="truncate text-xs font-mono text-muted-foreground" dir="ltr">{event.value}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{t("Secret Signing Key")}</Label>
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="secret"
                      type="text"
                      readOnly
                      dir="ltr"
                      className="h-10 pe-10 font-mono text-left"
                      placeholder={t("Auto-generated signing key")}
                      value={formData.secret}
                      onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                    />
                    <KeyRound className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, secret: generateSecret() }))}
                  >
                    <RefreshCw className="h-4 w-4 me-1.5" />
                    {t("توليد مفتاح جديد")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('استخدم هذا المفتاح للتحقق من توقيع الطلبات المرسلة إلى عنوان الـ Webhook')}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="method">{t("Method")}</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                  required
                >
                  <SelectTrigger id="method" className="w-full">
                    <SelectValue placeholder={t("Select method")} />
                  </SelectTrigger>
                  <SelectContent className="z-[60]" position="popper" sideOffset={5}>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">{t("Active")}</Label>
                  <div className="text-sm text-muted-foreground">
                    {t("Enable or disable this webhook")}
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 me-2" />
                  {t("Cancel")}
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 me-2" />
                  {editingWebhook ? t("Update") : t("Create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <CrudDeleteModal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          itemName={webhookToDelete?.module || ''}
          entityName={t('Webhook')}
        />
      </div>
    </SettingsSection>
  );
}