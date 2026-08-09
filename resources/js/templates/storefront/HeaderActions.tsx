import { LogIn, MessageCircle, ShoppingCart, User } from 'lucide-react';
import React from 'react';
import { useStorefrontCore } from './contexts';

/**
 * Shared header action controls for the template HeaderSection.
 * Desktop-only (the MobileAppShell owns the mobile header), token-aware.
 */

function buildWhatsAppLink(config: any, message?: string): string {
    const raw = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    const digits = String(raw).replace(/[^\d]/g, '');
    if (!digits) return 'https://wa.me';
    return `https://wa.me/${digits}?text=${encodeURIComponent(message || 'مرحباً، أود الاستفسار عن منتجاتكم.')}`;
}

export const CartButton: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { cart, ui } = useStorefrontCore();
    const count = cart.cartItems?.length || 0;

    return (
        <button
            type="button"
            aria-label="سلة التسوق"
            onClick={() => ui.setShowCart(true)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition hover:opacity-90 ${className}`}
            style={{
                background: 'var(--twc-surface, #ffffff)',
                borderColor: 'var(--twc-border, #e5e7eb)',
                color: 'var(--twc-text-primary, #111827)',
            }}
        >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
                <span
                    className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                    style={{ background: 'var(--twc-primary-600, #059669)' }}
                >
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
};

export const AccountButton: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { auth } = useStorefrontCore();

    return auth.isLoggedIn ? (
        <button
            type="button"
            aria-label="حسابي"
            onClick={() => auth.setShowOrdersModal(true)}
            className={`flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition hover:opacity-90 ${className}`}
            style={{
                background: 'var(--twc-surface, #ffffff)',
                borderColor: 'var(--twc-border, #e5e7eb)',
                color: 'var(--twc-text-primary, #111827)',
            }}
        >
            <User className="h-5 w-5" />
            <span className="hidden lg:inline">حسابي</span>
        </button>
    ) : (
        <button
            type="button"
            aria-label="تسجيل الدخول"
            onClick={() => auth.setShowLoginModal(true)}
            className={`flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-white transition hover:opacity-90 ${className}`}
            style={{ background: 'var(--twc-primary-600, #059669)' }}
        >
            <LogIn className="h-5 w-5" />
            <span className="hidden lg:inline">دخول</span>
        </button>
    );
};

export const WhatsAppButton: React.FC<{ className?: string; label?: string }> = ({ className = '', label = 'تواصل واتساب' }) => {
    const { config } = useStorefrontCore();
    const link = buildWhatsAppLink(config);

    if (link === 'https://wa.me') return null;

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 ${className}`}
        >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden md:inline">{label}</span>
        </a>
    );
};

export { buildWhatsAppLink };
