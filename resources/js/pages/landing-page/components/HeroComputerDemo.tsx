import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Battery,
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
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShoppingCart,
  SkipForward,
  Star,
  Volume2,
  VolumeX,
  Wifi,
  X
} from 'lucide-react';
import { demoStores, type DemoProduct, type DemoStore } from './demoStores';
import { demoAudio } from './demoSounds';

type Stage = 'idle' | 'bios' | 'spin' | 'login' | 'desktop' | 'browser' | 'loading' | 'demo';

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

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

interface CursorState {
  x: number;
  y: number;
  dur: number;
}

const BIOS_LINES = [
  'Wusool BIOS v2.71 — Copyright (C) 2026',
  'CPU: Wusool Core i9-13900K @ 5.80GHz',
  'Memory Testing: 16384MB OK',
  'IDE Channel 0 Master: WUSOOLSSD 512GB',
  'Looking for boot device... OK',
  'Starting Wusool OS...',
];

const ACCOUNTS = [
  { name: 'أحمد', color: '#38bdf8' },
  { name: 'سارة', color: '#fb7185' },
  { name: 'خالد', color: '#a3e635' },
];

export default function HeroComputerDemo({
  brandColor = '#10b77f',
  appName = 'وصول',
}: HeroComputerDemoProps) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('idle');
  const [storeIndex, setStoreIndex] = useState(0);
  const [biosLine, setBiosLine] = useState(0);
  const [loginPhase, setLoginPhase] = useState<'pick' | 'typing'>('pick');
  const [passDots, setPassDots] = useState(0);
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
  const [userControl, setUserControl] = useState(false);
  const [zoom, setZoom] = useState(1);

  const runIdRef = useRef(0);
  const cursorRef = useRef<CursorState>({ x: 0, y: 0, dur: 600 });
  const screenRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef(stage);
  const userControlRef = useRef(false);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    userControlRef.current = userControl;
  }, [userControl]);
  const avatarRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const passFieldRef = useRef<HTMLDivElement>(null);
  const passGoRef = useRef<HTMLButtonElement>(null);
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

  const moveCursor = useCallback((p: CursorState) => {
    cursorRef.current = p;
    setCursor(p);
  }, []);

  const flyTo = useCallback((el: HTMLElement | null, durOverride?: number) => {
    const scr = screenRef.current;
    if (!scr || !el) return 0;
    const sr = scr.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const cx = er.left - sr.left + er.width / 2 - 2;
    const cy = er.top - sr.top + er.height / 2 - 2;
    const dist = Math.hypot(cx - cursorRef.current.x, cy - cursorRef.current.y);
    const dur = durOverride ?? Math.round(Math.min(1500, Math.max(280, 340 + dist * 1.05)));
    moveCursor({ x: cx, y: cy, dur });
    return dur;
  }, [moveCursor]);

  const doClick = useCallback(() => {
    setClicking(true);
    demoAudio.click();
    window.setTimeout(() => setClicking(false), 210);
  }, []);

  const cursorToScreen = useCallback(() => {
    const scr = screenRef.current;
    if (!scr) return;
    const r = scr.getBoundingClientRect();
    moveCursor({ x: r.width / 2 - 2, y: r.height - 78, dur: 500 });
  }, [moveCursor]);

  /* wait until a scroll settles (stable measurement across frames) */
  const waitStable = useCallback((measure: () => number, maxMs = 1800) => {
    return new Promise<void>((resolve) => {
      const start = Date.now();
      let prev = measure();
      let stable = 0;
      const tick = () => {
        const cur = measure();
        if (Math.abs(cur - prev) < 0.5) stable += 1;
        else stable = 0;
        prev = cur;
        if (stable >= 3 || Date.now() - start > maxMs) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, []);

  const settleEl = useCallback(
    (el: HTMLElement, maxMs?: number) => waitStable(() => el.getBoundingClientRect().top + el.getBoundingClientRect().height, maxMs),
    [waitStable]
  );

  const settleScroll = useCallback((g: HTMLElement, maxMs?: number) => waitStable(() => g.scrollTop, maxMs), [waitStable]);

  /* fly the cursor to the target, click only after it arrives, then run the action */
  const goAndClick = useCallback(
    async (el: HTMLElement | null, fn?: () => void) => {
      const id = runIdRef.current;
      if (!el) return;
      const dur = flyTo(el);
      await sleep(dur + 160);
      if (runIdRef.current !== id) return;
      doClick();
      if (fn) {
        await sleep(200);
        if (runIdRef.current === id) fn();
      }
    },
    [flyTo, doClick]
  );

  const revealCard = useCallback(
    async (i: number) => {
      const id = runIdRef.current;
      const el = cardRefs.current[i];
      const g = scrollRef.current;
      if (!el) return;
      if (g && i === store.products.length - 1) {
        g.scrollTo({ top: g.scrollHeight, behavior: 'smooth' });
        await settleScroll(g, 1800);
        await settleEl(el, 900);
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await settleEl(el, 1800);
      }
      if (runIdRef.current !== id) return;
      flyTo(el);
    },
    [flyTo, settleEl, settleScroll, store]
  );

  const handOverControl = useCallback((msg: string) => {
    runIdRef.current += 1;
    setCursorVisible(false);
    setUserControl(true);
    setToast(msg);
  }, []);

  const skipTour = useCallback(() => {
    runIdRef.current += 1;
    setDetail(null);
    setCartOpen(false);
    setChatOpen(false);
    setStage('demo');
    setStoreReady(true);
    demoAudio.pop();
    setCursorVisible(false);
    setUserControl(true);
    setToast('تم التخطي — المتجر الآن بين يديك');
  }, []);

  const cycleZoom = useCallback(() => {
    setZoom((z) => (z >= 1.5 ? 1 : z === 1 ? 1.2 : 1.5));
  }, []);

  const userInteract = useCallback(() => {
    if (userControlRef.current) return;
    if (stageRef.current === 'idle') return;
    runIdRef.current += 1;
    setDetail(null);
    setCartOpen(false);
    setChatOpen(false);
    setTyped('');
    setStage('demo');
    setStoreReady(true);
    demoAudio.pop();
    setCursorVisible(false);
    setUserControl(true);
    setToast('التحكم الآن بين يديك — استكشف المتجر كاملًا');
  }, []);

  const resetAll = useCallback(() => {
    setDetail(null);
    setToast(null);
    setTyped('');
    setStoreReady(false);
    setClicking(false);
    setCursorVisible(false);
    setBiosLine(0);
    setLoginPhase('pick');
    setPassDots(0);
    setCart([]);
    setCartOpen(false);
    setChatOpen(false);
    setChatTyped(0);
    setChatReplied(false);
    setOrder([]);
    setUserControl(false);
  }, []);

  const runCycle = useCallback((index: number) => {
    const id = ++runIdRef.current;
    const next = ((index % demoStores.length) + demoStores.length) % demoStores.length;
    setStoreIndex(next);
    resetAll();
    demoAudio.ensure();
    demoAudio.setMuted(stateMutedRef.current);

    setStage('bios');
    void (async () => {
      for (let i = 0; i < BIOS_LINES.length; i++) {
        await new Promise((r) => setTimeout(r, 240));
        if (runIdRef.current !== id) return;
        setBiosLine(i + 1);
        demoAudio.bios();
      }
      await new Promise((r) => setTimeout(r, 620));
      if (runIdRef.current !== id) return;
      setStage('spin');
      demoAudio.boot();
    })();
  }, [resetAll]);

  const stateMutedRef = useRef(muted);
  useEffect(() => {
    stateMutedRef.current = muted;
    demoAudio.setMuted(muted);
  }, [muted]);

  /* ── Stage: spin → login screen ── */
  useEffect(() => {
    if (stage !== 'spin') return;
    const id = runIdRef.current;
    const t = window.setTimeout(() => {
      if (runIdRef.current !== id) return;
      setStage('login');
      demoAudio.pop();
    }, 2600);
    return () => window.clearTimeout(t);
  }, [stage]);

  /* ── Stage: login → pick account, type password, unlock ── */
  useEffect(() => {
    if (stage !== 'login') return;
    const id = runIdRef.current;
    void (async () => {
      await sleep(600);
      if (runIdRef.current !== id) return;
      cursorToScreen();
      setCursorVisible(true);
      await goAndClick(avatarRefs.current[0], () => setLoginPhase('typing'));
      await sleep(700);
      for (const d of [1, 2, 3, 4]) {
        if (runIdRef.current !== id) return;
        await goAndClick(passFieldRef.current, () => {
          setPassDots(d);
          demoAudio.key();
        });
        await sleep(420);
      }
      if (runIdRef.current !== id) return;
      await sleep(450);
      await goAndClick(passGoRef.current, () => {
        demoAudio.login();
        setStage('desktop');
      });
    })();
  }, [stage, goAndClick, cursorToScreen]);

  /* ── Stage: desktop → mouse moves to the browser icon ── */
  useEffect(() => {
    if (stage !== 'desktop') return;
    const id = runIdRef.current;
    void (async () => {
      await sleep(700);
      if (runIdRef.current !== id) return;
      cursorToScreen();
      setCursorVisible(true);
      await goAndClick(browserIconRef.current, () => setStage('browser'));
    })();
  }, [stage, goAndClick, cursorToScreen]);

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
    const guided = [0, 4, 11];
    const miss = () => runIdRef.current !== id;

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

    // message length drives the chat typing time (and when it closes)
    const chatLen =
      `مرحباً ${store.name} 👋\nأريد طلب: ${guided.map((g) => `1× ${products[g].name}`).join('، ')}\nالإجمالي: ${guided.reduce((s, g) => s + products[g].price, 0)}₪`.length;

    void (async () => {
      // 1) add the first product at the TOP of the store
      await sleep(600);
      if (miss()) return;
      await goAndClick(cardRefs.current[0], () => openAsking(0));
      await sleep(1100);
      if (miss()) return;
      await goAndClick(addBtnRef.current, () => addGuided(0));

      // 2) scroll to the middle of the grid and add product 4
      await sleep(1000);
      if (miss()) return;
      await revealCard(4);
      await goAndClick(cardRefs.current[4], () => openAsking(4));
      await sleep(1100);
      if (miss()) return;
      await goAndClick(addBtnRef.current, () => addGuided(4));

      // 3) descend to the very end of the site and add the LAST product
      await sleep(1000);
      if (miss()) return;
      await revealCard(11);
      await goAndClick(cardRefs.current[11], () => openAsking(11));
      await sleep(1100);
      if (miss()) return;
      await goAndClick(addBtnRef.current, () => addGuided(11));

      // 4) back to the top, open the cart
      const g = scrollRef.current;
      if (g) g.scrollTo({ top: 0, behavior: 'smooth' });
      if (g) await settleScroll(g, 1800);
      await sleep(500);
      if (miss()) return;
      await goAndClick(cartBtnRef.current, () => {
        demoAudio.cartOpen();
        setCartOpen(true);
      });

      // 5) press "اطلب عبر واتساب"
      await sleep(900);
      if (miss()) return;
      await goAndClick(orderBtnRef.current, () => {
        demoAudio.chatOpen();
        setOrder([...cartRef.current]);
        setCart([]);
        setCartOpen(false);
        setChatOpen(true);
        setChatTyped(0);
        setChatReplied(false);
      });

      // 6) after the chat closes the mouse walks the whole store, then hands it over
      await sleep(chatLen * 45 + 3200 + 500);
      if (miss()) return;
      await revealCard(6);
      await sleep(1300);
      if (miss()) return;
      await goAndClick(bubbleRef.current, () => {
        demoAudio.pop();
        setToast('تم فتح واتساب — أرسل رسالتك الآن');
      });
      await sleep(1400);
      if (miss()) return;
      await revealCard(11);
      await sleep(2600);
      if (miss()) return;
      handOverControl('المتجر الآن بين يديك — استكشفه كاملًا');
    })();
  }, [stage, storeReady, storeIndex, store, goAndClick, revealCard, settleScroll, handOverControl]);

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

  const chatFull =
    chatOpen
      ? `مرحباً ${store.name} 👋\nأريد طلب: ${order.map((i) => `1× ${i.product.name}`).join('، ')}\nالإجمالي: ${orderTotal}₪`
      : '';

  return (
    <div className="mx-auto w-full max-w-[620px]" dir="rtl">
      {/* zoom wrapper */}
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.35s ease' }}>
        {/* ── Monitor ── */}
        <div className="relative rounded-[22px] border border-slate-600/60 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-2 shadow-[0_40px_90px_-24px_rgba(0,0,0,0.75)] sm:p-3">
          <div
            className="pointer-events-none absolute inset-0 m-6 rounded-2xl opacity-30 blur-3xl"
            style={{ background: brandColor }}
          />
        <div
          ref={screenRef}
          onPointerDown={userInteract}
          onWheel={userInteract}
          className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-black ring-1 ring-black/60"
        >
          {/* ── idle ── */}
          {stage === 'idle' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-6"
              style={{ background: `radial-gradient(circle at 50% 44%, ${brandColor}2e 0%, transparent 62%), #07090b` }}
            >
              <button
                aria-label="تشغيل العرض"
                onClick={() => runCycle(0)}
                className="play-btn group relative flex h-24 w-24 items-center justify-center rounded-full"
              >
                <span className="play-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${brandColor}` }} />
                <span
                  className="absolute inset-0 rounded-full opacity-60"
                  style={{ boxShadow: `0 0 60px 12px ${brandColor}55, inset 0 0 30px ${brandColor}33` }}
                />
                <span
                  className="relative flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}aa)`, boxShadow: `0 10px 34px ${brandColor}66` }}
                >
                  <Play size={28} fill="currentColor" />
                </span>
              </button>
              <div className="text-center">
                <p className="text-sm font-extrabold text-white">شاهد كيف يكون متجرك مع {appName}</p>
                <p className="mt-1 text-[11px] text-white/40">اضغط زر التشغيل لبدء العرض • الصوت قابل للكتم</p>
              </div>
            </div>
          )}

          {/* ── bios: real boot text ── */}
          {stage === 'bios' && (
            <div
              dir="ltr"
              className="absolute inset-0 bg-black px-5 pt-3"
              style={{ fontFamily: "'Consolas', 'Courier New', monospace" }}
            >
              <div className="scanlines pointer-events-none absolute inset-0" />
              <div className="flex h-full flex-col justify-center gap-[3px]">
                {BIOS_LINES.slice(0, biosLine).map((line, i) => (
                  <div key={i} className="bios-line flex items-center gap-1.5 text-[7.5px] leading-relaxed text-emerald-300/90 sm:text-[8.5px]">
                    <span className="text-emerald-500/70">▸</span>
                    <span>{line}</span>
                  </div>
                ))}
                {biosLine > 0 && biosLine < BIOS_LINES.length && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="caret bios-blink inline-block bg-emerald-300" style={{ width: 6, height: 8, background: '#6ee7b7' }} />
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 left-5 text-[6.5px] tracking-wider text-white/35">
                PRESS DEL TO ENTER SETUP &nbsp;·&nbsp; WUSOOL 2026
              </div>
            </div>
          )}

          {/* ── spin: windows-style loader ── */}
          {stage === 'spin' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-5"
              style={{ background: 'linear-gradient(180deg, #0f274a 0%, #0a1228 100%)' }}
            >
              <div className="scanlines pointer-events-none absolute inset-0" />
              <div className="win-loader relative h-24 w-24">
                {[0, 72, 144, 216, 288].map((deg, i) => (
                  <span
                    key={deg}
                    className="absolute left-1/2 top-1/2"
                    style={{ transform: `rotate(${deg}deg) translateY(-38px)` }}
                  >
                    <span className="win-dot block" style={{ background: '#5eb3f6', animationDelay: `${i * 0.12}s` }} />
                  </span>
                ))}
              </div>
              <img
                src={toAsset('/images/demo/boot-intro.png')}
                alt={appName}
                className="boot-logo h-14 w-auto max-w-[70%] object-contain"
                style={{ filter: 'drop-shadow(0 6px 24px rgba(94,179,246,0.45))' }}
              />
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-white/85">جارٍ تحميل النظام...</p>
                <p className="text-[8px] text-white/35" dir="ltr">Wusool OS · {new Date().getFullYear()}</p>
              </div>
            </div>
          )}

          {/* ── login: windows lock screen with 3 accounts ── */}
          {stage === 'login' && (
            <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(150deg, #0e3d99 0%, #0f6fd0 55%, #4aa3e8 100%)' }}>
              <div className="wall-blob absolute -right-14 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: '#7cc4ff', opacity: 0.35 }} />
              <div className="wall-blob-2 absolute -left-16 bottom-24 h-52 w-52 rounded-full blur-3xl" style={{ background: '#062a63', opacity: 0.5 }} />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.5px)', backgroundSize: '24px 24px' }}
              />

              {/* big clock */}
              <div className="absolute left-1/2 top-[6%] -translate-x-1/2 text-center text-white">
                <p
                  className="text-[34px] font-extralight leading-none tracking-widest sm:text-[42px]"
                  dir="ltr"
                  style={{ fontFamily: "'Segoe UI', 'Tajawal', sans-serif", textShadow: '0 2px 26px rgba(0,0,0,0.45)' }}
                >
                  {`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`}
                </p>
                <p className="mt-2 text-[9px] font-semibold tracking-wide text-white/85">{clockDate}</p>
              </div>

              {/* bottom status bar (windows lock style) */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-3 pb-3 text-white/85">
                <span className="flex items-center gap-1 rounded-md bg-black/20 px-2 py-0.5 text-[7.5px] font-bold backdrop-blur-sm">
                  <Globe size={8} /> عربي
                </span>
                <div className="flex items-center gap-1.5 text-[8px]">
                  <Wifi size={10} />
                  <Battery size={11} />
                  <span className="rounded-md bg-black/20 px-1.5 py-0.5 font-bold" dir="ltr">
                    {clockTime}
                  </span>
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/20 text-white/90 backdrop-blur-sm">
                    <Power size={9} />
                  </span>
                </div>
              </div>

              {/* windows-style account card + password */}
              <div className="absolute inset-x-0 bottom-14 z-10 flex flex-col items-center px-6 pb-2">
                <div className={`flex flex-col items-center gap-2.5 transition-all duration-300 ${loginPhase === 'typing' ? '' : 'mb-2'}`}>
                  <span
                    className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] bg-[#0b2440]/40 p-1 backdrop-blur-sm sm:h-20 sm:w-20 ${
                      loginPhase === 'typing' ? 'border-white/95' : 'border-white/70'
                    }`}
                    style={{
                      boxShadow:
                        loginPhase === 'typing'
                          ? '0 0 0 8px rgba(255,255,255,0.22), 0 16px 34px -10px rgba(0,0,0,0.7)'
                          : '0 14px 30px -10px rgba(0,0,0,0.6)',
                    }}
                  >
                    <span
                      className="flex h-full w-full items-center justify-center rounded-full text-[26px] font-black text-white sm:text-[30px]"
                      style={{
                        background: `linear-gradient(135deg, ${ACCOUNTS[0].color}, ${ACCOUNTS[0].color}88)`,
                        boxShadow: 'inset 0 -7px 16px rgba(0,0,0,0.28)',
                      }}
                    >
                      {ACCOUNTS[0].name[0]}
                    </span>
                  </span>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-white drop-shadow">{ACCOUNTS[0].name}</p>
                    <p className="mt-0.5 text-[7.5px] text-white/70">عضو على جهاز {appName}</p>
                    <p className="mt-1 text-[8px] font-semibold text-white/90">
                      {loginPhase === 'pick' ? 'انقر للدخول' : 'أهلًا بك 👋'}
                    </p>
                  </div>
                </div>

                {loginPhase === 'typing' && (
                  <div
                    ref={passFieldRef}
                    className="login-bar mt-3 flex w-full max-w-[250px] items-center rounded-2xl border border-white/40 bg-white/15 py-1.5 pl-1 pr-3 shadow-2xl backdrop-blur-xl"
                  >
                    <span
                      className="mx-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${ACCOUNTS[0].color}, ${ACCOUNTS[0].color}88)` }}
                    >
                      {ACCOUNTS[0].name[0]}
                    </span>
                    <div className="flex items-center gap-1 text-[15px] leading-none tracking-widest text-white">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="inline-block w-2 text-center">
                          {i < passDots ? '●' : ''}
                        </span>
                      ))}
                    </div>
                    <button
                      ref={passGoRef}
                      aria-label="دخول"
                      onClick={() => demoAudio.click()}
                      className="ms-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/95 text-[#0b66d9] shadow-md transition hover:scale-105"
                    >
                      <ArrowLeft size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}

                {loginPhase === 'pick' && (
                  <div className="mt-1 flex items-end justify-center gap-6 sm:gap-7">
                    {ACCOUNTS.map((acc, i) => (
                      <button
                        key={acc.name}
                        ref={(el) => {
                          avatarRefs.current[i] = el;
                        }}
                        onClick={() => {
                          demoAudio.open();
                          setLoginPhase('typing');
                        }}
                        className={`login-acc flex flex-col items-center gap-1 transition ${
                          i === 0 ? '-translate-y-1 opacity-100' : 'opacity-45 hover:-translate-y-0.5 hover:opacity-90'
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[#0b2440]/30 p-[2px] shadow-xl backdrop-blur-sm sm:h-14 sm:w-14 ${
                            i === 0 ? 'border-white/90' : 'border-white/50'
                          }`}
                        >
                          <span
                            className="flex h-full w-full items-center justify-center rounded-full text-[17px] font-black text-white sm:text-[19px]"
                            style={{ background: `linear-gradient(135deg, ${acc.color}, ${acc.color}88)` }}
                          >
                            {acc.name[0]}
                          </span>
                        </span>
                        <span className="rounded-full bg-black/35 px-2 py-px text-[7.5px] font-bold text-white shadow backdrop-blur">
                          {acc.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── desktop + browser ── */}
          {(stage === 'desktop' || stage === 'browser' || stage === 'loading' || stage === 'demo') && (
            <>
              {/* wallpaper */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ background: `linear-gradient(160deg, #101a33 0%, #1b2a4d 38%, #0d1526 100%)` }}
              >
                <div className="wall-blob absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: brandColor, opacity: 0.3 }} />
                <div className="wall-blob-2 absolute -left-20 bottom-10 h-56 w-56 rounded-full blur-3xl" style={{ background: brandColor, opacity: 0.16 }} />
                <div
                  className="absolute left-1/2 top-[30%] h-[85%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${brandColor}4d 0%, transparent 62%)`, opacity: 0.8 }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'conic-gradient(from 205deg at 66% 4%, transparent 0deg, rgba(255,255,255,0.05) 10deg, transparent 22deg, transparent 80deg, rgba(255,255,255,0.035) 96deg, transparent 112deg)',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage: `linear-gradient(${brandColor}60 1px, transparent 1px), linear-gradient(90deg, ${brandColor}60 1px, transparent 1px)`,
                    backgroundSize: '34px 34px',
                  }}
                />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
              </div>

              {/* icons */}
              {stage === 'desktop' && (
                <>
                  <div className="absolute right-1.5 top-1.5 z-10 grid grid-cols-2 gap-1 sm:grid">
                    <DesktopIcon ref={browserIconRef} icon={<Globe size={14} />} label="المتصفح" brandColor={brandColor} active glow />
                    <DesktopIcon icon={<MessageCircle size={14} />} label="واتساب" brandColor="#25D366" />
                    <DesktopIcon icon={<FolderOpen size={14} />} label="الملفات" brandColor={brandColor} />
                    <DesktopIcon icon={<Settings size={14} />} label="الإعدادات" brandColor={brandColor} />
                    <DesktopIcon icon={<Camera size={14} />} label="الكاميرا" brandColor="#38bdf8" />
                    <DesktopIcon icon={<ShoppingCart size={14} />} label="المتجر" brandColor={brandColor} />
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
              <div className="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-2.5 backdrop-blur-xl">
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label="ابدأ"
                    className="flex h-7 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
                  >
                    <span className="grid grid-cols-2 gap-[2.5px]">
                      <span className="h-[5px] w-[5px] rounded-[1px] bg-white" />
                      <span className="h-[5px] w-[5px] rounded-[1px] bg-white" />
                      <span className="h-[5px] w-[5px] rounded-[1px] bg-white" />
                      <span className="h-[5px] w-[5px] rounded-[1px] bg-white" />
                    </span>
                  </button>
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 transition hover:bg-white/20">
                    <MessageCircle size={11} className="text-[#25D366]" />
                  </span>
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/15 transition hover:bg-white/25" title="المتصفح - مفتوح">
                    <Globe size={11} className="text-white" />
                    <span className="absolute bottom-[1px] h-[3px] w-3.5 rounded-full" style={{ background: '#38bdf8' }} />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 transition hover:bg-white/20">
                    <ShoppingCart size={11} className="text-white/85" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 transition hover:bg-white/20">
                    <FolderOpen size={11} className="text-white/85" />
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] text-white/85">
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <Wifi size={10} />
                    <Battery size={12} />
                    <Volume2 size={10} />
                    <span className="text-[7px] font-bold text-white/60">78%</span>
                  </span>
                  <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[7.5px] font-bold text-white/85 backdrop-blur">
                    <Globe size={8} /> عربي
                  </span>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="rounded bg-black/40 px-1.5 py-[1px] font-bold text-white/90" dir="ltr">
                      {clockTime}
                    </span>
                    <span className="px-0.5 text-[6px] text-white/55">{clockDate}</span>
                  </div>
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
                          scrollRef={scrollRef}
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

          {/* mouse cursor */}
          {cursorVisible && (
            <div
              className="pointer-events-none absolute left-0 top-0 z-[80]"
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
                <div className="relative h-20">
                  <ProductThumb product={detail} wrapClass="absolute inset-0 rounded-t-2xl sm:rounded-t-2xl" emojiClass="text-4xl" imgClass="rounded-t-2xl sm:rounded-t-2xl" />
                  {detail.badge && (
                    <span className="absolute right-2 top-2 z-[1] rounded bg-red-500 px-1.5 py-px text-[8px] font-bold text-white">
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
      </div>
      {zoom > 1 && <div style={{ height: Math.round((zoom - 1) * 400) }} />}

      {/* control chips while the demo is playing */}
      {stage !== 'idle' && stage !== 'spin' && !userControl && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={skipTour}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <SkipForward size={10} /> تخطي العرض
          </button>
          <button
            onClick={() => runCycle(storeIndex)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={10} /> إعادة من البداية
          </button>
          <button
            onClick={cycleZoom}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <Search size={10} /> تكبير {zoom}×
          </button>
        </div>
      )}

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

        @keyframes biosIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
        .bios-line { animation: biosIn 0.16s ease forwards; }
        @keyframes biosBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .bios-blink { animation: biosBlink 0.7s steps(1) infinite; }

        @keyframes winSpin { to { transform: rotate(360deg); } }
        .win-loader { animation: winSpin 1.4s linear infinite; }
        @keyframes dotBlink { 0%, 100% { opacity: 1; } 65% { opacity: 0.2; } }
        .win-dot { width: 9px; height: 9px; border-radius: 9999px; animation: dotBlink 1.4s linear infinite; }

        @keyframes loginIn { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
        .login-acc { animation: loginIn 0.45s ease forwards; }
        .login-bar { animation: loginIn 0.3s ease forwards; }

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

        .thin-scroll::-webkit-scrollbar { width: 4px; }
        .thin-scroll::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 4px; }
        .thin-scroll { scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.4) transparent; }
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
        className={`desktop-icon group relative flex w-[52px] flex-col items-center gap-1 rounded-lg p-1.5 transition ${
          active ? 'bg-white/10 shadow-xl ring-1 ring-white/25' : 'hover:bg-white/10'
        }`}
        style={{ animationDelay: '0s' }}
      >
        <span
          className={`relative flex h-8 w-8 items-center justify-center rounded-[10px] border ${glow ? 'icon-glow text-white' : ''}`}
          style={{
            background: `linear-gradient(150deg, ${brandColor}f2 0%, ${brandColor}88 55%, ${brandColor}2e 100%)`,
            borderColor: 'rgba(255,255,255,0.28)',
            boxShadow: `0 8px 18px -8px ${brandColor}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
            color: '#fff',
          }}
        >
          {icon}
          <span className="pointer-events-none absolute inset-x-[2px] top-[2px] h-[42%] rounded-[7px] bg-gradient-to-b from-white/40 to-transparent" />
        </span>
        <span className="text-[7px] font-semibold text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          {label}
        </span>
        {active && <span className="absolute -bottom-[3px] h-[3px] w-9 rounded-full" style={{ background: brandColor }} />}
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

/* ── resolve asset paths against the app base URL (mirrors Header/Footer pattern) ── */
const toAsset = (path?: string) => {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return `${window.appSettings?.baseUrl || window.location.origin}${path}`;
};

/* ── product image with graceful fallback ── */
function ProductThumb({
  product,
  wrapClass,
  emojiClass,
  imgClass,
}: {
  product: DemoProduct;
  wrapClass: string;
  emojiClass: string;
  imgClass?: string;
}) {
  const [err, setErr] = useState(false);
  const showImg = !!product.image && !err;
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${wrapClass}`}
      style={{ background: `linear-gradient(135deg, ${product.c1}, ${product.c2})` }}
    >
      {showImg ? (
        <img
          src={toAsset(product.image)}
          alt={product.name}
          loading="lazy"
          onError={() => setErr(true)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClass || ''}`}
        />
      ) : (
        <span className={`relative select-none drop-shadow-sm ${emojiClass}`}>{product.emoji}</span>
      )}
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
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function StoreView({ store, brandColor, cartCount, onOpenDetail, onWaClick, onCartClick, waBtnRef, bubbleRef, cartBtnRef, cardRefs, scrollRef }: StoreViewProps) {
  const [cat, setCat] = useState('الكل');
  const [q, setQ] = useState('');
  const catOf = (i: number) => store.categories[i % store.categories.length];
  const cats = ['الكل', ...store.categories];

  const filtered = store.products.filter((p, i) => {
    const okCat = cat === 'الكل' || catOf(i) === cat;
    const okQ = !q.trim() || p.name.includes(q.trim());
    return okCat && okQ;
  });

  const scrollToGrid = () => {
    const g = scrollRef.current;
    if (g) g.scrollTo({ top: Math.min(260, g.scrollHeight), behavior: 'smooth' });
  };

  return (
    <div className="relative h-full bg-white" dir="rtl" style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}>
      {/* one real scrollable page — the whole storefront moves like a real site */}
      <div ref={scrollRef} className="h-full overflow-y-auto thin-scroll">
        {/* header — in-flow, so it scrolls away with the page */}
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
            <button onClick={scrollToGrid} className="text-gray-900 transition hover:text-black">
              {store.categories[0]}
            </button>
            <button onClick={scrollToGrid} className="transition hover:text-black">
              المنتجات
            </button>
            <button onClick={scrollToGrid} className="transition hover:text-black">
              العروض
            </button>
            <button onClick={onWaClick} className="transition hover:text-black">
              تواصل معنا
            </button>
            <span className="rounded-full px-1.5 py-px text-[7px]" style={{ background: `${brandColor}22`, color: brandColor }}>
              مميز
            </span>
          </div>
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

        {/* search + category filter chips — real interaction */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="flex min-w-[120px] flex-1 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[7.5px] text-gray-400">
            <Search size={8} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`ابحث في ${store.name}...`}
              className="w-full bg-transparent text-[7.5px] text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-2 py-0.5 text-[7.5px] font-bold transition ${
                cat === c ? 'text-white shadow-sm' : 'bg-white/80 text-gray-500 hover:bg-white'
              }`}
              style={cat === c ? { background: store.brand } : undefined}
            >
              {c}
            </button>
          ))}
        </div>

        {/* banner */}
        <div
          onClick={scrollToGrid}
          className="mx-1.5 mt-1.5 cursor-pointer rounded-lg p-2 text-white transition hover:brightness-110"
          style={{ background: `linear-gradient(120deg, ${store.brand}, ${store.brandDeep})` }}
        >
          <p className="text-[10px] font-extrabold">{store.bannerTitle}</p>
          <p className="mt-0.5 text-[7.5px] text-white/85">{store.bannerSub}</p>
          <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-px text-[7px] font-bold backdrop-blur">
            🏷️ كوبون: {store.coupon} — تسوق الآن
          </span>
        </div>

        {/* products grid */}
        <div className="p-1.5 pb-1">
          {filtered.length === 0 ? (
            <p className="pt-8 pb-6 text-center text-[8px] text-gray-400">لا توجد منتجات مطابقة 🔍</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {filtered.map((product, i) => (
                <div
                  key={product.name}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  onClick={() => onOpenDetail(product)}
                  className="group cursor-pointer rounded-lg border border-gray-100 bg-white p-1 shadow-sm transition hover:-translate-y-px hover:border-gray-300 hover:shadow-md"
                >
                  <div className="relative h-12">
                    <ProductThumb product={product} wrapClass="absolute inset-0 rounded-md" emojiClass="text-2xl" imgClass="rounded-md" />
                    {product.badge && (
                      <span className="absolute right-0.5 top-0.5 z-[1] rounded bg-red-500 px-1 py-px text-[6.5px] font-bold text-white">
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
          )}

          {/* ── deals strip (extends the store so it really scrolls) ── */}
          <div className="mt-2 rounded-xl border border-orange-200/70 bg-gradient-to-l from-orange-50 via-amber-50 to-red-50 p-1.5">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <p className="text-[9px] font-extrabold text-orange-600">🔥 عروض اليوم — خصم حتى 25%</p>
              <span onClick={scrollToGrid} className="cursor-pointer rounded-full bg-orange-100 px-2 py-px text-[7px] font-bold text-orange-600 transition hover:bg-orange-200">
                تسوق الآن
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {store.products.slice(5, 9).map((p) => (
                <div
                  key={p.name}
                  onClick={() => onOpenDetail(p)}
                  className="group cursor-pointer rounded-lg border border-gray-100 bg-white p-1 text-center shadow-sm transition hover:-translate-y-px hover:shadow-md"
                >
                  <div className="relative mx-auto h-10 w-full overflow-hidden rounded-md">
                    <ProductThumb product={p} wrapClass="absolute inset-0 rounded-md" emojiClass="text-lg" imgClass="rounded-md" />
                  </div>
                  <p className="mt-0.5 truncate text-[6.5px] font-bold text-gray-700">{p.name}</p>
                  <p className="text-[7px] font-black text-red-500">
                    {p.price}₪ {p.oldPrice && <span className="text-[6px] font-normal text-gray-400 line-through">{p.oldPrice}₪</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── trust / contact strip ── */}
          <div
            className="mt-2 flex items-center justify-between rounded-xl p-2 text-white"
            style={{ background: `linear-gradient(120deg, ${store.brand}, ${store.brandDeep})` }}
          >
            <div className="flex items-center gap-1.5">
              <MessageCircle size={14} />
              <div>
                <p className="text-[8.5px] font-extrabold">فريقنا متاح 24/7</p>
                <p className="text-[6.5px] text-white/80">ردّ سريع عبر الواتساب خلال دقائق</p>
              </div>
            </div>
            <span onClick={onWaClick} className="cursor-pointer rounded-full bg-white/25 px-2.5 py-1 text-[7px] font-bold backdrop-blur transition hover:bg-white/40">
              مراسلة الآن
            </span>
          </div>

          {/* ── mini trust badges ── */}
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {['توصيل سريع 🚚', 'دفع آمن 💳', 'إرجاع 14 يوم ↩️'].map((t) => (
              <div key={t} className="rounded-lg border border-gray-100 bg-gray-50 py-1.5 text-center text-[6.5px] font-bold text-gray-600">
                {t}
              </div>
            ))}
          </div>

          {/* ── footer strip ── */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 px-1 py-1.5 text-[6.5px] text-gray-400">
            <span>© {store.name} 2026 — صنع بحب عبر وصول</span>
            <span className="font-bold text-gray-500">دعم واتساب: 24/7</span>
          </div>
        </div>
      </div>

      {/* WA floating bubble — stays at the window corner like a real store */}
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
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
                <ProductThumb product={item.product} wrapClass="absolute inset-0 rounded-md" emojiClass="text-[16px]" imgClass="rounded-md" />
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