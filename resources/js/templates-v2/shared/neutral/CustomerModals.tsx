import { useStore } from '@/contexts/StoreContext';
import { toast } from '@/components/custom-toast';
import { AuthFormProvider, useAuthForm } from '@/contexts/AuthFormContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { usePage } from '@inertiajs/react';
import { Calendar, Copy, CreditCard, LogOut, MapPin, Package, ShoppingBag, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const primary = 'var(--twc-primary-600, #059669)';

const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; title: string; icon: React.ReactNode }> = ({
    children,
    onClose,
    title,
    icon,
}) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"
                    style={{ background: 'var(--twc-surface, #ffffff)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: primary }}>
                                {icon}
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق"
                            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

/* ------------------------------- Order Success ------------------------------- */

interface OrderSuccessProps {
    orderNumber: string;
    onClose: () => void;
    onContinueShopping: () => void;
}

export const TemplateOrderSuccessModal: React.FC<OrderSuccessProps> = ({ orderNumber, onClose, onContinueShopping }) => {
    const copyOrderNumber = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderNumber);
            toast.success('تم نسخ رقم الطلب!');
        }
    };

    return (
        <ModalShell onClose={onClose} title="تم استلام طلبك" icon={<ShoppingBag className="h-5 w-5" />}>
            <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                    <Package className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    شكراً لك! تم استلام طلبك بنجاح
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                    سنقوم بمراجعة طلبك والتواصل معك قريباً لتأكيد التفاصيل.
                </p>
                <button
                    type="button"
                    onClick={copyOrderNumber}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition hover:opacity-90"
                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', color: primary }}
                >
                    <Copy className="h-4 w-4" />
                    رقم الطلب: {orderNumber}
                </button>
                <button
                    type="button"
                    onClick={onContinueShopping}
                    className="mt-5 w-full rounded-xl py-3 font-bold text-white transition hover:opacity-90"
                    style={{ background: primary }}
                >
                    متابعة التسوق
                </button>
            </div>
        </ModalShell>
    );
};

/* ------------------------------- My Orders ------------------------------- */

interface MyOrdersProps {
    orders: any[];
    loading: boolean;
    onClose: () => void;
    onViewOrder: (orderNumber: string) => void;
    storeSlug: string;
}

