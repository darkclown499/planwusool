import React, { useState } from 'react';
import {
  Megaphone,
  Layout,
  Sparkles,
  Grid,
  Package,
  Layers,
  BadgePercent,
  Image,
  Shield,
  Star,
  HelpCircle,
  Video,
  Mail,
  Phone,
  PanelBottom,
  Code,
  Film,
  Link2,
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  MoveUp,
  MoveDown,
  Star as StarIcon,
  type LucideIcon,
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import type { BuilderPropSchema } from '@/builder/types';
import { FEATURE_ICON_MAP, FEATURE_ICON_KEYS } from '@/builder/sections/Features';
import { toast } from 'sonner';

export const SECTION_ICONS: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  layout: Layout,
  sparkles: Sparkles,
  grid: Grid,
  package: Package,
  layers: Layers,
  badge: BadgePercent,
  image: Image,
  shield: Shield,
  star: Star,
  help: HelpCircle,
  video: Video,
  mail: Mail,
  phone: Phone,
  'panel-bottom': PanelBottom,
  code: Code,
};

export const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 pt-4 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
    {children}
  </div>
);

export const FieldLabel: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <div className="mb-1.5">
    <span className="text-xs font-bold text-slate-700">{label}</span>
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
);

export const toggleClass = (on: boolean) =>
  `relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
    on ? 'bg-emerald-500' : 'bg-slate-300'
  }`;

export const knobClass = (on: boolean) =>
  `inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`;

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={toggleClass(checked)}>
    <span className={knobClass(checked)} />
  </button>
);

/** Renders an editable field based on a prop schema entry. */
export const PropField: React.FC<{
  prop: BuilderPropSchema;
  value: any;
  onChange: (key: string, value: any) => void;
  storeCategories?: any[];
}> = ({ prop, value, onChange, storeCategories = [] }) => {
  const set = (v: any) => onChange(prop.key, v);

  switch (prop.type) {
    case 'boolean':
      return (
        <div className="mb-4 flex items-center justify-between gap-3">
          <FieldLabel label={prop.label} />
          <Toggle checked={!!value} onChange={(v) => set(v)} />
        </div>
      );

    case 'select':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <select
            value={value || prop.default || ''}
            onChange={(e) => set(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            {(prop.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'color':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200"
              style={{ background: value || prop.default || '#0f8a5f' }}
            />
            <input
              type="color"
              value={normalizeColor(value || prop.default || '#0f8a5f')}
              onChange={(e) => set(e.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
            <input
              type="text"
              value={value || prop.default || ''}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-400"
              placeholder="#hex"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} hint={prop.hint} />
          <MediaPicker
            label={prop.label}
            value={value || ''}
            onChange={(v) => set(v)}
            placeholder="اختر صورة..."
            dragDrop
          />
        </div>
      );

    case 'category_multiselect':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} hint={prop.hint} />
          {!storeCategories.length ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-[11px] text-slate-400">
              لا توجد تصنيفات في متجرك بعد — سيتم عرض جميع التصنيفات تلقائياً.
            </p>
          ) : (
            <CategoryMultiselect
              categories={storeCategories}
              selected={Array.isArray(value) ? value.map(String) : []}
              onChange={(next) => set(next)}
            />
          )}
        </div>
      );

    case 'list':
      if (prop.list === 'reviews') {
        return (
          <div className="mb-4">
            <FieldLabel label={prop.label} hint={prop.hint} />
            <ReviewsEditor value={Array.isArray(value) ? value : []} onChange={set} />
          </div>
        );
      }
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} hint={prop.hint} />
          <FeaturesEditor value={Array.isArray(value) ? value : []} onChange={set} />
        </div>
      );

    case 'textarea':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <textarea
            value={value || ''}
            onChange={(e) => set(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );

    case 'number':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <input
            type="number"
            value={value ?? prop.default ?? ''}
            onChange={(e) => set(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );

    case 'video':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} hint={prop.hint} />
          <VideoField value={value || ''} onChange={set} />
        </div>
      );

    case 'slides':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} hint={prop.hint} />
          <SlidesEditor value={Array.isArray(value) ? value : []} onChange={set} />
        </div>
      );

    case 'link':
    case 'text':
    default:
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => set(e.target.value)}
            placeholder={prop.hint || ''}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );
  }
};

export const normalizeColor = (v: string): string => {
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  return '#0f8a5f';
};

