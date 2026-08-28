/**
 * Centralized media-slot specification registry
 * Every Designer media input reads its recommended dimensions from here.
 * Templates can override shared defaults.
 */
export interface MediaSpec {
  label: string;
  description: string;
  desktop: { width: number; height: number; ratio: string; fit: 'cover' | 'contain' };
  mobile?: { width: number; height: number; ratio: string; fit: 'cover' | 'contain' };
  formats: string;
  maxSize: string;
  help: string;
}

export interface TemplateMediaSpecs {
  [section: string]: { [slot: string]: MediaSpec };
}

export const MEDIA_SPECS: Record<string, TemplateMediaSpecs> = {
  // Shared fallback used when template has no override
  shared: {
    branding: {
      logo: {
        label: 'شعار المتجر',
        description: 'يظهر في الهيدر وصفحة المتجر.',
        desktop: { width: 512, height: 512, ratio: '1:1', fit: 'contain' },
        formats: 'PNG / SVG / WebP',
        maxSize: 'أقل من 1MB',
        help: 'المقاس المقترح: 512 × 512 بكسل — نسبة 1:1 — PNG بخلفية شفافة — الوضع: Contain',
      },
      favicon: {
        label: 'أيقونة المتصفح',
        description: 'تظهر في تبويب المتصفح.',
        desktop: { width: 32, height: 32, ratio: '1:1', fit: 'cover' },
        formats: 'PNG / ICO',
        maxSize: 'أقل من 100KB',
        help: 'المقاس المقترح: 32 × 32 بكسل — نسبة 1:1 — الوضع: Cover',
      },
    },
  },
  'fashion-atelier': {
    hero: {
      desktopImage: {
        label: 'الصورة الرئيسية — سطح المكتب',
        description: 'تظهر في أعلى الصفحة الرئيسية — حاوية تحريرية محتواة (ليست ملء الشاشة) — ارتفاع متجاوب ~380-520px.',
        desktop: { width: 1600, height: 550, ratio: '32:11', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 550 بكسل — نسبة 32:11 — الوضع: Cover — تركيب عريض، قص طفيف فقط',
      },
      mobileImage: {
        label: 'الصورة الرئيسية — الهاتف',
        description: 'تظهر على الهواتف كبانر مدمج قصير (ليست بورتريه). إن تركتها فارغة سيتم استخدام صورة سطح المكتب مع قص.',
        desktop: { width: 1080, height: 880, ratio: '27:22', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 880 بكسل — نسبة 27:22 — الوضع: Cover — تركيب قصير يطابق الفتحة ~270-330px',
      },
      desktopVideo: {
        label: 'فيديو سطح المكتب',
        description: 'يظهر بدل الصورة عندما يكون نوع الهيرو فيديو على سطح المكتب.',
        desktop: { width: 1600, height: 550, ratio: '32:11', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — يُفضل مُكتوم ويعمل تلقائياً — غلاف 1600×550 — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهاتف',
        description: 'يظهر على الهاتف كبانر قصير. فارغ = يستخدم فيديو سطح المكتب.',
        desktop: { width: 1080, height: 880, ratio: '27:22', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 أفقي قصير — 1080×880 — نسبة 27:22 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'رابط يوتيوب لسطح المكتب عندما يكون نوع الهيرو YouTube.',
        desktop: { width: 1600, height: 550, ratio: '32:11', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'مثال: https://www.youtube.com/watch?v=... — الوضع: Cover (يُقص ليملأ — حاوية 1600×550)',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'رابط يوتيوب للهاتف (بانر قصير). فارغ = يستخدم رابط سطح المكتب.',
        desktop: { width: 1080, height: 880, ratio: '27:22', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube أفقي قصير — 1080×880 — نسبة 27:22 — الوضع: Cover',
      },
    },
    lookbook: {
      panel1: {
        label: 'لوك بوك — اللوحة 1',
        description: 'تظهر كلوحة تحريرية في قسم اللوك بوك (بجانب الهيرو).',
        desktop: { width: 800, height: 1000, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 800 × 1000 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      panel2: {
        label: 'لوك بوك — اللوحة 2',
        description: 'اللوحة الثانية في قسم اللوك بوك.',
        desktop: { width: 800, height: 1000, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 800 × 1000 بكسل — نسبة 4:5 — الوضع: Cover',
      },
    },
  },
  'bazaar-market': {
    hero: {
      desktopImage: {
        label: 'الشريحة 1 — سطح المكتب',
        description: 'الشريحة الأولى في سلايدر الهيرو — بطاقة محتواة بزوايا مستديرة — ارتفاع متجاوب ~360-460px.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 600 بكسل — نسبة 8:3 — الوضع: Cover — حتى 10 شرائح',
      },
      mobileImage: {
        label: 'الشريحة 1 — الهاتف',
        description: 'نسخة عمودية للشريحة 1 على الهاتف. فارغة = تستخدم صورة سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 1350 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      desktopVideo: {
        label: 'فيديو الهيرو — سطح المكتب',
        description: 'يظهر بدل السلايدر عندما يكون نوع الهيرو فيديو.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1600×600 — يُعرض بملء العرض — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهيرو — الهاتف',
        description: 'فيديو عمودي للهاتف. فارغ = فيديو سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1080×1350 — نسبة 4:5 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'سلايدر يوتيوب لسطح المكتب.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover — حاوية 1600×600',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'يوتيوب للهاتف. فارغ = سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
    },
  },
  'grocery-souq': {
    hero: {
      desktopImage: {
        label: 'الصورة الرئيسية — سطح المكتب',
        description: 'تظهر في أعلى الصفحة الرئيسية كسلايدر هيرو على سطح المكتب.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 600 بكسل — نسبة 8:3 — الوضع: Cover — حتى 10 شرائح',
      },
      mobileImage: {
        label: 'الصورة الرئيسية — الهاتف',
        description: 'تظهر على الهواتف بدل صورة سطح المكتب. فارغة = سيتم استخدام صورة سطح المكتب على الهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 1350 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      desktopVideo: {
        label: 'فيديو سطح المكتب',
        description: 'يظهر بدل الصورة عندما يكون نوع الهيرو فيديو.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1600×600 — نسبة 8:3 — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهاتف',
        description: 'فيديو عمودي للهاتف. فارغ = فيديو سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1080×1350 — نسبة 4:5 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'رابط يوتيوب لسطح المكتب.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'مثال: https://www.youtube.com/watch?v=... — الوضع: Cover',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'يوتيوب للهاتف. فارغ = سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
    },
  },
  'bakery-house': {
    hero: {
      desktopImage: {
        label: 'الصورة الرئيسية — سطح المكتب',
        description: 'تظهر كهيرو فردي في أعلى الصفحة — صورة واحدة.',
        desktop: { width: 1200, height: 500, ratio: '12:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1200 × 500 بكسل — نسبة 12:5 — الوضع: Cover',
      },
      mobileImage: {
        label: 'الصورة الرئيسية — الهاتف',
        description: 'نسخة عمودية للهاتف. فارغة = سيتم استخدام صورة سطح المكتب على الهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 1350 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      desktopVideo: {
        label: 'فيديو الهيرو — سطح المكتب',
        description: 'فيديو بدل الصورة عندما يكون نوع الهيرو فيديو.',
        desktop: { width: 1200, height: 500, ratio: '12:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1200×500 — قصير أقل من 10 ثوان — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهيرو — الهاتف',
        description: 'فيديو للهاتف. فارغ = فيديو سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1080×1350 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'يوتيوب لسطح المكتب.',
        desktop: { width: 1200, height: 500, ratio: '12:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — 1200×500 — الوضع: Cover',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'يوتيوب للهاتف. فارغ = سطح المكتب.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
    },
  },
  'electronics-hub': {
    hero: {
      desktopImage: {
        label: 'الصورة الرئيسية — سطح المكتب',
        description: 'تظهر كهيرو تقني مع وعد المنتجات بجانبها.',
        desktop: { width: 1400, height: 600, ratio: '7:3', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1400 × 600 بكسل — نسبة 7:3 — الوضع: Cover',
      },
      mobileImage: {
        label: 'الصورة الرئيسية — الهاتف',
        description: 'صورة الهاتف. فارغة = سيتم استخدام صورة سطح المكتب على الهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 1350 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      desktopVideo: {
        label: 'فيديو الهيرو — سطح المكتب',
        description: 'فيديو تقني لسطح المكتب.',
        desktop: { width: 1400, height: 600, ratio: '7:3', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1400×600 — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهيرو — الهاتف',
        description: 'فيديو للهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1080×1350 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'يوتيوب لسطح المكتب.',
        desktop: { width: 1400, height: 600, ratio: '7:3', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'يوتيوب للهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
    },
  },
  'restaurant-menu': {
    hero: {
      desktopImage: {
        label: 'الصورة الرئيسية — سطح المكتب',
        description: 'تظهر كهيرو مطعم في أعلى الصفحة.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 600 بكسل — نسبة 8:3 — الوضع: Cover',
      },
      mobileImage: {
        label: 'الصورة الرئيسية — الهاتف',
        description: 'صورة الهاتف. فارغة = سيتم استخدام صورة سطح المكتب على الهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1080 × 1350 بكسل — نسبة 4:5 — الوضع: Cover',
      },
      desktopVideo: {
        label: 'فيديو الهيرو — سطح المكتب',
        description: 'فيديو مطعم لسطح المكتب.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1600×600 — الوضع: Cover',
      },
      mobileVideo: {
        label: 'فيديو الهيرو — الهاتف',
        description: 'فيديو للهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1080×1350 — الوضع: Cover',
      },
      desktopYoutube: {
        label: 'YouTube — سطح المكتب',
        description: 'يوتيوب لسطح المكتب.',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
      mobileYoutube: {
        label: 'YouTube — الهاتف',
        description: 'يوتيوب للهاتف.',
        desktop: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'YouTube URL',
        maxSize: '—',
        help: 'YouTube — الوضع: Cover',
      },
    },
  },
};

export function getMediaSpec(template: string, section: string, slot: string): MediaSpec | null {
  const t = MEDIA_SPECS[template]?.[section]?.[slot];
  if (t) return t;
  // fallback to shared
  const s = MEDIA_SPECS.shared?.[section]?.[slot];
  if (s) return s;
  return null;
}

export function mediaSpecHelp(spec: MediaSpec | null): string {
  if (!spec) return '';
  const d = `${spec.desktop.width} × ${spec.desktop.height} بكسل — نسبة ${spec.desktop.ratio}`;
  const m = spec.mobile ? ` — للهاتف: ${spec.mobile.width} × ${spec.mobile.height} بكسل — نسبة ${spec.mobile.ratio}` : '';
  return `المقاس المقترح: ${d}${m} — ${spec.formats} — ${spec.maxSize}`;
}
