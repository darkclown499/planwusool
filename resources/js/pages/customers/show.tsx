import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, MessageCircle, Plus, Trash2, Repeat, AlertTriangle, CalendarDays, X, Tag as TagIcon, User, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { formatCustomerDate } from '@/utils/date-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Note { id: number; note: string; created_at?: string | null; created_by_name?: string | null; }
interface Tag { id: number; name: string; }
interface TotalsGroup { currency: string; total: number; count: number; avg: number; }
interface AddressRow { source: 'book' | 'order'; label: string; address: string; city: string; state: string; postal_code?: string; country: string; }
interface OrderRow {
  id: number; order_number: string; total: number; currency: string;
  status: string; payment_status: string; payment_method: string; items_count: number; date: string; url: string;
}

interface LoyaltyTxn {
  id: number; type: string; points: number; balance_after: number;
  description?: string | null; order_id?: number | null; expires_at?: string | null; created_at?: string | null;
}
interface LoyaltySection { enabled: boolean; has_account: boolean; balance: number; transactions: LoyaltyTxn[]; }
interface CartRow {
  id: number; status: string; value: number; last_activity_at?: string | null; reminder_sent_at?: string | null;
  whatsapp_status?: string | null; recovered_order_id?: number | null; recovered_order_number?: string | null;
}
interface AbandonedCartsSection { count: number; recent: CartRow[]; }
interface ReturnRow {
  id: number; return_number: string; status: string; refund_status: string; refund_amount: number;
  requested_at?: string | null; order_id?: number | null; order_number?: string | null; order_url?: string | null; url: string;
}
interface ReturnsSection { count: number; recent: ReturnRow[]; }

interface Profile {
  identity: {
    ref_token: string;
    kind: 'registered' | 'guest';
    id: number | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    phone_e164: string | null;
    whatsapp_url?: string | null;
    call_url?: string | null;
    is_active: boolean | null;
    customer_group: string;
    created_at?: string | null;
    legacy_note?: string | null;
  };
  overview: {
    orders_count: number; valid_count: number; cancelled_count: number; is_repeat: boolean;
    totals: TotalsGroup[]; first_order_at?: string | null; last_order_at?: string | null;
  };
  orders: OrderRow[];
  addresses: AddressRow[];
  notes: Note[];
  tags: Tag[];
  loyalty?: LoyaltySection;
  abandoned_carts?: AbandonedCartsSection;
  returns?: ReturnsSection;
}

const orderStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'قيد التجهيز',
    shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', refunded: 'مسترجع', failed: 'فشل',
  };
  return map[s] || s;
};

const paymentLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'قيد الدفع', paid: 'مدفوع', failed: 'فشل', refunded: 'مسترجع', partially_refunded: 'مسترجع جزئياً' };
  return map[s] || s;
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
}

const cartStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    new: 'جديد', draft: 'مسودة', abandoned: 'متروكة', reminder_sent: 'أُرسل التذكير',
    recovered: 'تم الاسترداد', expired: 'منتهية', unsubscribed: 'إلغاء اشتراك',
  };
  return map[s] || s;
};

const returnStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    requested: 'مطلوب', approved: 'موافق عليه', rejected: 'مرفوض', in_transit: 'قيد التوصيل',
    received: 'مستلم', completed: 'مكتمل', cancelled: 'ملغي',
  };
  return map[s] || s;
};

const refundStatusLabel = (s: string) => {
  const map: Record<string, string> = { none: '—', pending: 'قيد الاسترداد', partial: 'جزئي', refunded: 'مسترجع' };
  return map[s] || s;
};

const loyaltyTypeLabel = (s: string) => {
  const map: Record<string, string> = {
    earn: 'نقاط مكتسبة', redeem: 'استبدال نقاط', signup_bonus: 'مكافأة تسجيل', review_bonus: 'مكافأة تقييم',
    adjustment: 'تعديل', expired: 'انتهت صلاحيتها', refund: 'استرداد',
  };
  return map[s] || s;
};

