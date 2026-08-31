import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowRight,
    Building2,
    Check,
    ChevronDown,
    Code2,
    Eye,
    Image as ImageIcon,
    Layers,
    LayoutGrid,
    Loader2,
    Megaphone,
    Monitor,
    Palette,
    Pencil,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import MediaPicker from '@/components/MediaPicker';
import { apiGet, apiPut } from '@/utils/api';
import { getImageUrl } from '@/utils/image-helper';
import { csrfHeaders, getCsrfToken } from '@/utils/csrf';
import { getTemplateModule, listTemplateModules, type TemplateModule } from '@/templates-v2/registry';
import { MEDIA_SPECS, mediaSpecHelp } from '@/templates-v2/shared/mediaSpecs';
import { usePage } from '@inertiajs/react';

interface SlotField { key: string; label: string; type: 'text' | 'image'; group?: string; default?: string; }
interface Props { store: any; availableThemes: string[]; settings: any; storeUrl: string; }

function setDotted(obj: Record<string, any>, path: string, value: any): Record<string, any> {
    if (typeof path !== 'string' || !path) return obj;
    const next = { ...obj };
    const parts = path.split('.');
    let cur: any = next;
    for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = { ...(cur[parts[i]] || {}) }; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = value;
    return next;
}
function getDotted(obj: Record<string, any>, path: string): any {
    if (typeof path !== 'string' || !path) return undefined;
    return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
function stripTrailingSlash(url: string): string { return String(url || '').trim().replace(/\/+$/, ''); }
function normalizeImageUrl(url: string): string {
    if (!url) return '';
    const trimmed = stripTrailingSlash(String(url).trim());
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    try { return stripTrailingSlash(getImageUrl(trimmed)); } catch { return trimmed; }
}
function sanitizeHeroImages(images: any): string[] {
    if (!Array.isArray(images)) return [];
    return images.map((u: any) => String(u || '').trim()).filter(Boolean).map((u) => normalizeImageUrl(u)).filter((u) => u && u.length > 5 && u !== '/' && u !== '//' && !u.endsWith('//')).slice(0, 10);
}
function parsePos(v: string): [number, number] {
    const parts = String(v || '').split(/\s+/).map((s) => parseFloat(s));
    const x = parts[0];
    const y = parts[1];
    if (!Number.isNaN(x as number) && !Number.isNaN(y as number)) return [x as number, y as number];
    return [50, 50];
}
function clampPos(x: number, y: number): string {
    const cx = Math.round(Math.max(0, Math.min(100, x)));
    const cy = Math.round(Math.max(0, Math.min(100, y)));
    return `${cx}% ${cy}%`;
}
function VideoCropEditor({ src, ratio, label, hint, value, onChange, onReset }: { src: string; ratio: string; label: string; hint: string; value: string; onChange: (pos: string) => void; onReset: () => void; }) {
    const dragRef = useRef<{ startX: number; startY: number; rect: DOMRect; ox: number; oy: number } | null>(null);
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const t = e.currentTarget as HTMLElement;
        try { t.setPointerCapture(e.pointerId); } catch { /* noop */ }
        const rect = t.getBoundingClientRect();
        const [ox, oy] = parsePos(value);
        dragRef.current = { startX: e.clientX, startY: e.clientY, rect, ox, oy };
    };
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current;
        if (!d) return;
        const t = e.currentTarget as HTMLElement;
        if (!t.hasPointerCapture(e.pointerId)) return;
        const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
        const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
        onChange(clampPos(d.ox - dx * 0.5, d.oy - dy * 0.5));
    };
    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        const t = e.currentTarget as HTMLElement;
        try { if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId); } catch { /* noop */ }
        dragRef.current = null;
    };
    return (
        <div className="mt-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-600">{label}</p>
                <button type="button" onClick={onReset} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700">إعادة ضبط</button>
            </div>
            <p className="text-[10px] text-slate-400">{hint}</p>
            <div
                className="relative mt-1 w-full cursor-grab touch-none overflow-hidden rounded-lg border bg-black active:cursor-grabbing"
                style={{ aspectRatio: ratio }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <video src={normalizeImageUrl(src)} className="h-full w-full object-cover" style={{ objectPosition: value }} muted playsInline />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-white/30" />
                <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white" dir="ltr">{value}</span>
            </div>
        </div>
    );
}
function ColorPickerField({ label, helper, value, onChange }: { label: string; helper?: string; value: string; onChange: (v: string) => void }) {
    const safe = /^#[0-9a-fA-F]{6}$/.test(String(value || '').trim()) ? String(value).trim() : '#0d9488';
    return (
        <div>
            <Label className="mb-1 block text-xs font-bold leading-none text-slate-700">{label}{helper && <span className="ms-1 text-[9px] font-normal tracking-wide text-slate-400/70">{helper}</span>}</Label>
            <div className="flex items-center gap-2">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-inner">
                    <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer border-0 p-0" aria-label={label} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold leading-none text-slate-600" dir="ltr">{safe}</span>
            </div>
        </div>
    );
}
function DropzoneUploader({ onFiles, accept = 'image/*', multiple = false, label, hint, uploading }: { onFiles: (files: FileList) => void; accept?: string; multiple?: boolean; label: string; hint?: string; uploading?: boolean; }) {
    const ref = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    return (
        <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
            onClick={() => ref.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'}`}
        >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />}</div>
            <p className="text-xs font-bold leading-none text-slate-700">{label}</p>
            {hint && <p className="text-[11px] leading-none text-slate-500">{hint}</p>}
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-emerald-700 shadow-sm">اختيار ملف</span>
            <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
        </div>
    );
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm ${className}`}>{children}</div>;
}
function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return <Label className="mb-1 block text-xs font-bold leading-none text-slate-700">{children}{hint && <span className="ms-1 text-[10px] font-normal text-slate-400">— {hint}</span>}</Label>;
}

type WorkspaceId = 'templates' | 'identity' | 'interface' | 'sections' | 'content' | 'advanced';
const WORKSPACES: { id: WorkspaceId; label: string; icon: React.ReactNode }[] = [
    { id: 'templates', label: 'القالب', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: 'identity', label: 'الهوية', icon: <Palette className="h-3.5 w-3.5" /> },
    { id: 'interface', label: 'الواجهة', icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: 'sections', label: 'الأقسام', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'content', label: 'المحتوى', icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: 'advanced', label: 'متقدم', icon: <Code2 className="h-3.5 w-3.5" /> },
];

function CompactTemplateThumb({ slug, preview }: { slug: string; preview: string }) {
    // ultra compact visual - just gradient + simple shapes for thumb 64px
    return (
        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200" style={{ background: preview }}>
            <div className="absolute inset-0 flex flex-col p-1">
                <div className="h-1 w-6 rounded bg-black/15" />
                <div className="mt-1 flex-1 rounded bg-white/80" />
            </div>
        </div>
    );
}

export default function StoreDesigner({ store, availableThemes, settings, storeUrl }: Props) {
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
    const [previewVersion, setPreviewVersion] = useState(0);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(() => {
        if (typeof window !== 'undefined') {
            const tab = new URLSearchParams(window.location.search).get('tab');
            if (tab === 'templates') return 'templates';
            if (tab === 'identity' || tab === 'brand') return 'identity';
            if (tab === 'interface' || tab === 'hero') return 'interface';
            if (tab === 'sections') return 'sections';
            if (tab === 'content') return 'content';
            if (tab === 'advanced') return 'advanced';
        }
        return 'templates';
    });
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
    const [previewTemplateSlug, setPreviewTemplateSlug] = useState<string | null>(null);
    const [confirmTemplateSlug, setConfirmTemplateSlug] = useState<string | null>(null);
    const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
    const [interfaceVideoUploading, setInterfaceVideoUploading] = useState(false);
    const [focusedSlot, setFocusedSlot] = useState<string | null>(null);

    const page = usePage<any>();
    useEffect(() => {
        const rawUrl = typeof page.url === 'string' ? page.url : '';
        const q = rawUrl.split('?')[1] || (typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '');
        const tab = new URLSearchParams(q).get('tab') || '';
        if (tab === 'templates') setActiveWorkspace('templates');
        else if (tab === 'identity' || tab === 'brand') setActiveWorkspace('identity');
        else if (tab === 'interface' || tab === 'hero') setActiveWorkspace('interface');
        else if (tab === 'sections') setActiveWorkspace('sections');
        else if (tab === 'content') setActiveWorkspace('content');
        else if (tab === 'advanced') setActiveWorkspace('advanced');
    }, [page.url]);

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
                setTokens(nTokens); setContent(nContent); setCustomCss(nCss); setCustomJs(nJs); setHeadInject(nHead);
                if (Array.isArray(res.categories)) setAvailableCategories(res.categories);
                setInitialSnapshot(JSON.stringify({ theme: res.theme || 'bazaar-market', tokens: nTokens, content: nContent, css: nCss, js: nJs, head: nHead }));
            })
            .catch(() => toast.error('تعذر تحميل إعدادات المصمم'))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [store.id]);

    const isDirty = useMemo(() => {
        try {
            const cur = JSON.stringify({ tokens, content, css: customCss, js: customJs, head: headInject });
            const snap = (() => { try { const parsed = JSON.parse(initialSnapshot); const { theme: _t, ...rest } = parsed; return JSON.stringify(rest); } catch { return initialSnapshot; } })();
            return cur !== snap;
        } catch { return true; }
    }, [tokens, content, customCss, customJs, headInject, initialSnapshot]);

    // Live preview without save: post draft to iframe via postMessage (includes focused slot + previewMode for mobile fallback)
    useEffect(() => {
        if (loading) return;
        const iframe = previewIframeRef.current?.contentWindow;
        if (!iframe) return;
        const draft = { designTokens: tokens, content, customCss, customJs, headInject, theme: previewTemplateSlug || theme, highlight: focusedSlot, previewMode };
        // debounce to avoid spam on keystrokes
        const t = setTimeout(() => {
            try {
                iframe.postMessage({ type: 'wusool:preview:draft', payload: draft }, window.location.origin);
            } catch {}
        }, 120);
        return () => clearTimeout(t);
    }, [tokens, content, customCss, customJs, headInject, theme, previewTemplateSlug, focusedSlot, previewMode, loading]);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'wusool:preview:ready' && !loading) {
                const iframe = previewIframeRef.current?.contentWindow;
                if (!iframe) return;
                const draft = { designTokens: tokens, content, customCss, customJs, headInject, theme: previewTemplateSlug || theme, highlight: focusedSlot, previewMode };
                try { iframe.postMessage({ type: 'wusool:preview:draft', payload: draft }, window.location.origin); } catch {}
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [tokens, content, customCss, customJs, headInject, theme, previewTemplateSlug, focusedSlot, previewMode, loading]);

    const activeModule: TemplateModule | null = useMemo(() => { try { return getTemplateModule(theme); } catch { return null; } }, [theme]);
    const modules = useMemo(() => listTemplateModules(), []);

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
            if (heroType !== undefined) { payloadContent = setDotted(payloadContent, 'hero_banner.type', String(heroType).trim().replace(/\/+$/, '')); payloadContent = setDotted(payloadContent, 'hero_type', String(heroType).trim().replace(/\/+$/, '')); }
            const heroVideo = getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url');
            if (heroVideo !== undefined) { const cleanVideo = stripTrailingSlash(String(heroVideo).trim()); const normVideo = cleanVideo ? (cleanVideo.startsWith('http') ? cleanVideo : normalizeImageUrl(cleanVideo)) : ''; payloadContent = setDotted(payloadContent, 'hero_banner.video_url', normVideo); payloadContent = setDotted(payloadContent, 'hero_video_url', normVideo); }
            const heroVideoMobile = getDotted(content, 'hero_banner.video_url_mobile') ?? getDotted(content, 'hero_video_url_mobile');
            if (heroVideoMobile !== undefined) { const cleanM = stripTrailingSlash(String(heroVideoMobile).trim()); const normM = cleanM ? (cleanM.startsWith('http') ? cleanM : normalizeImageUrl(cleanM)) : ''; payloadContent = setDotted(payloadContent, 'hero_banner.video_url_mobile', normM); payloadContent = setDotted(payloadContent, 'hero_video_url_mobile', normM); }
            const heroYoutube = getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url');
            if (heroYoutube !== undefined) { const cleanYt = stripTrailingSlash(String(heroYoutube).trim()); payloadContent = setDotted(payloadContent, 'hero_banner.youtube_url', cleanYt); payloadContent = setDotted(payloadContent, 'hero_youtube_url', cleanYt); }
            const heroYoutubeMobile = getDotted(content, 'hero_banner.youtube_url_mobile') ?? getDotted(content, 'hero_youtube_url_mobile');
            if (heroYoutubeMobile !== undefined) { const cleanYtm = stripTrailingSlash(String(heroYoutubeMobile).trim()); payloadContent = setDotted(payloadContent, 'hero_banner.youtube_url_mobile', cleanYtm); payloadContent = setDotted(payloadContent, 'hero_youtube_url_mobile', cleanYtm); }
            const rawMobileNested = getDotted(content, 'hero_banner.images_mobile');
            const rawMobileFlat = getDotted(content, 'hero_images_mobile');
            const rawMobileImages = rawMobileNested !== undefined ? rawMobileNested : rawMobileFlat;
            if (rawMobileImages !== undefined) { const cleanMob = sanitizeHeroImages((rawMobileImages as any) ?? []); payloadContent = setDotted(payloadContent, 'hero_banner.images_mobile', cleanMob); payloadContent = setDotted(payloadContent, 'hero_images_mobile', cleanMob); }
            const overlay = getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity');
            if (overlay !== undefined) { const num = Math.min(100, Math.max(0, Number(overlay))); payloadContent = setDotted(payloadContent, 'hero_banner.overlay_opacity', num); payloadContent = setDotted(payloadContent, 'overlay_opacity', num); }
            for (const k of ['heading', 'subtitle', 'cta_label', 'cta_link'] as const) {
                const v = getDotted(content, `hero_banner.${k}`) ?? getDotted(content, `hero_${k}`);
                if (v !== undefined) { const s = k === 'cta_link' ? stripTrailingSlash(String(v).trim()) : String(v ?? ''); payloadContent = setDotted(payloadContent, `hero_banner.${k}`, s); payloadContent = setDotted(payloadContent, `hero_${k}`, s); }
            }
            try {
                const finalType = String(getDotted(payloadContent, 'hero_banner.type') ?? getDotted(payloadContent, 'hero_type') ?? 'image').trim() || 'image';
                const finalImages = sanitizeHeroImages((getDotted(payloadContent, 'hero_banner.images') ?? getDotted(payloadContent, 'hero_images') ?? []) as any);
                if ((finalType === 'image' || finalType === 'slider') && finalImages.length > 0) {
                    const hHeading = String(getDotted(payloadContent, 'hero_banner.heading') ?? getDotted(payloadContent, 'hero_heading') ?? '');
                    const hSubtitle = String(getDotted(payloadContent, 'hero_banner.subtitle') ?? getDotted(payloadContent, 'hero_subtitle') ?? '');
                    const hCtaLabel = String(getDotted(payloadContent, 'hero_banner.cta_label') ?? getDotted(payloadContent, 'hero_cta_label') ?? '');
                    const hCtaLink = String(getDotted(payloadContent, 'hero_banner.cta_link') ?? getDotted(payloadContent, 'hero_cta_link') ?? '#');
                    const bannerArray = finalImages.map((img: string) => ({ image: img, title: hHeading, subtitle: hSubtitle, button_text: hCtaLabel, button_link: hCtaLink }));
                    payloadContent = setDotted(payloadContent, 'banners', bannerArray);
                }
            } catch {}
            const res: any = await apiPut(`/api/stores/${store.id}/designer`, { design_tokens: tokens, content: payloadContent, custom_css: customCss, custom_js: customJs, head_inject: headInject });
            const finalContent = res?.content ?? payloadContent; const finalTokens = res?.design_tokens ?? tokens;
            setContent(finalContent); setTokens(finalTokens);
            if (res?.custom_css !== undefined) setCustomCss(res.custom_css);
            if (res?.custom_js !== undefined) setCustomJs(res.custom_js);
            if (res?.head_inject !== undefined) setHeadInject(res.head_inject);
            setInitialSnapshot(JSON.stringify({ theme, tokens: finalTokens, content: finalContent, css: res?.custom_css ?? customCss, js: res?.custom_js ?? customJs, head: res?.head_inject ?? headInject }));
            toast.success('تم حفظ جميع التغييرات بنجاح');
            setPreviewVersion((v) => v + 1);
        } catch { toast.error('تعذر حفظ التغييرات — تأكد من سلامة المدخلات'); } finally { setSaving(false); }
    };

    const uploadHeroFiles = async (files: FileList) => {
        const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (valid.length === 0) { toast.warning('الرجاء اختيار ملف صورة'); return; }
        setHeroUploading(true);
        try {
            const fd = new FormData(); valid.forEach((f) => fd.append('files[]', f));
            const res = await fetch(route('api.media.batch'), { method: 'POST', body: fd, headers: { Accept: 'application/json', ...csrfHeaders() } });
            const json: any = await res.json();
            if (res.ok && json?.data?.length) {
                const urls: string[] = (json.data as any[]).map((d: any) => { const raw = String(d.url || ''); if (!raw) return ''; if (raw.startsWith('/storage')) return raw; const m = raw.match(/\/storage\/.*$/); return m ? m[0] : raw; }).filter(Boolean).map((u) => normalizeImageUrl(u)).filter(Boolean);
                if (urls.length) {
                    const rawMedia = (getDotted(content, 'hero_banner.media') ?? []) as any[];
                    const newId = () => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`);
                    const newItems = urls.map((url) => ({ id: newId(), type: 'image', src: url, position: '50% 50%', positionMobile: '50% 50%' }));
                    const newMedia = [...(Array.isArray(rawMedia) ? rawMedia : []), ...newItems].slice(0, 10);
                    let tmp = setDotted(content, 'hero_banner.media', newMedia);
                    // Sync legacy for backward compat
                    const legacyImages = newMedia.filter((m:any)=>m.type==='image').map((m:any)=>m.src).slice(0,10);
                    tmp = setDotted(tmp, 'hero_banner.images', legacyImages);
                    tmp = setDotted(tmp, 'hero_images', legacyImages);
                    // Also keep hero_banner.type as image if not set
                    if (!getDotted(tmp, 'hero_banner.type')) { tmp = setDotted(tmp, 'hero_banner.type', 'image'); tmp = setDotted(tmp, 'hero_type', 'image'); }
                    setContent(tmp); toast.success('تم رفع الصورة');
                }
            } else toast.error(json?.message || 'فشل الرفع');
        } catch { toast.error('حدث خطأ أثناء الرفع'); } finally { setHeroUploading(false); }
    };
    const uploadLogoFile = async (files: FileList) => {
        const file = Array.from(files).find((f) => f.type.startsWith('image/')); if (!file) { toast.warning('الرجاء اختيار ملف صورة'); return; }
        setLogoUploading(true);
        try {
            const fd = new FormData(); fd.append('files[]', file);
            const res = await fetch(route('api.media.batch'), { method: 'POST', body: fd, headers: { Accept: 'application/json', ...csrfHeaders() } });
            const json: any = await res.json();
            if (res.ok && json?.data?.[0]?.url) { const raw = String(json.data[0].url || ''); const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : ''; const normalized = normalizeImageUrl(url); setTokens({ ...tokens, logo: normalized }); let tmp = setDotted(content, 'brand.logo', normalized); tmp = setDotted(tmp, 'logo', normalized); setContent(tmp); toast.success('تم رفع الشعار'); } else toast.error(json?.message || 'فشل رفع الشعار');
        } catch { toast.error('حدث خطأ أثناء الرفع'); } finally { setLogoUploading(false); }
    };
    const uploadFaviconFile = async (files: FileList) => {
        const file = Array.from(files).find((f) => f.type.startsWith('image/')); if (!file) { toast.warning('الرجاء اختيار ملف صورة'); return; }
        setFaviconUploading(true);
        try {
            const fd = new FormData(); fd.append('files[]', file);
            const res = await fetch(route('api.media.batch'), { method: 'POST', body: fd, headers: { Accept: 'application/json', ...csrfHeaders() } });
            const json: any = await res.json();
            if (res.ok && json?.data?.[0]?.url) { const raw = String(json.data[0].url || ''); const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : ''; const normalized = normalizeImageUrl(url); setTokens({ ...tokens, favicon: normalized }); let tmp = setDotted(content, 'brand.favicon', normalized); tmp = setDotted(tmp, 'favicon', normalized); setContent(tmp); toast.success('تم رفع الأيقونة'); } else toast.error(json?.message || 'فشل رفع الأيقونة');
        } catch { toast.error('حدث خطأ أثناء الرفع'); } finally { setFaviconUploading(false); }
    };

    const colors = (tokens?.colors || {}) as Record<string, string>;
    const typography = (tokens?.typography || {}) as Record<string, any>;
    const logoValue = (tokens?.logo as string) || (getDotted(content, 'brand.logo') as string) || (getDotted(content, 'logo') as string) || '';
    const faviconValue = (tokens?.favicon as string) || (getDotted(content, 'brand.favicon') as string) || (getDotted(content, 'favicon') as string) || '';

    useEffect(() => {
        if (!faviconValue) return;
        const faviconUrl = getImageUrl(faviconValue);
        const timestamp = Date.now();
        const hrefWithCacheBuster = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${timestamp}`;
        const updateFavicon = (doc: Document) => {
            let link = doc.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (!link) { link = doc.createElement('link'); link.rel = 'icon'; link.type = 'image/png'; doc.head.appendChild(link); }
            link.href = hrefWithCacheBuster;
            let appleLink = doc.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
            if (!appleLink) { appleLink = doc.createElement('link'); appleLink.rel = 'apple-touch-icon'; doc.head.appendChild(appleLink); }
            appleLink.href = hrefWithCacheBuster;
        };
        updateFavicon(document);
        const iframe = document.querySelector('iframe[title="Live store preview"]') as HTMLIFrameElement;
        if (iframe) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) updateFavicon(iframeDoc);
                else {
                    const handleLoad = () => { try { const doc = iframe.contentDocument || iframe.contentWindow?.document; if (doc) updateFavicon(doc); } catch {} };
                    iframe.addEventListener('load', handleLoad, { once: true });
                    return () => iframe.removeEventListener('load', handleLoad);
                }
            } catch {}
        }
    }, [faviconValue]);

    const announcementText = (getDotted(content, 'announcement.text') ?? '') as string;
    const announcementBg = (getDotted(content, 'announcement.bg_color') ?? '#2b2320') as string;
    const announcementColor = (getDotted(content, 'announcement.text_color') ?? '#f5ede2') as string;
    const showAnnouncementRaw = getDotted(content, 'announcement.enabled');
    const showAnnouncement = showAnnouncementRaw === undefined ? true : !!showAnnouncementRaw;
    const announcementItems = (getDotted(content, 'announcement.items') ?? []) as string[];
    const showCategoriesBarRaw = getDotted(content, 'settings.show_categories_bar') ?? getDotted(content, 'homepage.show_categories_bar') ?? false;
    const showCategoriesBar = !!showCategoriesBarRaw;
    const showLatestRaw = getDotted(content, 'settings.show_latest_products') ?? getDotted(content, 'homepage.show_latest_products');
    const showLatestProducts = showLatestRaw === undefined ? true : !!showLatestRaw;
    const showBestSellersRaw = getDotted(content, 'settings.show_best_sellers') ?? getDotted(content, 'homepage.show_best_sellers');
    const showBestSellers = showBestSellersRaw === undefined ? true : !!showBestSellersRaw;
    const homepageCategories = (getDotted(content, 'settings.homepage_categories') ?? getDotted(content, 'homepage.homepage_categories') ?? getDotted(content, 'homepage_categories') ?? []) as Array<string | number>;
    const homepageProductsPerCategoryRaw = getDotted(content, 'settings.homepage_products_per_category') ?? getDotted(content, 'homepage.homepage_products_per_category') ?? 8;
    const homepageProductsPerCategory = [4, 8, 12].includes(Number(homepageProductsPerCategoryRaw)) ? Number(homepageProductsPerCategoryRaw) : 8;
    const getYoutubeId = (url: string) => {
        try { const u = new URL(url); if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]; if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0]; const parts = u.pathname.split('/').filter(Boolean); const idx = parts.indexOf('embed'); if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split('?')[0]; return parts[parts.length - 1]?.split('?')[0] ?? null; } catch { const m = url.match(/[a-zA-Z0-9_-]{11}/); return m ? m[0] : null; }
    };
    const heroType = (getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type') ?? 'image') as string;
    const rawHeroImages = (getDotted(content, 'hero_banner.images') ?? getDotted(content, 'hero_images') ?? []) as any;
    const heroImages = sanitizeHeroImages(rawHeroImages);
    // Canonical hero_banner.media — single source of truth for images/videos/youtube (mixed order)
    const getHeroMedia = (): any[] => {
        const raw = (getDotted(content, 'hero_banner.media') ?? []) as any[];
        if (Array.isArray(raw) && raw.length) return raw;
        // Hydrate legacy images/images_mobile into canonical with deterministic ids and correct pairing
        const legacyMob = sanitizeHeroImages((getDotted(content, 'hero_banner.images_mobile') ?? getDotted(content, 'hero_images_mobile') ?? []) as any);
        const legacy: any[] = [];
        rawHeroImages.forEach((src: string, idx: number) => {
            legacy.push({ id: `legacy-image-${idx}-${src.slice(-8)}`, type: 'image', src, srcMobile: (legacyMob[idx] && legacyMob[idx] !== src) ? legacyMob[idx] : null, position: '50% 50%', positionMobile: '50% 50%' });
        });
        const legacyVideo = String(getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url') ?? '').trim();
        if (legacyVideo) legacy.push({ id: `legacy-video-${legacyVideo.slice(-8)}`, type: 'video', src: legacyVideo, position: String(getDotted(content, 'hero_banner.position') ?? '50% 50%'), positionMobile: String(getDotted(content, 'hero_banner.position_mobile') ?? '50% 50%') });
        const legacyYt = String(getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url') ?? '').trim();
        const ytId = legacyYt ? getYoutubeId(legacyYt) : null;
        if (ytId) legacy.push({ id: `legacy-youtube-${ytId.slice(-8)}`, type: 'youtube', src: ytId });
        return legacy;
    };
    const heroMediaAll = getHeroMedia();
    const newId = () => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`);
    const totalMediaCount = heroMediaAll.length;
    const moveHeroMediaById = (movingId: string, targetCanonicalIdx: number) => {
        const raw = (getDotted(content, 'hero_banner.media') ?? []) as any[];
        if (!Array.isArray(raw) || !raw.length) return;
        const fromIdx = raw.findIndex((m:any)=>String(m.id)===String(movingId));
        if (fromIdx<0) return;
        const clampedTo = Math.max(0, Math.min(targetCanonicalIdx, raw.length-1));
        if (fromIdx===clampedTo) return;
        const next=[...raw]; const [m]=next.splice(fromIdx,1); next.splice(clampedTo,0,m);
        let tmp=setDotted(content,'hero_banner.media', next);
        const imgs=next.filter((mm:any)=>String(mm.type).toLowerCase()==='image').map((mm:any)=>mm.src);
        // Preserve positional alignment: every image slot gets a mobile entry;
        // missing srcMobile uses the desktop src as a sanitizer-safe placeholder
        // (runtime already falls back to desktop src when srcMobile is falsy).
        const mobImgs=next.filter((mm:any)=>String(mm.type).toLowerCase()==='image').map((mm:any)=>{ const mob=String(mm.srcMobile || '').trim(); return mob ? mob : mm.src; });
        tmp=setDotted(tmp,'hero_banner.images', imgs);
        tmp=setDotted(tmp,'hero_images', imgs);
        tmp=setDotted(tmp,'hero_banner.images_mobile', mobImgs);
        tmp=setDotted(tmp,'hero_images_mobile', mobImgs);
        const firstVideo=next.find((mm:any)=>String(mm.type).toLowerCase()==='video')?.src||'';
        tmp=setDotted(tmp,'hero_banner.video_url', firstVideo);
        tmp=setDotted(tmp,'hero_video_url', firstVideo);
        const firstYt=next.find((mm:any)=>String(mm.type).toLowerCase()==='youtube')?.src||'';
        tmp=setDotted(tmp,'hero_banner.youtube_url', firstYt ? 'https://www.youtube.com/watch?v='+firstYt : '');
        tmp=setDotted(tmp,'hero_youtube_url', tmp['hero_banner.youtube_url'] as any);
        setContent(tmp);
    };
    const updateHeroMedia = (id: string, patch: Record<string, any>) => {
        const raw = (getDotted(content, 'hero_banner.media') ?? []) as any[];
        if (!Array.isArray(raw) || !raw.length) {
            // Hydrate legacy into canonical first if empty
            const hyd = getHeroMedia();
            const next = hyd.map((m:any)=> String(m.id)===String(id) ? { ...m, ...patch, show_content: patch.showContent ?? patch.show_content ?? m.show_content, showContent: patch.showContent ?? patch.show_content ?? m.showContent, cta_label: patch.cta_label ?? patch.ctaLabel ?? m.cta_label, ctaLabel: patch.ctaLabel ?? patch.cta_label ?? m.ctaLabel, cta_link: patch.cta_link ?? patch.ctaLink ?? m.cta_link, ctaLink: patch.ctaLink ?? patch.cta_link ?? m.ctaLink } : m);
            setContent(setDotted(content, 'hero_banner.media', next));
            return;
        }
        const next = raw.map((m:any)=> String(m.id)===String(id) ? { ...m, ...patch, show_content: patch.showContent !== undefined ? patch.showContent : (patch.show_content !== undefined ? patch.show_content : m.show_content), showContent: patch.showContent !== undefined ? patch.showContent : (patch.show_content !== undefined ? patch.show_content : m.showContent) } : m);
        // sync aliases for content fields
        const synced = next.map((m:any)=> {
            if (String(m.id)!==String(id)) return m;
            const out={...m};
            if (patch.heading !== undefined) { out.heading = patch.heading; out.title = patch.heading; }
            if (patch.subtitle !== undefined) out.subtitle = patch.subtitle;
            if (patch.ctaLabel !== undefined || patch.cta_label !== undefined) { const v = patch.ctaLabel ?? patch.cta_label; out.ctaLabel = v; out.cta_label = v; out.button_text = v; }
            if (patch.ctaLink !== undefined || patch.cta_link !== undefined) { const v = patch.ctaLink ?? patch.cta_link; out.ctaLink = v; out.cta_link = v; out.button_link = v; }
            return out;
        });
        setContent(setDotted(content, 'hero_banner.media', synced));
    };
    const heroVideoUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url') ?? ''));
    const heroVideoUrlMobile = stripTrailingSlash(String(getDotted(content, 'hero_banner.video_url_mobile') ?? getDotted(content, 'hero_banner.videoUrlMobile') ?? getDotted(content, 'hero_video_url_mobile') ?? ''));
    const heroYoutubeUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url') ?? ''));
    const heroYoutubeUrlMobile = stripTrailingSlash(String(getDotted(content, 'hero_banner.youtube_url_mobile') ?? getDotted(content, 'hero_banner.youtubeUrlMobile') ?? getDotted(content, 'hero_youtube_url_mobile') ?? ''));
    const heroOverlay = Number(getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity') ?? 0);
    const youtubeIdMobile = heroYoutubeUrlMobile ? getYoutubeId(heroYoutubeUrlMobile) : null;
    const heroHeading = (getDotted(content, 'hero_banner.heading') ?? '') as string;
    const heroSubtitle = (getDotted(content, 'hero_banner.subtitle') ?? '') as string;
    const heroCtaLabel = (getDotted(content, 'hero_banner.cta_label') ?? '') as string;
    const heroCtaLink = (getDotted(content, 'hero_banner.cta_link') ?? '') as string;
    const youtubeId = heroYoutubeUrl ? getYoutubeId(heroYoutubeUrl) : null;

    const applyTemplate = async (slug: string) => {
        setApplyingTemplate(slug);
        try {
            await apiPut(`/api/stores/${store.id}/designer`, { theme: slug });
            setTheme(slug);
            setInitialSnapshot((prev) => { try { const p = JSON.parse(prev); p.theme = slug; return JSON.stringify(p); } catch { return prev; } });
            setPreviewVersion((v) => v + 1);
            toast.success('تم تطبيق القالب بنجاح');
            setConfirmTemplateSlug(null);
        } catch (e: any) {
            const msg = e?.data?.error || e?.data?.message || (e?.status === 422 ? 'القالب غير متاح في خطتك الحالية' : e?.status === 403 ? 'ليس لديك صلاحية لتغيير القالب' : '');
            toast.error(msg ? `تعذر تطبيق القالب: ${msg}` : 'تعذر تطبيق القالب — حاول مرة أخرى');
        } finally { setApplyingTemplate(null); }
    };
    const previewModule = useMemo(() => (previewTemplateSlug ? modules.find((m) => m.meta.slug === previewTemplateSlug) ?? null : null), [previewTemplateSlug, modules]);
    const confirmModule = useMemo(() => (confirmTemplateSlug ? modules.find((m) => m.meta.slug === confirmTemplateSlug) ?? null : null), [confirmTemplateSlug, modules]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /> جارٍ تحميل المصمم…</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100" dir="rtl">
            {/* Global Header */}
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <div className="mx-auto flex h-[56px] max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-slate-600 hover:text-slate-900 px-2 sm:px-3" onClick={() => { try { window.location.href = route('stores.index'); } catch { window.location.href = '/stores'; } }}>
                            <ArrowRight className="h-4 w-4" /> <span className="hidden sm:inline">رجوع للمتاجر</span><span className="sm:hidden">رجوع</span>
                        </Button>
                        <Separator orientation="vertical" className="hidden h-6 sm:block" />
                        <div className="hidden items-center gap-2 sm:flex">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white"><Store className="h-3.5 w-3.5" /></div>
                            <div className="hidden lg:block"><p className="text-sm font-black leading-none text-slate-900">{store?.name ?? 'تخصيص المتجر'}</p><p className="text-[11px] text-slate-500">محرر بصري فوري</p></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="flex rounded-full bg-slate-100 p-1">
                            <button type="button" aria-label="معاينة سطح المكتب" onClick={() => setPreviewMode('desktop')} className={`flex h-7 w-7 items-center justify-center rounded-full transition ${previewMode === 'desktop' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}><Monitor className="h-3.5 w-3.5" /></button>
                            <button type="button" aria-label="معاينة الجوال" onClick={() => setPreviewMode('mobile')} className={`flex h-7 w-7 items-center justify-center rounded-full transition ${previewMode === 'mobile' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}><Smartphone className="h-3.5 w-3.5" /></button>
                        </div>
                        <button type="button" onClick={async () => {
                            const isUnpublished = settings?.store_status === 'false' || settings?.store_status === false;
                            const label = isUnpublished ? 'معاينة المتجر' : 'فتح المتجر';
                            if (isUnpublished) {
                                try {
                                    const res = await fetch(route('stores.preview-token', store.id), { headers: { 'Accept': 'application/json', ...csrfHeaders() } });
                                    const data = await res.json();
                                    if (data.preview_url) { window.open(data.preview_url, '_blank'); return; }
                                } catch {}
                            }
                            window.open(storeUrl, '_blank');
                        }} className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:inline-flex"><Eye className="h-3.5 w-3.5" /> {settings?.store_status === 'false' || settings?.store_status === false ? 'معاينة المتجر' : 'فتح المتجر'}</button>
                        <button type="button" onClick={async () => {
                            const isUnpublished = settings?.store_status === 'false' || settings?.store_status === false;
                            if (isUnpublished) {
                                try {
                                    const res = await fetch(route('stores.preview-token', store.id), { headers: { 'Accept': 'application/json', ...csrfHeaders() } });
                                    const data = await res.json();
                                    if (data.preview_url) { window.open(data.preview_url, '_blank'); return; }
                                } catch {}
                            }
                            window.open(storeUrl, '_blank');
                        }} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm sm:hidden" aria-label="معاينة المتجر"><Eye className="h-3.5 w-3.5" /></button>
                        <Button onClick={handleSaveAll} disabled={saving || !isDirty} className={`gap-1.5 rounded-full px-4 sm:px-5 text-xs sm:text-sm font-black transition ${isDirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-700' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`} title={isDirty ? 'حفظ التغييرات' : 'لا توجد تغييرات'}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} <span className="hidden sm:inline">حفظ التغييرات</span><span className="sm:hidden">حفظ</span>{isDirty && !saving && <span className="ms-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Split Layout: Preview + Controls — Controls on RIGHT (RTL), Preview LEFT ~72-75%
                Desktop 1440: [ Controls 390px RIGHT ] [ Preview flexible LEFT ]
                Wrapper dir="ltr" makes visual order = DOM order; order utilities swap mobile vs desktop placement.
                Controls RIGHT = left-to-right row second column; Preview LEFT = first column larger.
            */}
            <div dir="ltr" className="mx-auto flex max-w-[1600px] flex-col lg:h-[calc(100vh-56px)] lg:flex-row lg:overflow-hidden">
                {/* Preview Panel — LEFT visually on desktop (first col), bottom on mobile */}
                <main className="order-2 flex min-h-[420px] flex-1 flex-col overflow-hidden bg-slate-100 lg:order-1 lg:min-h-0" dir="rtl">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2 sm:px-4">
                        <div className="flex flex-col gap-0.5">
                            <p className="flex items-center gap-1.5 text-xs font-black leading-none text-slate-800"><Monitor className="h-3.5 w-3.5 text-slate-400" /> وضع المعاينة</p>
                            <p className="text-[11px] font-medium leading-none text-slate-500">أنت تشاهد معاينة مباشرة للمتجر</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold leading-none text-slate-600 ring-1 ring-slate-200">{previewMode === 'mobile' ? 'جوال 375px' : 'سطح مكتب'}</span>
                    </div>
                    {isDirty && (
                        <div className="flex items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden />
                            <p className="text-[11px] font-bold leading-none text-amber-800">لديك تغييرات غير محفوظة</p>
                        </div>
                    )}
                    <div className="flex flex-1 flex-col overflow-hidden bg-slate-100 p-2 sm:p-3">
                        <div className={`mx-auto flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-out ${previewMode === 'mobile' ? 'w-[375px] max-w-full rounded-[18px] border border-slate-200 shadow-lg ring-1 ring-slate-200' : 'w-full max-w-[1100px] rounded-[12px] border border-slate-200 shadow-lg ring-1 ring-slate-200'}`}>
                            {(() => {
                                const base = String(storeUrl || '').trim();
                                let previewSrc = '';
                                if (base) {
                                    try { const u = new URL(base, window.location.origin); u.searchParams.set('preview', 'true'); u.searchParams.set('v', String(previewVersion)); u.searchParams.set('theme', theme); previewSrc = u.toString(); } catch { const sep = base.includes('?') ? '&' : '?'; previewSrc = `${base}${sep}preview=true&v=${previewVersion}&theme=${encodeURIComponent(theme)}`; }
                                }
                                return <iframe ref={previewIframeRef} key={`${previewSrc}-${previewVersion}-${theme}`} src={previewSrc} title="Live store preview" className="h-full min-h-[520px] w-full flex-1 border-0 bg-white" loading="lazy" referrerPolicy="no-referrer" allow="fullscreen" />;
                            })()}
                        </div>
                    </div>
                </main>

                {/* Controls Panel — RIGHT visually on desktop (second col, 360-390px), top on mobile */}
                <aside className="order-1 flex w-full shrink-0 flex-col overflow-hidden border-b border-slate-100 bg-white lg:order-2 lg:w-[360px] lg:border-b-0 lg:border-s lg:border-s-slate-100 xl:w-[390px]" dir="rtl">
                    {/* Sticky workspace navigation */}
                    <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white">
                        <div className="grid grid-cols-3 gap-1 p-2 sm:gap-1.5 sm:p-2.5">
                            {WORKSPACES.map((ws) => {
                                const active = activeWorkspace === ws.id;
                                return (
                                    <button
                                        key={ws.id}
                                        type="button"
                                        onClick={() => setActiveWorkspace(ws.id)}
                                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-black leading-none transition sm:py-2 sm:text-xs ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'}`}
                                    >
                                        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-white/15' : 'bg-slate-100'}`}>{ws.icon}</span>
                                        {ws.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Active workspace title bar */}
                        <div className="flex items-center justify-between bg-slate-50/80 px-3 py-2">
                            <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                                {WORKSPACES.find((w) => w.id === activeWorkspace)?.icon}
                                {WORKSPACES.find((w) => w.id === activeWorkspace)?.label}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">{activeWorkspace === 'templates' ? `${modules.length} قوالب` : activeWorkspace === 'sections' ? `${homepageCategories.length} فئات` : ''}</span>
                        </div>
                    </div>

                    {/* Scrollable workspace content — subtle scrollbar */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-3 sm:py-3 lg:max-h-[calc(100vh-56px-118px)] [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-transparent">
                        {/* ============ 1. القالب ============ */}
                        {activeWorkspace === 'templates' && (
                            <div className="space-y-3">
                                <p className="text-xs leading-relaxed text-slate-500">اختر قالب متجرك — يُطبّق فوراً عند الاختيار.</p>
                                <div className="space-y-2.5">
                                    {modules.map((tpl) => {
                                        const active = theme.trim().toLowerCase() === tpl.meta.slug.toLowerCase();
                                        const allowed = !availableThemes || availableThemes.length === 0 || availableThemes.includes(tpl.meta.slug);
                                        return (
                                            <div key={tpl.meta.slug} className={`flex gap-3 rounded-xl border p-3 transition ${active ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'} ${!allowed ? 'opacity-60' : ''}`}>
                                                <CompactTemplateThumb slug={tpl.meta.slug} preview={tpl.meta.preview} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="truncate text-sm font-black text-slate-900">{tpl.meta.name}</h3>
                                                        {active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>}
                                                    </div>
                                                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{tpl.meta.description}</p>
                                                    <div className="mt-2 flex items-center gap-1.5">
                                                        <button type="button" onClick={() => setPreviewTemplateSlug(tpl.meta.slug)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-3 w-3" /> معاينة</button>
                                                        {active ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">مُستخدم حالياً</span>
                                                        ) : !allowed ? (
                                                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">ترقية مطلوبة</span>
                                                        ) : (
                                                            <button type="button" disabled={applyingTemplate === tpl.meta.slug} onClick={() => setConfirmTemplateSlug(tpl.meta.slug)} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white hover:bg-slate-800 disabled:opacity-50" style={{ backgroundColor: tpl.meta.accent }}>
                                                                {applyingTemplate === tpl.meta.slug && <Loader2 className="h-3 w-3 animate-spin" />} استخدام
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ============ 2. الهوية ============ */}
                        {activeWorkspace === 'identity' && (
                            <div className="space-y-3">
                                <Card>
                                    <SectionLabel>شعار المتجر <span className="text-[9px] font-normal tracking-wide text-slate-400/70">Logo</span></SectionLabel>
                                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">{mediaSpecHelp(MEDIA_SPECS.shared.branding.logo)}</p>
                                    {logoValue ? (
                                        <div className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <img src={getImageUrl(logoValue)} alt="شعار المتجر" className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow" />
                                            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700" dir="ltr">{logoValue}</p><p className="text-[11px] text-slate-500">اضغط لتغيير الشعار — يحافظ على نسبة العرض</p></div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => logoFileRef.current?.click()} disabled={logoUploading}>{logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}</Button>
                                            <button type="button" onClick={() => { setTokens({ ...tokens, logo: '' }); setContent(setDotted(setDotted(content, 'brand.logo', ''), 'logo', '')); }} className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600" aria-label="حذف"><X className="h-3 w-3" /></button>
                                        </div>
                                    ) : (
                                        <DropzoneUploader label="اسحب الشعار هنا أو اضغط للاختيار" hint={mediaSpecHelp(MEDIA_SPECS.shared.branding.logo)} accept="image/*" multiple={false} uploading={logoUploading} onFiles={uploadLogoFile} />
                                    )}
                                    <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadLogoFile(e.target.files)} />
                                </Card>

                                <Card>
                                    <SectionLabel>أيقونة المتجر <span className="text-[9px] font-normal tracking-wide text-slate-400/70">Favicon</span></SectionLabel>
                                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">{mediaSpecHelp(MEDIA_SPECS.shared.branding.favicon)}</p>
                                    {faviconValue ? (
                                        <div className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <img src={getImageUrl(faviconValue)} alt="أيقونة المتجر" className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow" />
                                            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700" dir="ltr">{faviconValue}</p><p className="text-[11px] text-slate-500">تظهر في تبويب المتصفح — تتحدث فوراً بالمعاينة</p></div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => faviconFileRef.current?.click()} disabled={faviconUploading}>{faviconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}</Button>
                                            <button type="button" onClick={() => { setTokens({ ...tokens, favicon: '' }); setContent(setDotted(setDotted(content, 'brand.favicon', ''), 'favicon', '')); }} className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600" aria-label="حذف"><X className="h-3 w-3" /></button>
                                        </div>
                                    ) : (
                                        <DropzoneUploader label="اسحب الأيقونة هنا" hint={mediaSpecHelp(MEDIA_SPECS.shared.branding.favicon)} accept="image/*" multiple={false} uploading={faviconUploading} onFiles={uploadFaviconFile} />
                                    )}
                                    <input ref={faviconFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadFaviconFile(e.target.files)} />
                                </Card>

                                <Card>
                                    <p className="mb-2 text-xs font-black leading-none text-slate-800">الألوان</p>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <ColorPickerField label="اللون الأساسي" helper="Primary" value={colors.primary || '#0d9488'} onChange={(v) => setTokens({ ...tokens, colors: { ...colors, primary: v } })} />
                                        <ColorPickerField label="اللون الثانوي" helper="Secondary" value={colors.secondary || '#f59e0b'} onChange={(v) => setTokens({ ...tokens, colors: { ...colors, secondary: v } })} />
                                    </div>
                                </Card>

                                <Card>
                                    <div className="space-y-3">
                                        <div>
                                            <SectionLabel>استدارة الزوايا</SectionLabel>
                                            <div className="flex items-center gap-3">
                                                <input type="range" min={0} max={32} value={parseInt(String(tokens.radius ?? 16), 10) || 0} onChange={(e) => setTokens({ ...tokens, radius: `${e.target.value}px` })} className="flex-1 accent-emerald-600" aria-label="استدارة الزوايا" />
                                                <span className="min-w-12 rounded-full bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">{String(tokens.radius ?? '16px')}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionLabel>عائلة الخط</SectionLabel>
                                            <select value={typography.font_family || ''} onChange={(e) => setTokens({ ...tokens, typography: { ...typography, font_family: e.target.value } })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                                                <option value="">افتراضي القالب</option><option value="Cairo">Cairo</option><option value="Tajawal">Tajawal</option><option value="Almarai">Almarai</option><option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                                            </select>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-100">
                                            <p className="mb-1.5 text-[11px] font-bold leading-none text-slate-400">معاينة سريعة</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-3 py-1.5 text-xs font-black leading-none text-white shadow-sm" style={{ backgroundColor: colors.primary || '#0d9488', borderRadius: tokens.radius || '16px' }}>زر أساسي</span>
                                                <span className="px-3 py-1.5 text-xs font-black leading-none text-white shadow-sm" style={{ backgroundColor: colors.secondary || '#f59e0b', borderRadius: tokens.radius || '16px' }}>زر ثانوي</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* ============ 3. الواجهة ============ */}
                        {activeWorkspace === 'interface' && (
                            <div className="space-y-3">
                                {/* 0. شريط الإعلانات المتحرك — marquee */}
                                <Card>
                                    <div className="flex items-center justify-between gap-2">
                                        <SectionLabel>شريط الإعلانات المتحرك</SectionLabel>
                                        <Switch checked={showAnnouncement} onCheckedChange={(v) => setContent(setDotted(content, 'announcement.enabled', !!v))} />
                                    </div>
                                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">يظهر كشريط متحرك أعلى البحث في المتجر — كل سطر عبارة، وتتدحرج العبارات بشكل متواصل.</p>
                                    <div>
                                        <SectionLabel>عبارات الشريط — سطر لكل عبارة</SectionLabel>
                                        <Textarea
                                            rows={4}
                                            dir="rtl"
                                            value={(Array.isArray(announcementItems) ? announcementItems : []).join('\n')}
                                            onChange={(e) => { const list = e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean); setContent(setDotted(content, 'announcement.items', list)); }}
                                            placeholder={'عروض الصيف تخفيضات حتى 40%\nشحن مجاني للطلبات فوق 250 شيكل\nتشكيلات جديدة كل أسبوع'}
                                            className="mt-1 bg-white font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <SectionLabel>لون الخلفية</SectionLabel>
                                            <div className="mt-1 flex items-center gap-2">
                                                <input type="color" value={announcementBg} onChange={(e) => setContent(setDotted(content, 'announcement.bg_color', e.target.value))} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                                                <Input className="h-9 bg-white font-mono text-xs" value={announcementBg} onChange={(e) => setContent(setDotted(content, 'announcement.bg_color', e.target.value))} />
                                            </div>
                                        </div>
                                        <div>
                                            <SectionLabel>لون النص</SectionLabel>
                                            <div className="mt-1 flex items-center gap-2">
                                                <input type="color" value={announcementColor} onChange={(e) => setContent(setDotted(content, 'announcement.text_color', e.target.value))} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                                                <Input className="h-9 bg-white font-mono text-xs" value={announcementColor} onChange={(e) => setContent(setDotted(content, 'announcement.text_color', e.target.value))} />
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* A. نوع الوسائط — segmented, warm accent */}
                                <Card>
                                    <SectionLabel>نوع الوسائط</SectionLabel>
                                    <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                                        {[{ id: 'image', label: 'صورة' }, { id: 'video', label: 'فيديو' }, { id: 'youtube', label: 'YouTube' }].map((opt) => (
                                            <button key={opt.id} type="button" onClick={() => { let tmp = setDotted(content, 'hero_banner.type', opt.id); tmp = setDotted(tmp, 'hero_type', opt.id); setContent(tmp); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-black transition ${heroType === opt.id ? 'bg-white text-[#9d7463] shadow' : 'text-slate-500 hover:text-slate-700'}`}>{opt.label}</button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-400">يتحكم في نوع محتوى البانر — التغيير يظهر فوراً في المعاينة</p>
                                </Card>

                                {/* B. وسائط البانر — clean thumbnails, reorder/replace/delete/add */}
                                {heroType === 'image' && (() => {
                                    const desktopSpec = MEDIA_SPECS[theme]?.hero?.desktopImage || MEDIA_SPECS['bazaar-market'].hero.desktopImage;
                                    const mobImages = sanitizeHeroImages((getDotted(content,'hero_banner.images_mobile') ?? getDotted(content,'hero_images_mobile') ?? []) as any);
                                    const rawMediaImg = (getDotted(content,'hero_banner.media') ?? []) as any[];
                                    const hasMedia = Array.isArray(rawMediaImg) && rawMediaImg.length>0;
                                    // Canonical: use hero_banner.media if exists, else legacy heroImages
                                    const displayImages: any[] = hasMedia ? rawMediaImg.filter((m:any)=>String(m.type).toLowerCase()==='image') : heroImages.map((src,idx)=>({ id:`legacy-image-${idx}`, type:'image', src }));
                                    const totalMediaCount = Array.isArray(rawMediaImg) ? rawMediaImg.length : heroImages.length;
                                    const handleReplaceDesktop = async (idx: number, files: FileList) => {
                                        const f = Array.from(files)[0]; if (!f) return;
                                        const fd = new FormData(); fd.append('files[]', f);
                                        try {
                                            const res = await fetch(route('api.media.batch'), { method: 'POST', body: fd, headers: { Accept: 'application/json', ...csrfHeaders() } }); const json:any = await res.json();
                                            if (res.ok && json?.data?.[0]?.url) {
                                                const raw = String(json.data[0].url||''); const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : ''; const norm = normalizeImageUrl(url);
                                                if (hasMedia) {
                                                    const targetId = displayImages[idx]?.id;
                                                    const newMedia = rawMediaImg.map((m:any)=> String(m.id)===String(targetId) ? {...m, src: norm} : m);
                                                    let tmp=setDotted(content,'hero_banner.media', newMedia);
                                                    // Sync legacy for compat
                                                    const legImgs=newMedia.filter((m:any)=>m.type==='image').map((m:any)=>m.src);
                                                    tmp=setDotted(tmp,'hero_banner.images', legImgs);
                                                    tmp=setDotted(tmp,'hero_images', legImgs);
                                                    setContent(tmp);
                                                } else {
                                                    const next = [...heroImages]; next[idx]=norm; let tmp=setDotted(content,'hero_banner.images',next); tmp=setDotted(tmp,'hero_images',next); setContent(tmp);
                                                }
                                                toast.success('تم استبدال الصورة');
                                            }
                                        } catch { toast.error('فشل الاستبدال'); }
                                    };
                                    const moveMediaById = (movingId: string, targetId: string | null, before: boolean = true) => {
                                        const raw = (getDotted(content, 'hero_banner.media') ?? []) as any[];
                                        if (!Array.isArray(raw) || !raw.length) return;
                                        const fromIdx = raw.findIndex((m:any)=>String(m.id)===String(movingId));
                                        if (fromIdx<0) return;
                                        let toIdx: number;
                                        if (targetId === null) toIdx = raw.length - 1;
                                        else {
                                            toIdx = raw.findIndex((m:any)=>String(m.id)===String(targetId));
                                            if (toIdx<0) return;
                                            if (fromIdx < toIdx) toIdx--;
                                            if (!before) toIdx++;
                                        }
                                        const next=[...raw]; const [m]=next.splice(fromIdx,1); next.splice(toIdx,0,m);
                                        let tmp=setDotted(content,'hero_banner.media', next);
                                        const legImgs=next.filter((m:any)=>m.type==='image').map((m:any)=>m.src);
                                        tmp=setDotted(tmp,'hero_banner.images', legImgs);
                                        tmp=setDotted(tmp,'hero_images', legImgs);
                                        const firstVideo=next.find((m:any)=>m.type==='video')?.src||'';
                                        tmp=setDotted(tmp,'hero_banner.video_url', firstVideo);
                                        tmp=setDotted(tmp,'hero_video_url', firstVideo);
                                        const firstYt=next.find((m:any)=>m.type==='youtube')?.src||'';
                                        tmp=setDotted(tmp,'hero_banner.youtube_url', firstYt ? 'https://www.youtube.com/watch?v='+firstYt : '');
                                        tmp=setDotted(tmp,'hero_youtube_url', tmp['hero_banner.youtube_url'] as any);
                                        setContent(tmp);
                                    };
                                    const moveDesktop = (from: number, dir: number) => {
                                        if (hasMedia) {
                                            const fromItem = (displayImages as any)[from];
                                            const toItem = (displayImages as any)[from+dir];
                                            if (!fromItem || !toItem) return;
                                            const raw = (getDotted(content, 'hero_banner.media') ?? []) as any[];
                                            const toIdx = raw.findIndex((m:any)=>String(m.id)===String(toItem.id));
                                            if (toIdx<0) return;
                                            moveHeroMediaById(String(fromItem.id), toIdx);
                                        } else {
                                            const to = from + dir; if (to < 0 || to >= heroImages.length) return;
                                            const next = [...heroImages]; const [m] = next.splice(from,1); next.splice(to,0,m); let tmp=setDotted(content,'hero_banner.images',next); tmp=setDotted(tmp,'hero_images',next); setContent(tmp);
                                        }
                                    };
                                    return (
                                    <Card>
                                        <div onFocus={()=>setFocusedSlot('hero')} onBlur={()=>setFocusedSlot(null)} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <SectionLabel>وسائط البانر</SectionLabel>
                                            <span className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">المقاس الموصى به: 1200 × 800 — 3:2</span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-500">اسحب صوراً جديدة أو استبدل/احذف — الترتيب يظهر فوراً (الحد الإجمالي 10 عناصر)</p>
                                        {displayImages.length===0 && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">لا توجد شرائح — اسحب الصور هنا (حتى 10 إجمالي)</p>}
                                        {displayImages.map((item:any, idx:number)=>{
                                            const showOn = (item.showContent ?? item.show_content) !== false;
                                            const titleVal = String(item.heading ?? item.title ?? '');
                                            const subVal = String(item.subtitle ?? '');
                                            const ctaLabelVal = String(item.ctaLabel ?? item.cta_label ?? item.button_text ?? '');
                                            const ctaLinkVal = String(item.ctaLink ?? item.cta_link ?? item.button_link ?? '');
                                            return (
                                            <div key={item.id||idx} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                                                <div className="flex gap-3">
                                                    <img src={normalizeImageUrl(item.src)} alt={`شريحة ${idx+1}`} className="h-16 w-24 rounded-lg object-cover ring-1 ring-slate-100" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-black text-slate-800">الشريحة {idx+1} — صورة<span className="ms-1 text-[10px] font-normal text-slate-400">محتواها خاص بها فقط</span></p>
                                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold hover:bg-slate-50"><input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files && handleReplaceDesktop(idx, e.target.files)} />استبدال</label>
                                                            <button type="button" onClick={()=>moveDesktop(idx,-1)} disabled={idx===0} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] disabled:opacity-40">↑</button>
                                                            <button type="button" onClick={()=>moveDesktop(idx,1)} disabled={idx===displayImages.length-1} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] disabled:opacity-40">↓</button>
                                                            <button type="button" onClick={()=>{
                                                                if (hasMedia) {
                                                                    const targetId=displayImages[idx]?.id;
                                                                    const newMedia=(rawMediaImg as any[]).filter((m:any)=>String(m.id)!==String(targetId));
                                                                    let tmp=setDotted(content,'hero_banner.media', newMedia);
                                                                    const legImgs=newMedia.filter((m:any)=>m.type==='image').map((m:any)=>m.src);
                                                                    tmp=setDotted(tmp,'hero_banner.images', legImgs);
                                                                    tmp=setDotted(tmp,'hero_images', legImgs);
                                                                    setContent(tmp);
                                                                } else {
                                                                    const next=heroImages.filter((_:string,i:number)=>i!==idx); let tmp=setDotted(content,'hero_banner.images',next); tmp=setDotted(tmp,'hero_images',next); setContent(tmp);
                                                                }
                                                            }} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100">حذف</button>
                                                        </div>
                                                    </div>
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{idx+1}</span>
                                                </div>
                                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <span className="text-[11px] font-black text-slate-700">محتوى هذه الشريحة</span>
                                                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><Switch checked={showOn} onCheckedChange={(v)=>updateHeroMedia(String(item.id), { showContent: !!v, show_content: !!v })} /><span>{showOn ? 'إظهار النص' : 'بدون نص'}</span></label>
                                                    </div>
                                                    {showOn ? (
                                                        <div className="space-y-2">
                                                            <div><SectionLabel>العنوان</SectionLabel><Input value={titleVal} onChange={e=>updateHeroMedia(String(item.id), { heading: e.target.value })} placeholder="مثال: وصلت التشكيلة الجديدة" className="h-8 bg-white text-xs" /></div>
                                                            <div><SectionLabel>الوصف</SectionLabel><Input value={subVal} onChange={e=>updateHeroMedia(String(item.id), { subtitle: e.target.value })} placeholder="اكتشف أحدث المنتجات" className="h-8 bg-white text-xs" /></div>
                                                            <div className="grid grid-cols-2 gap-2"><div><SectionLabel>نص الزر</SectionLabel><Input value={ctaLabelVal} onChange={e=>updateHeroMedia(String(item.id), { ctaLabel: e.target.value })} placeholder="تسوق الآن" className="h-8 bg-white text-xs" /></div><div><SectionLabel>رابط الزر</SectionLabel><Input dir="ltr" value={ctaLinkVal} onChange={e=>updateHeroMedia(String(item.id), { ctaLink: e.target.value.trim() })} placeholder="#atelier-new" className="h-8 bg-white text-xs font-mono" /></div></div>
                                                            {!titleVal && !subVal && !ctaLabelVal && <p className="text-[10px] leading-relaxed text-amber-600">اترك الحقول فارغة + شغّل “إظهار النص” لإظهار النص العام (للشرائح القديمة). لإخفاء النص نهائياً أوقف “إظهار النص”.</p>}
                                                        </div>
                                                    ) : (<p className="text-[11px] leading-relaxed text-slate-500">هذه الشريحة بدون نص — لن يظهر أي عنوان/زر عند عرضها (صريح).</p>)}
                                                </div>
                                            </div>
                                        );})}
                                        {totalMediaCount < 10 && <DropzoneUploader label={displayImages.length===0 ? 'اسحب شرائح الهيرو هنا' : `إضافة شرائح (${displayImages.length}/10)`} hint={`حتى 10 شرائح — 1200×800 — 3:2`} multiple uploading={heroUploading} onFiles={uploadHeroFiles} />}
                                        </div>
                                    </Card>
                                    );
                                })()}
                                {heroType === 'video' && (() => {
                                    const rawMedia = (getDotted(content, 'hero_banner.media') ?? []) as any[];
                                    const videos = Array.isArray(rawMedia) ? rawMedia.filter((m:any) => String(m.type).toLowerCase()==='video') : [];
                                    // Fallback to legacy single video if media empty
                                    const legacyVideo = !videos.length ? (getDotted(content, 'hero_banner.video_url') as string || '') : '';
                                    const allVideos = videos.length ? videos : (legacyVideo ? [{ id: 'legacy-video', type: 'video', src: legacyVideo, position: '50% 50%' }] : []);
                                    const moveVideo = (from:number, dir:number) => {
                                      const fromItem = allVideos[from];
                                      const toItem = allVideos[from+dir];
                                      if (!fromItem || !toItem) return;
                                      const raw2 = (getDotted(content, 'hero_banner.media') ?? []) as any[];
                                      const toIdx2 = raw2.findIndex((m:any)=>String(m.id)===String(toItem.id));
                                      if (toIdx2<0) return;
                                      moveHeroMediaById(String(fromItem.id), toIdx2);
                                    };
                                    return (
                                    <div className="space-y-3" onFocus={()=>setFocusedSlot('hero')} onBlur={()=>setFocusedSlot(null)}>
                                    <Card>
                                        <SectionLabel>وسائط البانر — فيديو (متعدد)</SectionLabel>
                                        <p className="mb-2 text-[11px] text-slate-500">المقاس الموصى به: 1200 × 800 — 3:2 — MP4 — يمكنك إضافة عدة فيديوهات</p>
                                        <DropzoneUploader label={allVideos.length ? `إضافة فيديو (${allVideos.length}/10)` : 'اسحب الفيديو هنا'} hint={`1200×800 — 3:2 — MP4`} accept="video/mp4,video/*" uploading={interfaceVideoUploading} onFiles={async (files) => {
                                            const valid=Array.from(files).filter(f=>f.type.startsWith('video/')); if(!valid.length) return; setInterfaceVideoUploading(true);
                                            const errMsg=(json:any):string=>{ if(Array.isArray(json?.errors)&&json.errors.length) return String(json.errors[0]); return json?.message||'فشل رفع الفيديو'; };
                                            try{
                                              const uploads: any[]=[]; const failures: string[]=[];
                                              for(const f of valid.slice(0,10-allVideos.length)){
                                                const fd=new FormData(); fd.append('files[]',f);
                                                let json: any = null; let ok = false;
                                                try {
                                                  const res=await fetch(route('api.media.batch'),{method:'POST',body:fd,headers:{Accept:'application/json',...csrfHeaders()}});
                                                  ok=res.ok; json=await res.json();
                                                } catch (e) { failures.push(`فشل اتصال أثناء رفع الفيديو`); }
                                                if(ok && json?.data?.[0]?.url){
                                                  const raw=String(json.data[0].url||''); const url=raw?(raw.startsWith('/storage')?raw:(raw.match(/\/storage\/.*$/)?.[0]??raw)):'';
                                                  const norm=normalizeImageUrl(url);
                                                  uploads.push({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type:'video', src: norm, position:'50% 50%', positionMobile:'50% 50%' });
                                                } else {
                                                  failures.push(errMsg(json));
                                                }
                                              }
                                              if(uploads.length){
                                                const newMedia=[...(Array.isArray(rawMedia)?rawMedia:[]), ...uploads];
                                                let tmp=setDotted(content,'hero_banner.media', newMedia);
                                                const firstSrc=newMedia.find((m:any)=>m.type==='video')?.src||'';
                                                tmp=setDotted(tmp,'hero_banner.video_url', firstSrc);
                                                tmp=setDotted(tmp,'hero_video_url', firstSrc);
                                                setContent(tmp); toast.success(`تم رفع ${uploads.length} فيديو`);
                                              }
                                              const uniqueFailures=[...new Set(failures)];
                                              if(uniqueFailures.length) toast.error(uniqueFailures[0]);
                                            }catch{ toast.error('حدث خطأ أثناء الرفع'); } finally{ setInterfaceVideoUploading(false); }
                                        }} />
                                        {allVideos.length===0 ? <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">لا يوجد فيديو — فارغ</p> : allVideos.map((v:any, idx:number)=>{
                                          const setVideoField=(field:'position'|'positionMobile', pos:string)=>{
                                            const next=[...(Array.isArray(rawMedia)?rawMedia:[])];
                                            const ti=next.findIndex((m:any)=>String(m.id)===String(v.id));
                                            if(ti<0) return;
                                            (next[ti] as any)[field]=pos;
                                            setContent(setDotted(content,'hero_banner.media', next));
                                          };
                                          return (
                                          <div key={v.id||idx} className="group relative mt-3 rounded-xl border bg-white p-2.5">
                                            <div className="flex gap-3">
                                              <video src={normalizeImageUrl(v.src)} className="h-16 w-24 rounded-lg object-cover ring-1 ring-slate-100" style={{ objectPosition: (v.position||'50% 50%') }} muted />
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold truncate">فيديو {idx+1}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{v.src}</p>
                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                  <button type="button" onClick={()=>moveVideo(idx,-1)} disabled={idx===0} className="rounded-full border px-2 py-1 text-[11px] disabled:opacity-40">↑</button>
                                                  <button type="button" onClick={()=>moveVideo(idx,1)} disabled={idx===allVideos.length-1} className="rounded-full border px-2 py-1 text-[11px] disabled:opacity-40">↓</button>
                                                  <button type="button" onClick={()=>{
                                                    const newMedia=(Array.isArray(rawMedia)?rawMedia:[]).filter((m:any)=>String(m.id)!==String(v.id));
                                                    let tmp=setDotted(content,'hero_banner.media', newMedia);
                                                    const firstSrc=newMedia.find((m:any)=>m.type==='video')?.src||'';
                                                    tmp=setDotted(tmp,'hero_banner.video_url', firstSrc);
                                                    tmp=setDotted(tmp,'hero_video_url', firstSrc);
                                                    setContent(tmp);
                                                  }} className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">حذف</button>
                                                </div>
                                              </div>
                                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{idx+1}</span>
                                            </div>
                                            <VideoCropEditor
                                              src={v.src}
                                              ratio="3 / 2"
                                              label="ضبط عرض الكمبيوتر"
                                              hint="المقاس 3:2 — اسحب داخل الإطار (فأرة / لمس / قلم)"
                                              value={v.position || '50% 50%'}
                                              onChange={(pos)=>setVideoField('position', pos)}
                                              onReset={()=>setVideoField('position', '50% 50%')}
                                            />
                                            <VideoCropEditor
                                              src={v.src}
                                              ratio="4 / 3"
                                              label="ضبط عرض الهاتف"
                                              hint="المقاس 4:3 — مستقل عن موضع الكمبيوتر"
                                              value={v.positionMobile || v.position || '50% 50%'}
                                              onChange={(pos)=>setVideoField('positionMobile', pos)}
                                              onReset={()=>setVideoField('positionMobile', '50% 50%')}
                                            />
                                            {(()=>{ const showOn=(v.showContent ?? v.show_content) !== false; const t=String(v.heading ?? v.title ?? ''); const s=String(v.subtitle ?? ''); const l=String(v.ctaLabel ?? v.cta_label ?? ''); const lk=String(v.ctaLink ?? v.cta_link ?? ''); return (<div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-black text-slate-700">محتوى هذا الفيديو</span><label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><Switch checked={showOn} onCheckedChange={(ch)=>updateHeroMedia(String(v.id), { showContent: !!ch, show_content: !!ch })} /><span>{showOn ? 'إظهار النص' : 'بدون نص'}</span></label></div>{showOn ? (<div className="space-y-2"><div><SectionLabel>العنوان</SectionLabel><Input value={t} onChange={e=>updateHeroMedia(String(v.id), { heading: e.target.value })} placeholder="مثال: شاهد المجموعة الجديدة" className="h-8 bg-white text-xs" /></div><div><SectionLabel>الوصف</SectionLabel><Input value={s} onChange={e=>updateHeroMedia(String(v.id), { subtitle: e.target.value })} placeholder="وصف قصير" className="h-8 bg-white text-xs" /></div><div className="grid grid-cols-2 gap-2"><div><SectionLabel>نص الزر</SectionLabel><Input value={l} onChange={e=>updateHeroMedia(String(v.id), { ctaLabel: e.target.value })} placeholder="اكتشف" className="h-8 bg-white text-xs" /></div><div><SectionLabel>رابط الزر</SectionLabel><Input dir="ltr" value={lk} onChange={e=>updateHeroMedia(String(v.id), { ctaLink: e.target.value.trim() })} placeholder="#atelier-new" className="h-8 bg-white text-xs font-mono" /></div></div></div>) : (<p className="text-[11px] text-slate-500">هذا الفيديو بدون نص — صريح.</p>)}</div>); })()}
                                          </div>
                                        ); })}
                                    </Card>
                                    </div>
                                    );
                                })()}
                                {heroType === 'youtube' && (() => {
                                    const rawMedia2=(getDotted(content,'hero_banner.media')??[]) as any[];
                                    const yts=Array.isArray(rawMedia2)?rawMedia2.filter((m:any)=>String(m.type).toLowerCase()==='youtube'): [];
                                    const legacyYt=!yts.length ? (getDotted(content,'hero_banner.youtube_url') as string||'') : '';
                                    const allYt=yts.length?yts:(legacyYt?[{id:'legacy-yt',type:'youtube',src:legacyYt}]:[]);
                                    const moveYt=(from:number,dir:number)=>{
                                      const fromItem=(allYt as any)[from];
                                      const toItem=(allYt as any)[from+dir];
                                      if(!fromItem||!toItem) return;
                                      const raw=(getDotted(content,'hero_banner.media')??[]) as any[];
                                      const toIdx=raw.findIndex((m:any)=>String(m.id)===String(toItem.id));
                                      if(toIdx<0) return;
                                      moveHeroMediaById(String(fromItem.id), toIdx);
                                    };
                                    const addYt=(url:string)=>{
                                      const clean=stripTrailingSlash(url.trim()); if(!clean) return;
                                      const yid=getYoutubeId(clean) || clean;
                                      if(!yid) { toast.error('رابط يوتيوب غير صالح'); return; }
                                      const newItem={ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type:'youtube', src: yid };
                                      const newMedia=[...(Array.isArray(rawMedia2)?rawMedia2:[]), newItem];
                                      let tmp=setDotted(content,'hero_banner.media', newMedia);
                                      const firstYt=newMedia.find((m:any)=>m.type==='youtube')?.src||'';
                                      tmp=setDotted(tmp,'hero_banner.youtube_url', firstYt);
                                      tmp=setDotted(tmp,'hero_youtube_url', firstYt);
                                      setContent(tmp);
                                    };
                                    return (
                                    <div className="space-y-3" onFocus={()=>setFocusedSlot('hero')} onBlur={()=>setFocusedSlot(null)}>
                                    <Card>
                                        <SectionLabel>وسائط البانر — YouTube (متعدد)</SectionLabel>
                                        <p className="mb-2 text-[11px] text-slate-500">المقاس الموصى به: 1200 × 800 — 3:2 — يمكنك إضافة عدة روابط</p>
                                        <div className="flex gap-2">
                                          <Input dir="ltr" id="yt-input" placeholder="https://www.youtube.com/watch?v=..." className="bg-white font-mono text-sm flex-1" onKeyDown={(e:any)=>{ if(e.key==='Enter'){ const inp=document.getElementById('yt-input') as HTMLInputElement; if(inp&&inp.value.trim()){ addYt(inp.value); inp.value=''; }}}} />
                                          <button type="button" onClick={()=>{ const inp=document.getElementById('yt-input') as HTMLInputElement; if(inp&&inp.value.trim()){ addYt(inp.value); inp.value=''; }}} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">إضافة</button>
                                        </div>
                                        {allYt.length===0 ? <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">لا يوجد رابط يوتيوب</p> : allYt.map((u:any, idx:number)=>{
                                          const showOn=(u.showContent ?? u.show_content) !== false; const t=String(u.heading ?? u.title ?? ''); const s=String(u.subtitle ?? ''); const l=String(u.ctaLabel ?? u.cta_label ?? ''); const lk=String(u.ctaLink ?? u.cta_link ?? ''); return (
                                          <div key={u.id||idx} className="mt-3 rounded-xl border bg-white p-2.5">
                                            <div className="flex gap-3">
                                              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${getYoutubeId(u.src)||u.src}?mute=1&controls=0`} title={`yt-${idx}`} /></div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold truncate">YouTube {idx+1}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{u.src}</p>
                                                <div className="mt-1.5 flex gap-1.5">
                                                  <button type="button" onClick={()=>moveYt(idx,-1)} disabled={idx===0} className="rounded-full border px-2 py-1 text-[11px] disabled:opacity-40">↑</button>
                                                  <button type="button" onClick={()=>moveYt(idx,1)} disabled={idx===allYt.length-1} className="rounded-full border px-2 py-1 text-[11px] disabled:opacity-40">↓</button>
                                                  <button type="button" onClick={()=>{ const newMedia=(Array.isArray(rawMedia2)?rawMedia2:[]).filter((m:any)=>String(m.id)!==String(u.id)); let tmp=setDotted(content,'hero_banner.media', newMedia); const firstYt=newMedia.find((m:any)=>m.type==='youtube')?.src||''; tmp=setDotted(tmp,'hero_banner.youtube_url', firstYt); tmp=setDotted(tmp,'hero_youtube_url', firstYt); setContent(tmp);}} className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">حذف</button>
                                                </div>
                                              </div>
                                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{idx+1}</span>
                                            </div>
                                            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-black text-slate-700">محتوى هذا الفيديو</span><label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><Switch checked={showOn} onCheckedChange={(ch)=>updateHeroMedia(String(u.id), { showContent: !!ch, show_content: !!ch })} /><span>{showOn ? 'إظهار النص' : 'بدون نص'}</span></label></div>{showOn ? (<div className="space-y-2"><div><SectionLabel>العنوان</SectionLabel><Input value={t} onChange={e=>updateHeroMedia(String(u.id), { heading: e.target.value })} placeholder="شاهد المجموعة الجديدة" className="h-8 bg-white text-xs" /></div><div><SectionLabel>الوصف</SectionLabel><Input value={s} onChange={e=>updateHeroMedia(String(u.id), { subtitle: e.target.value })} placeholder="وصف" className="h-8 bg-white text-xs" /></div><div className="grid grid-cols-2 gap-2"><div><SectionLabel>نص الزر</SectionLabel><Input value={l} onChange={e=>updateHeroMedia(String(u.id), { ctaLabel: e.target.value })} placeholder="اكتشف" className="h-8 bg-white text-xs" /></div><div><SectionLabel>رابط الزر</SectionLabel><Input dir="ltr" value={lk} onChange={e=>updateHeroMedia(String(u.id), { ctaLink: e.target.value.trim() })} placeholder="#hub-deals" className="h-8 bg-white text-xs font-mono" /></div></div></div>) : (<p className="text-[11px] text-slate-500">هذا العنصر بدون نص — صريح.</p>)}</div>
                                          </div>
                                        );})}
                                    </Card>
                                    </div>
                                    );
                                })()}

                                {/* C. النص والمحتوى — legacy fallback for media without per-banner content */}
                                <Card>
                                    <div className="space-y-2.5">
                                        <SectionLabel>النص والمحتوى — عام (احتياطي)</SectionLabel>
                                        <p className="text-[11px] leading-relaxed text-slate-500">يُستخدم فقط للشرائح التي لم يتم تخصيص محتواها الخاص (التوافق مع المتاجر القديمة). الشرائح التي تم ضبط “محتوى هذه الشريحة” سيتم تجاهل هذا الحقل عند عرضها.</p>
                                        <div>
                                            <SectionLabel>العنوان</SectionLabel>
                                            <Input value={heroHeading ?? ''} onChange={(e) => { let tmp = setDotted(content, 'hero_banner.heading', e.target.value); tmp = setDotted(tmp, 'hero_heading', e.target.value); setContent(tmp); }} placeholder="أناقة تُروى كقصة" className="h-9 bg-white" />
                                        </div>
                                        <div>
                                            <SectionLabel>الوصف</SectionLabel>
                                            <Input value={heroSubtitle ?? ''} onChange={(e) => { let tmp = setDotted(content, 'hero_banner.subtitle', e.target.value); tmp = setDotted(tmp, 'hero_subtitle', e.target.value); setContent(tmp); }} placeholder="تشكيلة الموسم الجديدة" className="bg-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><SectionLabel>نص الزر</SectionLabel><Input value={heroCtaLabel ?? ''} onChange={(e) => { let tmp = setDotted(content, 'hero_banner.cta_label', e.target.value); tmp = setDotted(tmp, 'hero_cta_label', e.target.value); setContent(tmp); }} placeholder="اكتشفي التشكيلة" className="bg-white" /></div>
                                            <div><SectionLabel>رابط الزر</SectionLabel><Input dir="ltr" value={heroCtaLink ?? ''} onChange={(e) => { const clean = stripTrailingSlash(e.target.value.trim()); let tmp = setDotted(content, 'hero_banner.cta_link', clean); tmp = setDotted(tmp, 'hero_cta_link', clean); setContent(tmp); }} placeholder="#atelier-new" className="bg-white font-mono text-sm" /></div>
                                        </div>
                                    </div>
                                </Card>

                                {/* D. المظهر — collapsible */}
                                <Collapsible className="rounded-xl border border-slate-200 bg-white">
                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-3 text-start">
                                        <span className="flex items-center gap-2 text-xs font-black text-slate-700"><Settings2 className="h-3.5 w-3.5 text-slate-500" /> المظهر</span>
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="px-3 pb-3">
                                        <div className="space-y-3 border-t border-slate-100 pt-3">
                                            <div>
                                                <SectionLabel>وضع العرض</SectionLabel>
                                                {(() => {
                                                    const currentFit = String(getDotted(content, 'hero_banner.fit') ?? getDotted(content, 'hero_fit') ?? 'cover').toLowerCase();
                                                    return (
                                                        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                                                            {[{ id: 'cover', label: 'تغطية' }, { id: 'contain', label: 'احتواء' }].map((opt) => (
                                                                <button key={opt.id} type="button" onClick={() => { let tmp = setDotted(content, 'hero_banner.fit', opt.id); tmp = setDotted(tmp, 'hero_fit', opt.id); setContent(tmp); }} className={`flex-1 rounded-lg px-2 py-2 text-xs font-black transition ${currentFit === opt.id ? 'bg-white text-[#9d7463] shadow' : 'text-slate-500 hover:text-slate-700'}`}>{opt.label}</button>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <SectionLabel>موضع التركيز</SectionLabel>
                                                {(() => {
                                                    const curPos = String(getDotted(content, 'hero_banner.position') ?? getDotted(content, 'hero_position') ?? 'center');
                                                    const opts = [{ id: 'center', label: 'وسط' }, { id: 'top', label: 'أعلى' }, { id: 'bottom', label: 'أسفل' }, { id: 'left', label: 'يسار' }, { id: 'right', label: 'يمين' }];
                                                    return (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {opts.map((o) => (
                                                                <button key={o.id} type="button" onClick={() => { let tmp = setDotted(content, 'hero_banner.position', o.id); tmp = setDotted(tmp, 'hero_position', o.id); setContent(tmp); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${curPos === o.id ? 'border-[#9d7463] bg-[#9d7463] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#9d7463]/40'}`}>{o.label}</button>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <SectionLabel>شفافية الطبقة ({heroOverlay}%)</SectionLabel>
                                                <div className="flex items-center gap-3">
                                                    <input type="range" min={0} max={100} value={heroOverlay} onChange={(e) => { const val = Number(e.target.value); let tmp = setDotted(content, 'hero_banner.overlay_opacity', val); tmp = setDotted(tmp, 'overlay_opacity', val); setContent(tmp); }} className="flex-1 accent-[#9d7463]" />
                                                    <span className="min-w-12 rounded-full bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">{heroOverlay}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <SectionLabel hint="يتحكم بارتفاع البانر">الارتفاع</SectionLabel>
                                                {(() => {
                                                    const desktopH = String(getDotted(content, 'hero_banner.height_desktop') ?? getDotted(content, 'hero_height_desktop') ?? '');
                                                    const mobileH = String(getDotted(content, 'hero_banner.height_mobile') ?? getDotted(content, 'hero_height_mobile') ?? '');
                                                    return (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <SectionLabel>سطح المكتب</SectionLabel>
                                                                <Input dir="ltr" value={desktopH} onChange={e=>{ let tmp=setDotted(content,'hero_banner.height_desktop',e.target.value); tmp=setDotted(tmp,'hero_height_desktop',e.target.value); setContent(tmp); }} placeholder="— افتراضي —" className="font-mono text-sm bg-white"/>
                                                            </div>
                                                            <div>
                                                                <SectionLabel>الهاتف</SectionLabel>
                                                                <Input dir="ltr" value={mobileH} onChange={e=>{ let tmp=setDotted(content,'hero_banner.height_mobile',e.target.value); tmp=setDotted(tmp,'hero_height_mobile',e.target.value); setContent(tmp); }} placeholder="— افتراضي —" className="font-mono text-sm bg-white"/>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* E. إعدادات متقدمة — mobile overrides */}
                                <Collapsible className="rounded-xl border border-slate-200 bg-white">
                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-3 text-start">
                                        <span className="flex items-center gap-2 text-xs font-black text-slate-700"><Code2 className="h-3.5 w-3.5 text-slate-500" /> إعدادات متقدمة</span>
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="px-3 pb-3">
                                        <div className="space-y-3 border-t border-slate-100 pt-3">
                                            <p className="text-[11px] leading-relaxed text-slate-500">وسائط خاصة بالهاتف — اتركها فارغة ليُستخدم نفس وسائط سطح المكتب</p>
                                            {heroType === 'image' && (() => {
                                                const mobImages = sanitizeHeroImages((getDotted(content,'hero_banner.images_mobile') ?? getDotted(content,'hero_images_mobile') ?? []) as any);
                                                const handleAddMobile = async (files: FileList) => {
                                                    const valid = Array.from(files).filter(f=>f.type.startsWith('image/')); if(!valid.length) return;
                                                    const fd = new FormData(); valid.forEach(f=>fd.append('files[]',f));
                                                    try { const res=await fetch(route('api.media.batch'),{method:'POST',body:fd,headers:{Accept:'application/json',...csrfHeaders()}}); const json:any=await res.json(); if(res.ok && json?.data?.length){ const urls:string[]=(json.data as any[]).map((d:any)=>{const raw=String(d.url||''); return raw.startsWith('/storage')?raw:(raw.match(/\/storage\/.*$/)?.[0]??raw)}).filter(Boolean).map(u=>normalizeImageUrl(u)); const next=[...mobImages,...urls].slice(0,10); let tmp=setDotted(content,'hero_banner.images_mobile',next); tmp=setDotted(tmp,'hero_images_mobile',next); setContent(tmp); toast.success('تم رفع صور الهاتف'); }} catch {toast.error('فشل الرفع')}
                                                };
                                                return (
                                                    <div className="space-y-2">
                                                        {mobImages.length>0 && <div className="flex gap-2 flex-wrap">{mobImages.map((img:string,idx:number)=><div key={idx} className="relative h-16 w-16 overflow-hidden rounded-lg border"><img src={normalizeImageUrl(img)} className="h-full w-full object-cover"/><button type="button" onClick={()=>{const next=mobImages.filter((_:string,i:number)=>i!==idx); let tmp=setDotted(content,'hero_banner.images_mobile',next); tmp=setDotted(tmp,'hero_images_mobile',next); setContent(tmp);}} className="absolute inset-0 bg-black/40 text-white text-xs">×</button></div>)}</div>}
                                                        <DropzoneUploader label="رفع صورة للهاتف (اختياري)" hint="1200×900 — 4:3" multiple uploading={heroUploading} onFiles={handleAddMobile} />
                                                    </div>
                                                );
                                            })()}
                                            {heroType === 'video' && (
                                                <div className="space-y-2">
                                                    <SectionLabel>فيديو الهاتف (اختياري)</SectionLabel>
                                                    <Input dir="ltr" value={String(getDotted(content,'hero_banner.video_url_mobile') ?? getDotted(content,'hero_video_url_mobile') ?? '')} onChange={e=> { const clean = stripTrailingSlash(e.target.value.trim()); const norm = clean ? (clean.startsWith('http') ? clean : normalizeImageUrl(clean)) : ''; let tmp=setDotted(content,'hero_banner.video_url_mobile',norm); tmp=setDotted(tmp,'hero_video_url_mobile',norm); setContent(tmp); }} placeholder="https://example.com/video-mobile.mp4" className="bg-white font-mono text-sm"/>
                                                    <DropzoneUploader label="اسحب فيديو الهاتف (اختياري)" hint="1200×900 — 4:3 — MP4" accept="video/mp4,video/*" uploading={interfaceVideoUploading} onFiles={async (files) => {
                                                        const f = Array.from(files)[0]; if (!f) return; setInterfaceVideoUploading(true);
                                                        try { const fd = new FormData(); fd.append('files[]', f); const res = await fetch(route('api.media.batch'), { method: 'POST', body: fd, headers: { Accept: 'application/json', ...csrfHeaders() } }); const json: any = await res.json(); if (res.ok && json?.data?.[0]?.url) { const raw = String(json.data[0].url || ''); const url = raw ? (raw.startsWith('/storage') ? raw : (raw.match(/\/storage\/.*$/)?.[0] ?? raw)) : ''; const normalized = normalizeImageUrl(url); let tmp = setDotted(content, 'hero_banner.video_url_mobile', normalized); tmp = setDotted(tmp, 'hero_video_url_mobile', normalized); setContent(tmp); toast.success('تم رفع فيديو الهاتف'); } else { const em = (Array.isArray(json?.errors) && json.errors.length) ? String(json.errors[0]) : (json?.message || 'فشل رفع فيديو الهاتف'); toast.error(em); } } catch { toast.error('حدث خطأ أثناء الرفع'); } finally { setInterfaceVideoUploading(false); }
                                                    }} />
                                                </div>
                                            )}
                                            {heroType === 'youtube' && (
                                                <div className="space-y-2">
                                                    <SectionLabel>YouTube للهاتف (اختياري)</SectionLabel>
                                                    <Input dir="ltr" value={String(getDotted(content,'hero_banner.youtube_url_mobile') ?? getDotted(content,'hero_youtube_url_mobile') ?? '')} onChange={e=> { const clean = stripTrailingSlash(e.target.value.trim()); let tmp=setDotted(content,'hero_banner.youtube_url_mobile',clean); tmp=setDotted(tmp,'hero_youtube_url_mobile',clean); setContent(tmp); }} placeholder="https://www.youtube.com/watch?v=..." className="bg-white font-mono text-sm"/>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        )}

                                                {/* ============ 4. الأقسام ============ */}
                        {activeWorkspace === 'sections' && (
                            <div className="space-y-3">
                                <p className="text-xs leading-relaxed text-slate-500">تحكم في أقسام الصفحة الرئيسية.</p>
                                {[
                                    { label: 'شريط الفئات', hint: 'شريط الفئات الثانوي في الهيدر', checked: showCategoriesBar, onChange: (v: boolean) => { let tmp = setDotted(content, 'settings.show_categories_bar', v); tmp = setDotted(tmp, 'homepage.show_categories_bar', v); setContent(tmp); } },
                                    { label: 'وصل حديثاً', hint: 'أحدث المنتجات', checked: showLatestProducts, onChange: (v: boolean) => { let tmp = setDotted(content, 'settings.show_latest_products', v); tmp = setDotted(tmp, 'homepage.show_latest_products', v); setContent(tmp); } },
                                    { label: 'الأكثر مبيعاً', hint: 'المنتجات الأكثر مبيعاً', checked: showBestSellers, onChange: (v: boolean) => { let tmp = setDotted(content, 'settings.show_best_sellers', v); tmp = setDotted(tmp, 'homepage.show_best_sellers', v); setContent(tmp); } },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                                        <div><p className="text-sm font-bold text-slate-800">{row.label}</p><p className="text-[11px] text-slate-500">{row.hint}</p></div>
                                        <Switch checked={row.checked} onCheckedChange={row.onChange} />
                                    </div>
                                ))}
                                <Separator />
                                <Card>
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-sm font-black text-slate-800">التصنيفات المعروضة</p><p className="text-xs text-slate-500">{homepageCategories.length === 0 ? 'لم يتم اختيار تصنيفات' : `${homepageCategories.length} تصنيفات مختارة`}</p></div>
                                        <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs font-bold" onClick={() => setCategoryPickerOpen(true)}><Pencil className="h-3 w-3" /> تعديل التصنيفات</Button>
                                    </div>
                                    {homepageCategories.length > 0 && availableCategories.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {homepageCategories.map((id) => { const cat = availableCategories.find((c) => String(c.id) === String(id)); return <span key={String(id)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{cat?.name ?? `#${id}`}</span>; })}
                                        </div>
                                    )}
                                </Card>
                                <Card>
                                    <SectionLabel>الحد الأقصى للمنتجات في كل قسم</SectionLabel>
                                    <select value={String(homepageProductsPerCategory)} onChange={(e) => { const v = Number(e.target.value); let tmp = setDotted(content, 'settings.homepage_products_per_category', v); tmp = setDotted(tmp, 'homepage.homepage_products_per_category', v); setContent(tmp); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                                        <option value="4">4 منتجات</option><option value="8">8 منتجات</option><option value="12">12 منتجاً</option>
                                    </select>
                                </Card>
                            </div>
                        )}

                        {/* ============ 5. المحتوى — مُدرك بالقالب ============ */}
                        {activeWorkspace === 'content' && (
                            <div className="space-y-4">
                                <p className="text-xs leading-relaxed text-slate-500">محتوى الصفحة — كل حقل يوضح أين يظهر ومن أي قالب يُقرأ.</p>
                                <Card>
                                    <div className="space-y-4">
                                        <div><SectionLabel>رسالة الترحيب</SectionLabel><Input value={getDotted(content, 'welcome_message') as string || ''} onChange={(e) => setContent(setDotted(content, 'welcome_message', e.target.value))} placeholder="مرحباً بكم في متجرنا!" className="bg-white" /><p className="mt-1 text-[11px] text-slate-400">تظهر أعلى الصفحة الرئيسية — كل القوالب</p></div>
                                        <div><SectionLabel>وصف المتجر</SectionLabel><Textarea value={getDotted(content, 'store_description') as string || ''} onChange={(e) => setContent(setDotted(content, 'store_description', e.target.value))} placeholder="وصف مختصر لمتجرك..." rows={3} className="bg-white" /><p className="mt-1 text-[11px] text-slate-400">يُستخدم في السيو والمشاركة</p></div>
                                        <div><SectionLabel>نص الحقوق</SectionLabel><Input value={getDotted(content, 'copyright_text') as string || ''} onChange={(e) => setContent(setDotted(content, 'copyright_text', e.target.value))} placeholder="© 2026 متجري. جميع الحقوق محفوظة." className="bg-white" /><p className="mt-1 text-[11px] text-slate-400">يظهر في تذييل المتجر</p></div>
                                    </div>
                                </Card>
                                {/* قالب-specific editorial headings — only shown for relevant template */}
                                {theme === 'fashion-atelier' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">أزياء — محتوى القالب <span className="ms-1 rounded bg-[#9d7463]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#9d7463]">أتيليه الموضة</span></p>
                                        <div className="space-y-3">
                                            <div><SectionLabel hint="الصفحة الرئيسية → قسم الفئات الدائري">عنوان قسم الفئات</SectionLabel><Input value={String(getDotted(content,'fashion_category_heading') ?? '')} onChange={e=> setContent(setDotted(content,'fashion_category_heading', e.target.value))} placeholder="تسوقي حسب الفئة" className="bg-white" /></div>
                                        </div>
                                    </Card>
                                )}
                                {theme === 'fashion-atelier' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">أتيليه — روابط التواصل في القائمة (6 خانات) <span className="ms-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">هامبرغر</span></p>
                                        <p className="mb-3 text-[11px] leading-relaxed text-slate-500">تظهر داخل قائمة الهامبرغر للجوال فقط. كل خانة قابلة للتفعيل/التعطيل مع اختيار المنصة والرابط. الروابط غير المفعلة أو الفارغة لا تُعرض.</p>
                                        <div className="space-y-4">
                                            {[1,2,3,4,5,6].map((idx) => {
                                                const enabled = !!getDotted(content, `fashion_mobile_nav.social_${idx}_enabled`);
                                                const platform = String(getDotted(content, `fashion_mobile_nav.social_${idx}_platform`) ?? 'instagram');
                                                const url = String(getDotted(content, `fashion_mobile_nav.social_${idx}_url`) ?? '');
                                                return (
                                                    <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-xs font-black text-stone-700">رابط {idx}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-bold text-stone-500">مفعل</span>
                                                                <Switch checked={enabled} onCheckedChange={(v)=> setContent(setDotted(content, `fashion_mobile_nav.social_${idx}_enabled`, v))} />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <SectionLabel>المنصة</SectionLabel>
                                                                <select value={platform} onChange={(e)=> setContent(setDotted(content, `fashion_mobile_nav.social_${idx}_platform`, e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs focus:border-[#9d7463] focus:outline-none">
                                                                    <option value="facebook">Facebook</option>
                                                                    <option value="instagram">Instagram</option>
                                                                    <option value="tiktok">TikTok</option>
                                                                    <option value="youtube">YouTube</option>
                                                                    <option value="snapchat">Snapchat</option>
                                                                    <option value="telegram">Telegram</option>
                                                                    <option value="x">X / Twitter</option>
                                                                    <option value="whatsapp">WhatsApp</option>
                                                                    <option value="website">Website</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <SectionLabel>الرابط</SectionLabel>
                                                                <Input dir="ltr" value={url} onChange={(e)=> setContent(setDotted(content, `fashion_mobile_nav.social_${idx}_url`, e.target.value.trim()))} placeholder="https://..." className="bg-white text-xs" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                )}
                                {theme === 'fashion-atelier' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">أتيليه — زر واتساب العائم (جوال) <span className="ms-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">WhatsApp</span></p>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                                                <span className="text-xs font-bold text-stone-700">تفعيل زر واتساب العائم</span>
                                                <Switch checked={!!getDotted(content,'fashion_whatsapp.enabled')} onCheckedChange={(v)=> setContent(setDotted(content,'fashion_whatsapp.enabled', v))} />
                                            </div>
                                            <div>
                                                <SectionLabel hint="يُستخدم إن وجد، وإلا رقم واتساب العام للمتجر">رقم واتساب (مع رمز البلد)</SectionLabel>
                                                <Input dir="ltr" value={String(getDotted(content,'fashion_whatsapp.number') ?? '')} onChange={(e)=> setContent(setDotted(content,'fashion_whatsapp.number', e.target.value.replace(/[^0-9+]/g,'')))} placeholder="9665XXXXXXXX" className="bg-white text-sm" />
                                            </div>
                                            <div>
                                                <SectionLabel>الرسالة الافتراضية</SectionLabel>
                                                <Textarea value={String(getDotted(content,'fashion_whatsapp.message') ?? '')} onChange={(e)=> setContent(setDotted(content,'fashion_whatsapp.message', e.target.value))} placeholder="مرحباً، أريد الاستفسار عن أحد المنتجات" rows={2} className="bg-white" />
                                                <p className="mt-1 text-[11px] text-stone-400">يتم ترميزها تلقائياً عبر wa.me</p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                                {theme === 'bakery-house' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">مخبز — محتوى القالب <span className="ms-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">بيت المخبز</span></p>
                                        <div className="space-y-3">
                                            <div><SectionLabel hint="الصفحة الرئيسية → شبكة الفئات">عنوان رفوف المخبز</SectionLabel><Input value={String(getDotted(content,'bakery_category_heading') ?? '')} onChange={e=> setContent(setDotted(content,'bakery_category_heading', e.target.value))} placeholder="من رفوف المخبز" className="bg-white" /></div>
                                            <div><SectionLabel hint="الصفحة الرئيسية → شريط آخر دفعة">عنوان عداد آخر دفعة</SectionLabel><Input value={String(getDotted(content,'bakery_last_batch.heading') ?? '')} onChange={e=> setContent(setDotted(content,'bakery_last_batch.heading', e.target.value))} placeholder="آخر دفعة من الفرن اليوم بعد…" className="bg-white" /></div>
                                        </div>
                                    </Card>
                                )}
                                {theme === 'electronics-hub' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">تقنية — محتوى القالب <span className="ms-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">عالم التقنية</span></p>
                                        <div className="space-y-3">
                                            <div><SectionLabel hint="الصفحة الرئيسية → أسفل الهيرو مباشرة">النص الترويجي للهيرو</SectionLabel><Textarea value={String(getDotted(content,'electronics_promise') ?? '')} onChange={e=> setContent(setDotted(content,'electronics_promise', e.target.value))} placeholder="أحدث الأجهزة بأسعار منافسة، ضمان رسمي معتمد، وتوصيل سريع لباب بيتك." rows={2} className="bg-white" /></div>
                                            <div><SectionLabel hint="الصفحة الرئيسية → شريط العلامات">عنوان قسم العلامات</SectionLabel><Input value={String(getDotted(content,'electronics_brands_heading') ?? '')} onChange={e=> setContent(setDotted(content,'electronics_brands_heading', e.target.value))} placeholder="علامات نثق بها:" className="bg-white" /></div>
                                        </div>
                                    </Card>
                                )}
                                {theme === 'restaurant-menu' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">مطعم — محتوى القالب <span className="ms-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">قائمة المطعم</span></p>
                                        <div className="space-y-3">
                                            <div><SectionLabel hint="الصفحة الرئيسية → شبكة اختيارات الشيف">عنوان قسم اختيارات الشيف</SectionLabel><Input value={String(getDotted(content,'restaurant_chef_heading') ?? '')} onChange={e=> setContent(setDotted(content,'restaurant_chef_heading', e.target.value))} placeholder="اختيارات الشيف" className="bg-white" /></div>
                                        </div>
                                    </Card>
                                )}
                                {theme === 'bazaar-market' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">بازار — محتوى القالب <span className="ms-1 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">البازار</span></p>
                                        <p className="text-xs leading-relaxed text-slate-500">هذا القالب العام لا يحتاج عناوين خاصة — العناوين الافتراضية “وصل حديثاً / الأكثر رواجاً” هي عناوين نظام محايدة.</p>
                                    </Card>
                                )}
                                {theme === 'grocery-souq' && (
                                    <Card>
                                        <p className="mb-2 text-xs font-black text-slate-800">بقالة — محتوى القالب <span className="ms-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">سوق البقالة</span></p>
                                        <p className="text-xs leading-relaxed text-slate-500">العناوين “وصل حديثاً / منتجات مختارة” هي عناوين نظام محايدة. المنتجات الحقيقية تحدد المحتوى — لا توجد علامات وهمية.</p>
                                    </Card>
                                )}
                                <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200"><p className="text-xs leading-relaxed text-emerald-800">💡 كل حقل هنا يُحفظ مع “حفظ التغييرات” ويظهر مباشرة في المعاينة الحية على اليسار. التبديل بين القوالب يحافظ على بيانات كل قالب.</p></div>
                            </div>
                        )}

                        {/* ============ 6. متقدم ============ */}
                        {activeWorkspace === 'advanced' && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="flex items-center gap-1.5 text-xs font-black text-amber-800"><Code2 className="h-3.5 w-3.5" /> منطقة متقدمة</p>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-700">هذا القسم مخصص للمستخدمين المتقدمين. الأكواد هنا تُحقن في واجهة متجرك فقط ضمن بيئة معزولة.</p>
                                </div>
                                <Card>
                                    <SectionLabel>CSS مخصص</SectionLabel>
                                    <Textarea dir="ltr" rows={6} value={customCss} onChange={(e) => setCustomCss(e.target.value)} placeholder=".my-button { background: #0d9488; }" className="font-mono text-sm" />
                                </Card>
                                <Card>
                                    <SectionLabel>JavaScript مخصص</SectionLabel>
                                    <Textarea dir="ltr" rows={6} value={customJs} onChange={(e) => setCustomJs(e.target.value)} placeholder="// يعمل بعد اكتمال التحميل" className="font-mono text-sm" />
                                </Card>
                                <Card>
                                    <SectionLabel>وسوم الرأس (Head)</SectionLabel>
                                    <Textarea dir="ltr" rows={4} value={headInject} onChange={(e) => setHeadInject(e.target.value)} placeholder='<meta name="..." />' className="font-mono text-sm" />
                                </Card>
                            </div>
                        )}

                        <p className="px-1 pt-4 text-center text-[11px] text-slate-400">يتم حفظ كل الأقسام معاً عبر زر “حفظ التغييرات” أعلاه</p>
                    </div>
                </aside>
            </div>

            {/* Category picker dialog */}
            <Dialog open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>اختيار التصنيفات</DialogTitle><DialogDescription className="text-start">اختر الفئات التي تريد عرضها كأقسام في الصفحة الرئيسية.</DialogDescription></DialogHeader>
                    {availableCategories.length === 0 ? (
                        <p className="rounded-xl bg-amber-50 px-3 py-3 text-center text-xs font-bold text-amber-700">لا توجد فئات نشطة لهذا المتجر.</p>
                    ) : (
                        <div className="max-h-[320px] space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                            {availableCategories.map((cat) => {
                                const idStr = String(cat.id); const checked = homepageCategories.map(String).includes(idStr);
                                return (
                                    <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                                        <input type="checkbox" checked={checked} onChange={(e) => { const next = e.target.checked ? [...homepageCategories.map(String), idStr] : homepageCategories.map(String).filter((x) => x !== idStr); let tmp = setDotted(content, 'settings.homepage_categories', next); tmp = setDotted(tmp, 'homepage.homepage_categories', next); tmp = setDotted(tmp, 'homepage_categories', next); setContent(tmp); }} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                        <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span><span className="text-xs text-slate-400">#{cat.id}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-xs text-slate-500">{homepageCategories.length} فئات مختارة</p>
                    <DialogFooter><Button onClick={() => setCategoryPickerOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800">تم</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template preview dialog */}
            <Dialog open={!!previewTemplateSlug} onOpenChange={(o) => !o && setPreviewTemplateSlug(null)}>
                <DialogContent className="max-h-[90vh] flex w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
                    {previewModule && (
                        <>
                            <DialogHeader className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="text-start"><DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">{previewModule.meta.name}<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{previewModule.meta.sector}</span></DialogTitle><DialogDescription className="mt-1 text-start text-sm text-slate-500">{previewModule.meta.description}</DialogDescription></div>
                                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 shrink-0">
                                        <button type="button" onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Monitor className="h-3.5 w-3.5" /> سطح المكتب</button>
                                        <button type="button" onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Smartphone className="h-3.5 w-3.5" /> الهاتف</button>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-100 p-4">
                                <div className={`overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-300 ${previewMode === 'mobile' ? 'h-[650px] w-[390px] max-w-full' : 'h-[600px] w-full'}`}><iframe src={`/stores/${store.id}/templates/${previewModule.meta.slug}/preview`} title={`معاينة ${previewModule.meta.name}`} className="h-full w-full border-0" loading="lazy" /></div>
                            </div>
                            <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 px-6 py-4 sm:gap-2">
                                <Button variant="outline" onClick={() => setPreviewTemplateSlug(null)}>إغلاق</Button>
                                {theme.trim().toLowerCase() === previewModule.meta.slug.toLowerCase() ? (
                                    <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => setPreviewTemplateSlug(null)}>تخصيص القالب</Button>
                                ) : (
                                    <Button disabled={!!applyingTemplate} onClick={() => { setPreviewTemplateSlug(null); setConfirmTemplateSlug(previewModule.meta.slug); }} style={{ backgroundColor: previewModule.meta.accent }} className="gap-1.5 text-white">{applyingTemplate === previewModule.meta.slug && <Loader2 className="h-4 w-4 animate-spin" />} استخدام هذا القالب</Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirm apply template */}
            <Dialog open={!!confirmTemplateSlug} onOpenChange={(o) => !o && setConfirmTemplateSlug(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>هل تريد تطبيق هذا القالب؟</DialogTitle><DialogDescription className="text-start leading-relaxed">سيتم تغيير طريقة عرض متجرك إلى قالب <span className="font-bold text-slate-900">«{confirmModule?.meta.name}»</span>.<br /><span className="font-medium text-emerald-700">لن يتم حذف منتجاتك أو تصنيفاتك أو طلباتك.</span><br />يمكنك تغيير القالب في أي وقت.</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setConfirmTemplateSlug(null)} disabled={!!applyingTemplate}>إلغاء</Button><Button onClick={() => confirmModule && applyTemplate(confirmModule.meta.slug)} disabled={!!applyingTemplate} style={{ backgroundColor: confirmModule?.meta.accent }} className="gap-1.5 text-white">{applyingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}تطبيق القالب</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
