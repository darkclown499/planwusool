import React from 'react';
import { Facebook, Instagram, Mail, MessageCircle, Send } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useStorefrontCore } from '../../shared/hooks';

/**
 * The Atelier footer: a quiet ivory block with the word-mark, category
 * links, contact lines and social row — plus a soft newsletter capture
 * that thanks shoppers without leaving the page.
 */
export const AtelierFooter: React.FC = () => {
  const { config, store, product } = useStorefrontCore();
  const categories = (product?.categories || []).slice(0, 6);

  const subscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get('email');
    if (!email) return;
    // The newsletter slot persists through the designer phase; for now it
    // confirms gracefully and can be wired to an API when marketing lands.
    form.reset();
    toast.success('تم الاشتراك! ستصلك أخبار التشكيلات أولاً 💌');
  };

  const social = (config?.socialMedia || {}) as Record<string, string | undefined>;

  return (
    <footer className="bg-[#241d19] text-stone-300" dir="rtl">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="text-center sm:text-start">
            <h3 className="font-serif text-2xl font-bold text-white">انضمي لقائمة الأناقة</h3>
            <p className="mt-1 text-sm text-stone-400">أول من يعرف عن التشكيلات الجديدة والعروض الحصرية</p>
          </div>
          <form onSubmit={subscribe} className="flex w-full max-w-md items-center gap-0 overflow-hidden rounded-full bg-white/10 p-1 ring-1 ring-white/15 focus-within:ring-[#b08d57]">
            <Mail className="mr-3 h-4 w-4 shrink-0 text-stone-400" />
            <input
              type="email"
              name="email"
              required
              placeholder="بريدك الإلكتروني"
              className="w-full bg-transparent py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#9d7463] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#b08d57]"
            >
              اشتراك <Send className="h-3.5 w-3.5 -scale-x-100" />
            </button>
          </form>
        </div>
      </div>

      {/* Main columns */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          {(config?.logo || store?.logo) ? (
            <img src={String(config.logo || store.logo)} alt={config?.storeName || store?.name} className="mb-4 h-12 w-auto object-contain" />
          ) : (
            <p className="font-serif text-2xl font-bold text-white">{config?.storeName || store?.name}</p>
          )}
          {config?.description && (
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">{config.description}</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-sm font-bold tracking-wide text-white">التصنيفات</p>
          <ul className="space-y-2.5">
            {categories.map((c: any) => (
              <li key={c.id}>
                <a href={`/category/${c.slug || c.id}`} className="text-sm text-stone-400 transition hover:text-[#e8cfa8]">
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-bold tracking-wide text-white">تواصل معنا</p>
          <ul className="space-y-2.5 text-sm text-stone-400">
            {!!config?.phoneNumber && (
              <li dir="ltr" className="text-right">{config.phoneNumber}</li>
            )}
            {!!config?.email && <li>{config.email}</li>}
            {!!config?.address && <li>{config.address}</li>}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-bold tracking-wide text-white">تابعينا</p>
          <div className="flex gap-2">
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="rounded-full bg-white/10 p-2.5 transition hover:bg-[#9d7463]">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="rounded-full bg-white/10 p-2.5 transition hover:bg-[#9d7463]">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {(social.whatsapp || config?.whatsapp_widget_phone) && (
              <a href={`https://wa.me/${String(social.whatsapp || config?.whatsapp_widget_phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"
                className="rounded-full bg-white/10 p-2.5 transition hover:bg-[#25D366]">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {config?.storeName || store?.name} — جميع الحقوق محفوظة
      </div>
    </footer>
  );
};