export default function ShowCustomer() {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const props = usePage().props as any;
  const profile = props.profile as Profile;

  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagLoading, setTagLoading] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupMessage, setFollowupMessage] = useState('');

  const followup = (profile as any).whatsapp as null | { message?: string; phone?: string; label?: string } | undefined;

  const canManage = hasPermission('edit-customers');
  const refToken = profile?.identity?.ref_token || '';

  if (!profile) {
    return (
      <PageTemplate title="العميل" url="/customers" backUrl={route('customers.index')}>
        <p className="text-muted-foreground">لم يتم العثور على العميل.</p>
      </PageTemplate>
    );
  }

  const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || noteLoading) return;
    if (!checkPermission('edit-customers', auth)) return;
    setNoteLoading(true);
    router.post(route('customers.notes.store', refToken), { note: newNote }, {
      preserveScroll: true,
      onSuccess: () => { setNewNote(''); setNoteLoading(false); },
      onError: () => setNoteLoading(false),
    });
  };

  const deleteNote = (id: number) => {
    if (!checkPermission('edit-customers', auth)) return;
    router.delete(route('customers.notes.destroy', [refToken, id]), { preserveScroll: true });
  };

  const submitTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || tagLoading) return;
    if (!checkPermission('edit-customers', auth)) return;
    setTagLoading(true);
    router.post(route('customers.tags.store', refToken), { name: newTag }, {
      preserveScroll: true,
      onSuccess: () => { setNewTag(''); setTagLoading(false); },
      onError: () => setTagLoading(false),
    });
  };

  const deleteTag = (id: number) => {
    if (!checkPermission('edit-customers', auth)) return;
    router.delete(route('customers.tags.destroy', [refToken, id]), { preserveScroll: true });
  };

  const totalLabel = (group: { currency: string; total: number }) => {
    const formatted = formatCurrency(group.total);
    const storeCurrency = (props as any).storeCurrency || {};
    const defaultCode = storeCurrency.code || storeCurrency.currency || 'ILS';
    return defaultCode === group.currency ? formatted : `${group.currency} ${group.total.toLocaleString()}`;
  };

  const overviewTotals = profile.overview.totals || [];

  return (
    <PageTemplate
      title={t('Customer Details')}
      url="/customers/show"
      backUrl={route('customers.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Customer Management'), href: route('customers.index') },
        { title: t('Customer Details') }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl font-bold text-violet-700">
                  {profile.identity.full_name ? profile.identity.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : 'ض'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{profile.identity.full_name || 'زبون ضيف'}</h2>
                    {profile.overview.is_repeat && <Badge variant="default">عميل متكرر</Badge>}
                    {profile.identity.kind === 'guest' && <Badge variant="outline">ضيف</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {profile.identity.phone && (
                      <span className="inline-flex items-center gap-1.5" dir="ltr"><Phone className="h-4 w-4" />{profile.identity.phone}</span>
                    )}
                    {profile.identity.email && (
                      <span className="inline-flex items-center gap-1.5">{profile.identity.email}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {profile.identity.whatsapp_url && (
                  <a href={profile.identity.whatsapp_url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" /> تواصل عبر واتساب
                  </a>
                )}
                {followup && (
                  <Button
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-2"
                    onClick={() => {
                      setFollowupMessage(followup?.message ?? '');
                      setFollowupOpen(true);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" /> {followup?.label || 'متابعة عبر واتساب'}
                  </Button>
                )}
                {profile.identity.call_url && (
                  <a href={profile.identity.call_url}
                     className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent">
                    <Phone className="h-4 w-4" /> اتصال
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview metrics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <OverviewStat icon={<ShoppingBag className="h-4 w-4" />} label="عدد الطلبات" value={`${profile.overview.orders_count}`} />
          <OverviewStat icon={<ShoppingBag className="h-4 w-4" />} label="طلبات صالحة" value={`${profile.overview.valid_count}`} />
          <OverviewStat icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="طلبات ملغاة" value={`${profile.overview.cancelled_count}`} />
          <OverviewStat icon={<CalendarDays className="h-4 w-4" />} label="آخر طلب" value={fmtDate(profile.overview.last_order_at) ?? '—'} small />
          <OverviewStat icon={<CalendarDays className="h-4 w-4" />} label="أول طلب" value={fmtDate(profile.overview.first_order_at) ?? '—'} small />
        </div>

        {/* Order value per currency */}
        <Card>
          <CardHeader><CardTitle className="text-base">إجمالي قيمة الطلبات</CardTitle></CardHeader>
          <CardContent>
            {overviewTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد طلبات.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {overviewTotals.map((g) => (
                  <div key={g.currency} className="rounded-lg border p-4">
                    <div className="text-lg font-bold text-start ltr-num" dir="rtl">{totalLabel(g)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      متوسط {formatCurrency(g.avg)} · {g.count} طلب
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              ملاحظة: القيم معروضة دون دمج بين العملات؛ كل عملة تُعرض على حدة.
            </p>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الوسوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {(profile.tags || []).map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  <TagIcon className="h-3 w-3" />
                  {tag.name}
                  {canManage && (
                    <button onClick={() => deleteTag(tag.id)} className="text-muted-foreground hover:text-destructive" title="إزالة">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {(profile.tags || []).length === 0 && <span className="text-sm text-muted-foreground">لا توجد وسوم.</span>}
            </div>
            {canManage && (
              <form onSubmit={submitTag} className="mt-3 flex gap-2">
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="وسم جديد (مثال: VIP، زبون دائم، جملة)" className="max-w-sm" />
                <Button type="submit" size="sm" disabled={!newTag.trim() || tagLoading}><Plus className="h-4 w-4 me-1" />إضافة</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">ملاحظات داخلية</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">هذه الملاحظات خاصة بك ولن يراها العميل أبداً.</p>
            {(profile.notes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد ملاحظات.</p>
            ) : (
              <div className="space-y-2">
                {(profile.notes || []).map((note) => (
                  <div key={note.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-sm">{note.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDate(note.created_at)}
                        {note.created_by_name ? ` · ${note.created_by_name}` : ''}
                      </p>
                    </div>
                    {canManage && (
                      <button onClick={() => deleteNote(note.id)} className="shrink-0 text-muted-foreground hover:text-destructive" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canManage && (
              <form onSubmit={submitNote} className="mt-3 space-y-2">
                <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2}
                          placeholder="أضف ملاحظة داخلية (مثال: يفضل التواصل بعد الساعة 5، يرجى التأكد من المقاس قبل الشحن...)" />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!newNote.trim() || noteLoading}><Plus className="h-4 w-4 me-1" />حفظ ملاحظة</Button>
                </div>
              </form>
            )}
            {profile.identity.legacy_note && (
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">ملاحظات سابقة:</span> {profile.identity.legacy_note}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order history */}
        <Card>
          <CardHeader><CardTitle className="text-base">سجل الطلبات</CardTitle></CardHeader>
          <CardContent>
            {(profile.orders || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد طلبات.</p>
            ) : (
              <div className="space-y-2">
                {(profile.orders || []).map((order) => (
                  <a key={order.id} href={order.url}
                     className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" dir="ltr">{order.order_number}</span>
                        <Badge variant={order.status === 'cancelled' || order.status === 'failed' || order.status === 'refunded' ? 'destructive' : 'secondary'}>
                          {orderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(order.date)} · {order.items_count} منتجات · {paymentLabel(order.payment_status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold" dir="rtl">{totalLabel({ currency: order.currency, total: order.total })}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer 360: loyalty + abandoned carts */}
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نقاط الولاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className="rounded-lg border p-3 text-center min-w-28">
                  <div className="text-2xl font-bold text-start ltr-num" dir="rtl">
                    {Number(profile.loyalty?.balance ?? 0).toLocaleString('ar')}
                  </div>
                  <div className="text-xs text-muted-foreground">نقطة</div>
                </div>
                {profile.loyalty?.enabled === false && (
                  <p className="text-xs text-muted-foreground">برنامج الولاء غير مفعل حالياً في هذا المتجر.</p>
                )}
              </div>
              {(profile.loyalty?.transactions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {profile.loyalty?.has_account ? 'لا توجد حركات نقاط بعد.' : 'لا يوجد حساب ولاء لهذا الزبون.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(profile.loyalty?.transactions || []).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {loyaltyTypeLabel(txn.type)}
                          {txn.order_id && <span className="text-xs text-muted-foreground" dir="ltr">طلب #{txn.order_id}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatCustomerDate(txn.created_at)}
                          {txn.description ? ` · ${txn.description}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-start ltr-num" dir="rtl">
                        <span className={'text-sm font-semibold ' + (txn.points >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                          {txn.points >= 0 ? '+' : ''}{txn.points.toLocaleString('ar')}
                        </span>
                        <span className="ms-2 text-xs text-muted-foreground">رصيد {txn.balance_after.toLocaleString('ar')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                السلال المتروكة
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal">{Number(profile.abandoned_carts?.count ?? 0).toLocaleString('ar')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(profile.abandoned_carts?.recent || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد سلال متروكة لهذا الزبون.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(profile.abandoned_carts?.recent || []).map((cart) => (
                    <div key={cart.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={cart.status === 'recovered' ? 'default' : cart.status === 'unsubscribed' || cart.status === 'expired' ? 'destructive' : 'secondary'}>
                            {cartStatusLabel(cart.status)}
                          </Badge>
                          {cart.recovered_order_number && (
                            <a href={route('orders.show', cart.recovered_order_id!)} className="text-xs text-primary hover:underline" dir="ltr">
                              {cart.recovered_order_number}
                            </a>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          آخر نشاط: {formatCustomerDate(cart.last_activity_at)}
                          {cart.whatsapp_status ? ` · تذكير: ${cart.whatsapp_status}` : ''}
                        </p>
                      </div>
                      <div className="font-semibold shrink-0 text-start ltr-num" dir="rtl">{formatCurrency(cart.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer 360: returns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              المرتجعات
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal">{Number(profile.returns?.count ?? 0).toLocaleString('ar')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(profile.returns?.recent || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد مرتجعات لهذا الزبون.</p>
            ) : (
              <div className="space-y-2">
                {(profile.returns?.recent || []).map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={item.url} className="font-medium hover:underline" dir="ltr">{item.return_number}</a>
                        <Badge variant={item.status === 'rejected' || item.status === 'cancelled' ? 'destructive' : item.status === 'completed' ? 'default' : 'secondary'}>
                          {returnStatusLabel(item.status)}
                        </Badge>
                        <Badge variant="outline">{refundStatusLabel(item.refund_status)}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatCustomerDate(item.requested_at)}
                        {item.order_number && (
                          <a href={item.order_url ?? '#'} className="text-primary hover:underline" dir="ltr"> · {item.order_number}</a>
                        )}
                      </p>
                    </div>
                    <div className="font-semibold shrink-0 text-start ltr-num" dir="rtl">{formatCurrency(item.refund_amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader><CardTitle className="text-base">العناوين</CardTitle></CardHeader>
          <CardContent>
            {(profile.addresses || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد عناوين مسجلة.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(profile.addresses || []).slice(0, 6).map((addr, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {addr.source === 'book' ? (addr.label === 'billing' ? 'عنوان الفوترة' : addr.label === 'shipping' ? 'عنوان الشحن' : addr.label) : 'عنوان من طلب'}
                      </span>
                    </div>
                    <p className="text-sm">{addr.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {[addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join('، ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp follow-up compose — deep link only, never auto-sends */}
      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> متابعة عبر واتساب</DialogTitle>
            <DialogDescription>يُفتح الرابط في محادثة واتساب العميل مع رسالة جاهزة للتعديل — لا يُرسل شيء تلقائياً.</DialogDescription>
          </DialogHeader>
          <Textarea
            dir="rtl"
            value={followupMessage}
            onChange={(e) => setFollowupMessage(e.target.value)}
            rows={6}
            placeholder="نص الرسالة..."
          />
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setFollowupOpen(false)}>إغلاق</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              disabled={!followupMessage?.trim()}
              onClick={() => {
                const url = createWhatsAppUrl(String(followup?.phone ?? ''), followupMessage);
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <MessageCircle className="h-4 w-4" /> فتح واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}

function OverviewStat({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={'mt-2 font-bold text-start ' + (small ? 'text-sm' : 'text-2xl')}>{value}</div>
    </div>
  );
}