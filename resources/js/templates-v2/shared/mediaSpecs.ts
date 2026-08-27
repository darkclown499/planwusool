/**
 * Centralized media-slot specification registry
 * Every Designer media input reads its recommended dimensions from here.
 * Templates can override shared defaults.
 */
export interface MediaSpec {
  label: string;
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
        desktop: { width: 512, height: 512, ratio: '1:1', fit: 'contain' },
        formats: 'PNG / SVG / WebP',
        maxSize: 'أقل من 1MB',
        help: 'المقاس المقترح: 512 × 512 بكسل — نسبة 1:1 — PNG بخلفية شفافة',
      },
      favicon: {
        label: 'أيقونة المتصفح',
        desktop: { width: 32, height: 32, ratio: '1:1', fit: 'cover' },
        formats: 'PNG / ICO',
        maxSize: 'أقل من 100KB',
        help: 'المقاس المقترح: 32 × 32 بكسل — نسبة 1:1',
      },
    },
  },
  'fashion-atelier': {
    hero: {
      desktopImage: {
        label: 'صورة الهيرو — سطح المكتب',
        desktop: { width: 1600, height: 900, ratio: '16:9', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 900 بكسل — نسبة 16:9 — للهاتف: 1080 × 1350 بكسل — نسبة 4:5',
      },
      video: {
        label: 'فيديو الهيرو',
        desktop: { width: 1600, height: 900, ratio: '16:9', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — يُفضل مُكتوم ويعمل تلقائياً — غلاف 1600×900',
      },
    },
    category: {
      image: {
        label: 'صورة القسم',
        desktop: { width: 400, height: 400, ratio: '1:1', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 1MB',
        help: 'المقاس المقترح: 400 × 400 بكسل — نسبة 1:1',
      },
    },
  },
  'bazaar-market': {
    hero: {
      desktopImage: {
        label: 'صور سلايدر الهيرو',
        desktop: { width: 1600, height: 700, ratio: '16:7', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 700 بكسل — نسبة 16:7 — للهاتف: 1080 × 1350 — نسبة 4:5',
      },
      video: {
        label: 'فيديو الهيرو',
        desktop: { width: 1600, height: 700, ratio: '16:7', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1600×700 — يُعرض بملء العرض',
      },
    },
  },
  'grocery-souq': {
    hero: {
      desktopImage: {
        label: 'صورة الهيرو',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 600 بكسل — نسبة 8:3 — للهاتف: 1080 × 1350',
      },
    },
  },
  'bakery-house': {
    hero: {
      desktopImage: {
        label: 'صورة الهيرو',
        desktop: { width: 1200, height: 500, ratio: '12:5', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1200 × 500 بكسل — نسبة 12:5 — حلويات واضحة',
      },
      video: {
        label: 'فيديو الهيرو',
        desktop: { width: 1200, height: 500, ratio: '12:5', fit: 'cover' },
        formats: 'MP4 / WebM',
        maxSize: 'أقل من 8MB',
        help: 'MP4 — 1200×500 — قصير أقل من 10 ثوان',
      },
    },
  },
  'electronics-hub': {
    hero: {
      desktopImage: {
        label: 'صورة الهيرو',
        desktop: { width: 1400, height: 600, ratio: '7:3', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1400 × 600 بكسل — نسبة 7:3 — منتج بارز',
      },
    },
    brand: {
      logo: {
        label: 'صورة العلامة',
        desktop: { width: 200, height: 80, ratio: '5:2', fit: 'contain' },
        formats: 'PNG / SVG',
        maxSize: 'أقل من 500KB',
        help: 'المقاس المقترح: 200 × 80 بكسل — نسبة 5:2',
      },
    },
  },
  'restaurant-menu': {
    hero: {
      desktopImage: {
        label: 'صورة الهيرو',
        desktop: { width: 1600, height: 600, ratio: '8:3', fit: 'cover' },
        mobile: { width: 1080, height: 1350, ratio: '4:5', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 2MB',
        help: 'المقاس المقترح: 1600 × 600 بكسل — نسبة 8:3 — طعام شهي',
      },
    },
    menu: {
      categoryImage: {
        label: 'صورة التصنيف',
        desktop: { width: 600, height: 400, ratio: '3:2', fit: 'cover' },
        formats: 'JPG / PNG / WebP',
        maxSize: 'أقل من 1MB',
        help: 'المقاس المقترح: 600 × 400 بكسل — نسبة 3:2',
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
