import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    BarChart3,
    Check,
    ChevronDown,
    CreditCard,
    Globe,
    LayoutTemplate,
    Menu,
    MessageCircle,
    Palette,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    X,
    Zap,
} from 'lucide-react';

const BRAND = '#10b77f';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
    { label: 'المميزات', href: '#features' },
    { label: 'كيف يعمل', href: '#how' },
    { label: 'القوالب', href: '#templates' },
    { label: 'الأسعار', href: '#pricing' },
    { label: 'الأسئلة الشائعة', href: '#faq' },
];

const FEATURES = [
    {
        icon: MessageCircle,
        title: 'طلبات واتساب مباشرة',
        desc: 'كل طلب يوصلك فوراً على واتساب — بدون تطبيق إضافي وبدون عمولة وسطاء.',
    },
    {
        icon: Palette,
        title: 'مصمم بصري بالسحب والإفلات',
        desc: 'عدّل أقسام متجرك وألوانه وخطوطه مباشرة، وشاهد النتيجة لحظة بلحظة.',
    },
    {
        icon: LayoutTemplate,
        title: '29 قالباً عربياً جاهزاً',
        desc: 'قوالب مصممة لكل نشاط: مطاعم، بقالة، أزياء، إلكترونيات وأكثر — بلمسة عربية أصيلة.',
    },
    {
        icon: CreditCard,
        title: 'أكثر من 20 بوابة دفع',
        desc: 'مدى، STC Pay، Tap، Moyasar، Stripe، PayPal وغيرها — استقبل مدفوعاتك بكل سهولة.',
    },
    {
        icon: BarChart3,
        title: 'تقارير وإحصائيات',
        desc: 'تابع مبيعاتك وزوارك وأكثر المنتجات مبيعاً من لوحة تحكم واحدة واضحة.',
    },
    {
        icon: Globe,
        title: 'نطاقك الخاص',
        desc: 'متجر على نطاق فرعي فوراً، واربط نطاقك الخاص (.com) وقتما تشاء مع SSL مجاني.',
    },
];

const STEPS = [
    {
        num: '١',
        title: 'أنشئ حسابك',
        desc: 'تسجيل خلال دقيقة واحدة — بريد إلكتروني وكلمة مرور فقط، بدون بطاقة ائتمانية.',
        icon: Sparkles,
    },
    {
        num: '٢',
        title: 'اختر قالبك وجهّز متجرك',
        desc: 'معالج ذكي يبني متجرك معك خطوة بخطوة: الاسم، الشعار، الألوان والمنتجات.',
        icon: Store,
    },
    {
        num: '٣',
        title: 'ابدأ البيع عبر واتساب',
        desc: 'شارك رابط متجرك مع عملائك واستقبل الطلبات والمدفوعات مباشرة.',
        icon: Zap,
    },
];

const STATS = [
    { value: '+29', label: 'قالباً احترافياً' },
    { value: '+20', label: 'بوابة دفع' },
    { value: '99.9%', label: 'وقت تشغيل' },
    { value: '5 دقائق', label: 'لإطلاق متجرك' },
];

const TEMPLATE_CARDS = [
    { name: 'المطاعم والتوصيل', emoji: '🍔', from: '#d31b27', to: '#e5a500' },
    { name: 'البقالة والسوبرماركت', emoji: '🛒', from: '#ed1d3b', to: '#ff7a59' },
    { name: 'الأزياء والموضة', emoji: '👗', from: '#11248f', to: '#c4ec26' },
    { name: 'التجميل والعناية', emoji: '💄', from: '#5fcb91', to: '#a8e6cf' },
    { name: 'الإلكترونيات', emoji: '📱', from: '#0069df', to: '#38bdf8' },
    { name: 'الأطفال', emoji: '🧸', from: '#f98496', to: '#9085f9' },
    { name: 'المخبوزات والحلويات', emoji: '🧁', from: '#F88C91', to: '#EA5D5C' },
    { name: 'العطور والفخامة', emoji: '🌸', from: '#f1657d', to: '#1a1c22' },
];