export const TemplateMyOrdersModal: React.FC<MyOrdersProps> = ({ orders, loading, onClose, onViewOrder }) => {
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    return (
        <ModalShell onClose={onClose} title="طلباتي" icon={<Package className="h-5 w-5" />}>
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="py-10 text-center">
                        <div
                            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                            style={{ borderColor: primary }}
                        ></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            لا توجد طلبات بعد
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                            عندما تقوم بطلب منتجات، ستظهر طلباتك هنا.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order: any) => (
                            <div
                                key={order.order_number || order.id}
                                className="rounded-2xl border p-4"
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p
                                            className="flex items-center gap-2 text-sm font-bold"
                                            style={{ color: 'var(--twc-text-primary, #111827)' }}
                                        >
                                            <Calendar className="h-4 w-4" />
                                            {order.created_at || order.date}
                                        </p>
                                        <p className="mt-1 text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                            رقم الطلب: {order.order_number}
                                        </p>
                                    </div>
                                    <span
                                        className="rounded-full px-3 py-1 text-xs font-bold"
                                        style={{
                                            background: 'var(--twc-primary-50, #ecfdf5)',
                                            color: primary,
                                        }}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-bold" style={{ color: primary }}>
                                        {formatCurrency(order.total, storeSettings, currencies)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onViewOrder(order.order_number)}
                                        className="rounded-full border px-4 py-1.5 text-xs font-bold transition hover:opacity-90"
                                        style={{ borderColor: primary, color: primary }}
                                    >
                                        عرض التفاصيل
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

/* ------------------------------- Order Details ------------------------------- */

interface OrderDetailsProps {
    orderNumber: string;
    storeSlug: string;
    onClose: () => void;
}

export const TemplateOrderDetailsModal: React.FC<OrderDetailsProps> = ({ orderNumber, storeSlug, onClose }) => {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const page = usePage().props as any;
    const storeSettings = page?.storeSettings || {};
    const currencies = page?.currencies || [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const loadOrderDetails = async () => {
            try {
                const response = await fetch(`${route('api.orders.show', { orderNumber })}?store_slug=${storeSlug}`);
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data.order);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        loadOrderDetails();
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [orderNumber, storeSlug]);

    return (
        <ModalShell onClose={onClose} title="تفاصيل الطلب" icon={<CreditCard className="h-5 w-5" />}>
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="py-10 text-center">
                        <div
                            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                            style={{ borderColor: primary }}
                        ></div>
                    </div>
                ) : !order ? (
                    <p className="py-10 text-center text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                        تعذر تحميل تفاصيل الطلب.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                رقم الطلب: {order.order_number}
                            </p>
                            <p className="mt-1 text-xs font-bold" style={{ color: primary }}>
                                الحالة: {order.status_label || order.status}
                            </p>
                            {order.tracking_number && <p className="mt-1 text-xs break-all" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>رقم التتبع: <span className="font-mono font-bold" dir="ltr">{order.tracking_number}</span></p>}
                            {order.shipped_at && <p className="mt-1 text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>تاريخ الشحن: {new Date(order.shipped_at).toLocaleDateString('ar-EG')}</p>}
                        </div>
                        {Array.isArray(order.timeline) && order.timeline.length > 0 && (
                          <div className="rounded-2xl border p-3 space-y-2" style={{borderColor:'var(--twc-border,#e5e7eb)'}}>
                            <p className="text-xs font-bold" style={{color:'var(--twc-text-primary,#111827)'}}>تتبع الطلب</p>
                            <div className="relative pe-4">
                              <div className="absolute right-2 top-2 bottom-2 w-px bg-gray-200"/>
                              {order.timeline.map((t:any, idx:number)=>(
                                <div key={idx} className="relative flex items-center gap-3 py-1.5">
                                  <span className="relative z-10 h-3 w-3 rounded-full border-2 bg-white" style={{borderColor: primary, background: primary}}/>
                                  <span className="text-xs font-semibold" style={{color:'var(--twc-text-primary,#111827)'}}>{t.label}</span>
                                  <span className="ms-auto text-[11px]" style={{color:'var(--twc-text-muted,#6b7280)'}}>{t.at ? new Date(t.at).toLocaleDateString('ar-EG') : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                            <p className="mb-2 flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                <MapPin className="h-4 w-4" /> عنوان الشحن
                            </p>
                            <p className="text-sm break-words" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                {(() => {
                                  const sa = order.shipping_address;
                                  if (!sa) return '—';
                                  if (typeof sa === 'string') return sa;
                                  return [sa.address, sa.city, sa.state, sa.postal_code, sa.country].filter(Boolean).join('، ') || '—';
                                })()}
                            </p>
                        </div>

                        <div className="space-y-2">
                            {(order.items || []).map((item: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-2xl border p-3"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                >
                                    <img src={getImageUrl(item.image)} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                            {item.quantity} × {formatCurrency(item.price, storeSettings, currencies)}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: primary }}>
                                        {formatCurrency((item.price || 0) * (item.quantity || 1), storeSettings, currencies)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div
                            className="flex items-center justify-between rounded-2xl border p-3"
                            style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                        >
                            <span className="font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                الإجمالي
                            </span>
                            <span className="text-lg font-bold" style={{ color: primary }}>
                                {formatCurrency(order.total, storeSettings, currencies)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

/* ------------------------------- Profile ------------------------------- */

interface ProfileProps {
    userProfile: any;
    storeSlug: string;
    onClose: () => void;
}

const ProfileContent: React.FC<ProfileProps> = ({ userProfile, storeSlug, onClose }) => {
    const { profile, setProfile, passwords, setPasswords, isLoading, errors, handleProfileUpdate, handlePasswordUpdate } = useAuthForm();
    let authData:any = {};
    try { authData = useAuth(); } catch {}
    const logout: () => void = authData.logout || (()=>{});
    const { behavior } = useStore() as any;
    const verificationMethod = behavior?.customer_verification_method || 'email';

    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    useEffect(() => {
        if (userProfile) {
            setProfile({
                firstName: userProfile.first_name || '',
                lastName: userProfile.last_name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                address: userProfile.address || '',
                city: userProfile.city || '',
                state: userProfile.state || '',
                country: userProfile.country || '',
                postalCode: userProfile.postalCode || '',
            });
        }
    }, [userProfile, setProfile]);

    const inputClass = 'w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2';
    const labelClass = 'mb-1.5 block text-sm font-semibold';

    return (
        <ModalShell onClose={onClose} title="ملفي الشخصي" icon={<User className="h-5 w-5" />}>
            <div className="flex border-b" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                {(['profile', 'password'] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className="flex-1 py-3 text-sm font-bold transition"
                        style={{
                            color: activeTab === tab ? primary : 'var(--twc-text-muted, #6b7280)',
                            borderBottom: activeTab === tab ? `2px solid ${primary}` : '2px solid transparent',
                        }}
                    >
                        {tab === 'profile' ? 'البيانات الشخصية' : 'تغيير كلمة المرور'}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {authData?.customer && !authData.customer.email_verified_at && verificationMethod==='email' && (
                  <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">بريدك الإلكتروني غير مؤكد — يرجى تأكيد البريد عبر الرمز المرسل لإتمام تحديث البيانات.</div>
                )}
                {authData?.customer && authData.customer.email_verified_at && (
                  <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">✓ البريد الإلكتروني مؤكد</div>
                )}
                {activeTab === 'profile' ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleProfileUpdate(storeSlug, () => {
                                toast.success('تم تحديث البيانات');
                                onClose();
                            });
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    الاسم الأول
                                </label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    className={inputClass}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                            </div>
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    اسم العائلة
                                </label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    className={inputClass}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                رقم الهاتف
                            </label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                العنوان
                            </label>
                            <input
                                type="text"
                                value={profile.address}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    المدينة
                                </label>
                                <input
                                    type="text"
                                    value={profile.city}
                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                    className={inputClass}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                            </div>
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    الدولة
                                </label>
                                <input
                                    type="text"
                                    value={profile.country}
                                    onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                                    className={inputClass}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                            style={{ background: primary }}
                        >
                            {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </form>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handlePasswordUpdate(storeSlug, () => {
                                toast.success('تم تغيير كلمة المرور');
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                كلمة المرور الحالية
                            </label>
                            <input
                                type="password"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                كلمة المرور الجديدة
                            </label>
                            <input
                                type="password"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                تأكيد كلمة المرور
                            </label>
                            <input
                                type="password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                className={inputClass}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                        {errors && Object.keys(errors).length > 0 && (
                            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                {Object.entries(errors).map(([key, msg]) => (
                                    <p key={key}>{String(msg)}</p>
                                ))}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                            style={{ background: primary }}
                        >
                            {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                        </button>
                    </form>
                )}
            </div>
            <div className="border-t p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                <button
                    type="button"
                    onClick={() => { onClose(); logout(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition hover:bg-red-50"
                    style={{ borderColor: '#fecaca', color: '#dc2626' }}
                >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400">سيتم تسجيل خروجك من هذا المتجر فقط</p>
            </div>
        </ModalShell>
    );
};

export const TemplateProfileModal: React.FC<ProfileProps> = (props) => (
    <AuthFormProvider>
        <ProfileContent {...props} />
    </AuthFormProvider>
);
