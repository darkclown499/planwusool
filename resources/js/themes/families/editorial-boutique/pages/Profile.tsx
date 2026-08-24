import { toast } from '@/components/custom-toast';
import { AuthFormProvider, useAuthForm } from '@/contexts/AuthFormContext';
import { User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { css } from '@/builder/sections/helpers';
import { ModalShell } from './shared';

interface ProfileProps {
    userProfile: any;
    storeSlug: string;
    onClose: () => void;
}

const ProfileContent: React.FC<ProfileProps> = ({ userProfile, storeSlug, onClose }) => {
    const { profile, setProfile, passwords, setPasswords, isLoading, errors, handleProfileUpdate, handlePasswordUpdate } = useAuthForm();
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

    const border = css('--twc-border', '#ededed');
    const textPrimary = css('--twc-text-primary', '#161311');
    const textSecondary = css('--twc-text-secondary', '#8a8178');
    const primary = css('--twc-primary', '#f6d7d5');
    const radius = css('--twx-radius', '4px');

    const inputClass = 'w-full border px-3.5 py-2.5 text-sm outline-none transition focus:opacity-90';
    const inputStyle = { borderColor: border, background: css('--twc-background', '#ffffff'), color: textPrimary, borderRadius: radius };
    const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em]';

    return (
        <ModalShell onClose={onClose} title="ملفي الشخصي" icon={<User className="h-5 w-5" />}>
            <div className="flex border-b" style={{ borderColor: border }}>
                {(['profile', 'password'] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className="flex-1 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition"
                        style={{
                            color: activeTab === tab ? textPrimary : textSecondary,
                            borderBottom: activeTab === tab ? `2px solid ${primary}` : '2px solid transparent',
                        }}
                    >
                        {tab === 'profile' ? 'البيانات الشخصية' : 'كلمة المرور'}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
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
                                <label className={labelClass} style={{ color: textPrimary }}>
                                    الاسم الأول
                                </label>
                                <input type="text" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className={inputClass} style={inputStyle} />
                            </div>
                            <div>
                                <label className={labelClass} style={{ color: textPrimary }}>
                                    اسم العائلة
                                </label>
                                <input type="text" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className={inputClass} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: textPrimary }}>
                                البريد الإلكتروني
                            </label>
                            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: textPrimary }}>
                                رقم الهاتف
                            </label>
                            <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: textPrimary }}>
                                العنوان
                            </label>
                            <input type="text" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass} style={{ color: textPrimary }}>
                                    المدينة
                                </label>
                                <input type="text" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className={inputClass} style={inputStyle} />
                            </div>
                            <div>
                                <label className={labelClass} style={{ color: textPrimary }}>
                                    الدولة
                                </label>
                                <input type="text" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className={inputClass} style={inputStyle} />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85 disabled:opacity-50"
                            style={{ background: primary, color: '#000000', borderRadius: radius }}
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
                            <label className={labelClass} style={{ color: textPrimary }}>
                                كلمة المرور الحالية
                            </label>
                            <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: textPrimary }}>
                                كلمة المرور الجديدة
                            </label>
                            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: textPrimary }}>
                                تأكيد كلمة المرور
                            </label>
                            <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className={inputClass} style={inputStyle} />
                        </div>
                        {errors && Object.keys(errors).length > 0 && (
                            <div className="p-3 text-sm text-red-700" style={{ background: '#fef2f2', borderRadius: radius }}>
                                {Object.entries(errors).map(([key, msg]) => (
                                    <p key={key}>{String(msg)}</p>
                                ))}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-85 disabled:opacity-50"
                            style={{ background: primary, color: '#000000', borderRadius: radius }}
                        >
                            {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                        </button>
                    </form>
                )}
            </div>
        </ModalShell>
    );
};

export const Profile: React.FC<ProfileProps> = (props) => (
    <AuthFormProvider>
        <ProfileContent {...props} />
    </AuthFormProvider>
);

export default Profile;