const TESTIMONIALS = [
    {
        name: 'أم عبدالله',
        role: 'متجر حلويات منزلية',
        text: 'كنت أستقبل الطلبات يدوياً على الواتساب وضيعت طلبات كثيرة. الآن كل طلب يوصلني منظّماً باسم الزبون والعنوان — خدمت ضعف عدد الزباين.',
        initials: 'أ ع',
    },
    {
        name: 'خالد المطيري',
        role: 'معرض إلكترونيات',
        text: 'جرّبت منصات عالمية وما كانت تناسب السوق العربي. وصول فهم المطلوب: واتساب أولاً، دفع محلي، وتصميم عربي أنيق.',
        initials: 'خ م',
    },
    {
        name: 'نورة السالم',
        role: 'براند عبايات',
        text: 'المصمم البصري خلاّني أعدّل المتجر بنفسي بدون أي مبرمج. غيّرت القالب مرتين وبضغطة زر — والمتجر أصبح أحلى من قبل.',
        initials: 'ن س',
    },
];

const FAQS = [
    {
        q: 'هل أحتاج خبرة برمجية لإنشاء متجري؟',
        a: 'أبداً. المعالج الذكي يبني متجرك خطوة بخطوة، والمصمم البصري بالسحب والإفلات يجعل التعديل أسهل من تعديل منشور على مواقع التواصل.',
    },
    {
        q: 'كيف أستلم الطلبات؟',
        a: 'كل طلب جديد يصلك برسالة واتساب منظمة فيها تفاصيل الزبون ومنتجاته وعنوانه، بالإضافة إلى لوحة الطلبات داخل المنصة وفواتير PDF جاهزة.',
    },
    {
        q: 'ما طرق الدفع المدعومة؟',
        a: 'ندعم أكثر من 20 بوابة دفع عالمية ومحلية: مدى، STC Pay، Tap، Moyasar، PayTabs، Stripe، PayPal وغيرها. يمكنك أيضاً تفعيل الدفع عند الاستلام.',
    },
    {
        q: 'هل يمكنني استخدام نطاقي الخاص؟',
        a: 'نعم. تبدأ بنطاق فرعي مجاني فوراً، ويمكنك ربط نطاقك الخاص من لوحة التحكم في أي وقت.',
    },
    {
        q: 'هل هناك فترة تجريبية؟',
        a: 'نعم، الباقة المجانية تتيح لك إطلاق متجرك بكامل المميزات الأساسية دون بطاقة ائتمانية، والترقية متى ما كبر نشاطك.',
    },
];

