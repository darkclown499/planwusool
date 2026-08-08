import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCheck,
  FolderOpen,
  Globe,
  Lock,
  Menu,
  MessageCircle,
  Minus,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShoppingCart,
  Star,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { demoStores, type DemoProduct, type DemoStore } from './demoStores';
import { demoAudio } from './demoSounds';

type Stage = 'idle' | 'boot' | 'desktop' | 'browser' | 'loading' | 'demo';

interface HeroComputerDemoProps {
  brandColor?: string;
  appName?: string;
  appLogo?: string;
}

interface CartItem {
  product: DemoProduct;
  qty: number;
}

const QUERY = 'كيف شكل موقعي مع وصول؟';
const WA_BG = '#25d366';

interface CursorState {
  x: number;
  y: number;
  dur: number;
}

const BOOT_STEPS = ['تحضير النظام...', 'تهيئة المتجر...', 'جلب أدواتك...', 'كل شيء جاهز 🎉'];

export default function HeroComputerDemo({
  brandColor = '#10b77f',
  appName = 'وصول',
  appLogo = '',
}: HeroComputerDemoProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [storeIndex, setStoreIndex] = useState(0);
  const [bootProgress, setBootProgress] = useState(0);
  const [typed, setTyped] = useState('');
  const [storeReady, setStoreReady] = useState(false);
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, dur: 600 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<DemoProduct | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTyped, setChatTyped] = useState(0);
  const [chatReplied, setChatReplied] = useState(false);
  const [order, setOrder] = useState<CartItem[]>([]);

  const runIdRef = useRef(0);
  const screenRef = useRef<HTMLDivElement>(null);
  const browserIconRef = useRef<HTMLButtonElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const waBtnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const orderBtnRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const store = demoStores[storeIndex];
  const nextStore = demoStores[(storeIndex + 1) % demoStores.length];

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const orderTotal = order.reduce((s, i) => s + i.product.price * i.qty, 0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const flyTo = useCallback((el: HTMLElement | null, dur = 1000) => {
    const scr = screenRef.current;
    if (!scr || !el) return;
    const sr = scr.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setCursor({
      x: er.left - sr.left + er.width / 2 - 2,
      y: er.top - sr.top + er.height / 2 - 2,
      dur,
    });
  }, []);

  const doClick = useCallback(() => {
    setClicking(true);
    demoAudio.click();
    window.setTimeout(() => setClicking(false), 210);
  }, []);

  const cursorToScreen = useCallback(() => {
    const scr = screenRef.current;
    if (!scr) return;
    const r = scr.getBoundingClientRect();
    setCursor({ x: r.width / 2 - 2, y: r.height - 78, dur: 500 });
  }, []);

  const resetAll = useCallback(() => {
    setDetail(null);
    setToast(null);
    setTyped('');
    setStoreReady(false);
    setClicking(false);
    setCursorVisible(false);
    setBootProgress(0);
    setCart([]);
    setCartOpen(false);
    setChatOpen(false);
    setChatTyped(0);
    setChatReplied(false);
    setOrder([]);
  }, []);

  const runCycle = useCallback((index: number) => {
    const id = ++runIdRef.current;
    const next = ((index % demoStores.length) + demoStores.length) % demoStores.length;
    setStoreIndex(next);
    resetAll();
    demoAudio.ensure();
    demoAudio.setMuted(stateMutedRef.current);

    setStage('boot');
    void (async () => {
      const t0 = performance.now();
      const duration = 2600;
      while (performance.now() - t0 < duration) {
        if (runIdRef.current !== id) return;
        setBootProgress(Math.min(1, (performance.now() - t0) / duration));
        await new Promise((r) => setTimeout(r, 45));
      }
      if (runIdRef.current !== id) return;
      setBootProgress(1);
      setStage('desktop');
    })();
  }, [resetAll]);

  const stateMutedRef = useRef(muted);
  useEffect(() => {
    stateMutedRef.current = muted;
    demoAudio.setMuted(muted);
  }, [muted]);

  /* ── Stage: desktop → mouse moves to the browser icon ── */
  useEffect(() => {
    if (stage !== 'desktop') return;
    const id = runIdRef.current;
    demoAudio.boot();
    const t1 = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      cursorToScreen();
      setCursorVisible(true);
      flyTo(browserIconRef.current, 1600);
    }, 900);
    const t2 = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      doClick();
    }, 2700);
    const t3 = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      setStage('browser');
    }, 2980);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [stage, cursorToScreen, doClick, flyTo]);

  /* ── Browser → type the query in the address bar ── */
  useEffect(() => {
    if (stage !== 'browser') return;
    const id = runIdRef.current;
    demoAudio.open();
    const t0 = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      flyTo(addressRef.current, 950);
    }, 620);
    const start = Date.now();
    const typing = window.setInterval(() => {
      if (runIdRef.current !== id) {
        window.clearInterval(typing);
        return;
      }
      const i = Math.floor((Date.now() - start) / 120);
      if (i >= QUERY.length) {
        window.clearInterval(typing);
        doClick();
        window.setTimeout(() => {
          if (runIdRef.current === id) setStage('loading');
        }, 420);
        return;
      }
      setTyped(QUERY.slice(0, i + 1));
      demoAudio.type();
    }, 60);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(typing);
    };
  }, [stage, flyTo, doClick]);

  /* ── Loading → store appears ── */
  useEffect(() => {
    if (stage !== 'loading') return;
    const id = runIdRef.current;
    demoAudio.load();
    const t = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      setStage('demo');
      setStoreReady(true);
      demoAudio.pop();
    }, 1900);
    return () => window.clearTimeout(t);
  }, [stage]);

  /* ── Demo store: cinematic guided shopping flow, then user control ── */
  useEffect(() => {
    if (stage !== 'demo' || !storeReady) return;
    const id = runIdRef.current;
    const products = store.products;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(
        window.setTimeout(() => {
          if (runIdRef.current === id) fn();
        }, ms)
      );
    };

    const openAsking = (i: number) => {
      setDetail(products[i]);
      demoAudio.open();
    };
    const addGuided = (i: number) => {
      demoAudio.addCart();
      setToast('تمت إضافة المنتج للسلة ✓');
      setDetail(null);
      setCart((prev) => {
        const found = prev.find((c) => c.product.name === products[i].name);
        if (found) {
          return prev.map((c) => (c.product.name === products[i].name ? { ...c, qty: c.qty + 1 } : c));
        }
        return [...prev, { product: products[i], qty: 1 }];
      });
    };

    // 1) add product 0
    at(900, () => flyTo(cardRefs.current[0], 1300));
    at(1400, () => { doClick(); openAsking(0); });
    at(2100, () => flyTo(addBtnRef.current, 1000));
    at(2950, () => { doClick(); });
    at(3050, () => addGuided(0));

    // 2) add product 1
    at(3900, () => flyTo(cardRefs.current[1], 1300));
    at(4400, () => { doClick(); openAsking(1); });
    at(5100, () => flyTo(addBtnRef.current, 1000));
    at(5950, () => { doClick(); });
    at(6050, () => addGuided(1));

    // 3) add product 2
    at(6900, () => flyTo(cardRefs.current[2], 1300));
    at(7400, () => { doClick(); openAsking(2); });
    at(8100, () => flyTo(addBtnRef.current, 1000));
    at(8950, () => { doClick(); });
    at(9050, () => addGuided(2));

    // 4) open the cart
    at(10200, () => flyTo(cartBtnRef.current, 1200));
    at(11100, () => {
      doClick();
      demoAudio.cartOpen();
      setCartOpen(true);
    });

    // 5) press "اطلب عبر واتساب"
    at(11900, () => flyTo(orderBtnRef.current, 1100));
    at(12900, () => {
      doClick();
      demoAudio.chatOpen();
      setOrder([...cartRef.current]);
      setCart([]);
      setCartOpen(false);
      setChatOpen(true);
      setChatTyped(0);
      setChatReplied(false);
    });

    // 6) idle living motion while the user takes over
    let flip = 0;
    let idleTimer = window.setTimeout(function loopIdle() {
      if (runIdRef.current !== id) return;
      flip = flip === 0 ? 1 : 0;
      flyTo(flip === 0 ? cardRefs.current[1] : cardRefs.current[3], 3200);
      idleTimer = window.setTimeout(loopIdle, 4600);
    }, 13800);
    timers.push(idleTimer);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [stage, storeReady, storeIndex, store, flyTo, doClick]);

  /* keep the latest cart reachable inside the cinematic timeline */
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  /* ── WhatsApp chat: progressive typing + reply ── */
  useEffect(() => {
    if (!chatOpen) return;
    const id = runIdRef.current;
    const full = `مرحباً ${store.name} 👋\nأريد طلب: ${order.map((i) => `1× ${i.product.name}`).join('، ')}\nالإجمالي: ${orderTotal}₪`;
    let i = 0;
    const typing = window.setInterval(() => {
      if (runIdRef.current !== id) {
        window.clearInterval(typing);
        return;
      }
      i += 1;
      setChatTyped(i);
      if (i % 3 === 0) demoAudio.type();
      if (i >= full.length) {
        window.clearInterval(typing);
        demoAudio.chatSend();
        window.setTimeout(() => {
          if (runIdRef.current !== id) return;
          setChatReplied(true);
          demoAudio.chatReply();
        }, 900);
      }
    }, 45);
    const closeTimer = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      setChatOpen(false);
      setChatTyped(0);
      setChatReplied(false);
      setToast('تم استلام طلبك — تصفح المتجر بنفسك');
    }, full.length * 45 + 3200);
    return () => {
      window.clearInterval(typing);
      window.clearTimeout(closeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, storeIndex]);

  /* ── detail auto-close safety ── */
  useEffect(() => {
    if (!detail) return;
    const t = window.setTimeout(() => setDetail(null), 15000);
    return () => window.clearTimeout(t);
  }, [detail]);

  /* ── toast auto-hide ── */
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const waClick = useCallback(() => {
    demoAudio.pop();
    setToast('تم فتح واتساب — أرسل رسالتك الآن');
  }, []);

  const openDetail = useCallback((product: DemoProduct) => {
    demoAudio.open();
    setDetail(product);
  }, []);

  const closeDetail = useCallback(() => {
    demoAudio.click();
    setDetail(null);
  }, []);

  const addToCart = useCallback((product: DemoProduct) => {
    demoAudio.addCart();
    setToast('تمت إضافة المنتج للسلة ✓');
    setCart((prev) => {
      const found = prev.find((c) => c.product.name === product.name);
      if (found) {
        return prev.map((c) => (c.product.name === product.name ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const clockTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockDate = now.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });

  const showBrowser = stage === 'browser' || stage === 'loading' || stage === 'demo';
  const addressFilled = stage === 'loading' || stage === 'demo';

  const bootStep = bootProgress > 0.9 ? 3 : bootProgress > 0.6 ? 2 : bootProgress > 0.3 ? 1 : 0;
  const completedSteps = BOOT_STEPS.slice(0, bootStep);
  const currentStep = BOOT_STEPS[Math.min(bootStep, 3)];

  const chatFull =
    chatOpen
      ? `مرحباً ${store.name} 👋\nأريد طلب: ${order.map((i) => `1× ${i.product.name}`).join('، ')}\nالإجمالي: ${orderTotal}₪`
      : '';

  return (
    <div className="mx-auto w-full max-w-[620px]" dir="rtl">
      {/* ── Monitor ── */}
      <div className="relative rounded-[22px] border border-slate-600/60 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-2 shadow-[0_40px_90px_-24px_rgba(0,0,0,0.75)] sm:p-3">
        <div
          className="pointer-events-none absolute inset-0 m-6 rounded-2xl opacity-30 blur-3xl"
          style={{ background: brandColor }}
        />
        <div ref={screenRef} className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-black ring-1 ring-black/60">
          {/* ── idle ── */}
          {stage === 'idle' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-5"
              style={{ background: `radial-gradient(circle at 50% 36%, ${brandColor}2e 0%, transparent 62%), #07090b` }}
            >
              <button
                aria-label="تشغيل العرض"
                onClick={() => runCycle(0)}
                className="play-btn group relative flex h-20 w-20 items-center justify-center rounded-full"
              >
                <span className="play-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${brandColor}` }} />
                <span
                  className="absolute inset-0 rounded-full opacity-60"
                  style={{ boxShadow: `0 0 60px 12px ${brandColor}55, inset 0 0 30px ${brandColor}33` }}
                />
                <span
                  className="relative flex h-16 w-16 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}aa)`, boxShadow: `0 10px 34px ${brandColor}66` }}
                >
                  <Play size={26} fill="currentColor" className="mr-1" />
                </span>
              </button>
              <div className="text-center">
                <p className="text-sm font-extrabold text-white">شاهد كيف يكون متجرك مع {appName}</p>
                <p className="mt-1 text-[11px] text-white/40">اضغط زر التشغيل لبدء العرض • الصوت قابل للكتم</p>
              </div>
            </div>
          )}

          {/* ── boot: modern cinematic ── */}
          {stage === 'boot' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#06090b]">
              <div className="boot-flash absolute inset-0" />
              <div className="scanlines absolute inset-0 pointer-events-none" />
              <div className="relative flex items-center justify-center">
                {/* orbit ring */}
                <div className="boot-orbit absolute h-40 w-40 rounded-full" style={{ borderColor: `${brandColor}66` }} />
                <div className="boot-orbit-dot absolute" style={{ background: brandColor, boxShadow: `0 0 14px ${brandColor}` }} />
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="boot-logo h-16 w-auto max-w-[70%] object-contain" />
                ) : (
                  <span
                    className="boot-logo select-none text-5xl font-black"
                    style={{ color: brandColor, textShadow: `0 0 40px ${brandColor}88` }}
                  >
                    {appName}
                  </span>
                )}
              </div>

              {/* boot step lines */}
              <div className="flex h-10 w-56 flex-col items-center justify-center gap-1">
                {completedSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/60">
                    <Check size={10} className="text-emerald-400" />
                    <span className="line-through decoration-emerald-400/40">{step.replace('...', '')}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/85">
                  <span className="boot-dots flex items-center gap-0.5">
                    <span className="boot-dot" style={{ background: brandColor }} />
                    <span className="boot-dot" style={{ background: brandColor, animationDelay: '0.15s' }} />
                    <span className="boot-dot" style={{ background: brandColor, animationDelay: '0.3s' }} />
                  </span>
                  {currentStep}
                </div>
              </div>

              <div className="w-52">
                <div className="h-[5px] overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-100 ease-linear"
                    style={{ width: `${Math.round(bootProgress * 100)}%`, background: `linear-gradient(90deg, ${brandColor}, #fff)` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-white/40">التحميل...</span>
                  <span className="text-white/70" dir="ltr">{Math.round(bootProgress * 100)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ── desktop + browser ── */}
          {(stage === 'desktop' || stage === 'browser' || stage === 'loading' || stage === 'demo') && (
            <>
              {/* wallpaper */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ background: `linear-gradient(150deg, #0f172a 0%, #182338 45%, #0c121f 100%)` }}
              >
                <div className="wall-blob absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: brandColor, opacity: 0.28 }} />
                <div className="wall-blob-2 absolute -left-20 bottom-10 h-56 w-56 rounded-full blur-3xl" style={{ background: brandColor, opacity: 0.15 }} />
                <div
                  className="absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage: `linear-gradient(${brandColor}60 1px, transparent 1px), linear-gradient(90deg, ${brandColor}60 1px, transparent 1px)`,
                    backgroundSize: '34px 34px',
                  }}
                />
              </div>

              {/* icons */}
              {stage === 'desktop' && (
                <>
                  <div className="absolute right-2 top-2 z-10 hidden flex-col gap-2.5 sm:flex">
                    <DesktopIcon ref={browserIconRef} icon={<Globe size={18} />} label="المتصفح" brandColor={brandColor} active glow />
                    <DesktopIcon icon={<MessageCircle size={18} />} label="واتساب" brandColor="#25D366" />
                    <DesktopIcon icon={<FolderOpen size={18} />} label="الملفات" brandColor={brandColor} />
                    <DesktopIcon icon={<Settings size={18} />} label="الإعدادات" brandColor={brandColor} />
                    <DesktopIcon icon={<Camera size={18} />} label="الكاميرا" brandColor="#38bdf8" />
                    <DesktopIcon icon={<ShoppingCart size={18} />} label="المتجر" brandColor={brandColor} />
                  </div>
                  {/* welcome toast */}
                  <div className="welcome-toast absolute left-1/2 top-4 z-20 -translate-x-1/2">
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[10px] font-bold text-white shadow-xl backdrop-blur">
                      <span className="text-emerald-300">👋</span> أهلاً بك — متجرك جاهز الآن
                    </div>
                  </div>
                </>
              )}

              {/* taskbar */}
              <div className="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between border-t border-white/10 bg-white/[0.06] px-2 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 border border-white/10">
                    <MessageCircle size={11} className="text-[#25D366]" />
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 border border-white/10">
                    <Globe size={11} className="text-white/80" />
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 border border-white/10">
                    <ShoppingCart size={11} className="text-white/80" />
                  </span>
                  <span className="ml-1 rounded-md bg-black/30 px-2 py-0.5 text-[8px] font-bold text-white/70">ابدأ</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-white/70">
                  <span>{clockDate}</span>
                  <span className="rounded-md bg-black/40 px-1.5 py-0.5 font-bold text-white/85" dir="ltr">
                    {clockTime}
                  </span>
                </div>
              </div>

              {/* browser window */}
              {showBrowser && (
                <div className="app-open absolute inset-1 bottom-[44px] z-10 flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                  {/* tab bar */}
                  <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-100 px-2 pt-1.5">
                    <div className="flex items-center gap-1.5 rounded-t-md bg-white px-2 py-1 text-[9px] font-semibold text-gray-700">
                      <span
                        className="flex h-3.5 w-3.5 items-center justify-center rounded text-[8px]"
                        style={{ background: `linear-gradient(135deg, ${store.brand}, ${store.brandDeep})` }}
                      >
                        {store.emoji}
                      </span>
                      <span className="max-w-[60px] truncate sm:max-w-[110px]" dir="rtl">
                        {addressFilled ? store.name : 'متجرك الجديد'}
                      </span>
                      <X size={8} className="text-gray-400" />
                    </div>
                    <div className="hidden items-center gap-1 rounded-t-md px-2 py-1 text-[9px] text-gray-400 sm:flex">
                      <Lock size={8} className="text-green-600" /> الصفحة الجديدة
                    </div>
                    <Plus size={10} className="mr-auto text-gray-500" />
                    <Menu size={10} className="text-gray-500" />
                  </div>

                  {/* toolbar */}
                  <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-2 py-1">
                    <ArrowRight size={11} className="text-gray-400" />
                    <ArrowLeft size={11} className="text-gray-600" />
                    <RefreshCw size={11} className={stage === 'loading' ? 'animate-spin text-blue-500' : 'text-gray-500'} />
                    <div
                      ref={addressRef}
                      className="mx-1 flex h-5 flex-1 cursor-text items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 text-[8.5px] text-gray-500"
                      dir="rtl"
                    >
                      {addressFilled ? (
                        <>
                          <Lock size={8} className="text-green-600" />
                          <span dir="ltr" className="truncate font-medium text-gray-700">
                            https://{store.url}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center truncate font-medium text-gray-800">
                          {typed}
                          <span className="caret ml-0.5 inline-block" />
                        </span>
                      )}
                    </div>
                    <Star size={10} className="text-gray-400" />
                    <Menu size={10} className="text-gray-400" />
                  </div>

                  {/* loading progress */}
                  {stage === 'loading' && (
                    <div className="h-[3px] w-full bg-gray-100">
                      <div className="loading-bar h-full" style={{ background: brandColor }} />
                    </div>
                  )}

                  {/* content */}
                  <div className="relative flex-1 overflow-hidden bg-white">
                    {stage === 'loading' ? <StoreSkeleton brandColor={brandColor} /> : null}
                    {stage === 'demo' && storeReady ? (
                      <div key={store.id} className="stage-enter h-full">
                        <StoreView
                          store={store}
                          brandColor={brandColor}
                          cartCount={cartCount}
                          onOpenDetail={openDetail}
                          onWaClick={waClick}
                          onCartClick={() => {
                            demoAudio.cartOpen();
                            setCartOpen((v) => !v);
                          }}
                          waBtnRef={waBtnRef}
                          bubbleRef={bubbleRef}
                          cartBtnRef={cartBtnRef}
                          cardRefs={cardRefs}
                        />
                        {/* ── cart drawer ── */}
                        {cartOpen && (
                          <CartDrawer
                            items={cart}
                            total={cartTotal}
                            orderBtnRef={orderBtnRef}
                            onClose={() => {
                              demoAudio.click();
                              setCartOpen(false);
                            }}
                            onOrder={() => {
                              demoAudio.chatOpen();
                              setOrder([...cart]);
                              setCart([]);
                              setCartOpen(false);
                              setChatOpen(true);
                              setChatTyped(0);
                              setChatReplied(false);
                            }}
                          />
                        )}
                      </div>
                    ) : null}
                    {stage === 'browser' ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] text-gray-400">فتح الصفحة...</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* ── WhatsApp chat window ── */}
              {chatOpen && storeReady && (
                <div className="chat-pop absolute inset-1 bottom-[44px] z-30 flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                  {/* header */}
                  <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[12px]">
                      {store.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="text-[10px] font-extrabold leading-tight">{store.name}</p>
                      <p className="text-[7.5px] text-white/80">متصل الآن — رد إلكتروني سريع</p>
                    </div>
                    <MessageCircle size={12} className="text-white/70" />
                  </div>
                  {/* messages */}
                  <div className="flex-1 space-y-2 overflow-hidden bg-[#e5ddd5] p-2.5" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                    {/* user order bubble */}
                    {chatTyped > 0 && (
                      <div className="msg-in ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-2.5 py-1.5 shadow-sm">
                        <p className="whitespace-pre-line text-[8.5px] leading-relaxed text-gray-800">
                          {chatFull.slice(0, chatTyped)}
                          <span className="caret ml-0.5 inline-block bg-gray-600" style={{ width: 1.5, height: 8 }} />
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[6.5px] text-gray-500">
                          {now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          {chatReplied || chatTyped >= chatFull.length ? (
                            <CheckCheck size={8} className="text-sky-500" />
                          ) : (
                            <Check size={8} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    )}
                    {/* typing indicator */}
                    {chatTyped >= chatFull.length && !chatReplied && (
                      <div className="msg-in flex w-14 items-center gap-1 rounded-lg rounded-tr-sm bg-white px-2.5 py-1.5 shadow">
                        <span className="typing-dot" />
                        <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                        <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
                      </div>
                    )}
                    {/* reply bubble */}
                    {chatReplied && (
                      <div className="msg-in max-w-[70%] rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5 shadow">
                        <p className="text-[8.5px] leading-relaxed text-gray-800">
                          تم استلام طلبكم ✅ سنقوم بتأكيده خلال دقائق وسيتواصل معك المندوب. شكرًا لثقتكم بـ {appName}!
                        </p>
                        <div className="mt-0.5 flex items-center gap-0.5 text-[6.5px] text-gray-500">
                          {now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          <Check size={8} className="text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* input */}
                  <div className="flex items-center gap-1.5 border-t border-gray-200 bg-gray-50 px-2 py-1.5">
                    <div className="flex flex-1 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[8px] text-gray-400 shadow-sm">
                      اكتب رسالة...
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white">
                      <Send size={10} />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* mouse cursor + trail */}
          {cursorVisible && (
            <>
              <div
                className="pointer-events-none absolute left-0 top-0 z-40 h-3 w-3 rounded-full"
                style={{
                  transform: `translate3d(${cursor.x - 4}px, ${cursor.y - 4}px, 0)`,
                  transitionDuration: `${Math.max(cursor.dur * 2.6, 800)}ms`,
                  transitionProperty: 'transform',
                  transitionTimingFunction: 'linear',
                  background: brandColor,
                  opacity: 0.25,
                  filter: `blur(2px)`,
                }}
              />
              <div
                className="pointer-events-none absolute left-0 top-0 z-40"
                style={{
                  transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
                  transitionDuration: `${cursor.dur}ms`,
                  transitionProperty: 'transform',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <svg width="17" height="22" viewBox="0 0 17 22" className={`drop-shadow-md ${clicking ? 'cursor-press' : ''}`}>
                  <path
                    d="M1 1 L1 20.5 6.9 15.4 11.1 22 14.1 20.1 9.9 13.5 16.8 13.4 Z"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </>
          )}

          {/* toast */}
          {toast && (
            <div className="toast-pop absolute bottom-12 left-1/2 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/95 px-3 py-1.5 text-[9px] font-bold text-white shadow-xl">
              <Check size={11} className="text-emerald-400" />
              {toast}
            </div>
          )}

          {/* product detail */}
          {detail && (
            <div
              className="backdrop-fade absolute inset-0 z-[60] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
              onClick={closeDetail}
            >
              <div
                className="detail-pop w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-[260px] sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
              >
                <div
                  className="relative flex h-20 items-center justify-center text-4xl"
                  style={{ background: `linear-gradient(135deg, ${detail.c1}, ${detail.c2})` }}
                >
                  <span className="drop-shadow">{detail.emoji}</span>
                  {detail.badge && (
                    <span className="absolute right-2 top-2 rounded bg-red-500 px-1.5 py-px text-[8px] font-bold text-white">
                      {detail.badge}
                    </span>
                  )}
                </div>
                <div className="px-3 pb-3 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-extrabold text-gray-800">{detail.name}</p>
                      <p className="mt-0.5 text-[7.5px] text-gray-400">{detail.emoji} — متوفر بالمخزون</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[8.5px]">
                        <Star size={9} className="text-amber-400" fill="currentColor" />
                        <span className="font-bold text-gray-700">{detail.rating}</span>
                        <span className="text-gray-400">({detail.ratingCount} تقييم)</span>
                      </div>
                    </div>
                    <button
                      aria-label="إغلاق"
                      onClick={closeDetail}
                      className="rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-[16px] font-black" style={{ color: brandColor }}>
                      {detail.price}
                      <small className="text-[9px]">₪</small>
                    </span>
                    {detail.oldPrice && <span className="text-[9px] text-gray-400 line-through">{detail.oldPrice}₪</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button aria-label="نقصان" className="px-1.5 py-1 text-gray-500" onClick={() => demoAudio.click()}>
                        <Minus size={10} />
                      </button>
                      <span className="text-[10px] font-bold">1</span>
                      <button aria-label="زيادة" className="px-1.5 py-1 text-gray-500" onClick={() => demoAudio.click()}>
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      ref={addBtnRef}
                      onClick={() => {
                        addToCart(detail);
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-bold text-white transition hover:brightness-110"
                      style={{ background: brandColor }}
                    >
                      <ShoppingCart size={10} /> أضف للسلة
                    </button>
                    <button
                      onClick={waClick}
                      className="flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-bold text-white transition hover:brightness-110"
                      style={{ background: WA_BG }}
                    >
                      <MessageCircle size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* stand */}
      <div className="mx-auto -mt-0.5 h-3.5 w-28 rounded-b-xl bg-gradient-to-b from-slate-600 to-slate-800" />
      <div className="mx-auto h-2 w-44 rounded-full bg-slate-700" />

      {/* cycle controls */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          {demoStores.map((s, i) => (
            <span
              key={s.id}
              title={s.name}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === storeIndex ? 18 : 8,
                background: i === storeIndex ? brandColor : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-white/60">متجر {storeIndex + 1}/5</span>
        <span className="hidden text-[10px] text-white/40 sm:inline">⏭ التالي: {nextStore.name}</span>
        <div className="flex items-center gap-2">
          <button
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            onClick={() => setMuted((m) => !m)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white"
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <button
            onClick={() => runCycle(storeIndex + 1)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-bold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={11} /> إعادة التشغيل — متجر جديد
          </button>
        </div>
      </div>

      <style>{`
        @keyframes playRing {
          0% { transform: scale(0.85); opacity: 0.8; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .play-ring { animation: playRing 2.2s ease-out infinite; }
        .play-btn:hover .play-ring { animation-duration: 1.1s; }

        @keyframes bootLogoIn { from { opacity: 0; transform: scale(0.72); filter: blur(10px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
        .boot-logo { animation: bootLogoIn 0.95s ease forwards; }

        @keyframes flashFade { from { opacity: 0.85; } to { opacity: 0; } }
        .boot-flash { background: #fff; animation: flashFade 0.4s ease forwards; }

        @keyframes crtFlicker { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.65; } }
        .scanlines { background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px); animation: crtFlicker 0.11s infinite; }

        @keyframes caretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .caret { width: 1.5px; height: 9px; background: #334155; animation: caretBlink 0.8s steps(1) infinite; }

        @keyframes loadBar { 0% { width: 6%; } 55% { width: 68%; } 100% { width: 100%; } }
        .loading-bar { animation: loadBar 1.8s ease-in forwards; }

        @keyframes shimmerMove { to { background-position: -200% 0; } }
        .shimmer { background: linear-gradient(90deg, #e8eaed 25%, #f6f7f9 50%, #e8eaed 75%); background-size: 200% 100%; animation: shimmerMove 1.1s linear infinite; }

        @keyframes toastPop { 0% { opacity: 0; transform: translate(-50%, 10px) scale(0.9); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .toast-pop { animation: toastPop 0.28s ease forwards; }

        @keyframes appOpen { from { opacity: 0; transform: scale(0.93) translateY(12px); } to { opacity: 1; transform: none; } }
        .app-open { animation: appOpen 0.38s cubic-bezier(0.2, 0.9, 0.25, 1.15) forwards; }

        @keyframes stageFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .stage-enter { animation: stageFade 0.5s ease forwards; }

        @keyframes detailPop { from { opacity: 0; transform: translateY(28px) scale(0.96); } to { opacity: 1; transform: none; } }
        .detail-pop { animation: detailPop 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards; }
        @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }
        .backdrop-fade { animation: backdropFade 0.25s ease forwards; }

        @keyframes bubblePing { 0% { transform: scale(1); opacity: 0.55; } 80%, 100% { transform: scale(2.1); opacity: 0; } }
        .bubble-ping { animation: bubblePing 2.4s ease-out infinite; }

        @keyframes cursorPress { 0% { transform: scale(1); } 45% { transform: scale(0.72); } 100% { transform: scale(1); } }
        .cursor-press { animation: cursorPress 0.2s ease; }

        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .boot-orbit { border-style: dashed; border-width: 1.5px; animation: orbitSpin 7s linear infinite; }
        .boot-orbit-dot {
          position: absolute; top: -5px; left: 50%; width: 10px; height: 10px; border-radius: 9999px;
          background: ${brandColor}; box-shadow: 0 0 14px ${brandColor};
          animation: orbitSpin 7s linear infinite;
        }

        @keyframes bootDotBounce { 0%, 100% { transform: translateY(0); opacity: 0.45; } 50% { transform: translateY(-3px); opacity: 1; } }
        .boot-dot { width: 5px; height: 5px; border-radius: 9999px; display: inline-block; animation: bootDotBounce 0.9s ease-in-out infinite; }

        @keyframes iconFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .desktop-icon { animation: iconFloat 4s ease-in-out infinite; }
        @keyframes iconGlowPulse { 0%, 100% { box-shadow: 0 0 0 0 ${brandColor}66; } 50% { box-shadow: 0 0 14px 3px ${brandColor}66; } }
        .icon-glow { animation: iconGlowPulse 2.1s ease-in-out infinite; }

        @keyframes welcomeFloat { 0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } 12% { opacity: 1; transform: translateX(-50%) translateY(0); } 85% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) translateY(-6px); } }
        .welcome-toast > div { animation: welcomeFloat 4.5s ease forwards; }

        @keyframes blobDrift { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(28px, -18px) scale(1.12); } }
        .wall-blob { animation: blobDrift 11s ease-in-out infinite; }
        .wall-blob-2 { animation: blobDrift 14s ease-in-out infinite reverse; }

        @keyframes cartSlide { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        .cart-slide { animation: cartSlide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) forwards; }

        @keyframes chatIn { from { opacity: 0; transform: scale(0.94) translateY(14px); } to { opacity: 1; transform: none; } }
        .chat-pop { animation: chatIn 0.34s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards; }

        @keyframes msgIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .msg-in { animation: msgIn 0.26s ease forwards; }

        @keyframes typingDot { 0%, 100% { opacity: 0.35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
        .chat-dot { width: 4px; height: 4px; border-radius: 9999px; background: #9ca3af; animation: typingDot 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ── helpers ── */

const DesktopIcon = React.forwardRef<HTMLButtonElement, { icon: React.ReactNode; label: string; brandColor: string; active?: boolean; glow?: boolean }>(
  function DesktopIcon({ icon, label, brandColor, active, glow }, ref) {
    return (
      <button
        ref={ref}
        className={`desktop-icon flex w-14 flex-col items-center gap-1 rounded-lg p-1.5 transition ${
          active ? 'bg-white/15 shadow-lg ring-1 ring-white/20' : 'hover:bg-white/10'
        }`}
        style={{ animationDelay: '0s' }}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 ${glow ? 'icon-glow text-white' : ''}`}
          style={{ background: `linear-gradient(135deg, ${brandColor}55, ${brandColor}22)`, color: glow ? '#fff' : undefined }}
        >
          {icon}
        </span>
        <span className="text-[8px] font-semibold text-white/85">{label}</span>
      </button>
    );
  }
);

/* ── skeleton loading ── */
function StoreSkeleton({ brandColor }: { brandColor: string }) {
  return (
    <div dir="rtl" className="flex h-full flex-col px-2 pb-2 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="shimmer h-6 w-6 rounded-lg" />
          <div className="space-y-1">
            <div className="shimmer h-2 w-14 rounded" />
            <div className="shimmer h-1.5 w-10 rounded" />
          </div>
        </div>
        <div className="shimmer h-4 w-16 rounded-full" />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div className="shimmer h-4 flex-1 rounded-full" />
        <div className="shimmer h-4 w-10 rounded-full" />
      </div>
      <div className="mt-2 h-12 rounded-lg" style={{ background: `linear-gradient(90deg, ${brandColor}33, ${brandColor}1a)` }} />
      <div className="mt-2 grid flex-1 grid-cols-3 gap-1.5 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1 rounded-lg border border-gray-100 p-1">
            <div className="shimmer h-11 rounded-md" />
            <div className="shimmer h-1.5 w-4/5 rounded" />
            <div className="shimmer h-2 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── storefront inside the browser ── */
interface StoreViewProps {
  store: DemoStore;
  brandColor: string;
  cartCount: number;
  onOpenDetail: (p: DemoProduct) => void;
  onWaClick: () => void;
  onCartClick: () => void;
  waBtnRef: React.RefObject<HTMLButtonElement | null>;
  bubbleRef: React.RefObject<HTMLDivElement | null>;
  cartBtnRef: React.RefObject<HTMLButtonElement | null>;
  cardRefs: React.RefObject<(HTMLElement | null)[]>;
}

function StoreView({ store, brandColor, cartCount, onOpenDetail, onWaClick, onCartClick, waBtnRef, bubbleRef, cartBtnRef, cardRefs }: StoreViewProps) {
  return (
    <div className="flex h-full flex-col bg-white" dir="rtl" style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}>
      {/* header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[12px]"
            style={{ background: `linear-gradient(135deg, ${store.brand}, ${store.brandDeep})` }}
          >
            {store.emoji}
          </span>
          <div>
            <p className="text-[10px] font-extrabold leading-none text-gray-800">{store.name}</p>
            <p className="mt-0.5 text-[7px] leading-none text-gray-400">{store.tagline}</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-[8px] font-semibold text-gray-500 sm:flex">
          <span className="text-gray-900">{store.categories[0]}</span>
          <span>المنتجات</span>
          <span>العروض</span>
          <span>تواصل معنا</span>
          <span className="rounded-full px-1.5 py-px text-[7px]" style={{ background: `${brandColor}22`, color: brandColor }}>
            مميز
          </span>
        </div>
        <div className="relative flex items-center">
          <button
            ref={cartBtnRef}
            aria-label="السلة"
            onClick={onCartClick}
            className="relative flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-gray-100"
          >
            <ShoppingCart size={13} className="text-gray-700" />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="badge-pop absolute -left-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-bold text-white"
                style={{ background: store.brand }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* search + categories */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        <div className="flex flex-1 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[7.5px] text-gray-400">
          <Search size={8} /> ابحث في {store.name}...
        </div>
        {store.categories.slice(0, 3).map((cat, i) => (
          <span
            key={cat}
            className="rounded-full px-2 py-0.5 text-[7.5px] font-bold"
            style={i === 0 ? { background: store.brand, color: '#fff' } : { background: '#f1f5f9', color: '#64748b' }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* banner */}
      <div
        className="mx-1.5 mt-1.5 rounded-lg p-2 text-white"
        style={{ background: `linear-gradient(120deg, ${store.brand}, ${store.brandDeep})` }}
      >
        <p className="text-[10px] font-extrabold">{store.bannerTitle}</p>
        <p className="mt-0.5 text-[7.5px] text-white/85">{store.bannerSub}</p>
        <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-px text-[7px] font-bold backdrop-blur">
          🏷️ كوبون: {store.coupon} — تسوق الآن
        </span>
      </div>

      {/* products grid */}
      <div className="flex-1 overflow-y-auto p-1.5 pb-3">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {store.products.map((product, i) => (
            <div
              key={product.name}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              onClick={() => onOpenDetail(product)}
              className="group cursor-pointer rounded-lg border border-gray-100 bg-white p-1 shadow-sm transition hover:-translate-y-px hover:border-gray-300 hover:shadow-md"
            >
              <div
                className="relative flex h-12 items-center justify-center overflow-hidden rounded-md text-2xl"
                style={{ background: `linear-gradient(135deg, ${product.c1}, ${product.c2})` }}
              >
                <span className="transition-transform duration-300 group-hover:scale-110">{product.emoji}</span>
                {product.badge && (
                  <span className="absolute right-0.5 top-0.5 rounded bg-red-500 px-1 py-px text-[6.5px] font-bold text-white">
                    {product.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[7.5px] font-bold text-gray-700">{product.name}</p>
              <div className="mt-0.5 flex items-center gap-1 text-[6.5px]">
                <Star size={7} className="text-amber-400" fill="currentColor" />
                <span className="font-bold text-gray-600">{product.rating}</span>
                <span className="text-gray-300">({product.ratingCount})</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-[9.5px] font-black" style={{ color: store.brand }}>
                  {product.price}
                  <small className="text-[7px]">₪</small>
                </span>
                {product.oldPrice && <span className="text-[6.5px] text-gray-400 line-through">{product.oldPrice}₪</span>}
              </div>
              <button
                ref={i === 0 ? waBtnRef : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onWaClick();
                }}
                className="mt-1 flex w-full items-center justify-center gap-0.5 rounded-md py-[3px] text-[7px] font-bold text-white transition hover:brightness-110"
                style={{ background: WA_BG }}
              >
                <MessageCircle size={7} /> اطلب واتساب
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* footer strip */}
      <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1 text-[6.5px] text-gray-400">
        <span>© {store.name} 2026 — صنع بحب عبر وصول</span>
        <span className="font-bold text-gray-500">دعم واتساب: 24/7</span>
      </div>

      {/* WA floating bubble */}
      <div
        ref={bubbleRef}
        onClick={onWaClick}
        className="absolute bottom-2 left-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-lg transition hover:scale-110"
        style={{ background: WA_BG }}
        title="تواصل معنا"
      >
        <span className="bubble-ping absolute inset-0 rounded-full" style={{ background: WA_BG }} />
        <MessageCircle size={15} className="relative text-white" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[6.5px] font-bold text-white">
          1
        </span>
      </div>
    </div>
  );
}

/* ── cart drawer ── */
interface CartDrawerProps {
  items: CartItem[];
  total: number;
  orderBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onOrder: () => void;
}

function CartDrawer({ items, total, orderBtnRef, onClose, onOrder }: CartDrawerProps) {
  return (
    <div className="cart-slide absolute inset-y-0 left-0 top-0 z-30 flex w-44 flex-col bg-white shadow-2xl sm:w-52">
      <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5">
        <p className="text-[9.5px] font-extrabold text-gray-800">سلة التسوق ({items.reduce((s, i) => s + i.qty, 0)})</p>
        <button aria-label="إغلاق" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
          <X size={10} />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
        {items.length === 0 ? (
          <p className="pt-6 text-center text-[8px] text-gray-400">السلة فارغة 🛒</p>
        ) : (
          items.map((item) => (
            <div key={item.product.name} className="flex items-center gap-1.5 rounded-lg border border-gray-100 p-1.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[16px]"
                style={{ background: `linear-gradient(135deg, ${item.product.c1}, ${item.product.c2})` }}
              >
                {item.product.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[7.5px] font-bold text-gray-700">{item.product.name}</p>
                <p className="text-[7px] text-gray-400">
                  {item.qty} × {item.product.price}₪
                </p>
              </div>
              <span className="text-[8px] font-black text-gray-700">{item.product.price * item.qty}₪</span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-gray-100 px-2.5 py-2">
        <div className="flex items-center justify-between text-[8.5px]">
          <span className="text-gray-500">الإجمالي</span>
          <span className="text-[11px] font-black text-gray-900">{total}₪</span>
        </div>
        <button
          ref={orderBtnRef}
          onClick={onOrder}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-bold text-white transition hover:brightness-110"
          style={{ background: WA_BG }}
        >
          <MessageCircle size={10} /> اطلب عبر واتساب
        </button>
        <p className="mt-1 text-center text-[6.5px] text-gray-400">الشحن المجاني للطلبات فوق 200₪</p>
      </div>
    </div>
  );
}