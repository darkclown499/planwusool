import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowRight,
    Building2,
    ChevronDown,
    Code2,
    Eye,
    Image as ImageIcon,
    Loader2,
    Megaphone,
    Monitor,
    Palette,
    Save,
    Settings2,
    Smartphone,
    Sparkles,
    Store,
    UploadCloud,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import MediaPicker from '@/components/MediaPicker';
import { apiGet, apiPut } from '@/utils/api';
import { getImageUrl } from '@/utils/image-helper';
import { getTemplateModule, type TemplateModule } from '@/templates-v2';
import StoreTemplatesGrid from './components/store-templates-grid';
import { usePage } from '@inertiajs/react';

interface SlotField {
    key: string;
    label: string;
    type: 'text' | 'image';
    group?: string;
    default?: string;
}

interface Props {
    store: any;
    availableThemes: string[];
    settings: any;
    storeUrl: string;
}

function setDotted(obj: Record<string, any>, path: string, value: any): Record<string, any> {
    const next = { ...obj };
    const parts = path.split('.');
    let cur: any = next;
    for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...(cur[parts[i]] || {}) };
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    return next;
}

function getDotted(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function stripTrailingSlash(url: string): string {
    return String(url || '').trim().replace(/\/+$/, '');
}

function normalizeImageUrl(url: string): string {
    if (!url) return '';
    const trimmed = stripTrailingSlash(String(url).trim());
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    try {
        return stripTrailingSlash(getImageUrl(trimmed));
    } catch {
        return trimmed;
    }
}

function sanitizeHeroImages(images: any): string[] {
    if (!Array.isArray(images)) return [];
    return images
        .map((u: any) => String(u || '').trim())
        .filter(Boolean)
        .map((u) => normalizeImageUrl(u))
        .filter((u) => u && u.length > 5 && u !== '/' && u !== '//' && !u.endsWith('//'))
        .slice(0, 10);
}

function AccordionSection({
    title,
    icon,
    defaultOpen = true,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (v: boolean) => {
        if (controlledOnOpenChange) controlledOnOpenChange(v);
        if (!isControlled) setInternalOpen(v);
    };
    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-start hover:bg-slate-50/60">
                <span className="flex items-center gap-2.5 text-sm font-black text-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
                    {title}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-1">
                <div className="space-y-4 pt-2">{children}</div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ColorPickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const safe = /^#[0-9a-fA-F]{6}$/.test(String(value || '').trim()) ? String(value).trim() : '#0d9488';
    return (
        <div>
            <Label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</Label>
            <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-inner">
                    <input
                        type="color"
                        value={safe}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer border-0 p-0"
                        aria-label={label}
                    />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-600" dir="ltr">
                    {safe}
                </span>
            </div>
        </div>
    );
}

function DropzoneUploader({
    onFiles,
    accept = 'image/*',
    multiple = false,
    label,
    hint,
    uploading,
}: {
    onFiles: (files: FileList) => void;
    accept?: string;
    multiple?: boolean;
    label: string;
    hint?: string;
    uploading?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    return (
        <div
            onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
            }}
            onClick={() => ref.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : <UploadCloud className="h-5 w-5 text-emerald-600" />}
            </div>
            <p className="text-sm font-bold text-slate-700">{label}</p>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow">اختيار ملف</span>
            <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
        </div>
    );
}

export default function StoreDesigner({ store, availableThemes, storeUrl }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const heroFileRef = useRef<HTMLInputElement>(null);
    const [heroUploading, setHeroUploading] = useState(false);
    const logoFileRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const faviconFileRef = useRef<HTMLInputElement>(null);
    const [faviconUploading, setFaviconUploading] = useState(false);

    const [theme, setTheme] = useState<string>('bazaar-market');
    const [tokens, setTokens] = useState<Record<string, any>>({});
    const [content, setContent] = useState<Record<string, any>>({});
    const [customCss, setCustomCss] = useState('');
    const [customJs, setCustomJs] = useState('');
    const [headInject, setHeadInject] = useState('');
    const [availableCategories, setAvailableCategories] = useState<Array<{ id: string | number; name: string; image?: string | null; slug?: string }>>([]);
    const [initialSnapshot, setInitialSnapshot] = useState<string>('');

    // Sync tab state with URL query param ?tab= (templates / identity) — task: Fix URL Query Param (`tab=identity`) Syncing
    const page = usePage<any>();
    const getTabFromUrl = () => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('tab') || '';
        }
        return '';
    };
    // searchParams as required by task spec (parse searchParams.get('tab'))
    const searchParams = useMemo(() => {
        if (typeof window !== 'undefined') return new URLSearchParams(window.location.search);
        const q = page.url?.split('?')[1] || '';
        return new URLSearchParams(q);
    }, [page.url]);
    const [activeTab, setActiveTab] = useState<string>(() => searchParams.get('tab') || getTabFromUrl());
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const tab = searchParams.get('tab') || getTabFromUrl();
        if (tab === 'templates') return { templates: true, identity: false, announcement: false, hero: false, homeSections: false, homepageContent: false, advanced: false };
        // identity (or base) is the default for تخصيص تصميم المتجر
        return { templates: false, identity: true, announcement: true, hero: true, homeSections: true, homepageContent: true, advanced: false };
    });
    // activeSection mirrors activeTab for task spec compliance (setActiveSection)
    const [activeSection, setActiveSectionState] = useState<string>(() => {
        const t = searchParams.get('tab') || getTabFromUrl();
        return t === 'templates' ? 'templates' : 'identity';
    });
    const setActiveSection = (section: string) => {
        setActiveSectionState(section);
        setActiveTab(section);
        if (section === 'identity') setOpenSections({ templates: false, identity: true, announcement: true, hero: true, homeSections: true, homepageContent: true, advanced: false });
        else if (section === 'templates') setOpenSections({ templates: true, identity: false, announcement: false, hero: false, homeSections: false, homepageContent: false, advanced: false });
    };

    useEffect(() => {
      const activeTab = searchParams.get('tab');
      if (activeTab === 'identity') setActiveSection('identity');
      else if (activeTab === 'templates') setActiveSection('templates');
    }, [searchParams]);

    useEffect(() => {
        const tab = new URLSearchParams(page.url?.split('?')[1] || window.location.search.replace(/^\?/, '')).get('tab') || new URLSearchParams(window.location.search).get('tab') || '';
        setActiveTab(tab);
        if (tab === 'templates') {
            setOpenSections({ templates: true, identity: false, announcement: false, hero: false, homeSections: false, homepageContent: false, advanced: false });
        } else if (tab === 'identity' || tab === 'brand' || tab === '' ) {
            // identity maps to الهوية + hero open
            setOpenSections({ templates: false, identity: true, announcement: true, hero: true, homeSections: true, homepageContent: true, advanced: false });
        }
    }, [page.url]);

    useEffect(() => {
        const handler = () => {
            const tab = new URLSearchParams(window.location.search).get('tab') || '';
            setActiveTab(tab);
            if (tab === 'templates') setOpenSections({ templates: true, identity: false, announcement: false, hero: false, homeSections: false, homepageContent: false, advanced: false });
            else if (tab === 'identity') setOpenSections({ templates: false, identity: true, announcement: true, hero: true, homeSections: true, homepageContent: true, advanced: false });
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    useEffect(() => {
        let alive = true;
        apiGet(`/api/stores/${store.id}/designer`)
            .then((res: any) => {
                if (!alive || !res) return;
                const nTokens = res.design_tokens || {};
                const nContent = res.content || {};
                const nCss = res.custom_css || '';
                const nJs = res.custom_js || '';
                const nHead = res.head_inject || '';
                setTheme(res.theme || 'bazaar-market');
                setTokens(nTokens);
                setContent(nContent);
                setCustomCss(nCss);
                setCustomJs(nJs);
                setHeadInject(nHead);
                if (Array.isArray(res.categories)) {
                    setAvailableCategories(res.categories);
                }
                setInitialSnapshot(JSON.stringify({ theme: res.theme || 'bazaar-market', tokens: nTokens, content: nContent, css: nCss, js: nJs, head: nHead }));
            })
            .catch(() => toast.error('تعذر تحميل إعدادات المصمم'))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [store.id]);

    const isDirty = useMemo(() => {
        try {
            const cur = JSON.stringify({ theme, tokens, content, css: customCss, js: customJs, head: headInject });
            return cur !== initialSnapshot;
        } catch {
            return true;
        }
    }, [theme, tokens, content, customCss, customJs, headInject, initialSnapshot]);

    const activeModule: TemplateModule | null = useMemo(() => {
        try {
            return getTemplateModule(theme);
        } catch {
            return null;
        }
    }, [theme]);

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            let payloadContent: Record<string, any> = { ...content };
            const rawNested = getDotted(content, 'hero_banner.images');
            const rawFlat = getDotted(content, 'hero_images');
            const rawImages = rawNested !== undefined ? rawNested : rawFlat;
            const clean = sanitizeHeroImages((rawImages as any) ?? []);
            payloadContent = setDotted(payloadContent, 'hero_banner.images', clean);
            payloadContent = setDotted(payloadContent, 'hero_images', clean);
            const heroType = getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type');
            if (heroType !== undefined) {
                payloadContent = setDotted(payloadContent, 'hero_banner.type', String(heroType).trim().replace(/\/+$/, ''));
                payloadContent = setDotted(payloadContent, 'hero_type', String(heroType).trim().replace(/\/+$/, ''));
            }
            const heroVideo = getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url');
            if (heroVideo !== undefined) {
                const cleanVideo = stripTrailingSlash(String(heroVideo).trim());
                const normVideo = cleanVideo ? (cleanVideo.startsWith('http') ? cleanVideo : normalizeImageUrl(cleanVideo)) : '';
                payloadContent = setDotted(payloadContent, 'hero_banner.video_url', normVideo);
                payloadContent = setDotted(payloadContent, 'hero_video_url', normVideo);
            }
            const heroYoutube = getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url');
            if (heroYoutube !== undefined) {
                const cleanYt = stripTrailingSlash(String(heroYoutube).trim());
                payloadContent = setDotted(payloadContent, 'hero_banner.youtube_url', cleanYt);
                payloadContent = setDotted(payloadContent, 'hero_youtube_url', cleanYt);
            }
            const overlay = getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity');
            if (overlay !== undefined) {
                const num = Math.min(100, Math.max(0, Number(overlay)));
                payloadContent = setDotted(payloadContent, 'hero_banner.overlay_opacity', num);
                payloadContent = setDotted(payloadContent, 'overlay_opacity', num);
            }
            for (const k of ['heading', 'subtitle', 'cta_label', 'cta_link'] as const) {
                const v = getDotted(content, `hero_banner.${k}`) ?? getDotted(content, `hero_${k}`);
                if (v !== undefined) {
                    const s = k === 'cta_link' ? stripTrailingSlash(String(v).trim()) : String(v ?? '');
                    payloadContent = setDotted(payloadContent, `hero_banner.${k}`, s);
                    payloadContent = setDotted(payloadContent, `hero_${k}`, s);
                }
            }

            const res: any = await apiPut(`/api/stores/${store.id}/designer`, {
                design_tokens: tokens,
                content: payloadContent,
                custom_css: customCss,
                custom_js: customJs,
                head_inject: headInject,
            });
            const finalContent = res?.content ?? payloadContent;
            const finalTokens = res?.design_tokens ?? tokens;
            setContent(finalContent);
            setTokens(finalTokens);
            if (res?.custom_css !== undefined) setCustomCss(res.custom_css);
            if (res?.custom_js !== undefined) setCustomJs(res.custom_js);
            if (res?.head_inject !== undefined) setHeadInject(res.head_inject);
            setInitialSnapshot(JSON.stringify({ theme, tokens: finalTokens, content: finalContent, css: res?.custom_css ?? customCss, js: res?.custom_js ?? customJs, head: res?.head_inject ?? headInject }));
            toast.success('تم حفظ جميع التغييرات بنجاح');
        } catch {
            toast.error('تعذر حفظ التغييرات — تأكد من سلامة المدخلات');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHeroBanner = async () => {
        setSaving(true);
        try {
            let payloadContent: Record<string, any> = { ...content };
            const rawNested = getDotted(content, 'hero_banner.images');
            const rawFlat = getDotted(content, 'hero_images');
            const rawImages = rawNested !== undefined ? rawNested : rawFlat;
            const cleanImages = sanitizeHeroImages((rawImages as any) ?? []);
            payloadContent = setDotted(payloadContent, 'hero_banner.images', cleanImages);
            payloadContent = setDotted(payloadContent, 'hero_images', cleanImages);

            const heroType = getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type') ?? 'image';
            const vType = String(heroType).trim().replace(/\/+$/, '') || 'image';
            payloadContent = setDotted(payloadContent, 'hero_banner.type', vType);
            payloadContent = setDotted(payloadContent, 'hero_type', vType);

            const heroVideo = getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url') ?? '';
            const cleanVideo = stripTrailingSlash(String(heroVideo).trim());
            const normVideo = cleanVideo ? (cleanVideo.startsWith('http') ? cleanVideo : normalizeImageUrl(cleanVideo)) : '';
            payloadContent = setDotted(payloadContent, 'hero_banner.video_url', normVideo);
            payloadContent = setDotted(payloadContent, 'hero_video_url', normVideo);

            const heroYoutube = getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url') ?? '';
            const cleanYt = stripTrailingSlash(String(heroYoutube).trim());
            payloadContent = setDotted(payloadContent, 'hero_banner.youtube_url', cleanYt);
            payloadContent = setDotted(payloadContent, 'hero_youtube_url', cleanYt);

            const overlay = getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity') ?? 35;
            const num = Math.min(100, Math.max(0, Number(overlay)));
            payloadContent = setDotted(payloadContent, 'hero_banner.overlay_opacity', num);
            payloadContent = setDotted(payloadContent, 'overlay_opacity', num);

            for (const k of ['heading', 'subtitle', 'cta_label', 'cta_link'] as const) {
                const v = getDotted(content, `hero_banner.${k}`) ?? getDotted(content, `hero_${k}`) ?? '';
                const s = k === 'cta_link' ? stripTrailingSlash(String(v).trim()) : String(v ?? '');
                payloadContent = setDotted(payloadContent, `hero_banner.${k}`, s);
                payloadContent = setDotted(payloadContent, `hero_${k}`, s);
            }

            const res: any = await apiPut(`/api/stores/${store.id}/designer`, { content: payloadContent });
            const finalContent2 = res?.content ?? payloadContent;
            setContent(finalContent2);
            setInitialSnapshot(JSON.stringify({ theme, tokens, content: finalContent2, css: customCss, js: customJs, head: headInject }));
            toast.success('تم حفظ إعدادات البنر');
        } catch {
            toast.error('تعذر حفظ إعدادات البنر');
        } finally {
            setSaving(false);
        }
    };

    const uploadHeroFiles = async (files: FileList) => {
        const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (valid.length === 0) {
            toast.warning('الرجاء اختيار ملف صورة');
            return;
        }
        setHeroUploading(true);
        try {
            const fd = new FormData();
            valid.forEach((f) => fd.append('files[]', f));
            const res = await fetch(route('api.media.batch'), {
                method: 'POST',
                body: fd,
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const json: any = await res.json();
            if (res.ok && json?.data?.length) {
                const urls: string[] = (json.data as any[])
                    .map((d: any) => {
                        const raw = String(d.url || '');
                        if (!raw) return '';
                        if (raw.startsWith('/storage')) return raw;
                        const m = raw.match(/\/storage\/.*$/);
                        return m ? m[0] : raw;
                    })
                    .filter(Boolean)
                    .map((u) => normalizeImageUrl(u))
                    .filter(Boolean);
                if (urls.length) {
                    const rawHero = (getDotted(content, 'hero_banner.images') ?? getDotted(content, 'hero_images') ?? []) as any;
                    const existing = sanitizeHeroImages(rawHero);
                    const next = [...existing, ...urls].slice(0, 10);
                    let tmp = setDotted(content, 'hero_banner.images', next);
                    tmp = setDotted(tmp, 'hero_images', next);
                    setContent(tmp);
                    toast.success('تم رفع الصورة');
                }
            } else {
                toast.error(json?.message || 'فشل الرفع');
            }
        } catch {
            toast.error('حدث خطأ أثناء الرفع');
        } finally {
            setHeroUploading(false);
        }
    };

    const uploadLogoFile = async (files: FileList) => {
        const file = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!file) {
            toast.warning('الرجاء اختيار ملف صورة');
            return;
        }
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('files[]', file);
            const res = await fetch(route('api.media.batch'), {
                method: 'POST',
                body: fd,
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const json: any = await res.json();
            if (res.ok && json?.data?.[0]?.url) {
                const raw = String(json.data[0].url || '');
                const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : '';
                const normalized = normalizeImageUrl(url);
                const nextTokens = { ...tokens, logo: normalized };
                setTokens(nextTokens);
                // also store in content for persistence flexibility
                let tmp = setDotted(content, 'brand.logo', normalized);
                tmp = setDotted(tmp, 'logo', normalized);
                setContent(tmp);
                toast.success('تم رفع الشعار');
            } else {
                toast.error(json?.message || 'فشل رفع الشعار');
            }
        } catch {
            toast.error('حدث خطأ أثناء الرفع');
        } finally {
            setLogoUploading(false);
        }
    };

    const uploadFaviconFile = async (files: FileList) => {
        const file = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!file) {
            toast.warning('الرجاء اختيار ملف صورة');
            return;
        }
        setFaviconUploading(true);
        try {
            const fd = new FormData();
            fd.append('files[]', file);
            const res = await fetch(route('api.media.batch'), {
                method: 'POST',
                body: fd,
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const json: any = await res.json();
            if (res.ok && json?.data?.[0]?.url) {
                const raw = String(json.data[0].url || '');
                const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : '';
                const normalized = normalizeImageUrl(url);
                const nextTokens = { ...tokens, favicon: normalized };
                setTokens(nextTokens);
                let tmp = setDotted(content, 'brand.favicon', normalized);
                tmp = setDotted(tmp, 'favicon', normalized);
                setContent(tmp);
                toast.success('تم رفع الأيقونة');
            } else {
                toast.error(json?.message || 'فشل رفع الأيقونة');
            }
        } catch {
            toast.error('حدث خطأ أثناء الرفع');
        } finally {
            setFaviconUploading(false);
        }
    };

    const colors = (tokens?.colors || {}) as Record<string, string>;
    const typography = (tokens?.typography || {}) as Record<string, any>;
    const logoValue = (tokens?.logo as string) || (getDotted(content, 'brand.logo') as string) || (getDotted(content, 'logo') as string) || '';
    const faviconValue = (tokens?.favicon as string) || (getDotted(content, 'brand.favicon') as string) || (getDotted(content, 'favicon') as string) || '';

    // Announcement state
    const announcementText = (getDotted(content, 'announcement.text') ?? '') as string;
    const announcementBg = (getDotted(content, 'announcement.bg_color') ?? '#2b2320') as string;
    const announcementColor = (getDotted(content, 'announcement.text_color') ?? '#f5ede2') as string;
    const showAnnouncementRaw = getDotted(content, 'announcement.enabled');
    const showAnnouncement = showAnnouncementRaw === undefined ? true : !!showAnnouncementRaw;

    // Homepage sections state — stored under content.settings (also aliased as homepage.* for back-compat)
    // Defaults: show categories bar false (task spec), latest/best sellers true
    const showCategoriesBarRaw = getDotted(content, 'settings.show_categories_bar') ?? getDotted(content, 'homepage.show_categories_bar') ?? false;
    const showCategoriesBar = !!showCategoriesBarRaw;
    const showLatestRaw = getDotted(content, 'settings.show_latest_products') ?? getDotted(content, 'homepage.show_latest_products');
    const showLatestProducts = showLatestRaw === undefined ? true : !!showLatestRaw;
    const showBestSellersRaw = getDotted(content, 'settings.show_best_sellers') ?? getDotted(content, 'homepage.show_best_sellers');
    const showBestSellers = showBestSellersRaw === undefined ? true : !!showBestSellersRaw;
    const homepageCategories = (getDotted(content, 'settings.homepage_categories') ?? getDotted(content, 'homepage.homepage_categories') ?? getDotted(content, 'homepage_categories') ?? []) as Array<string | number>;
    const homepageProductsPerCategoryRaw = getDotted(content, 'settings.homepage_products_per_category') ?? getDotted(content, 'homepage.homepage_products_per_category') ?? 8;
    const homepageProductsPerCategory = [4, 8, 12].includes(Number(homepageProductsPerCategoryRaw)) ? Number(homepageProductsPerCategoryRaw) : 8;

    // Hero state
    const heroType = (getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type') ?? 'image') as string;
    const rawHeroImages = (getDotted(content, 'hero_banner.images') ?? getDotted(content, 'hero_images') ?? []) as any;
    const heroImages = sanitizeHeroImages(rawHeroImages);
    const heroVideoUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url') ?? ''));
    const heroYoutubeUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url') ?? ''));
    const heroOverlay = Number(getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity') ?? 35);
    const heroHeading = (getDotted(content, 'hero_banner.heading') ?? '') as string;
    const heroSubtitle = (getDotted(content, 'hero_banner.subtitle') ?? '') as string;
    const heroCtaLabel = (getDotted(content, 'hero_banner.cta_label') ?? '') as string;
    const heroCtaLink = (getDotted(content, 'hero_banner.cta_link') ?? '') as string;

    const getYoutubeId = (url: string) => {
        try {
            const u = new URL(url);
            if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
            if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0];
            const parts = u.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('embed');
            if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split('?')[0];
            return parts[parts.length - 1]?.split('?')[0] ?? null;
        } catch {
            const m = url.match(/[a-zA-Z0-9_-]{11}/);
            return m ? m[0] : null;
        }
    };
    const youtubeId = heroYoutubeUrl ? getYoutubeId(heroYoutubeUrl) : null;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" /> جارٍ تحميل المصمم…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100" dir="rtl">
            {/* ───────────── Unified Global Sticky Header ───────────── */}
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="mx-auto flex h-[64px] max-w-[1600px] items-center justify-between gap-2 px-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 font-bold text-slate-600 hover:text-slate-900"
                            onClick={() => {
                                const fallback = '/stores';
                                if (typeof route !== 'undefined') {
                                    try {
                                        window.location.href = route('stores.index');
                                        return;
                                    } catch {}
                                }
                                window.location.href = fallback;
                            }}
                        >
                            <ArrowRight className="h-4 w-4" /> <span className="hidden sm:inline">رجوع للمتاجر</span>
                            <span className="sm:hidden">رجوع</span>
                        </Button>
                        <Separator orientation="vertical" className="hidden h-6 sm:block" />
                        <div className="hidden items-center gap-2 sm:flex">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                <Store className="h-4 w-4" />
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-sm font-black leading-none text-slate-900">{store?.name ?? 'تخصيص المتجر'}</p>
                                <p className="text-xs text-slate-500">محرر بصري فوري</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Desktop / Mobile switcher */}
                        <div className="flex rounded-full bg-slate-100 p-1">
                            <button
                                type="button"
                                aria-label="معاينة سطح المكتب"
                                onClick={() => setPreviewMode('desktop')}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${previewMode === 'desktop' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Monitor className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                aria-label="معاينة الجوال"
                                onClick={() => setPreviewMode('mobile')}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${previewMode === 'mobile' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Smartphone className="h-4 w-4" />
                            </button>
                        </div>

                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener"
                            className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
                        >
                            <Eye className="h-4 w-4" /> معاينة المتجر
                        </a>

                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm sm:hidden"
                            aria-label="معاينة المتجر"
                        >
                            <Eye className="h-4 w-4" />
                        </a>

                        <Button
                            onClick={handleSaveAll}
                            disabled={saving || !isDirty}
                            className={`gap-1.5 rounded-full px-5 font-black ${isDirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                            title={isDirty ? 'حفظ التغييرات' : 'لا توجد تغييرات'}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} <span className="hidden sm:inline">حفظ التغييرات</span>
                            <span className="sm:hidden">حفظ</span>
                            {isDirty && !saving && <span className="ms-1 h-2 w-2 rounded-full bg-amber-300 animate-pulse" aria-hidden />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* ───────────── Split Layout: Sidebar + Live Canvas ───────────── */}
            <div className="h-full flex flex-col overflow-hidden mx-auto max-w-[1600px] lg:h-[calc(100vh-64px)] lg:flex-row">
                {/* Left Panel – Settings Sidebar */}
                <aside className="h-full flex flex-col overflow-hidden order-2 w-full shrink-0 border-t bg-white lg:order-1 lg:w-[400px] lg:border-e lg:border-t-0 xl:w-[420px]">
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-100px)] px-4 py-2 custom-scrollbar space-y-3">
                        {/* ── Templates quick picker ── */}
                        <AccordionSection title="القوالب" icon={<Sparkles className="h-3.5 w-3.5" />} open={openSections.templates} onOpenChange={(v) => setOpenSections((s) => ({ ...s, templates: v }))}>
                            <p className="text-xs leading-relaxed text-slate-500">اختر قالب متجرك — سيُطبَّق مباشرةً عند الاختيار.</p>
                            <StoreTemplatesGrid
                                store={store}
                                activeTheme={theme}
                                availableThemes={availableThemes}
                                withFilter={false}
                                onApplied={(slug) => setTheme(slug)}
                            />
                        </AccordionSection>

                        {/* ── 1. الهوية والألوان ── */}
                        <AccordionSection title="الهوية والألوان" icon={<Palette className="h-3.5 w-3.5" />} open={openSections.identity} onOpenChange={(v) => setOpenSections((s) => ({ ...s, identity: v }))}>
                            {/* Logo */}
                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">الشعار (Logo)</Label>
                                {logoValue ? (
                                    <div className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <img src={getImageUrl(logoValue)} alt="الشعار" className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-bold text-slate-700" dir="ltr">
                                                {logoValue}
                                            </p>
                                            <p className="text-xs text-slate-500">اضغط لتغيير الشعار</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => logoFileRef.current?.click()} disabled={logoUploading}>
                                            {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTokens({ ...tokens, logo: '' });
                                                setContent(setDotted(setDotted(content, 'brand.logo', ''), 'logo', ''));
                                            }}
                                            className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                            aria-label="حذف"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <DropzoneUploader
                                        label="اسحب الشعار هنا أو اضغط للاختيار"
                                        hint="PNG أو SVG بخلفية شفافة — 512×512 يفضل"
                                        accept="image/*"
                                        multiple={false}
                                        uploading={logoUploading}
                                        onFiles={uploadLogoFile}
                                    />
                                )}
                                <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadLogoFile(e.target.files)} />
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">الأيقونة (Favicon)</Label>
                                {faviconValue ? (
                                    <div className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <img src={getImageUrl(faviconValue)} alt="الأيقونة" className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-bold text-slate-700" dir="ltr">
                                                {faviconValue}
                                            </p>
                                            <p className="text-xs text-slate-500">اضغط لتغيير الأيقونة</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => faviconFileRef.current?.click()} disabled={faviconUploading}>
                                            {faviconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTokens({ ...tokens, favicon: '' });
                                                setContent(setDotted(setDotted(content, 'brand.favicon', ''), 'favicon', ''));
                                            }}
                                            className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                            aria-label="حذف"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <DropzoneUploader
                                        label="اسحب الأيقونة هنا أو اضغط للاختيار"
                                        hint="32×32 — تظهر في تبويب المتصفح"
                                        accept="image/*"
                                        multiple={false}
                                        uploading={faviconUploading}
                                        onFiles={uploadFaviconFile}
                                    />
                                )}
                                <input ref={faviconFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadFaviconFile(e.target.files)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <ColorPickerField label="اللون الأساسي" value={colors.primary || '#0d9488'} onChange={(v) => setTokens({ ...tokens, colors: { ...colors, primary: v } })} />
                                <ColorPickerField label="اللون الثانوي" value={colors.secondary || '#f59e0b'} onChange={(v) => setTokens({ ...tokens, colors: { ...colors, secondary: v } })} />
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">استدارة الزوايا</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={32}
                                        value={parseInt(String(tokens.radius ?? 16), 10) || 0}
                                        onChange={(e) => setTokens({ ...tokens, radius: `${e.target.value}px` })}
                                        className="flex-1 accent-emerald-600"
                                        aria-label="استدارة الزوايا"
                                    />
                                    <span className="min-w-12 rounded-full bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">
                                        {String(tokens.radius ?? '16px')}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">عائلة الخط</Label>
                                <select
                                    value={typography.font_family || ''}
                                    onChange={(e) => setTokens({ ...tokens, typography: { ...typography, font_family: e.target.value } })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">افتراضي القالب</option>
                                    <option value="Cairo">Cairo</option>
                                    <option value="Tajawal">Tajawal</option>
                                    <option value="Almarai">Almarai</option>
                                    <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                                </select>
                            </div>

                            {/* Live token preview */}
                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                <p className="mb-2 text-xs font-bold text-slate-400">معاينة سريعة</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-4 py-2 text-xs font-black text-white shadow" style={{ backgroundColor: colors.primary || '#0d9488', borderRadius: tokens.radius || '16px' }}>
                                        زر أساسي
                                    </span>
                                    <span className="px-4 py-2 text-xs font-black text-white shadow" style={{ backgroundColor: colors.secondary || '#f59e0b', borderRadius: tokens.radius || '16px' }}>
                                        زر ثانوي
                                    </span>
                                    <span className="border bg-white px-4 py-2 text-xs font-bold text-slate-700" style={{ borderColor: colors.primary || '#0d9488', borderRadius: tokens.radius || '16px' }}>
                                        عنصر محدد
                                    </span>
                                </div>
                            </div>
                        </AccordionSection>

                        {/* ── 2. شريط الإعلانات العلوي ── */}
                        <AccordionSection title="شريط الإعلانات العلوي" icon={<Megaphone className="h-3.5 w-3.5" />} open={openSections.announcement} onOpenChange={(v) => setOpenSections((s) => ({ ...s, announcement: v }))}>
                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">نص الشريط</Label>
                                <Input
                                    value={announcementText ?? ''}
                                    onChange={(e) => setContent(setDotted(content, 'announcement.text', e.target.value))}
                                    placeholder="توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح"
                                    className="bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <ColorPickerField
                                    label="لون الخلفية"
                                    value={announcementBg && /^#[0-9a-fA-F]{6}$/.test(announcementBg.trim()) ? announcementBg.trim() : '#1a1a1a'}
                                    onChange={(v) => setContent(setDotted(content, 'announcement.bg_color', v))}
                                />
                                <ColorPickerField
                                    label="لون النص"
                                    value={announcementColor && /^#[0-9a-fA-F]{6}$/.test(announcementColor.trim()) ? announcementColor.trim() : '#ffffff'}
                                    onChange={(v) => setContent(setDotted(content, 'announcement.text_color', v))}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">إظهار الشريط</p>
                                    <p className="text-xs text-slate-500">يظهر أعلى كل صفحات المتجر</p>
                                </div>
                                <Switch checked={showAnnouncement} onCheckedChange={(v) => setContent(setDotted(content, 'announcement.enabled', v))} aria-label="إظهار شريط الإعلانات" />
                            </div>

                            {/* Mini preview */}
                            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                                <div dir="rtl" className="flex items-center justify-center gap-2 px-3 py-2 text-center text-xs font-medium" style={{ backgroundColor: announcementBg, color: announcementColor }}>
                                    <span aria-hidden>✦</span>
                                    <span>{announcementText.trim() || 'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح'}</span>
                                    <span aria-hidden>✦</span>
                                </div>
                                {!showAnnouncement && <p className="bg-amber-50 px-3 py-1.5 text-center text-xs font-bold text-amber-700">مخفي</p>}
                            </div>
                        </AccordionSection>

                        {/* ── 3. البنر الرئيسي ── */}
                        <AccordionSection title="البنر الرئيسي (Hero Banner)" icon={<ImageIcon className="h-3.5 w-3.5" />} open={openSections.hero} onOpenChange={(v) => setOpenSections((s) => ({ ...s, hero: v }))}>
                            <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                                {[
                                    { id: 'image', label: 'صور' },
                                    { id: 'video', label: 'فيديو' },
                                    { id: 'youtube', label: 'يوتيوب' },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            let tmp = setDotted(content, 'hero_banner.type', opt.id);
                                            tmp = setDotted(tmp, 'hero_type', opt.id);
                                            setContent(tmp);
                                        }}
                                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-black transition ${heroType === opt.id ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {heroType === 'image' && (
                                <div className="space-y-3">
                                    {heroImages.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {heroImages.map((img: string, idx: number) => (
                                                <div key={idx} className="group relative overflow-hidden rounded-xl border bg-slate-100">
                                                    <img src={normalizeImageUrl(img)} alt="" className="aspect-[16/10] w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = heroImages.filter((_: string, i: number) => i !== idx);
                                                            let tmp = setDotted(content, 'hero_banner.images', next);
                                                            tmp = setDotted(tmp, 'hero_images', next);
                                                            setContent(tmp);
                                                        }}
                                                        className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-red-600"
                                                        aria-label="حذف الصورة"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <DropzoneUploader
                                        label={heroImages.length === 0 ? 'اسحب صور البنر هنا' : 'إضافة المزيد من الصور'}
                                        hint="حتى 10 صور — 1920×1080 موصى به، 2MB حد أقصى"
                                        multiple
                                        uploading={heroUploading}
                                        onFiles={uploadHeroFiles}
                                    />
                                    <input ref={heroFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadHeroFiles(e.target.files)} />
                                </div>
                            )}

                            {heroType === 'video' && (
                                <div className="space-y-3">
                                    <Label className="block text-xs font-bold text-slate-600">رابط فيديو MP4</Label>
                                    <Input
                                        dir="ltr"
                                        value={heroVideoUrl ? normalizeImageUrl(heroVideoUrl) : heroVideoUrl}
                                        onChange={(e) => {
                                            const clean = stripTrailingSlash(e.target.value.trim());
                                            const norm = clean ? (clean.startsWith('http') ? clean : normalizeImageUrl(clean)) : '';
                                            let tmp = setDotted(content, 'hero_banner.video_url', norm);
                                            tmp = setDotted(tmp, 'hero_video_url', norm);
                                            setContent(tmp);
                                        }}
                                        placeholder="https://example.com/video.mp4"
                                        className="bg-white font-mono text-sm"
                                    />
                                    <DropzoneUploader
                                        label="أو اسحب ملف الفيديو هنا"
                                        hint="MP4 — حتى 15MB"
                                        accept="video/mp4,video/*"
                                        onFiles={async (files) => {
                                            const f = Array.from(files)[0];
                                            if (!f) return;
                                            setHeroUploading(true);
                                            try {
                                                const fd = new FormData();
                                                fd.append('files[]', f);
                                                const res = await fetch(route('api.media.batch'), {
                                                    method: 'POST',
                                                    body: fd,
                                                    headers: {
                                                        Accept: 'application/json',
                                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                                    },
                                                });
                                                const json: any = await res.json();
                                                if (res.ok && json?.data?.[0]?.url) {
                                                    const raw = String(json.data[0].url || '');
                                                    const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : '';
                                                    const normalized = normalizeImageUrl(url);
                                                    let tmp = setDotted(content, 'hero_banner.video_url', normalized);
                                                    tmp = setDotted(tmp, 'hero_video_url', normalized);
                                                    setContent(tmp);
                                                    toast.success('تم رفع الفيديو');
                                                } else toast.error(json?.message || 'فشل الرفع');
                                            } catch {
                                                toast.error('حدث خطأ أثناء الرفع');
                                            } finally {
                                                setHeroUploading(false);
                                            }
                                        }}
                                        uploading={heroUploading}
                                    />
                                    {heroVideoUrl && <video src={normalizeImageUrl(heroVideoUrl)} controls className="max-h-48 w-full rounded-xl border object-cover" />}
                                </div>
                            )}

                            {heroType === 'youtube' && (
                                <div className="space-y-3">
                                    <Label className="block text-xs font-bold text-slate-600">رابط يوتيوب</Label>
                                    <Input
                                        dir="ltr"
                                        value={heroYoutubeUrl ? stripTrailingSlash(heroYoutubeUrl) : heroYoutubeUrl}
                                        onChange={(e) => {
                                            const clean = stripTrailingSlash(e.target.value.trim());
                                            let tmp = setDotted(content, 'hero_banner.youtube_url', clean);
                                            tmp = setDotted(tmp, 'hero_youtube_url', clean);
                                            setContent(tmp);
                                        }}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="bg-white font-mono text-sm"
                                    />
                                    {youtubeId && (
                                        <div className="overflow-hidden rounded-xl border">
                                            <iframe
                                                className="aspect-video w-full"
                                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&mute=1&controls=1`}
                                                title="YouTube preview"
                                                frameBorder="0"
                                                allow="autoplay; fullscreen"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">شفافية الطبقة ({heroOverlay}%)</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={heroOverlay}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            let tmp = setDotted(content, 'hero_banner.overlay_opacity', val);
                                            tmp = setDotted(tmp, 'overlay_opacity', val);
                                            setContent(tmp);
                                        }}
                                        className="flex-1 accent-emerald-600"
                                    />
                                    <span className="min-w-12 rounded-full bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">{heroOverlay}%</span>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <div>
                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">العنوان الرئيسي</Label>
                                    <Input
                                        value={heroHeading ?? ''}
                                        onChange={(e) => {
                                            let tmp = setDotted(content, 'hero_banner.heading', e.target.value);
                                            tmp = setDotted(tmp, 'hero_heading', e.target.value);
                                            setContent(tmp);
                                        }}
                                        placeholder="أناقة تُروى كقصة"
                                        className="bg-white"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">الوصف الفرعي</Label>
                                    <Input
                                        value={heroSubtitle ?? ''}
                                        onChange={(e) => {
                                            let tmp = setDotted(content, 'hero_banner.subtitle', e.target.value);
                                            tmp = setDotted(tmp, 'hero_subtitle', e.target.value);
                                            setContent(tmp);
                                        }}
                                        placeholder="تشكيلة الموسم الجديدة"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600">نص الزر</Label>
                                        <Input
                                            value={heroCtaLabel ?? ''}
                                            onChange={(e) => {
                                                let tmp = setDotted(content, 'hero_banner.cta_label', e.target.value);
                                                tmp = setDotted(tmp, 'hero_cta_label', e.target.value);
                                                setContent(tmp);
                                            }}
                                            placeholder="اكتشفي التشكيلة"
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600">رابط الزر</Label>
                                        <Input
                                            dir="ltr"
                                            value={heroCtaLink ?? ''}
                                            onChange={(e) => {
                                                const clean = stripTrailingSlash(e.target.value.trim());
                                                let tmp = setDotted(content, 'hero_banner.cta_link', clean);
                                                tmp = setDotted(tmp, 'hero_cta_link', clean);
                                                setContent(tmp);
                                            }}
                                            placeholder="#section"
                                            className="bg-white font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Template-specific slots (if any) */}
                            {!!activeModule?.contentSchema?.length && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 text-xs font-black text-slate-700">محتوى قالب «{activeModule.meta.name}»</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {(activeModule.contentSchema as SlotField[]).map((field) => {
                                            const value = getDotted(content, field.key) ?? field.default ?? '';
                                            return (
                                                <div key={field.key} className={field.type === 'image' ? 'sm:col-span-2' : ''}>
                                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">{field.label}</Label>
                                                    {field.type === 'image' ? (
                                                        <MediaPicker value={value} onChange={(url: string) => setContent(setDotted(content, field.key, url))} />
                                                    ) : (
                                                        <Input
                                                            value={String(value)}
                                                            onChange={(e) => setContent(setDotted(content, field.key, e.target.value))}
                                                            placeholder={field.default}
                                                            className="bg-white"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </AccordionSection>

                        {/* ── 4. أقسام الصفحة الرئيسية (tab=content) ── */}
                        <AccordionSection title="أقسام الصفحة الرئيسية" icon={<Store className="h-3.5 w-3.5" />} open={openSections.homeSections} onOpenChange={(v) => setOpenSections((s) => ({ ...s, homeSections: v }))}>
                            <p className="text-xs leading-relaxed text-slate-500">تحكم في عرض الأقسام الثابتة وإضافة أقسام فئات ديناميكية للصفحة الرئيسية.</p>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">شريط الفئات العلوي</p>
                                    <p className="text-xs text-slate-500">إظهار شريط الفئات الثانوي في الهيدر</p>
                                </div>
                                <Switch
                                    checked={showCategoriesBar}
                                    onCheckedChange={(v) => {
                                        let tmp = setDotted(content, 'settings.show_categories_bar', v);
                                        tmp = setDotted(tmp, 'homepage.show_categories_bar', v);
                                        setContent(tmp);
                                    }}
                                    aria-label="show_categories_bar"
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">وصل حديثاً</p>
                                    <p className="text-xs text-slate-500">إظهار قسم أحدث المنتجات</p>
                                </div>
                                <Switch
                                    checked={showLatestProducts}
                                    onCheckedChange={(v) => {
                                        let tmp = setDotted(content, 'settings.show_latest_products', v);
                                        tmp = setDotted(tmp, 'homepage.show_latest_products', v);
                                        setContent(tmp);
                                    }}
                                    aria-label="show_latest_products"
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">الأكثر مبيعاً</p>
                                    <p className="text-xs text-slate-500">إظهار قسم المنتجات الأكثر مبيعاً</p>
                                </div>
                                <Switch
                                    checked={showBestSellers}
                                    onCheckedChange={(v) => {
                                        let tmp = setDotted(content, 'settings.show_best_sellers', v);
                                        tmp = setDotted(tmp, 'homepage.show_best_sellers', v);
                                        setContent(tmp);
                                    }}
                                    aria-label="show_best_sellers"
                                />
                            </div>

                            <Separator />

                            <div>
                                <Label className="mb-2 block text-xs font-black text-slate-700">مدير أقسام الفئات (homepage_categories)</Label>
                                <p className="mb-3 text-xs text-slate-500">اختر الفئات التي تريد عرضها كأقسام منفصلة في الصفحة الرئيسية. لكل قسم سيظهر شبكة منتجات مع زر "عرض الكل".</p>
                                {availableCategories.length === 0 ? (
                                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">لا توجد فئات نشطة لهذا المتجر.</p>
                                ) : (
                                    <div className="max-h-56 space-y-1.5 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                                        {availableCategories.map((cat) => {
                                            const idStr = String(cat.id);
                                            const checked = homepageCategories.map(String).includes(idStr);
                                            return (
                                                <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            const next = e.target.checked
                                                                ? [...homepageCategories.map(String), idStr]
                                                                : homepageCategories.map(String).filter((x) => x !== idStr);
                                                            // store as strings to keep type consistent
                                                            let tmp = setDotted(content, 'settings.homepage_categories', next);
                                                            tmp = setDotted(tmp, 'homepage.homepage_categories', next);
                                                            tmp = setDotted(tmp, 'homepage_categories', next);
                                                            setContent(tmp);
                                                        }}
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span>
                                                    <span className="text-xs text-slate-400">#{cat.id}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-slate-400">{homepageCategories.length} فئة محددة</p>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">الحد الأقصى للمنتجات في كل قسم فئة</Label>
                                <select
                                    value={String(homepageProductsPerCategory)}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        let tmp = setDotted(content, 'settings.homepage_products_per_category', v);
                                        tmp = setDotted(tmp, 'homepage.homepage_products_per_category', v);
                                        setContent(tmp);
                                    }}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="4">4 منتجات</option>
                                    <option value="8">8 منتجات</option>
                                    <option value="12">12 منتجاً</option>
                                </select>
                            </div>
                        </AccordionSection>

                        {/* ── 5. محتوى الصفحة الرئيسية — جزء من تجربة التصميم الموحدة ── */}
                        <AccordionSection title="محتوى الصفحة الرئيسية" icon={<Building2 className="h-3.5 w-3.5" />} open={openSections.homeSections} onOpenChange={(v) => setOpenSections((s) => ({ ...s, homeSections: v }))}>
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">رسالة الترحيب</Label>
                                    <Input value={getDotted(content, 'welcome_message') as string || ''} onChange={(e) => setContent(setDotted(content, 'welcome_message', e.target.value))} placeholder="مرحباً بكم في متجرنا!" className="bg-white" />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">وصف المتجر</Label>
                                    <Textarea value={getDotted(content, 'store_description') as string || ''} onChange={(e) => setContent(setDotted(content, 'store_description', e.target.value))} placeholder="وصف مختصر لمتجرك..." rows={3} className="bg-white" />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">نص الحقوق</Label>
                                    <Input value={getDotted(content, 'copyright_text') as string || ''} onChange={(e) => setContent(setDotted(content, 'copyright_text', e.target.value))} placeholder="© 2026 متجري. جميع الحقوق محفوظة." className="bg-white" />
                                </div>
                                <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                                    <p className="text-xs leading-relaxed text-amber-800">💡 هذا المحتوى يظهر في الصفحة الرئيسية. يمكنك معاينته مباشرة في المعاينة الحية على اليمين.</p>
                                </div>
                            </div>
                        </AccordionSection>

                        {/* ── 6. إعدادات متقدمة ── */}
                        <AccordionSection title="إعدادات متقدمة" icon={<Code2 className="h-3.5 w-3.5" />} open={openSections.advanced} onOpenChange={(v) => setOpenSections((s) => ({ ...s, advanced: v }))}>
                            <p className="text-xs leading-relaxed text-slate-500">أكواد مخصصة تُحقن داخل واجهة متجرك فقط — في بيئة معزولة ومنقّاة.</p>
                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">CSS مخصص</Label>
                                <Textarea dir="ltr" rows={6} value={customCss} onChange={(e) => setCustomCss(e.target.value)} placeholder=".my-button { background: #0d9488; }" className="font-mono text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">JavaScript مخصص</Label>
                                <Textarea dir="ltr" rows={6} value={customJs} onChange={(e) => setCustomJs(e.target.value)} placeholder="// يعمل بعد اكتمال التحميل" className="font-mono text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-xs font-bold text-slate-600">وسوم الرأس (Head)</Label>
                                <Textarea dir="ltr" rows={3} value={headInject} onChange={(e) => setHeadInject(e.target.value)} placeholder='<meta name="..." />' className="font-mono text-sm" />
                            </div>
                        </AccordionSection>

                        <p className="px-1 pt-2 text-center text-xs text-slate-400">يتم حفظ كل الأقسام معاً عبر زر “حفظ التغييرات” أعلاه</p>
                    </div>
                </aside>

                {/* Right Panel – Live Canvas Preview — pure responsive iframe */}
                <main className="order-1 flex min-h-[480px] flex-1 flex-col overflow-hidden bg-slate-100 lg:order-2">
                    <div className="flex items-center justify-between border-b bg-white px-4 py-2.5">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-700">
                            <Monitor className="h-4 w-4 text-slate-400" /> معاينة حية
                            <span className="hidden text-xs font-medium text-slate-400 sm:inline">— تتحدث فورياً مع تعديلاتك</span>
                        </p>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">{previewMode === 'mobile' ? 'جوال 375px' : 'سطح مكتب'}</span>
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden bg-slate-100 p-4 sm:p-6">
                        <div className={`mx-auto flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-out ${previewMode === 'mobile' ? 'w-[375px] max-w-full rounded-[24px] border border-slate-200 shadow-xl ring-1 ring-slate-200' : 'w-full max-w-[1100px] rounded-[16px] border border-slate-200 shadow-xl ring-1 ring-slate-200'}`}>
                            {(() => {
                                const previewSrc = (() => {
                                    const base = String(storeUrl || '').trim();
                                    if (!base) return '';
                                    try {
                                        const u = new URL(base, window.location.origin);
                                        u.searchParams.set('preview', 'true');
                                        return u.toString();
                                    } catch {
                                        return base.includes('?') ? `${base}&preview=true` : `${base}?preview=true`;
                                    }
                                })();
                                return (
                                    <iframe
                                        key={previewSrc}
                                        src={previewSrc}
                                        title="Live store preview"
                                        className="h-full min-h-[520px] w-full flex-1 border-0 bg-white"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        allow="fullscreen"
                                    />
                                );
                            })()}
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-400">المعاينة الحية تتحدث فورياً — احفظ التغييرات لتظهر للزوار</p>
                    </div>
                </main>
            </div>
        </div>
    );
}