const PLANS = [
    {
        name: 'المجانية',
        price: '0',
        period: '/شهرياً',
        desc: 'مثالية للبداية وتجربة المنصة',
        features: ['7 قوالب مجانية', 'منتجات غير محدودة', 'طلبات واتساب', 'نطاق فرعي مجاني', 'دعم عبر البريد'],
        cta: 'ابدأ مجاناً',
        highlighted: false,
    },
    {
        name: 'النمو',
        price: '49',
        period: '/شهرياً',
        desc: 'للمتاجر الجادة التي تكبر كل يوم',
        features: [
            'كل القوالب (21+)',
            'المصمم البصري الكامل',
            'بوابات دفع متعددة',
            'صفحات مخصصة',
            'سلة مهجورة وإشعارات',
            'دعم ذو أولوية',
        ],
        cta: 'اختر باقة النمو',
        highlighted: true,
    },
    {
        name: 'الاحترافية',
        price: '99',
        period: '/شهرياً',
        desc: 'كل القوة لأكبر المتاجر والسلاسل',
        features: [
            'كل القوالب (29)',
            'تكامل ERP والمخازن',
            'نطاق خاص + SSL',
            'برنامج ولاء ونقاط',
            'إشعارات Push',
            'مدير حساب مخصص',
        ],
        cta: 'تواصل معنا',
        highlighted: false,
    },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

/** CSS-built phone mockup showing a WhatsApp order flow. */
const PhoneMockup = () => (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
        <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-emerald-500/25 via-teal-400/15 to-transparent blur-2xl" />
        <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-900 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-2 bg-emerald-700 px-4 py-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🛍️</div>
                <div className="flex-1 leading-tight">
                    <p className="text-sm font-bold">متجر وصول</p>
                    <p className="text-[10px] opacity-80">متصل الآن</p>
                </div>
                <MessageCircle className="h-5 w-5 opacity-90" />
            </div>
            <div className="space-y-2 bg-[#0b141a] bg-[radial-gradient(circle_at_top_right,#10231c,#0b141a)] px-3 py-4">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2 text-[11px] leading-relaxed text-slate-100">
                    السلام عليكم، أبغى أطلب 🌿
                </div>
                <div className="ms-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[11px] leading-relaxed text-white">
                    أهلاً وسهلاً! تفضل من قائمة المنتجات 👇
                    <span className="mt-1 block text-left text-[9px] text-slate-300">١٠:٣٢ ص</span>
                </div>
                <div className="ms-auto w-[88%] overflow-hidden rounded-2xl bg-[#005c4b] text-white">
                    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 text-4xl">🍯</div>
                    <div className="px-3 py-2">
                        <p className="text-xs font-bold">عسل سدر جبلي — ١ كجم</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-extrabold text-emerald-200">١٨٠ ر.س</span>
                            <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold">اطلب الآن</span>
                        </div>
                    </div>
                </div>
                <div className="ms-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[10px] leading-relaxed text-white">
                    ✅ تم استلام طلبك!
                    <br />
                    📦 عسل سدر × ١ = ١٨٠ ر.س
                    <br />
                    🚚 التوصيل: الرياض — حي النرجس
                    <br />
                    💳 الدفع: مدى / عند الاستلام
                    <span className="mt-1 block text-left text-[9px] text-emerald-200">✓✓ ١٠:٣٤ ص</span>
                </div>
            </div>
        </div>
        <div
            className="absolute -start-8 top-16 hidden animate-bounce rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg sm:block"
            style={{ animationDuration: '3s' }}
        >
            <p className="text-[10px] font-bold text-slate-800">🛒 طلب جديد!</p>
        </div>
        <div
            className="absolute -end-6 bottom-24 hidden animate-bounce rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg sm:block"
            style={{ animationDuration: '4s' }}
        >
            <p className="text-[10px] font-bold text-emerald-600">✓ دفع مدى ناجح</p>
        </div>
    </div>
);

const SectionHeading = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
    <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="mb-3 inline-block rounded-full bg-emerald-50 px-4 py-1 text-xs font-bold text-emerald-700">{eyebrow}</span>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        {sub && <p className="mt-4 text-base leading-relaxed text-slate-600">{sub}</p>}
    </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const ctaHref = auth.user ? route('dashboard') : route('register');

    return (
        <>
            <Head title="وصول — ابنِ متجرك على واتساب خلال 5 دقائق">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=tajawal:400,500,700,800&display=swap" rel="stylesheet" />
            </Head>

            <div dir="rtl" className="min-h-screen bg-white text-slate-800" style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}>
                {/* ============================ NAVBAR ============================ */}
                <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-md">
                    <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md" style={{ backgroundColor: BRAND }}>
                                <ShoppingBag className="h-5 w-5" />
                            </span>
                            <span className="text-xl font-extrabold text-slate-900">وصول</span>
                        </Link>

                        <div className="hidden items-center gap-7 lg:flex">
                            {NAV_LINKS.map((l) => (
                                <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">
                                    {l.label}
                                </a>
                            ))}
                        </div>

                        <div className="hidden items-center gap-3 lg:flex">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-full px-5 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                                    style={{ backgroundColor: BRAND }}
                                >
                                    لوحة التحكم
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="text-sm font-semibold text-slate-700 transition hover:text-emerald-600">
                                        تسجيل الدخول
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-full px-5 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                                        style={{ backgroundColor: BRAND }}
                                    >
                                        ابدأ مجاناً
                                    </Link>
                                </>
                            )}
                        </div>

                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="القائمة">
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </nav>

                    {mobileMenuOpen && (
                        <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
                            <div className="flex flex-col gap-1">
                                {NAV_LINKS.map((l) => (
                                    <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                        {l.label}
                                    </a>
                                ))}
                                <hr className="my-2 border-slate-100" />
                                {auth.user ? (
                                    <Link href={ctaHref} className="py-2 text-sm font-bold" style={{ color: BRAND }}>
                                        لوحة التحكم ←
                                    </Link>
                                ) : (
                                    <>
                                        <Link href={route('login')} className="py-2 text-sm font-medium text-slate-700">
                                            تسجيل الدخول
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className="mt-1 rounded-full py-2.5 text-center text-sm font-bold text-white shadow"
                                            style={{ backgroundColor: BRAND }}
                                        >
                                            ابدأ مجاناً
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </header>

                {/* ============================= HERO ============================= */}
                <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-white">
                    <div className="pointer-events-none absolute -start-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
                    <div className="pointer-events-none absolute -end-32 top-40 h-96 w-96 rounded-full bg-teal-200/25 blur-3xl" />
                    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
                        <div className="text-center lg:text-start">
                            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                منصة عربية ١٠٠٪ لبناء متاجرك على واتساب
                            </span>
                            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                                متجرك الإلكتروني على
                                <span className="mx-2 text-emerald-600">واتساب</span>
                                خلال ٥ دقائق
                            </h1>
                            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-600 lg:mx-0 lg:text-lg">
                                أنشئ متجراً احترافياً بقالب عربي جاهز، واستقبل طلباتك ومدفوعاتك مباشرة عبر واتساب — بدون مبرمج، بدون عمولات، وبدون تعقيد.
                            </p>
                            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                                <Link
                                    href={ctaHref}
                                    className="w-full rounded-full px-8 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto"
                                    style={{ backgroundColor: BRAND }}
                                >
                                    {auth.user ? 'اذهب إلى لوحة التحكم' : 'أنشئ متجرك مجاناً الآن'}
                                </Link>
                                <a href="#templates" className="w-full rounded-full border border-slate-300 bg-white px-8 py-3.5 text-center text-base font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-600 sm:w-auto">
                                    شاهد القوالب
                                </a>
                            </div>
                            <p className="mt-4 text-xs text-slate-500">✓ بدون بطاقة ائتمانية &nbsp;•&nbsp; ✓ إلغاء في أي وقت</p>

                            {/* trust row */}
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 lg:justify-start">
                                <span className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    ))}
                                    تقييم ٤.٩ من تجارنا
                                </span>
                                <span>+٢٬٠٠٠ متجر نشط</span>
                            </div>
                        </div>

                        <PhoneMockup />
                    </div>
                </section>

                {/* ============================= STATS ============================= */}
                <section className="border-y border-slate-100 bg-slate-50/70">
                    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
                        {STATS.map((s) => (
                            <div key={s.label}>
                                <p className="text-3xl font-extrabold text-emerald-600">{s.value}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ============================ FEATURES =========================== */}
                <section id="features" className="py-20 scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading eyebrow="المميزات" title="كل ما تحتاجه متجرك في مكان واحد" sub="من بناء المتجر حتى استلام المدفوعات — أدوات متكاملة صُممت خصيصاً للسوق العربي." />
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((f) => (
                                <div key={f.title} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5">
                                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                                        <f.icon className="h-6 w-6" />
                                    </span>
                                    <h3 className="mb-2 text-lg font-bold text-slate-900">{f.title}</h3>
                                    <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =========================== HOW IT WORKS ========================= */}
                <section id="how" className="bg-slate-50/70 py-20 scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading eyebrow="كيف يعمل" title="متجرك جاهز في ثلاث خطوات فقط" />
                        <div className="grid gap-8 md:grid-cols-3">
                            {STEPS.map((step, i) => (
                                <div key={step.num} className="relative rounded-2xl bg-white p-7 text-center shadow-sm">
                                    <span className="absolute -top-5 start-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full text-lg font-extrabold text-white shadow-lg rtl:translate-x-1/2" style={{ backgroundColor: BRAND }}>
                                        {step.num}
                                    </span>
                                    <span className="mx-auto mb-4 mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                        <step.icon className="h-7 w-7" />
                                    </span>
                                    <h3 className="mb-2 text-lg font-bold text-slate-900">{step.title}</h3>
                                    <p className="text-sm leading-relaxed text-slate-600">{step.desc}</p>
                                    {i < STEPS.length - 1 && (
                                        <ChevronDown className="absolute -bottom-9 start-1/2 hidden h-8 w-8 -translate-x-1/2 text-emerald-300 rtl:translate-x-1/2 md:hidden" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ============================ TEMPLATES ========================== */}
                <section id="templates" className="py-20 scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading
                            eyebrow="القوالب"
                            title="قالب جاهز لكل نشاط تجاري"
                            sub="أكثر من ٢٩ قالباً عربياً بألوانه وأقسامه المصممة بعناية — اختر قالبك وفعّله بضغطة واحدة."
                        />
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {TEMPLATE_CARDS.map((tpl) => (
                                <Link key={tpl.name} href={ctaHref} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                                    <div className="flex h-32 items-center justify-center text-5xl transition group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${tpl.from}, ${tpl.to})` }}>
                                        {tpl.emoji}
                                    </div>
                                    <p className="p-4 text-center text-sm font-bold text-slate-800 group-hover:text-emerald-600">{tpl.name}</p>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-10 text-center">
                            <a href="#pricing" className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-7 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100">
                                استعرض كل القوالب الـ ٢٩ ←
                            </a>
                        </div>
                    </div>
                </section>

                {/* =========================== TESTIMONIALS ======================== */}
                <section className="bg-slate-50/70 py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading eyebrow="آراء التجار" title="قصص نجاح من متاجر حقيقية" />
                        <div className="grid gap-6 md:grid-cols-3">
                            {TESTIMONIALS.map((tm) => (
                                <figure key={tm.name} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <div className="mb-3 flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">"{tm.text}"</blockquote>
                                    <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-700">{tm.initials}</span>
                                        <span>
                                            <span className="block text-sm font-bold text-slate-900">{tm.name}</span>
                                            <span className="block text-xs text-slate-500">{tm.role}</span>
                                        </span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ============================= PRICING =========================== */}
                <section id="pricing" className="py-20 scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading eyebrow="الأسعار" title="باقات بسيطة تنمو معك" sub="ابدأ مجاناً وقم بالترقية عندما يكبر نشاطك — بدون عقود وبدون مفاجآت." />
                        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
                            {PLANS.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`relative flex flex-col rounded-2xl p-7 shadow-sm transition hover:-translate-y-1 ${
                                        plan.highlighted ? 'border-2 shadow-lg shadow-emerald-500/10' : 'border border-slate-200 bg-white'
                                    }`}
                                    style={plan.highlighted ? { borderColor: BRAND } : {}}
                                >
                                    {plan.highlighted && (
                                        <span className="absolute -top-3.5 start-1/2 rounded-full px-4 py-1 text-xs font-extrabold text-white shadow rtl:-translate-x-1/2" style={{ backgroundColor: BRAND }}>
                                            الأكثر شعبية
                                        </span>
                                    )}
                                    <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                                    <p className="mt-1 text-xs text-slate-500">{plan.desc}</p>
                                    <p className="mt-4">
                                        <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                                        <span className="text-sm font-medium text-slate-500"> ر.س {plan.period}</span>
                                    </p>
                                    <ul className="mt-6 flex-1 space-y-3">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                                    <Check className="h-3 w-3" strokeWidth={3} />
                                                </span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={ctaHref}
                                        className={`mt-7 rounded-full py-3 text-center text-sm font-bold transition ${
                                            plan.highlighted ? 'text-white shadow-md hover:brightness-110' : 'border border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-600'
                                        }`}
                                        style={plan.highlighted ? { backgroundColor: BRAND } : {}}
                                    >
                                        {plan.cta}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =============================== FAQ ============================= */}
                <section id="faq" className="bg-slate-50/70 py-20 scroll-mt-16">
                    <div className="mx-auto max-w-3xl px-4 sm:px-6">
                        <SectionHeading eyebrow="الأسئلة الشائعة" title="عندك سؤال؟ عندنا الجواب" />
                        <div className="space-y-3">
                            {FAQS.map((faq, i) => (
                                <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start">
                                        <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                                        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openFaq === i && <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{faq.a}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ============================ FINAL CTA ========================== */}
                <section className="relative overflow-hidden py-20" style={{ background: `linear-gradient(135deg, #064e3b, ${BRAND})` }}>
                    <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
                    <div className="pointer-events-none absolute -start-16 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
                        <h2 className="text-3xl font-extrabold leading-snug text-white sm:text-4xl">جاهز تطلق متجرك على واتساب؟</h2>
                        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-emerald-50/90">
                            انضم لأكثر من ٢٬٠٠٠ تاجر يبيعون يومياً عبر وصول — أنشئ متجرك الآن مجاناً وابدأ باستقبال طلباتك الأولى اليوم.
                        </p>
                        <Link href={ctaHref} className="mt-8 inline-block rounded-full bg-white px-10 py-3.5 text-base font-extrabold text-emerald-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-50">
                            {auth.user ? 'الذهاب إلى لوحة التحكم' : 'أنشئ متجرك مجاناً'}
                        </Link>
                        <p className="mt-4 text-xs text-emerald-100/80">بدون بطاقة ائتمانية • إعداد خلال ٥ دقائق • دعم عربي كامل</p>
                    </div>
                </section>

                {/* ============================== FOOTER =========================== */}
                <footer className="bg-slate-900 py-12 text-slate-400">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="grid gap-8 md:grid-cols-4">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND }}>
                                        <ShoppingBag className="h-5 w-5" />
                                    </span>
                                    <span className="text-xl font-extrabold text-white">وصول</span>
                                </div>
                                <p className="text-xs leading-relaxed">منصة عربية لبناء المتاجر الإلكترونية والبيع عبر واتساب — بساطة في الإدارة، احترافية في النتيجة.</p>
                            </div>
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-white">المنتج</h4>
                                <ul className="space-y-2 text-xs">
                                    {NAV_LINKS.slice(0, 4).map((l) => (
                                        <li key={l.href}>
                                            <a href={l.href} className="transition hover:text-emerald-400">{l.label}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-white">ابدأ الآن</h4>
                                <ul className="space-y-2 text-xs">
                                    <li><Link href={route('register')} className="transition hover:text-emerald-400">إنشاء حساب جديد</Link></li>
                                    <li><Link href={route('login')} className="transition hover:text-emerald-400">تسجيل الدخول</Link></li>
                                    <li><a href="#pricing" className="transition hover:text-emerald-400">الباقات والأسعار</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="mb-3 text-sm font-bold text-white">تواصل معنا</h4>
                                <ul className="space-y-2 text-xs">
                                    <li>support@wusool.app</li>
                                    <li>الدعم الفني: ٩ص – ٩م</li>
                                    <li className="pt-1">
                                        <a href="#faq" className="transition hover:text-emerald-400">الأسئلة الشائعة</a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs">© ٢٠٢٦ وصول. جميع الحقوق محفوظة.</div>
                    </div>
                </footer>
            </div>
        </>
    );
}

