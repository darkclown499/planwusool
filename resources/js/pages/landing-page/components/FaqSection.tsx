import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Faq {
  id: number;
  question: string;
  answer: string;
}

// Default FAQs if none provided
const DEFAULT_FAQS = [
  {
    id: 1,
    question: 'كيف أبدأ متجري على منصة وصول؟',
    answer: 'سجّل مجانًا، اختر القالب الذي يناسب نشاطك، أضف منتجاتك وبيانات متجرك، ثم انشر متجرك برابط خاص بك وابدأ استقبال الطلبات عبر واتساب مباشرة — كل ذلك في دقائق وبدون خبرة تقنية.'
  },
  {
    id: 2,
    question: 'هل يمكنني تخصيص تصميم متجري؟',
    answer: 'نعم، توفر المنصة قوالب جاهزة ومتنوعة لجميع الأنشطة التجارية مع إمكانية تغيير الألوان والشعار والصور والأقسام بسهولة من لوحة التحكم.'
  },
  {
    id: 3,
    question: 'كيف أستقبل الطلبات عبر واتساب؟',
    answer: 'عند اختيار العميل لمنتجه وإتمام الطلب، تصل تفاصيل الطلب (المنتجات، الكمية، العنوان) إلى رقم واتساب الخاص بك مباشرة، ويمكنك متابعة جميع الطلبات من لوحة التحكم.'
  },
  {
    id: 4,
    question: 'هل أحتاج خبرة تقنية لإدارة متجري؟',
    answer: 'لا، واجهة المنصة سهلة وباللغة العربية بالكامل، ويمكنك إنشاء متجرك وتشغيله وتعديله في دقائق دون أي معرفة برمجية.'
  },
  {
    id: 5,
    question: 'كيف أستقبل المدفوعات من عملائي؟',
    answer: 'تدعم المنصة طرق دفع متعددة تشمل الدفع عند الاستلام والتحويل البنكي وبوابات الدفع الإلكترونية، وفقًا للباقة التي تختارها.'
  },
  {
    id: 6,
    question: 'هل يمكنني استخدام نطاق خاص لمتجري؟',
    answer: 'نعم، توفر المنصة رابطًا فرعيًا مجانيًا لمتجرك، كما تتيح لك ربط نطاق خاص بك حسب الباقة المختارة.'
  },
  {
    id: 7,
    question: 'هل يمكنني تغيير قالب متجري لاحقًا؟',
    answer: 'نعم، يمكنك تبديل القالب في أي وقت من إعدادات المتجر دون أن تفقد منتجاتك أو بياناتك أو طلباتك.'
  },
  {
    id: 8,
    question: 'ماذا يحدث لمنتجاتي عند تغيير القالب؟',
    answer: 'جميع منتجاتك وأقسامك وبياناتك محفوظة بشكل دائم، ويؤثر تغيير القالب على التصميم فقط.'
  }
];

interface FaqSectionProps {
  brandColor?: string;
  faqs: Faq[];
  settings?: any;
  sectionData?: {
    title?: string;
    subtitle?: string;
    cta_text?: string;
    button_text?: string;
    default_faqs?: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export default function FaqSection({ faqs, settings, sectionData, brandColor = '#3b82f6' }: FaqSectionProps) {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Extract FAQs from settings
  const settingsFaqs = settings?.config_sections?.sections?.find((section: any) => section.key === 'faq')?.faqs?.map((faq: any, index: number) => ({
    id: index + 1,
    question: faq.question,
    answer: faq.answer
  })) || [];
  
  const backendFaqs = sectionData?.default_faqs?.map((faq, index) => ({
    id: index + 1,
    ...faq
  })) || DEFAULT_FAQS;
  
  const displayFaqs = settingsFaqs.length > 0 ? settingsFaqs : (faqs.length > 0 ? faqs : backendFaqs);

  const toggleFaq = (id: number) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t(sectionData?.title || 'الأسئلة الشائعة')}
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-medium">
            {t(sectionData?.subtitle || 'إجابات على أكثر الأسئلة التي تهم أصحاب المتاجر. إن لم تجد ما تبحث عنه، تواصل مع فريق الدعم مباشرة.')}
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {displayFaqs.map((faq: any) => (
            <div
              key={faq.id}
              className="bg-gray-50 border border-gray-200 rounded-lg"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full px-6 py-4 text-start flex justify-between items-center hover:bg-gray-100 transition-colors"
                aria-expanded={openFaq === faq.id}
                aria-controls={`faq-answer-${faq.id}`}
                aria-describedby={`faq-question-${faq.id}`}
              >
                <h3 className="text-lg font-semibold text-gray-900 pe-4" id={`faq-question-${faq.id}`}>
                  {t(faq.question, { defaultValue: faq.question })}
                </h3>
                {openFaq === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" aria-hidden="true" />
                )}
              </button>
              
              {openFaq === faq.id && (
                <div className="px-6 pb-4 border-t border-gray-200" id={`faq-answer-${faq.id}`} role="region" aria-labelledby={`faq-question-${faq.id}`}>
                  <p className="text-gray-600 leading-relaxed pt-4">
                    {t(faq.answer, { defaultValue: faq.answer })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {(sectionData?.cta_text || sectionData?.button_text) && (
          <div className="text-center mt-8 sm:mt-12">
            <p className="text-gray-600 mb-4">
              {t(sectionData?.cta_text || 'Still have questions?')}
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
              style={{ backgroundColor: brandColor }}
            >
              {t(sectionData?.button_text || 'Contact Support')}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}