/* ------------------------------------------------------------------ */
/* Video source control — YouTube / Vimeo / MP4 upload or direct URL   */
/* ------------------------------------------------------------------ */

export const videoKind = (url: string): 'youtube' | 'vimeo' | 'mp4' | 'link' => {
  const v = (url || '').trim().toLowerCase();
  if (/(youtube\.com|youtu\.be)/.test(v)) return 'youtube';
  if (/vimeo\.com/.test(v)) return 'vimeo';
  if (/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/.test(v) || v.startsWith('/storage/')) return 'mp4';
  return v ? 'link' : 'link';
};

export const youtubeId = (url: string): string => {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
};

export const vimeoId = (url: string): string => {
  const m = (url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
};

const VideoField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const kind = videoKind(value);

  const uploadVideo = async (files: FileList | File[]) => {
    const file = Array.from(files).find((f) => f.type.startsWith('video/'));
    if (!file) {
      toast.warning('الرجاء اختيار ملف فيديو');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files[]', file);
      const res = await fetch(route('api.media.batch'), {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      const result = await res.json();
      if (res.ok && result.data && result.data.length > 0) {
        onChange(result.data[0].url);
        toast.success('تم رفع الفيديو');
      } else {
        toast.error(result.message || 'فشل رفع الفيديو');
      }
    } catch {
      toast.error('حدث خطأ أثناء رفع الفيديو');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... أو رابط يوتيوب/فيميو"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <label
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
          title="رفع ملف فيديو"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          رفع
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadVideo(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-400 transition hover:border-red-300 hover:text-red-500"
          >
            ×
          </button>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-800">
            {kind === 'youtube' && youtubeId(value) ? (
              <img src={`https://img.youtube.com/vi/${youtubeId(value)}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
            ) : kind === 'vimeo' && vimeoId(value) ? (
              <img src={`https://vumbnail.com/${vimeoId(value)}.jpg`} alt="" className="h-full w-full object-cover" />
            ) : kind === 'mp4' ? (
              <Film className="h-5 w-5 text-white" />
            ) : (
              <Link2 className="h-5 w-5 text-white" />
            )}
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-700">
              {kind === 'youtube' ? 'YouTube' : kind === 'vimeo' ? 'Vimeo' : kind === 'mp4' ? 'فيديو MP4' : 'رابط'}
            </span>
            <span className="block truncate text-[11px] text-slate-400">{value}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slides list editor — images + headline + CTA per banner / hero slide */
/* ------------------------------------------------------------------ */

interface SlideItem {
  title?: string;
  subtitle?: string;
  badge?: string;
  image?: string;
  image_mobile?: string;
  content_position?: ContentPosition;
  overlay_opacity?: number;
  button_text?: string;
  button_link?: string;
  video?: string;
  background?: string;
  /** 'cover' (default) fills the banner and crops; 'contain' letterboxes the
   *  image at its own size — lets a merchant mix differently-sized slides
   *  in the same slider instead of forcing one uniform crop. */
  size_mode?: 'cover' | 'contain';
  /** Only used when size_mode is 'contain' — explicit box size in px. */
  width?: number;
  height?: number;
}

/** 9-position overlay content alignment. */
export type ContentPosition =
  | 'top_right'
  | 'top_center'
  | 'top_left'
  | 'center_right'
  | 'center'
  | 'center_left'
  | 'bottom_right'
  | 'bottom_center'
  | 'bottom_left';

const EMPTY_SLIDE: SlideItem = {
  title: '',
  subtitle: '',
  badge: '',
  image: '',
  image_mobile: '',
  content_position: 'center',
  overlay_opacity: 35,
  button_text: 'اكتشف المزيد',
  button_link: '#template-products',
  video: '',
  size_mode: 'cover',
};

/** Compact 3x3 grid picker for slide content alignment. */
const PositionGrid: React.FC<{ value: ContentPosition; onChange: (next: ContentPosition) => void }> = ({ value, onChange }) => {
  const rows: ContentPosition[][] = [
    ['bottom_right', 'bottom_center', 'bottom_left'],
    ['center_right', 'center', 'center_left'],
    ['top_right', 'top_center', 'top_left'],
  ];
  return (
    <div className="grid w-fit grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {rows.flat().map((pos) => (
        <button
          key={pos}
          type="button"
          onClick={() => onChange(pos)}
          aria-label={pos}
          className={`h-6 w-6 rounded-md border transition ${
            value === pos ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-slate-100 hover:border-emerald-300'
          }`}
        />
      ))}
    </div>
  );
};

const SlidesEditor: React.FC<{ value: SlideItem[]; onChange: (next: SlideItem[]) => void }> = ({ value, onChange }) => {
  const slides = Array.isArray(value) ? value : [];

  const update = (index: number, key: keyof SlideItem, v: any) => {
    const next = slides.map((s, i) => (i === index ? { ...s, [key]: v } : s));
    onChange(next);
  };

  const remove = (index: number) => onChange(slides.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {slides.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-400">
          لا توجد شرائح. أضف شريحة لعرض بانر/بطاقة جديدة.
        </p>
      )}

      {slides.map((slide, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-extrabold text-slate-600">
              <Film className="h-3.5 w-3.5 text-emerald-600" />
              شريحة {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:text-emerald-600" aria-label="تحريك لأعلى">
                <MoveUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(index, 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:text-emerald-600" aria-label="تحريك لأسفل">
                <MoveDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(index)} className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-500" aria-label="حذف الشريحة">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <MediaPicker label="" inputId={`slide-image-${index}`} value={slide.image || ''} onChange={(v) => update(index, 'image', v)} placeholder="صورة الشريحة (اختر أو ألصق رابطاً)" />

          <div className="mt-2">
            <MediaPicker
              label=""
              inputId={`slide-image-mobile-${index}`}
              value={slide.image_mobile || ''}
              onChange={(v) => update(index, 'image_mobile', v)}
              placeholder="صورة الجوال (عمودية — تظهر تحت 768px)"
            />
          </div>

          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-600">حجم الشريحة</span>
              <div className="flex overflow-hidden rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => update(index, 'size_mode', 'cover')}
                  className={`px-2.5 py-1 text-[11px] font-bold transition ${
                    (slide.size_mode || 'cover') === 'cover' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  تغطية كاملة
                </button>
                <button
                  type="button"
                  onClick={() => update(index, 'size_mode', 'contain')}
                  className={`px-2.5 py-1 text-[11px] font-bold transition ${
                    slide.size_mode === 'contain' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  حجم مخصص
                </button>
              </div>
            </div>
            {slide.size_mode === 'contain' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={slide.width || ''}
                  onChange={(e) => update(index, 'width', Number(e.target.value) || undefined)}
                  placeholder="العرض (px)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                />
                <input
                  type="number"
                  min={1}
                  value={slide.height || ''}
                  onChange={(e) => update(index, 'height', Number(e.target.value) || undefined)}
                  placeholder="الارتفاع (px)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-[11px] font-bold text-slate-600">موضع المحتوى</span>
            <PositionGrid value={slide.content_position || 'center'} onChange={(pos) => update(index, 'content_position', pos)} />
          </div>

          <label className="mt-2 block rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
              شفافية التظليل
              <span className="font-mono text-emerald-600">{Math.round(Number(slide.overlay_opacity ?? 35))}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={Number(slide.overlay_opacity ?? 35)}
              onChange={(e) => update(index, 'overlay_opacity', Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </label>

          <input
            type="text"
            value={slide.title || ''}
            onChange={(e) => update(index, 'title', e.target.value)}
            placeholder="العنوان"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
          <textarea
            value={slide.subtitle || ''}
            onChange={(e) => update(index, 'subtitle', e.target.value)}
            placeholder="النص الفرعي"
            rows={2}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={slide.button_text || ''}
              onChange={(e) => update(index, 'button_text', e.target.value)}
              placeholder="نص الزر"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
            />
            <input
              type="text"
              value={slide.button_link || ''}
              onChange={(e) => update(index, 'button_link', e.target.value)}
              placeholder="رابط الزر (#identifier)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
            />
          </div>
          <input
            type="text"
            value={slide.video || ''}
            onChange={(e) => update(index, 'video', e.target.value)}
            placeholder="رابط فيديو لهذه الشريحة (اختياري)"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...slides, { ...EMPTY_SLIDE }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50"
      >
        <Plus className="h-4 w-4" />
        إضافة شريحة
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Category multi-select — checkbox list of the store's categories.    */
/* ------------------------------------------------------------------ */

const CategoryMultiselect: React.FC<{
  categories: any[];
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ categories, selected, onChange }) => {
  const toggle = (id: any) => {
    const sid = String(id);
    onChange(selected.includes(sid) ? selected.filter((v) => v !== sid) : [...selected, sid]);
  };
  return (
    <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
      {categories.map((c) => {
        const id = String(c.id);
        const checked = selected.includes(id);
        return (
          <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-slate-50">
            <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="h-4 w-4 rounded accent-emerald-500" />
            {c.image ? (
              <img src={c.image} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Grid className="h-3 w-3" />
              </span>
            )}
            <span className="truncate text-xs text-slate-700">{c.name}</span>
          </label>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Feature list editor — Lucide icon picker + title + description.     */
/* ------------------------------------------------------------------ */

const getFeatureIcon = (key: any): React.ComponentType<{ className?: string }> =>
  FEATURE_ICON_MAP[key] || FEATURE_ICON_MAP.sparkles;

const FeaturesEditor: React.FC<{ value: any[]; onChange: (next: any[]) => void }> = ({ value, onChange }) => {
  const items = Array.isArray(value) ? value : [];
  const update = (index: number, key: string, v: any) =>
    onChange(items.map((it, i) => (i === index ? { ...it, [key]: v } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {!items.length && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-[11px] text-slate-400">
          لا توجد مزايا مخصصة — سيتم استخدام مزايا المتجر الافتراضية.
        </p>
      )}
      {items.map((item, index) => (
        <FeatureRow key={index} item={item} onRemove={() => remove(index)} onUpdate={(k, v) => update(index, k, v)} />
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { title: '', text: '', icon: 'truck' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50"
      >
        <Plus className="h-4 w-4" />
        إضافة ميزة
      </button>
    </div>
  );
};

const FeatureRow: React.FC<{
  item: any;
  onRemove: () => void;
  onUpdate: (key: string, value: any) => void;
}> = ({ item, onRemove, onUpdate }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const IconComp = getFeatureIcon(item.icon);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          title="تغيير الأيقونة"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 transition hover:border-emerald-400"
        >
          <IconComp className="h-4.5 w-4.5" />
        </button>
        <input
          type="text"
          value={item.title || ''}
          onChange={(e) => onUpdate('title', e.target.value)}
          placeholder="عنوان الميزة"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-500"
          aria-label="حذف الميزة"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <textarea
        rows={2}
        value={item.text || ''}
        onChange={(e) => onUpdate('text', e.target.value)}
        placeholder="وصف قصير للميزة"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
      />

      {pickerOpen && (
        <div className="mt-2 grid grid-cols-6 gap-1.5 rounded-lg border border-slate-200 bg-white p-2">
          {FEATURE_ICON_KEYS.map((key) => {
            const Comp = getFeatureIcon(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onUpdate('icon', key);
                  setPickerOpen(false);
                }}
                title={key}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                  item.icon === key ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Comp className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Reviews list editor — name + text + rating (1-5) + avatar.          */
/* ------------------------------------------------------------------ */

const ReviewsEditor: React.FC<{ value: any[]; onChange: (next: any[]) => void }> = ({ value, onChange }) => {
  const items = Array.isArray(value) ? value : [];
  const update = (index: number, key: string, v: any) =>
    onChange(items.map((it, i) => (i === index ? { ...it, [key]: v } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const setRating = (index: number, rating: number) => update(index, 'rating', rating);

  return (
    <div className="space-y-3">
      {!items.length && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-[11px] text-slate-400">
          لا توجد تقييمات مخصصة — سيتم استخدام تقييمات المتجر الافتراضية.
        </p>
      )}
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-2 flex items-start gap-2">
            <MediaPicker label="" inputId={`review-avatar-${index}`} value={item.avatar || ''} onChange={(v) => update(index, 'avatar', v)} placeholder="صورة العميل" showPreview />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                type="text"
                value={item.name || ''}
                onChange={(e) => update(index, 'name', e.target.value)}
                placeholder="اسم العميل"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              />
              <textarea
                rows={2}
                value={item.text || ''}
                onChange={(e) => update(index, 'text', e.target.value)}
                placeholder="نص التقييم"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-500"
              aria-label="حذف التقييم"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold text-slate-500">التقييم:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(index, star)} aria-label={`${star} نجوم`}>
                <StarIcon
                  className={`h-5 w-5 transition ${star <= Number(item.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                />
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: '', text: '', rating: 5, avatar: '' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50"
      >
        <Plus className="h-4 w-4" />
        إضافة تقييم
      </button>
    </div>
  );
};