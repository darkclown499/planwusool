import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Plus, Trash2, Loader2, FolderPlus, ChevronDown, EyeOff, Eye, AlertTriangle, Package, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ProfitSummary } from '@/components/ui/profit-summary';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import InputError from '@/components/input-error';
import { TagInput } from '@/components/ui/tag-input';
import VariantImageSlot from '@/components/VariantImageSlot';
import { toast } from '@/components/custom-toast';
import { apiPost } from '@/utils/api';
import { hasPermission } from '@/utils/permissions';
import {
  generateVariantCombinations,
  mergeCombinationEdits,
  toCombinationEditsMap,
  type VariantCombination,
} from '@/utils/variant-combinations';

function slugify(value: string): string {
  return String(value).trim().toLowerCase().replace(/[^\w\s\u0600-\u06FF-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

type ProductLike = any;

interface Props {
  mode: 'create' | 'edit';
  product?: ProductLike;
  categories: any[];
  taxes: any[];
  errors: Record<string, string>;
  planLimits?: any;
  onDirtyChange?: (dirty: boolean) => void;
}

const PRESET_COLORS = ['أسود', 'أبيض', 'زهري', 'أحمر', 'أزرق'];
const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function isColorOption(name: string): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n.includes('لون') || n.includes('اللون') || n.includes('color') || n.includes('colour');
}
function isSizeOption(name: string): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n.includes('مقاس') || n.includes('المقاس') || n.includes('size') || n.includes('حجم') || n.includes('مقاسات');
}

export default function ProductForm({ mode, product, categories: initialCategories, taxes, errors, planLimits }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const [categoriesList, setCategoriesList] = useState<any[]>(initialCategories || []);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Parse specifications stored as JSON quick_specs or legacy text
  const parseQuickSpecs = (raw: any): { key: string; value: string }[] => {
    if (!raw) return [{ key: '', value: '' }];
    if (Array.isArray(raw)) return raw.length ? raw : [{ key: '', value: '' }];
    try {
      const parsed = JSON.parse(String(raw));
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    // legacy text -> show as single empty
    return [{ key: '', value: '' }];
  };

  const initialQuickSpecs = useMemo(() => parseQuickSpecs(product?.specifications), [product]);
  const initialCustomFields = useMemo(() => {
    if (product?.custom_fields && Array.isArray(product.custom_fields) && product.custom_fields.length) return product.custom_fields;
    return [{ name: '', value: '' }];
  }, [product]);

  const initialImages = product?.images || product?.cover_image || '';
  const [formData, setFormData] = useState(() => ({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    details: product?.details || '',
    price: product?.price != null ? String(product.price) : '',
    cost_price: (product?.cost_price ?? '') != null ? String(product?.cost_price ?? '') : '',
    sale_price: product?.sale_price != null ? String(product.sale_price) : '',
    stock: product?.stock ?? 0,
    low_stock_warning: product?.low_stock_warning ?? 5,
    track_inventory: product?.track_inventory !== undefined ? !!product.track_inventory : true,
    allow_backorder: !!product?.allow_backorder,
    images: initialImages,
    category_id: product?.category_id ? String(product.category_id) : '',
    tax_id: product?.tax_id ? String(product.tax_id) : '',
    is_active: product?.is_active !== undefined ? !!product.is_active : true,
    is_tax_included: product?.is_tax_included !== undefined ? !!product.is_tax_included : true,
    is_downloadable: !!product?.is_downloadable,
    downloadable_file: product?.downloadable_file || '',
    meta_title: product?.meta_title || '',
    meta_description: product?.meta_description || '',
    seo_url_slug: product?.seo_url_slug || '',
  }));

  const [quickSpecs, setQuickSpecs] = useState<{ key: string; value: string }[]>(initialQuickSpecs as any);
  const [customFields, setCustomFields] = useState<{ name: string; value: string }[]>(initialCustomFields);
  const [variants, setVariants] = useState(() => {
    if (product?.variants && Array.isArray(product.variants) && product.variants.length) {
      return product.variants.map((v: any) => ({ name: v.name || '', values: Array.isArray(v.values) ? v.values : (Array.isArray(v.options) ? v.options : []) }));
    }
    return [{ name: '', values: [] as string[] }];
  });
  const [variantsEnabled, setVariantsEnabled] = useState(() => Boolean(product?.variants && Array.isArray(product.variants) && product.variants.length > 0));
  const [comboEdits, setComboEdits] = useState<Record<string, VariantCombination>>(() => toCombinationEditsMap(product?.variant_combinations));
  const [inventoryMode, setInventoryMode] = useState<'product' | 'variant'>(() => {
    const m = (product as any)?.inventory_mode;
    if (m === 'variant' || m === 'product') return m;
    // Backward compat: existing variant products default to product (not auto-variant)
    return 'product';
  });
  const [showVariantFields, setShowVariantFields] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [contentExtraOpen, setContentExtraOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<null | { type: 'value' | 'group'; groupIdx: number; value?: string; affectedCount: number; label: string }>(null);

  const hasEditedMetaTitle = useRef(!!product?.meta_title);
  const hasEditedSlug = useRef(!!product?.seo_url_slug);
  const initialSnapshot = useRef(JSON.stringify({ formData, quickSpecs, customFields, variants, comboEdits, inventoryMode }));
  const isDirty = useMemo(() => {
    try { return JSON.stringify({ formData, quickSpecs, customFields, variants, comboEdits, inventoryMode }) !== initialSnapshot.current; } catch { return true; }
  }, [formData, quickSpecs, customFields, variants, comboEdits, inventoryMode]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty && !submitting) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, submitting]);

  const setField = (name: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // auto-derive SEO if not manually edited
      if (name === 'name') {
        if (!hasEditedMetaTitle.current) next.meta_title = String(value).slice(0, 60);
        if (!hasEditedSlug.current) next.seo_url_slug = slugify(String(value));
      }
      return next;
    });
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (name === 'meta_title') hasEditedMetaTitle.current = true;
    if (name === 'seo_url_slug') hasEditedSlug.current = true;
    setField(name, type === 'number' ? value : value);
  };
  const handleSelectChange = (name: string, value: string) => setField(name, value);
  const generateSku = () => {
    const name = formData.name.trim();
    const cat = categoriesList?.find((c: any) => String(c.id) === formData.category_id);
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
    const catPrefix = cat ? cat.name.substring(0, 2).toUpperCase() : '';
    const num = String(Math.floor(Math.random() * 900) + 100);
    setField('sku', catPrefix ? `${catPrefix}-${prefix}-${num}` : `${prefix}-${num}`);
  };
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { toast.error(t('Enter a category name')); return; }
    if (creatingCategory) return;
    setCreatingCategory(true);
    try {
      const res = await apiPost(route('categories.inline'), { name });
      if (res?.category) {
        setCategoriesList(prev => [...prev, res.category]);
        setField('category_id', String(res.category.id));
        setNewCategoryName(''); setNewCategoryOpen(false); toast.success(t('Category created'));
      } else toast.error(res?.message || t('Could not create the category'));
    } catch { toast.error(t('Could not create the category')); } finally { setCreatingCategory(false); }
  };

  const buildPayload = (draft: boolean) => {
    const cleanedVariants = variantsEnabled ? variants.map(v => ({ ...v, values: (v.values || []).map(x => x.trim()).filter(Boolean) })).filter(v => v.name.trim() !== '') : [];
    const generated = generateVariantCombinations(cleanedVariants);
    const combos = mergeCombinationEdits(generated, comboEdits);
    // inventory_mode: explicit merchant intent; only allow variant when variants actually exist
    const effectiveMode: 'product' | 'variant' = (formData.track_inventory && variantsEnabled && cleanedVariants.length > 0 && combos.length > 0 && inventoryMode === 'variant') ? 'variant' : 'product';
    return {
      ...formData,
      price: formData.price === '' ? 0 : formData.price,
      is_active: draft ? false : formData.is_active,
      is_published: draft ? false : formData.is_active,
      quick_specs: quickSpecs.filter(s => s.key.trim() !== ''),
      variants: cleanedVariants,
      variant_combinations: combos,
      inventory_mode: effectiveMode,
      custom_fields: customFields.filter(f => f.name.trim() !== ''),
    };
  };

  const noCategories = !categoriesList || categoriesList.length === 0;

  const handleSubmit = (draft = false) => {
    if (planLimits && !planLimits.can_create && !isEdit) { toast.error(t('Product limit reached')); return; }
    if (noCategories) {
      toast.error('أنشئ تصنيفاً أولاً قبل إضافة المنتج — استخدم زر "تصنيف جديد" أدناه');
      setNewCategoryOpen(true);
      return;
    }
    if (!formData.name.trim() || !formData.category_id || !formData.images || formData.price === '') {
      toast.error('يرجى إكمال الحقول المطلوبة: الاسم، التصنيف، الصور، السعر');
      return;
    }
    setSubmitting(true);
    const payload = buildPayload(draft);
    if (isEdit) router.put(route('products.update', product.id), payload, { onFinish: () => setSubmitting(false) });
    else router.post(route('products.store'), payload, { onFinish: () => setSubmitting(false) });
  };

  const variantsPreview = useMemo(() => generateVariantCombinations(variantsEnabled ? variants : []), [variants, variantsEnabled]);
  const mergedCombos = useMemo(() => mergeCombinationEdits(variantsPreview, comboEdits), [variantsPreview, comboEdits]);

  const totalStock = useMemo(() => {
    if (!variantsEnabled || !formData.track_inventory || inventoryMode !== 'variant') return null;
    return mergedCombos.reduce((acc: number, c: any) => acc + (parseInt(String(c.stock ?? 0)) || 0), 0);
  }, [mergedCombos, variantsEnabled, formData.track_inventory, inventoryMode]);

  // Bulk apply
  const applyBulk = () => {
    const p = bulkPrice.trim();
    const s = bulkStock.trim();
    if (p === '' && s === '') {
      toast.error('أدخل السعر أو المخزون للتطبيق على كل التركيبات');
      return;
    }
    if (variantsPreview.length === 0) return;
    const generated = variantsPreview;
    setComboEdits(prev => {
      const next: Record<string, VariantCombination> = { ...prev };
      generated.forEach(g => {
        const existing = (next[g.id] as any) || g;
        const updated: VariantCombination = {
          ...g,
          uuid: (existing as any).uuid || g.uuid,
          price: p !== '' ? p : ((existing as any).price ?? g.price ?? ''),
          stock: s !== '' ? s : ((existing as any).stock ?? g.stock ?? ''),
          cost_price: (existing as any).cost_price ?? g.cost_price ?? '',
          sku: (existing as any).sku ?? g.sku ?? '',
          image: (existing as any).image ?? g.image ?? '',
          low_stock_warning: (existing as any).low_stock_warning ?? g.low_stock_warning ?? '',
        } as VariantCombination;
        next[g.id] = updated;
        if ((updated as any).uuid) next[(updated as any).uuid] = updated;
      });
      return next;
    });
    toast.success(`تم تطبيق ${p !== '' ? 'السعر' : ''}${p !== '' && s !== '' ? ' و' : ''}${s !== '' ? 'المخزون' : ''} على ${generated.length} تركيبة`);
  };

  // Preset helpers
  const addPresetValue = (groupIdx: number, val: string) => {
    const cur = variants[groupIdx]?.values || [];
    if (cur.includes(val)) return;
    const next = [...variants];
    next[groupIdx] = { ...next[groupIdx], values: [...cur, val] };
    setVariants(next as any);
  };

  // Safe removal helpers
  const comboHasEdits = (combo: any): boolean => {
    const hasPrice = combo.price !== '' && combo.price != null && String(combo.price).trim() !== '';
    const hasStock = combo.stock !== '' && combo.stock != null && String(combo.stock).trim() !== '' && String(combo.stock) !== '0';
    const hasSku = combo.sku !== '' && combo.sku != null && String(combo.sku).trim() !== '';
    const hasImage = combo.image !== '' && combo.image != null && String(combo.image).trim() !== '';
    const hasCost = (combo as any).cost_price !== '' && (combo as any).cost_price != null && String((combo as any).cost_price).trim() !== '';
    return hasPrice || hasStock || hasSku || hasImage || hasCost;
  };

  const getAffectedForValue = (groupIdx: number, value: string) => {
    const merged = mergeCombinationEdits(generateVariantCombinations(variantsEnabled ? variants : []), comboEdits);
    const affected = merged.filter((c: any) => (c.values || []).includes(value));
    const withEdits = affected.filter(comboHasEdits);
    return { affectedCount: affected.length, withEditsCount: withEdits.length, hasEdits: withEdits.length > 0 };
  };

  const getAffectedForGroup = (groupIdx: number) => {
    const merged = mergeCombinationEdits(generateVariantCombinations(variantsEnabled ? variants : []), comboEdits);
    const withEdits = merged.filter(comboHasEdits);
    return { affectedCount: merged.length, hasEdits: withEdits.length > 0, withEditsCount: withEdits.length };
  };

  const handleTagChangeWithConfirm = (groupIdx: number, newVals: string[]) => {
    const oldVals: string[] = variants[groupIdx]?.values || [];
    if (newVals.length < oldVals.length) {
      const removed = oldVals.find(v => !newVals.includes(v));
      if (removed) {
        const { affectedCount, hasEdits } = getAffectedForValue(groupIdx, removed);
        if (affectedCount > 0 && hasEdits) {
          setPendingRemoval({ type: 'value', groupIdx, value: removed, affectedCount, label: removed });
          return;
        }
      }
    }
    const next = [...variants];
    next[groupIdx] = { ...next[groupIdx], values: newVals };
    setVariants(next as any);
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    if (pendingRemoval.type === 'value' && pendingRemoval.value) {
      const idx = pendingRemoval.groupIdx;
      const val = pendingRemoval.value;
      const next = [...variants];
      next[idx] = { ...next[idx], values: (next[idx].values || []).filter((v: string) => v !== val) };
      setVariants(next as any);
    } else if (pendingRemoval.type === 'group') {
      const idx = pendingRemoval.groupIdx;
      setVariants(variants.filter((_, i) => i !== idx));
    }
    setPendingRemoval(null);
  };

  const handleRemoveGroupWithConfirm = (idx: number) => {
    const { affectedCount, hasEdits } = getAffectedForGroup(idx);
    const label = variants[idx]?.name || `خيار ${idx + 1}`;
    if (hasEdits && affectedCount > 0) {
      setPendingRemoval({ type: 'group', groupIdx: idx, affectedCount, label });
      return;
    }
    setVariants(variants.filter((_, i) => i !== idx));
  };

  return (
    <div className="pb-24" dir="rtl">
      {/* Sticky header actions for mobile */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Simple hero hint */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
          <span className="font-bold">💡 نصيحة:</span> أدخل الاسم والسعر والصورة والتصنيف ثم اضغط نشر — باقي الخيارات اختيارية ويمكن فتحها عند الحاجة.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-4">
          {/* SECTION 1 — BASIC */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">معلومات المنتج <span className="text-xs font-normal text-muted-foreground">— الحقول الأساسية</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* TASK 1 — Prominent product type selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4" data-testid="product-type-selector">
                <Label className="text-sm font-bold">نوع المنتج</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">مثال: بلوزة متوفرة بعدة ألوان أو مقاسات</p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setVariantsEnabled(false)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition sm:py-4 ${!variantsEnabled ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    aria-pressed={!variantsEnabled}
                    data-testid="product-type-simple"
                  >
                    <Package className={`h-5 w-5 ${!variantsEnabled ? 'text-primary-foreground' : 'text-slate-600'}`} />
                    <span className={`text-sm font-bold ${!variantsEnabled ? 'text-primary-foreground' : 'text-slate-800'}`}>منتج عادي</span>
                    <span className={`text-[11px] leading-tight ${!variantsEnabled ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>لون/مقاس واحد</span>
                    {!variantsEnabled && <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-white shadow" aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVariantsEnabled(true);
                      if (!variants || variants.length === 0 || variants.every((v: any) => !v.name && (!v.values || v.values.length === 0))) {
                        setVariants([{ name: 'اللون', values: [] as string[] }]);
                      }
                    }}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition sm:py-4 ${variantsEnabled ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    aria-pressed={variantsEnabled}
                    data-testid="product-type-variable"
                  >
                    <Layers className={`h-5 w-5 ${variantsEnabled ? 'text-primary-foreground' : 'text-slate-600'}`} />
                    <span className={`text-sm font-bold ${variantsEnabled ? 'text-primary-foreground' : 'text-slate-800'}`}>منتج بخيارات</span>
                    <span className={`text-[11px] leading-tight ${variantsEnabled ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>ألوان / مقاسات</span>
                    {variantsEnabled && <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-white shadow" aria-hidden />}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="name" required>اسم المنتج</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="مثال: قميص قطني رجالي" className="h-11 text-base" aria-invalid={!!errors.name} />
                <InputError message={errors.name} />
              </div>

              <div>
                <MediaPicker label="صور المنتج *" value={formData.images} onChange={(v) => handleSelectChange('images', v)} placeholder="اختر صور المنتج..." multiple required dragDrop />
                <p className="text-xs text-muted-foreground mt-1.5">الأولى هي الرئيسية — اسحب لإعادة الترتيب. المقاس المقترح 800×800.</p>
                {errors.images && <InputError message={errors.images} />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category_id" required>التصنيف</Label>
                    {hasPermission('create-categories') && (
                      <button type="button" onClick={() => setNewCategoryOpen(v => !v)} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded px-1.5 py-0.5"><FolderPlus className="h-3 w-3" /> تصنيف جديد</button>
                    )}
                  </div>
                  {noCategories && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                      <strong>لا يوجد تصنيفات بعد.</strong> أنشئ تصنيفاً أولاً — اضغط <span className="font-bold">تصنيف جديد</span> ثم أعد اختيار التصنيف.
                    </div>
                  )}
                  <Select value={formData.category_id} onValueChange={v => handleSelectChange('category_id', v)}>
                    <SelectTrigger className="h-11" aria-invalid={!!errors.category_id}><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Build hierarchical order: roots first (ordered), then children indented
                        const roots = (categoriesList || []).filter((c: any) => !c.parent_id);
                        const childrenByParent: Record<string, any[]> = {};
                        (categoriesList || []).forEach((c: any) => { if (c.parent_id) { const k = String(c.parent_id); (childrenByParent[k] ||= []).push(c); } });
                        const out: any[] = [];
                        roots.forEach((r: any) => {
                          out.push(r);
                          (childrenByParent[String(r.id)] || []).forEach((ch: any) => out.push(ch));
                        });
                        // Orphan subcategories (parent missing/filtered) appended
                        (categoriesList || []).forEach((c: any) => { if (c.parent_id && !out.find((x:any)=> String(x.id)===String(c.id))) out.push(c); });
                        return out.map((cat: any) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  {newCategoryOpen && (
                    <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                      <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }} placeholder="اسم التصنيف الجديد..." className="h-9 flex-1" />
                      <Button type="button" size="sm" className="h-9" onClick={handleCreateCategory} disabled={creatingCategory}>{creatingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}إنشاء</Button>
                    </div>
                  )}
                  <InputError message={errors.category_id} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="price" required>السعر</Label>
                  <CurrencyInput id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="0.00" className="h-11" aria-invalid={!!errors.price} />
                  <InputError message={errors.price} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TASK 4 — Inventory clarity: when variant mode, quantity becomes computed read-only */}
                {!(formData.track_inventory && variantsEnabled && inventoryMode === 'variant') ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="stock">الكمية</Label>
                    <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="0" className="h-11" aria-invalid={!!errors.stock} />
                    <InputError message={errors.stock} />
                  </div>
                ) : (
                  <div className="grid gap-1.5" data-testid="inventory-variant-total">
                    <Label>إجمالي المخزون</Label>
                    <div className="h-11 flex items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800">
                      <span>{totalStock ?? 0}</span>
                      <span className="text-xs font-medium text-emerald-700">عبر {mergedCombos.length} تركيبة</span>
                    </div>
                    <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> يتم إدارة المخزون من جدول الخيارات أدناه</p>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>الضريبة</Label>
                  <Select value={formData.tax_id} onValueChange={v => handleSelectChange('tax_id', v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="بدون ضريبة" /></SelectTrigger>
                    <SelectContent>{taxes?.map((tax: any) => <SelectItem key={tax.id} value={String(tax.id)}>{tax.name} ({tax.rate}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>وصف المنتج</Label>
                <RichTextEditor value={formData.description} onChange={v => handleSelectChange('description', v)} placeholder="اكتب وصفاً يوضح مميزات المنتج..." />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — Pricing & Inventory collapsed */}
          <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-start">
                <div>
                  <CardTitle className="text-base">خيارات السعر والمخزون</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">السعر المخفّض، SKU، الباركود، التتبع، الضريبة</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${pricingOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-1.5"><Label htmlFor="sale_price">السعر المخفّض (اختياري)</Label><CurrencyInput id="sale_price" name="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={handleChange} placeholder="0.00" /></div>
                    <div className="grid gap-1.5"><Label htmlFor="cost_price">سعر التكلفة</Label><CurrencyInput id="cost_price" name="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={handleChange} placeholder="0.00" /></div>
                    <div className="grid gap-1.5"><Label>SKU</Label><div className="flex gap-2"><Input value={formData.sku} onChange={e => setField('sku', e.target.value)} placeholder="PROD-001" className="flex-1" /><Button type="button" variant="outline" size="sm" onClick={generateSku} className="shrink-0">توليد</Button></div></div>
                  </div>
                  <div className="grid gap-1.5"><Label htmlFor="barcode">الباركود</Label><Input id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="6291041500213" dir="ltr" className="text-start" /></div>
                  <ProfitSummary costPrice={formData.cost_price} sellingPrice={formData.price} />
                  <div className="grid gap-3 rounded-xl border bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-3"><div><Label>تتبع المخزون</Label><p className="text-xs text-muted-foreground">إدارة الكمية وتنبيه انخفاض المخزون</p></div><Switch checked={formData.track_inventory} onCheckedChange={c => setField('track_inventory', c)} /></div>
                    {formData.track_inventory && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-1.5"><Label htmlFor="low_stock_warning">تنبيه انخفاض</Label><Input id="low_stock_warning" name="low_stock_warning" type="number" value={formData.low_stock_warning} onChange={handleChange} placeholder="5" /></div>
                          <div className="flex items-center justify-between gap-2 rounded-lg border bg-white p-3"><div className="text-start"><Label className="text-xs">السماح بالطلب عند النفاد</Label></div><Switch checked={formData.allow_backorder} onCheckedChange={c => setField('allow_backorder', c)} /></div>
                        </div>
                        {/* Inventory tracking mode — only meaningful when variants enabled */}
                        {variantsEnabled && (() => {
                          const cleaned = variants.map(v => ({ ...v, values: (v.values || []).map((x: string) => x.trim()).filter(Boolean) })).filter(v => v.name.trim() !== '');
                          const hasAnyVariant = cleaned.length > 0 && cleaned.every(v => v.values.length > 0);
                          return hasAnyVariant ? (
                            <div className="rounded-lg border bg-white p-3 space-y-2">
                              <Label className="text-xs font-bold">كيف تريد إدارة المخزون؟</Label>
                              <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${inventoryMode === 'product' ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                                <input type="radio" name="inventory_mode" value="product" checked={inventoryMode === 'product'} onChange={() => setInventoryMode('product')} className="accent-primary" />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold">كمية واحدة لكل المنتج</div>
                                  <div className="text-xs text-muted-foreground">كل الخيارات تشترك في نفس الكمية ({formData.stock} متوفر)</div>
                                </div>
                              </label>
                              <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${inventoryMode === 'variant' ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                                <input type="radio" name="inventory_mode" value="variant" checked={inventoryMode === 'variant'} onChange={() => setInventoryMode('variant')} className="accent-primary" />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold">كمية منفصلة لكل خيار</div>
                                  <div className="text-xs text-muted-foreground">مثال: أحمر / S = 5 ، أحمر / M = 0 — جدول المخزون أدناه</div>
                                </div>
                              </label>
                              {inventoryMode === 'variant' && <p className="text-[11px] text-amber-700">عند تتبع كل خيار منفصل، المخزون يُحفظ لكل تركيبة أدناه. الكمية الإجمالية للمنتج غير مُستخدمة للإتاحة.</p>}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">أدخل اسم وخيارات (مثل اللون والمقاس) أولاً لاختيار وضع التتبع المنفصل.</p>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><Label>السعر شامل الضريبة</Label></div><Switch checked={formData.is_tax_included} onCheckedChange={c => setField('is_tax_included', c)} /></div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><Label>منتج رقمي (قابل للتنزيل)</Label><p className="text-xs text-muted-foreground">يتطلب ملفاً ولا يحتاج شحن</p></div><Switch checked={formData.is_downloadable} onCheckedChange={c => { setField('is_downloadable', c); if (!c) setField('downloadable_file',''); }} /></div>
                  {formData.is_downloadable && <MediaPicker label="الملف القابل للتنزيل" value={formData.downloadable_file} onChange={v => handleSelectChange('downloadable_file', v)} placeholder="اختر الملف..." />}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* SECTION 3 — Variants (now prominent, controlled by product type selector) */}
          {variantsEnabled && (
          <Card className="border-slate-200 shadow-sm" data-testid="variants-section">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">خيارات المنتج</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">مثال: اللون (أسود، أبيض) والمقاس (S، M، L)</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">{variantsPreview.length} تركيبة</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { name: '', values: [] }])}><Plus className="h-4 w-4" /> إضافة خيار</Button></div>
                {variants.map((variant, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden" data-testid={`variant-group-${idx}`}>
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b">
                      <span className="text-sm font-semibold text-muted-foreground">خيار {idx + 1}</span>
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0" onClick={() => handleRemoveGroupWithConfirm(idx)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid gap-1.5"><Label>اسم الخيار</Label><Input placeholder="مثال: اللون" value={variant.name} onChange={e => { const n=[...variants]; (n[idx] as any).name=e.target.value; setVariants(n); }} /></div>
                      <div className="grid gap-1.5">
                        <Label>القيم</Label>
                        <TagInput values={variant.values || []} onChange={vals => handleTagChangeWithConfirm(idx, vals)} placeholder="اكتب قيمة واضغط Enter" />
                        {/* TASK 2 — Quick presets */}
                        {isColorOption(variant.name) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1" data-testid={`presets-color-${idx}`}>
                            <span className="text-[11px] text-muted-foreground">اقتراحات:</span>
                            {PRESET_COLORS.map(c => {
                              const exists = (variant.values || []).includes(c);
                              return (
                                <button key={c} type="button" disabled={exists} onClick={() => addPresetValue(idx, c)} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${exists ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white hover:border-primary hover:text-primary'}`}>{c}</button>
                              );
                            })}
                          </div>
                        )}
                        {isSizeOption(variant.name) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1" data-testid={`presets-size-${idx}`}>
                            <span className="text-[11px] text-muted-foreground">اقتراحات:</span>
                            {PRESET_SIZES.map(s => {
                              const exists = (variant.values || []).includes(s);
                              return (
                                <button key={s} type="button" disabled={exists} onClick={() => addPresetValue(idx, s)} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${exists ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white hover:border-primary hover:text-primary'}`}>{s}</button>
                              );
                            })}
                          </div>
                        )}
                        {!isColorOption(variant.name) && !isSizeOption(variant.name) && String(variant.name).trim() !== '' && (
                          <p className="text-[11px] text-muted-foreground">💡 اكتب القيم ثم اضغط Enter. يمكنك أيضاً استخدام الاقتراحات أعلاه عند اختيار اللون أو المقاس.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {variantsPreview.length > 0 && (
                  <div className="rounded-xl border overflow-hidden" data-testid="combinations-panel">
                    <div className="flex flex-col gap-2 bg-slate-50 px-3 py-3 border-b sm:flex-row sm:items-center sm:justify-between sm:px-4">
                      <div><p className="text-sm font-semibold">التركيبات ({variantsPreview.length})</p><p className="text-xs text-muted-foreground">تُولّد تلقائياً — يمكنك تعديل السعر والكمية لكل تركيبة {inventoryMode === 'variant' && formData.track_inventory ? '(المخزون منفصل لكل خيار)' : ''}</p></div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowVariantFields(!showVariantFields)}>{showVariantFields ? 'إخفاء الحقول' : 'حقول إضافية'}</Button>
                    </div>
                    {/* TASK 3 — Bulk edit bar */}
                    <div className="flex flex-col gap-2 border-b bg-amber-50/60 px-3 py-3 sm:flex-row sm:items-end sm:gap-3 sm:px-4" data-testid="bulk-bar">
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">السعر لكل التركيبات</Label>
                        <CurrencyInput type="number" step="0.01" placeholder="50" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} className="h-9 bg-white" />
                      </div>
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">المخزون لكل التركيبات</Label>
                        <Input type="number" placeholder="5" value={bulkStock} onChange={e => setBulkStock(e.target.value)} className="h-9 bg-white" />
                      </div>
                      <Button type="button" onClick={applyBulk} className="h-9 shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5" data-testid="bulk-apply">تطبيق</Button>
                    </div>
                    {totalStock !== null && (
                      <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-xs sm:px-4">
                        <span className="font-medium text-emerald-800">إجمالي المخزون: <strong>{totalStock}</strong></span>
                        <span className="text-emerald-700">يتم إدارة المخزون من جدول الخيارات أدناه</span>
                      </div>
                    )}
                    {/* Desktop table */}
                    <div className="overflow-x-auto hidden md:block">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50/70 text-xs text-muted-foreground border-b"><th className="px-3 py-2 text-start">صورة</th><th className="px-3 py-2 text-start">التركيبة</th><th className="px-3 py-2 text-start">السعر</th><th className="px-3 py-2 text-start">المخزون {inventoryMode === 'variant' && formData.track_inventory ? '*' : ''}</th>{showVariantFields && <><th className="px-3 py-2 text-start">التكلفة</th><th className="px-3 py-2 text-start">SKU</th></>}</tr></thead>
                        <tbody>{mergedCombos.map(combo => (
                          <tr key={combo.id} className="border-b last:border-0">
                            <td className="px-3 py-2"><VariantImageSlot value={combo.image} onChange={v => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), image: v } as any }))} /></td>
                            <td className="px-3 py-2 font-medium whitespace-nowrap">{combo.label}</td>
                            <td className="px-3 py-2"><CurrencyInput type="number" step="0.01" placeholder="0.00" value={combo.price || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), price: e.target.value } as any }))} /></td>
                            <td className="px-3 py-2"><Input type="number" placeholder="0" value={combo.stock ?? ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), stock: e.target.value } as any }))} /></td>
                            {showVariantFields && <><td className="px-3 py-2"><CurrencyInput type="number" step="0.01" placeholder="0.00" value={(combo as any).cost_price || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), cost_price: e.target.value } as any }))} /></td><td className="px-3 py-2"><Input placeholder="SKU" value={(combo as any).sku || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), sku: e.target.value } as any }))} /></td></>}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    {/* Mobile cards — compact */}
                    <div className="md:hidden divide-y">
                      {mergedCombos.map(combo => (
                        <div key={combo.id} className="p-3 space-y-2.5 bg-white" data-testid={`combo-card-${combo.id}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-bold text-sm leading-tight flex-1 min-w-0 truncate">{combo.label}</div>
                            <VariantImageSlot value={combo.image} onChange={v => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), image: v } as any }))} />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="grid gap-1"><Label className="text-[11px]">السعر</Label><CurrencyInput type="number" step="0.01" placeholder="0.00" value={combo.price || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), price: e.target.value } as any }))} /></div>
                            <div className="grid gap-1"><Label className="text-[11px]">المخزون {inventoryMode === 'variant' && formData.track_inventory ? '*' : ''}</Label><Input type="number" placeholder="0" value={combo.stock ?? ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), stock: e.target.value } as any }))} /></div>
                          </div>
                          {showVariantFields && (
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="grid gap-1"><Label className="text-[11px]">التكلفة</Label><CurrencyInput type="number" step="0.01" placeholder="0.00" value={(combo as any).cost_price || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), cost_price: e.target.value } as any }))} /></div>
                              <div className="grid gap-1"><Label className="text-[11px]">SKU</Label><Input placeholder="SKU" value={(combo as any).sku || ''} onChange={e => setComboEdits(prev => ({ ...prev, [combo.id]: { ...(prev[combo.id] || combo), sku: e.target.value } as any }))} /></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 4 — Content */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">محتوى إضافي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Collapsible open={contentExtraOpen} onOpenChange={setContentExtraOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5 text-sm font-medium">
                  <span>وصف مختصر ومواصفات سريعة</span><ChevronDown className={`h-4 w-4 transition ${contentExtraOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid gap-1.5"><Label htmlFor="short_description">وصف مختصر</Label><Textarea id="short_description" name="short_description" rows={2} value={formData.short_description} onChange={handleChange} placeholder="ملخص قصير يظهر في المعاينة..." /><p className="text-xs text-muted-foreground">يظهر في بطاقة المنتج وبعض القوالب.</p></div>
                  <div>
                    <div className="flex items-center justify-between mb-2"><Label>المواصفات السريعة</Label><span className="text-xs text-muted-foreground">الخاصية / التفاصيل</span></div>
                    <div className="space-y-2">
                      {quickSpecs.map((spec, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input placeholder="الخاصية" value={spec.key} onChange={e => { const n=[...quickSpecs]; n[i].key=e.target.value; setQuickSpecs(n); }} className="flex-1" />
                          <Input placeholder="التفاصيل" value={spec.value} onChange={e => { const n=[...quickSpecs]; n[i].value=e.target.value; setQuickSpecs(n); }} className="flex-1" />
                          <Button type="button" variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => setQuickSpecs(quickSpecs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setQuickSpecs([...quickSpecs, { key: '', value: '' }])}><Plus className="h-4 w-4 me-1" />إضافة مواصفة</Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* SECTION 5 — Advanced collapsed */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-start">
                <div><CardTitle className="text-base">إعدادات متقدمة</CardTitle><p className="text-xs text-muted-foreground mt-0.5">حقول مخصصة وتحسين محركات البحث ورابط المنتج</p></div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${advancedOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  <div>
                    <div className="flex items-center justify-between mb-2"><Label>حقول مخصصة (داخلية — لا تظهر للعميل إلا إذا كان القالب يدعمها)</Label><Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { name: '', value: '' }])}><Plus className="h-4 w-4 me-1" />إضافة حقل</Button></div>
                    <p className="text-xs text-muted-foreground mb-3">مثال: موقع المنتج بالمخزن — الرف A3. لا نعرض هذه الحقول تلقائياً في الواجهة.</p>
                    <div className="space-y-2">
                      {customFields.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input placeholder="اسم الحقل" value={f.name} onChange={e => { const n=[...customFields]; n[i].name=e.target.value; setCustomFields(n); }} />
                          <Input placeholder="القيمة" value={f.value} onChange={e => { const n=[...customFields]; n[i].value=e.target.value; setCustomFields(n); }} />
                          <Button type="button" variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-slate-50/50 p-4 space-y-4">
                    <h4 className="text-sm font-bold">تحسين الظهور في محركات البحث</h4>
                    <div className="grid gap-1.5"><Label htmlFor="meta_title">عنوان صفحة المنتج</Label><Input id="meta_title" name="meta_title" maxLength={60} value={formData.meta_title} onChange={handleChange} placeholder="يُستمد تلقائياً من اسم المنتج إذا تُرك فارغاً" /><div className={`text-xs ${(formData.meta_title || '').length >= 60 ? 'text-amber-600' : 'text-muted-foreground'}`}><span dir="ltr">{(formData.meta_title || '').length}/60</span></div></div>
                    <div className="grid gap-1.5"><Label htmlFor="meta_description">وصف صفحة المنتج</Label><Textarea id="meta_description" name="meta_description" rows={2} maxLength={160} value={formData.meta_description} onChange={handleChange} placeholder="وصف مختصر لمحركات البحث" /><div className={`text-xs ${(formData.meta_description || '').length >= 160 ? 'text-amber-600' : 'text-muted-foreground'}`}><span dir="ltr">{(formData.meta_description || '').length}/160</span></div></div>
                    <div className="grid gap-1.5"><Label htmlFor="seo_url_slug">رابط المنتج</Label><Input id="seo_url_slug" name="seo_url_slug" value={formData.seo_url_slug} onChange={handleChange} placeholder={slugify(formData.name) || 'product-slug'} dir="ltr" className="text-start" /><p className="text-xs text-muted-foreground break-all" dir="ltr">/products/{formData.seo_url_slug || slugify(formData.name) || '...'}</p></div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm">حالة النشر</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div><Label>منشور</Label><p className="text-xs text-muted-foreground">{formData.is_active ? 'يظهر في المتجر' : 'مسودة — مخفي'}</p></div>
                <Switch checked={formData.is_active} onCheckedChange={c => setField('is_active', c)} />
              </div>
              {formData.is_active ? <p className="flex items-center gap-1.5 text-xs text-emerald-700"><Eye className="h-3.5 w-3.5" /> سيظهر مباشرة بعد الحفظ</p> : <p className="flex items-center gap-1.5 text-xs text-amber-700"><EyeOff className="h-3.5 w-3.5" /> محفوظ كمسودة</p>}
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 space-y-2">
              <Button type="button" onClick={() => handleSubmit(false)} disabled={submitting} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-[15px] font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isEdit ? 'حفظ التغييرات' : 'نشر المنتج'}
              </Button>
              {!isEdit && <Button type="button" variant="outline" onClick={() => handleSubmit(true)} disabled={submitting} className="w-full gap-2 h-10">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} حفظ كمسودة</Button>}
              {isDirty && <p className="text-center text-xs text-amber-600">لديك تغييرات غير محفوظة</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TASK 5 — Safe removal confirmation dialog */}
      <Dialog open={!!pendingRemoval} onOpenChange={(o) => !o && setPendingRemoval(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" /> تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              {pendingRemoval?.type === 'value' ? (
                <>سيؤدي حذف <strong className="text-foreground">{pendingRemoval.label}</strong> إلى إزالة <strong className="text-foreground">{pendingRemoval.affectedCount} تركيبات</strong> محفوظة (تحتوي على سعر/مخزون/SKU/صورة). هل تريد المتابعة؟</>
              ) : (
                <>سيؤدي حذف <strong className="text-foreground">{pendingRemoval?.label}</strong> إلى إزالة <strong className="text-foreground">{pendingRemoval?.affectedCount} تركيبة</strong>. هل تريد المتابعة؟</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-row-reverse sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setPendingRemoval(null)}>إلغاء</Button>
            <Button type="button" variant="destructive" onClick={confirmRemoval}>تأكيد الحذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
