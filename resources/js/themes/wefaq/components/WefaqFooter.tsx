import { CreditCard, Facebook, Instagram, Leaf, MessageCircle, Phone, Send, ShieldCheck, Truck } from 'lucide-react';
import React, { useState } from 'react';

interface WefaqFooterProps {
    brandName: string;
    brandSub: string;
    phone: string;
}

export const WefaqFooter: React.FC<WefaqFooterProps> = ({ brandName, brandSub, phone }) => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    return (
        <footer className="mt-10 bg-[#1B3B2B] text-green-50">
            <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4CAF50] text-white">
                            <Leaf className="h-6 w-6" />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-lg font-extrabold text-white">{brandName}</span>
                            <span className="block text-[11px] font-semibold text-green-200">{brandSub}</span>
                        </span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-green-100/80">
                        سوبر ماركت متكامل يقدم خضروات طازجة، ألبان، لحوم ومونة البيت بجودة عالية وأسعار منافسة مع توصيل سريع حتى باب بيتك.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        {[Facebook, Instagram, MessageCircle].map((Icon, i) => (
                            <a
                                key={i}
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#4CAF50]"
                            >
                                <Icon className="h-5 w-5" />
                            </a>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-base font-extrabold text-white">روابط سريعة</h3>
                    <ul className="mt-4 space-y-2 text-sm text-green-100/80">
                        {['الرئيسية', 'الأقسام', 'أفضل العروض', 'المنتجات العضوية', 'وصفات اليوم'].map((item) => (
                            <li key={item}>
                                <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-[#4CAF50]">
                                    {item}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-extrabold text-white">خدمة العملاء</h3>
                    <ul className="mt-4 space-y-2 text-sm text-green-100/80">
                        {['تواصل معنا', 'الأسئلة الشائعة', 'سياسة الاسترجاع', 'سياسة الخصوصية', 'الشروط والأحكام'].map(
                            (item) => (
                                <li key={item}>
                                    <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-[#4CAF50]">
                                        {item}
                                    </a>
                                </li>
                            ),
                        )}
                    </ul>
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-100/80">
                        <Phone className="h-4 w-4 text-[#4CAF50]" />
                        <span dir="ltr">{phone}</span>
                    </div>
                </div>

                <div>
                    <h3 className="text-base font-extrabold text-white">النشرة البريدية</h3>
                    <p className="mt-4 text-sm text-green-100/80">اشترك ليصلك كل جديد وأفضل العروض أولاً بأول.</p>
                    <form
                        className="mt-4 flex items-center gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (email.trim()) {
                                setSubscribed(true);
                                setEmail('');
                            }
                        }}
                    >
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            placeholder="بريدك الإلكتروني"
                            className="h-11 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder-green-200 outline-none focus:border-[#4CAF50]"
                        />
                        <button
                            type="submit"
                            aria-label="اشترك"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4CAF50] text-white transition hover:bg-[#43A047]"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                    {subscribed && <p className="mt-2 text-xs font-bold text-[#81C784]">تم الاشتراك بنجاح! 🎉</p>}
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-green-100/70 md:flex-row">
                    <p>© 2026 {brandName} — جميع الحقوق محفوظة.</p>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-[#4CAF50]" /> دفع آمن 100%
                        </span>
                        <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4 text-[#4CAF50]" /> توصيل سريع
                        </span>
                        <span className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4 text-[#4CAF50]" /> فيزا / ماستركارد / كاش
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default WefaqFooter;
