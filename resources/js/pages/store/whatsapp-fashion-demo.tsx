import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCheck, MessageCircle, ShoppingBag } from 'lucide-react';

const products = [
  { name: 'فستان سهرة أنيق', price: '45.00', emoji: '👗', tag: 'الأكثر مبيعاً' },
  { name: 'حقيبة جلد طبيعي', price: '32.00', emoji: '👜', tag: 'جديد' },
  { name: 'نظارة شمسية فاخرة', price: '18.00', emoji: '🕶️', tag: null },
  { name: 'ساعة يد كاجوال', price: '27.50', emoji: '⌚', tag: 'خصم 25%' },
  { name: 'عطر مسائي شرقي', price: '38.00', emoji: '🧴', tag: null },
];

const messages = [
  { from: 'store', text: 'أهلاً بك في متجر الأزياء ✨ اطلب أزياءك عبر واتساب' },
  { from: 'customer', text: 'هل الفستان متوفر بمقاس 38؟' },
  { from: 'store', text: 'متوفر بالطبع 👗 نرسله اليوم مع الشحن المجاني' },
  { from: 'customer', text: 'رائع، أرسل لي صورة المقاس' },
];

export default function WhatsAppFashionDemo() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setVisible((v) => Math.min(v + 1, messages.length + products.length)), 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#1e1b4b_0%,#4c1d95_55%,#1e1b4b_100%)] px-4 py-10 text-white lg:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1.5 text-sm font-medium text-violet-300">
            <MessageCircle className="h-4 w-4" />
            متجر أزياء يعمل عبر واتساب
          </div>
          <h1 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl">
            أزياؤك تصل للعميل
            <br />
            <span className="text-violet-400">بمحادثة واتساب واحدة</span>
          </h1>
          <p className="mb-8 max-w-lg text-lg leading-8 text-slate-300">
            اعرض تشكيلتك بصور حية، أرسل المقاسات، واستقبل الطلب والدفع مباشرة في المحادثة.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-full bg-violet-500 px-7 py-6 text-base font-semibold text-white hover:bg-violet-400">
              ابدأ متجر أزيائك
              <ArrowRight className="ms-2 h-5 w-5" />
            </Button>
            <Button variant="outline" className="rounded-full border-white/20 bg-white/5 px-7 py-6 text-base font-semibold text-white hover:bg-white/10">
              تسوّق تجريبياً
            </Button>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              ['+120', 'قطعة معروضة'],
              ['48س', 'شحن سريع'],
              ['+65%', 'نمو المبيعات'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-violet-400">{v}</div>
                <div className="mt-1 text-sm text-slate-300">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-[3rem] bg-violet-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/5 bg-violet-600 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg">👗</div>
              <div>
                <div className="text-sm font-semibold">بوتيك الأناقة</div>
                <div className="text-xs text-violet-100">متصل الآن</div>
              </div>
            </div>
            <div className="space-y-2 px-4 py-4">
              {messages.slice(0, visible).map((m, i) => (
                <div key={i} className={`flex ${m.from === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${m.from === 'customer' ? 'bg-white text-slate-800' : 'bg-violet-500 text-white'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {visible > messages.length &&
                products.slice(0, visible - messages.length).map((p, i) => (
                  <div key={i} className="flex justify-start">
                    <div className="flex w-full max-w-[88%] items-center gap-3 rounded-2xl border border-white/10 bg-slate-800 p-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">{p.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{p.name}</span>
                          {p.tag && (
                            <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">{p.tag}</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-violet-400">${p.price}</div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                        <CheckCheck className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              <div className="flex justify-end pt-1">
                <div className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold shadow-lg">
                  اطلب عبر واتساب
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShoppingBag className="h-4 w-4 text-violet-400" />
            الطلبات تصل مباشرة إلى رقم واتساب البوتيك
          </div>
        </div>
      </div>
    </div>
  );
}
