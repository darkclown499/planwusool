import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useRotatingAnnouncement, useStorefrontCore } from '../../shared/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { POLICY_LINKS, getPolicyContent } from './PolicyContent';

interface AnnouncementBarProps {
  messages?: string[];
  /** Dynamic single text override (from Designer — announcement_text). */
  text?: string;
  /** Background color (announcement_bg_color). */
  bgColor?: string;
  /** Text/icon color (announcement_text_color). */
  textColor?: string;
  /** Visibility toggle (show_announcement). */
  visible?: boolean;
}

const DEFAULT_MESSAGES = [
  'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح',
  'شحن مجاني للطلبات فوق 250 ₪',
  'تشكيلات جديدة كل أسبوع — كوني الأولى بمن تراها',
];

/**
 * Atelier announcement ribbon — a slim editorial strip above the header.
 * Fixed overlap: icons and text are now inline flex with gap-2, no absolute
 * stacking. Rotates between messages when multiple are supplied; when a single
 * dynamic `text` is passed it renders inline without collision.
 */
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  messages,
  text,
  bgColor,
  textColor,
  visible,
}) => {
  // Bind to live store content when props are not explicitly passed (storefront rendering).
  const core = useStorefrontCore();
  const storeAnnouncement: any = (core as any)?.content?.announcement ?? {};
  const storeCfg: any = (core as any)?.config ?? {};
  const storeObj: any = (core as any)?.store ?? {};

  // Resolve dynamic props: explicit prop > store content > defaults.
  const effectiveText = typeof text === 'string' ? text : (storeAnnouncement.text ?? storeAnnouncement.announcement_text ?? undefined);
  const effectiveBg = typeof bgColor === 'string' ? bgColor : (storeAnnouncement.bg_color ?? storeAnnouncement.announcement_bg_color ?? undefined);
  const effectiveTextColor = typeof textColor === 'string' ? textColor : (storeAnnouncement.text_color ?? storeAnnouncement.announcement_text_color ?? undefined);
  const effectiveVisible = typeof visible === 'boolean' ? visible : (typeof storeAnnouncement.enabled === 'boolean' ? storeAnnouncement.enabled : (typeof storeAnnouncement.show_announcement === 'boolean' ? storeAnnouncement.show_announcement : true));

  const [openKey, setOpenKey] = useState<null | 'about' | 'shipping' | 'privacy'>(null);

  const vars = {
    STORE_NAME: String(storeCfg.storeName || storeObj.name || 'متجرنا'),
    STORE_PHONE: String(storeCfg.phoneNumber || storeCfg.phone || storeObj.phone || ''),
    STORE_CITY: String(storeCfg.city || storeCfg.address || storeObj.city || ''),
  };

  if (effectiveVisible === false) return null;

  const hasSingleText = typeof effectiveText === 'string' && (effectiveText as string).trim().length > 0;
  const items = hasSingleText
    ? [(effectiveText as string).trim()]
    : (messages && messages.length > 0 ? messages.filter(Boolean) : DEFAULT_MESSAGES);
  const index = useRotatingAnnouncement(items.length);
  const current = items[index] ?? items[0] ?? '';

  const barBg = effectiveBg && (effectiveBg as string).trim() ? (effectiveBg as string).trim() : 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)';
  const barColor = effectiveTextColor && (effectiveTextColor as string).trim() ? (effectiveTextColor as string).trim() : '#f5ede2';
  const isGradient = barBg.includes('gradient');

  const activePolicy = openKey ? getPolicyContent(openKey, vars) : null;

  return (
    <>
      <div
        dir="rtl"
        className="relative z-40 flex items-center justify-center gap-2 overflow-hidden px-4 py-2 text-center"
        style={isGradient ? { background: barBg, color: barColor } : { backgroundColor: barBg, color: barColor }}
      >
        {/* Announcement inline with sparkles — gap-2 prevents overlap */}
        <div className="flex items-center justify-center gap-2 text-center">
          <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: barColor, opacity: 0.9 }} aria-hidden />
          <span className="min-w-0 whitespace-nowrap text-center text-[12px] font-medium tracking-wide" style={{ color: barColor }}>
            {current}
          </span>
          <Sparkles className="h-3.5 w-3.5 shrink-0 scale-x-[-1]" style={{ color: barColor, opacity: 0.9 }} aria-hidden />
        </div>

        {/* Top header links — desktop inline, hidden on mobile to save space */}
        <nav className="ms-6 hidden items-center gap-4 border-s border-white/20 ps-6 text-xs md:flex" aria-label="روابط معلومات المتجر" style={{ borderColor: `${barColor}33` }}>
          {POLICY_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => setOpenKey(link.key)}
              className="whitespace-nowrap text-xs hover:underline"
              style={{ color: barColor }}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Lightweight modals for the 3 links — inject store variables */}
      {POLICY_LINKS.map((link) => {
        if (openKey !== link.key || !activePolicy) return null;
        const isActive = openKey === link.key;
        const content = getPolicyContent(link.key, vars);
        return (
          <Dialog key={link.key} open={isActive} onOpenChange={(o) => !o && setOpenKey(null)}>
            <DialogContent dir="rtl" className="max-h-[80vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold text-stone-900">{content.title}</DialogTitle>
                <DialogDescription className="sr-only">{content.title}</DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                {content.body}
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </>
  );
};
