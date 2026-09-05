import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatWidgetProps {
  position?: 'left' | 'right';
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  enabled?: boolean;
  language?: string;
}

export default function AIChatWidget({
  position = 'right',
  showOnMobile = true,
  showOnDesktop = true,
  enabled = true,
  language = 'ar',
}: AIChatWidgetProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedChatExists, setSavedChatExists] = useState(false);
  const [draftExists, setDraftExists] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide the widget when the user scrolls near the bottom of the page so it
  // doesn't overlap the footer or last sections.
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.scrollingElement || document.documentElement;
      const distanceFromBottom = scrollable.scrollHeight - scrollable.scrollTop - window.innerHeight;
      setNearBottom(distanceFromBottom < 160);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const STORAGE_KEY_SAVED = 'wusool_ai_saved_chat';
  const STORAGE_KEY_DRAFT = 'wusool_ai_draft';

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isVisible = enabled && ((isMobile && showOnMobile) || (!isMobile && showOnDesktop));

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const saveChatToStorage = () => {
    if (messages.length === 0) return;
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(messages));
    setSavedChatExists(true);
    showToast(language === 'ar' ? 'تم حفظ المحادثة' : 'Chat saved');
  };

  const saveDraftToStorage = () => {
    const draft = { messages, input, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
    setDraftExists(true);
    showToast(language === 'ar' ? 'تم حفظ المسودة' : 'Draft saved');
  };

  const loadSavedChat = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED);
      if (!raw) return;
      const saved: Message[] = JSON.parse(raw);
      if (saved.length > 0) {
        setMessages(saved);
        setFailedAttempts(0);
        showToast(language === 'ar' ? 'تم تحميل المحادثة المحفوظة' : 'Saved chat loaded');
      }
    } catch { /* ignore */ }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (!raw) return;
      const draft: { messages: Message[]; input: string } = JSON.parse(raw);
      if (draft.messages?.length > 0) {
        setMessages(draft.messages);
        setFailedAttempts(0);
      }
      if (draft.input) setInput(draft.input);
      showToast(language === 'ar' ? 'تم تحميل المسودة' : 'Draft loaded');
    } catch { /* ignore */ }
  };

  const clearSavedChat = () => {
    localStorage.removeItem(STORAGE_KEY_SAVED);
    setSavedChatExists(false);
    showToast(language === 'ar' ? 'تم حذف المحادثة المحفوظة' : 'Saved chat deleted');
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    setDraftExists(false);
    showToast(language === 'ar' ? 'تم حذف المسودة' : 'Draft deleted');
  };

  useEffect(() => {
    setSavedChatExists(!!localStorage.getItem(STORAGE_KEY_SAVED));
    setDraftExists(!!localStorage.getItem(STORAGE_KEY_DRAFT));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setFailedAttempts(0);
      const hasSaved = !!localStorage.getItem(STORAGE_KEY_SAVED);
      const hasDraft = !!localStorage.getItem(STORAGE_KEY_DRAFT);
      setSavedChatExists(hasSaved);
      setDraftExists(hasDraft);

      if (hasSaved || hasDraft) {
        const parts: string[] = [];
        if (language === 'ar') {
          parts.push('مرحباً! أنا مساعد وصول الذكي. 👋');
          if (hasSaved) parts.push('لديك محادثة محفوظة.');
          if (hasDraft) parts.push('لديك مسودة لم تكتمل.');
          parts.push('يمكنك استخدام أزرار "حفظ" و"مسودة" في الشريط السفلي.');
        } else {
          parts.push('Hello! I\'m the Wusool AI assistant. 👋');
          if (hasSaved) parts.push('You have a saved chat.');
          if (hasDraft) parts.push('You have an unfinished draft.');
          parts.push('Use the Save and Draft buttons below the input.');
        }
        setMessages([{ role: 'assistant', content: parts.join('\n'), timestamp: new Date() }]);
      } else {
        const greeting = language === 'ar'
          ? 'مرحباً! أنا مساعد وصول الذكي. كيف يمكنني مساعدتك اليوم؟'
          : 'Hello! I\'m the Wusool AI assistant. How can I help you today?';
        setMessages([{ role: 'assistant', content: greeting, timestamp: new Date() }]);
      }
    }
  }, [isOpen, messages.length, language]);

  const getLocalReply = (text: string): string | null => {
    const t = text.toLowerCase().trim();

    const greetings = ['أهلاً', 'اهلا', 'مرحبا', 'مرحباً', 'السلام عليكم', 'سلام', 'هاي', 'هلا', 'صباح الخير', 'مساء الخير', 'كيف حالك', 'كيفك', 'عامل ايه', 'عاملين ايه', 'hi', 'hello', 'hey', 'how are you'];
    if (greetings.some(g => t.includes(g))) {
      const replies = [
        'أهلاً وسهلاً! 😊 أنا مساعد وصول الذكي، جاهز لمساعدتك في أي سؤال عن المنصة.',
        'مرحباً بك! كيف أقدر أساعدك اليوم؟ هل تحتاج مساعدة في إعداد متجرك؟',
        'هلا وغلا! أنا هنا لمساعدتك. تبي تسأل عن الباقات، المنتجات، أو أي شي ثاني؟',
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (['اشتراك', 'باقات', 'باقة', 'اسعار', 'أسعار', 'كم الثمن', 'السعر', 'خطة', 'خطط', 'free', 'growth', 'professional', 'مجاني', 'مجان', 'مميزات'].some(k => t.includes(k))) {
      return 'وصول يوفر 3 باقات:\n\n🚀 **مجاني** — 18 منتج، 1 متجر، نطاق فرعي فقط.\n\n🥈 **Growth (299$/سنة)** — 500 منتج، شحن، PWA.\n\n🥇 **Professional (399$/سنة)** — حتى 10,000 منتج، نطاق مخصص، تطبيق جوال، دعم VIP.\n\nتبي تعرف تفاصيل أكثر عن باقة معينة؟';
    }

    if (['منتج', 'منتجات', 'اضافة منتج', 'إضافة منتج', 'add product', 'منتجاتي'].some(k => t.includes(k))) {
      return 'إضافة منتج في وصول سهلة جداً:\n\n1️⃣ ادخل على لوحة التحكم → "المنتجات"\n2️⃣ اضغط "إضافة منتج جديد"\n3️⃣ اكتب اسم المنتج، السعر، والوصف\n4️⃣ ارفع صورة المنتج\n5️⃣ اختر الفئة والمخزون\n6️⃣ احفظ!\n\nتبي أساعدك في شي ثاني؟';
    }

    if (['متجر', 'المتجر', 'store', 'متجري', '开店', 'تثبيت', 'إعداد', 'إعدادات المتجر'].some(k => t.includes(k))) {
      return 'إعداد المتجر في وصول خطوات بسيطة:\n\n1️⃣ سجّل حساب مجاني\n2️⃣ أضف متجرك من لوحة التحكم\n3️⃣ اختر الثيم المناسب (7 ثيمات متاحة)\n4️⃣ خصّص الشعار والألوان\n5️⃣ أضف المنتجات والدفع والشحن\n\nكل هذا في دقائق معدودة! 🚀';
    }

    if (['شحن', 'توصيل', 'delivery', 'shipping'].some(k => t.includes(k))) {
      return 'خدمات الشحن في وصول:\n\n📦 باقة Growth و Professional تشمل خيارات الشحن\n📍 يمكنك إعداد مناطق الشحن ورسومها\n🚗 دعم شركات الشحن المحلية والعالمية\n\nملاحظة: الباقة المجانية لا تدعم الشحن.\n\nتبي تعرف كيف تعداد الشحن؟';
    }

    if (['دفع', 'فواتير', 'fatoura', 'payment', 'دفع إلكتروني', 'محفظة', 'wallet'].some(k => t.includes(k))) {
      return 'طرق الدفع المتاحة في وصول:\n\n💳 بطاقات ائتمان (Stripe)\n📱 PayPal\n💰 المحافظ الإلكترونية\n🏦 تحويل بنكي\n📞 الدفع عبر واتساب\n\nتقدر تفعل أكثر من طريقة دفع للمتجر!';
    }

    if (['تصميم', 'ثيم', 'theme', 'شكل', 'الوان', 'ألوان', 'شعار', 'logo'].some(k => t.includes(k))) {
      return 'وصول يوفر 7 ثيمات احترافية:\n\n🛍️ متجر gadgets\n👗 متجر أزياء\n🛒 سوبرماركت\n🧁 متجر مخابز\n🧸 متجر ألعاب\n🏠 ديكور منزلي\n🚗 قطع غيار سيارات\n\nكل ثيم قابل للتخصيص بالكامل: ألوان، شعار، خطوط، تخطيط.';
    }

    if (['دعم', 'شات', 'تواصل', 'توكيل', 'اتصال', 'contact', 'support', 'هاتف', 'ايميل', 'بريد'].some(k => t.includes(k))) {
      return 'تواصل مع الدعم عبر واتساب +972559886886 أو ايميل support@wusool.ps';
    }

    if (['شكر', 'ممتاز', 'حلو', 'thanks', 'thank you', 'thanks a lot', 'تسلم'].some(k => t.includes(k))) {
      return 'العفو! 😊 إذا عندك أي سؤال ثاني، أنا هنا всегда.';
    }

    if (['وداع', 'باي', 'bye', 'في أمان الله', 'سلام'].some(k => t.includes(k)) && t.length < 15) {
      return 'في أمان الله! 👋 لا تتردد ترجع أي وقت.';
    }

    return null;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const localReply = getLocalReply(text);
    if (localReply) {
      setFailedAttempts(0);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: localReply, timestamp: new Date() }]);
        setIsLoading(false);
      }, 400 + Math.random() * 400);
      return;
    }

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ message: text, history, language }),
      });
      const data = await res.json();

      if (data.success && data.reply) {
        setFailedAttempts(0);
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date() }]);
      } else {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        let reply: string;
        if (newFailed >= 3) {
          reply = language === 'ar'
            ? 'يبدو إني ما قدرت أساعدك في هذا الموضوع. تواصل مع الدعم عبر واتساب +972559886886 أو ايميل support@wusool.ps'
            : 'It seems I couldn\'t help with this. Contact support via WhatsApp +972559886886 or email support@wusool.ps';
        } else {
          reply = language === 'ar'
            ? 'ما فهمت سؤالك تماماً. ممكن تعيد صياغته أو توضح أكثر؟'
            : 'I didn\'t quite understand. Could you rephrase or provide more details?';
        }
        setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
      }
    } catch {
      const newFailed = failedAttempts + 1;
      setFailedAttempts(newFailed);
      let reply: string;
      if (newFailed >= 3) {
        reply = language === 'ar'
          ? 'يبدو في مشكلة تقنية. تواصل مع الدعم عبر واتساب +972559886886 أو ايميل support@wusool.ps'
          : 'It seems there\'s a technical issue. Contact support via WhatsApp +972559886886 or email support@wusool.ps';
      } else {
        reply = language === 'ar'
          ? 'واجهت مشكلة تقنية بسيطة. حاول مرة ثانية أو اسأل عن موضوع ثاني!'
          : 'I faced a minor technical issue. Please try again or ask about something else!';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-6 z-50 ${position === 'left' ? 'left-6' : 'right-6'} transition-all duration-300 ${nearBottom ? 'opacity-0 translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
      {isOpen && (
        <div className={`absolute bottom-16 ${position === 'left' ? 'left-0' : 'right-0'} bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 sm:w-96 max-w-[calc(100vw-3rem)] flex flex-col overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom-4`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center overflow-hidden">
                <img src="/images/logos/wusool-Tlogo.png" alt="Wusool" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {language === 'ar' ? 'مساعد وصول الذكي' : 'Wusool AI Assistant'}
                </h4>
                <p className="text-xs text-emerald-100">
                  {language === 'ar' ? 'متاح لمساعدتك' : 'Available to help'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Restore Banner */}
          {(savedChatExists || draftExists) && messages.length <= 1 && (
            <div className="px-3 pt-2 flex gap-2">
              {savedChatExists && (
                <button onClick={loadSavedChat} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-emerald-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {language === 'ar' ? 'تحميل محادثة محفوظة' : 'Load saved chat'}
                </button>
              )}
              {draftExists && (
                <button onClick={loadDraft} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-amber-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {language === 'ar' ? 'تحميل مسودة' : 'Load draft'}
                </button>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[200px] max-h-[320px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-[10px] mt-1 block ${msg.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Toolbar */}
          {messages.length > 1 && (
            <div className="px-3 pt-2 pb-1 flex gap-2 border-t border-gray-100">
              <button
                onClick={saveChatToStorage}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-2 text-[12px] font-semibold hover:bg-emerald-100 active:scale-[0.97] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={saveDraftToStorage}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg py-2 text-[12px] font-semibold hover:bg-amber-100 active:scale-[0.97] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                {language === 'ar' ? 'مسودة' : 'Draft'}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                disabled={isLoading}
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        aria-label={language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.5 20.25h-2.25a.75.75 0 01-.75-.75V18a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75z" />
          </svg>
        )}
        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />
      </button>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
