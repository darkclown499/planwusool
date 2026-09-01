import React, { useCallback, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  UploadCloud,
  XCircle,
  AlertTriangle,
  Loader2,
  PackagePlus,
  History,
  ArrowLeft,
} from 'lucide-react';

const NO_FIELD = 'none';

const FIELD_OPTIONS: { value: string; label: string; required?: boolean }[] = [
  { value: 'name', label: 'اسم المنتج', required: true },
  { value: 'sku', label: 'كود المنتج (SKU)' },
  { value: 'barcode', label: 'الباركود' },
  { value: 'description', label: 'الوصف' },
  { value: 'price', label: 'السعر' },
  { value: 'compare_at_price', label: 'السعر قبل الخصم' },
  { value: 'stock', label: 'المخزون / الكمية' },
  { value: 'category', label: 'التصنيف' },
  { value: 'status', label: 'الحالة (نشط / غير نشط)' },
  { value: 'image_url', label: 'رابط الصورة' },
  { value: 'option1_name', label: 'اسم الخيار الأول' },
  { value: 'option1_value', label: 'قيمة الخيار الأول' },
  { value: 'option2_name', label: 'اسم الخيار الثاني' },
  { value: 'option2_value', label: 'قيمة الخيار الثاني' },
  { value: 'variant_sku', label: 'SKU المتغير' },
  { value: 'variant_price', label: 'سعر المتغير' },
  { value: 'variant_stock', label: 'مخزون المتغير' },
];

const STRATEGY_LABELS: Record<string, string> = {
  create_only: 'إضافة منتجات جديدة فقط',
  update_by_sku: 'إضافة وتحديث حسب الكود (SKU)',
};

const STATUS_LABELS: Record<string, string> = {
  previewed: 'معاينة',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  completed_with_errors: 'مكتمل مع أخطاء',
  failed: 'فشل',
};

type ErrorEntry = { field?: string; reason?: string };
type ErrorRow = { row: number; errors: ErrorEntry[] };
type WarningEntry = { row: number; field?: string; reason?: string };

type Summary = {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  estimated_products: number;
  duplicates: string[];
  strategy: string;
  warnings_list: WarningEntry[];
};

type ConfirmResult = {
  status: string;
  batch_id: number;
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  completed_at: string | null;
  message: string;
};

type HistoryItem = {
  id: number;
  original_filename: string;
  file_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  strategy: string;
  created_at: string;
  completed_at: string | null;
};

type Props = {
  categories: { id: number; name: string; parent_id: number | null }[];
  history: HistoryItem[];
  planLimits: { can_create: boolean; current_products: number; max_products: number } | null;
  limits: { max_rows: number; max_bytes: number; max_mb: number };
};

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function ProductImport({ categories, history, planLimits, limits }: Props) {
  const { csrf_token } = usePage().props as any;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<'create_only' | 'update_by_sku'>('create_only');
  const [createCategories, setCreateCategories] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);

  const mappingEntries = useMemo(
    () =>
      headers.map((header, index) => ({
        header,
        field: mapping[header] ?? NO_FIELD,
        index,
      })),
    [headers, mapping],
  );

  const mappedField = useCallback(
    (field: string) =>
      Object.values(mapping).some((f) => f === field && f !== NO_FIELD),
    [mapping],
  );

  const nameMapped = mappedField('name');

  const handleFileChosen = useCallback(
    async (chosen: File | null) => {
      setUploadError('');
      if (!chosen) return;

      if (chosen.size > limits.max_bytes) {
        setUploadError(`حجم الملف كبير جداً. الحد الأقصى ${limits.max_mb} ميغابايت.`);
        toast.error(`حجم الملف كبير جداً. الحد الأقصى ${limits.max_mb} ميغابايت.`);
        return;
      }
      const ext = (chosen.name.split('.').pop() || '').toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx') {
        setUploadError('صيغة الملف غير مدعومة. الملفات المسموح بها هي CSV و XLSX فقط.');
        toast.error('صيغة الملف غير مدعومة. الملفات المسموح بها هي CSV و XLSX فقط.');
        return;
      }

      setFile(chosen);
      setBusy(true);
      try {
        const formData = new FormData();
        formData.append('file', chosen);
        const response = await fetch(route('products.import.parse'), {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: {
            'X-CSRF-TOKEN': csrf_token,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'تعذر قراءة الملف');
        }
        setHeaders(data.headers || []);
        const initial: Record<string, string> = {};
        Object.entries((data.suggested_mapping as Record<string, string>) || {}).forEach(([h, f]) => {
          initial[h] = f || NO_FIELD;
        });
        setMapping(initial);
        setStep('mapping');
      } catch (err: any) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadError(err?.message || 'تعذر قراءة الملف');
        toast.error(err?.message || 'تعذر قراءة الملف');
      } finally {
        setBusy(false);
      }
    },
    [csrf_token, limits],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragRef.current) dragRef.current.classList.remove('border-primary');
    const dropped = e.dataTransfer?.files?.[0] ?? null;
    void handleFileChosen(dropped);
  };

  const setFieldForHeader = (header: string, value: string) => {
    setMapping((prev) => ({ ...prev, [header]: value }));
  };

  const activeCount = useMemo(
    () => mappingEntries.filter((m) => m.field !== NO_FIELD).length,
    [mappingEntries],
  );

  const openMappingErrors = useMemo(() => {
    const out: string[] = [];
    if (!nameMapped) out.push('عمود اسم المنتج غير محدد.');
    if (activeCount === 0) out.push('لا يوجد أي عمود محدد للاستيراد.');
    return out;
  }, [nameMapped, activeCount]);

  const runPreview = async () => {
    if (!file) return;
    setBusy(true);
    setUploadError('');
    try {
      const payload: Record<string, string> = {};
      Object.entries(mapping).forEach(([h, f]) => {
        if (f !== NO_FIELD) payload[h] = f;
      });
      const options = {
        strategy,
        create_categories: createCategories,
      };
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(payload));
      formData.append('options', JSON.stringify(options));
      const response = await fetch(route('products.import.preview'), {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf_token,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'تعذر إنشاء المعاينة');
      }
      setSummary(data.summary || null);
      setErrors(data.errors || []);
      setBatchId(data.batch_id);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء المعاينة');
      setUploadError(err?.message || 'تعذر إنشاء المعاينة');
    } finally {
      setBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!batchId) return;
    setBusy(true);
    try {
      const response = await fetch(route('products.import.confirm'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf_token,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch_id: batchId, strategy }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'تعذر تنفيذ الاستيراد');
      }
      setResult(data);
      setStep('result');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تنفيذ الاستيراد');
    } finally {
      setBusy(false);
    }
  };

  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setMapping({});
    setSummary(null);
    setErrors([]);
    setResult(null);
    setBatchId(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    window.open(route('products.import.template'), '_blank');
  };

  const downloadErrors = () => {
    if (!batchId) return;
    window.open(route('products.import.errors', { id: batchId }), '_blank');
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'رفع الملف' },
    { id: 'mapping', label: 'مطابقة الأعمدة' },
    { id: 'preview', label: 'المراجعة والمعاينة' },
    { id: 'result', label: 'النتيجة' },
  ];

  const backToProducts = () => router.visit(route('products.index'));

  return (
    <PageTemplate
      title="استيراد المنتجات"
      description="استيراد دفعة من المنتجات من ملف Excel (XLSX) أو CSV بأمان وبشكل تدريجي."
      url={route('products.import')}
    >
      {/* Step indicator */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const active = step === s.id;
          const done = (i === 0 && step !== 'upload') || (i === 1 && (step === 'preview' || step === 'result')) || (i === 2 && step === 'result');
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              {i > 0 && <ChevronLeft className="rtl-flip h-3.5 w-3.5 text-muted-foreground/50" />}
              <span
                className={
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ' +
                  (active
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : done
                      ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30'
                      : 'text-muted-foreground')
                }
              >
                {i + 1}. {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                ملف المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!planLimits || planLimits.can_create ? null : (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    خطة منتجاتك اكتملت ({planLimits.current_products}/{planLimits.max_products}). لن يتم إنشاء
                    منتجات جديدة تتجاوز سعة خطتك، وستظهر الصفوف الزائدة كأخطاء في التقرير.
                  </p>
                </div>
              )}

              <div
                ref={dragRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragRef.current) dragRef.current.classList.add('border-primary');
                }}
                onDragLeave={() => dragRef.current?.classList.remove('border-primary')}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-10 text-center transition-colors hover:border-primary/50"
              >
                <UploadCloud className="h-9 w-9 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {busy ? 'جارٍ قراءة الملف...' : 'اسحب الملف هنا أو انقر للاختيار'}
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV أو XLSX — حتى {limits.max_mb} ميغابايت وحتى {limits.max_rows.toLocaleString('ar-EG')} صف
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] ?? null;
                    void handleFileChosen(chosen);
                  }}
                />
              </div>

              {uploadError && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                تحميل قالب جاهز (CSV)
              </Button>

              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>الصف الأول يجب أن يحتوي على أسماء الأعمدة (الترويسة).</li>
                <li>رتب مربع الأعمدة لمطابقة بياناتك (الاسم، السعر، المخزون...).</li>
                <li>إزالة الأعمدة الإضافية غير المهمة تُقلل الأخطاء وتُسرع المعالجة.</li>
                <li>لا نقوم بجلب الصور من الروابط — يُخزَّن الرابط فقط كمرجع.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <PackagePlus className="h-4 w-4 text-primary" />
                إعدادات الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[13px]">طريقة الاستيراد</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStrategy('create_only')}
                    className={
                      'rounded-lg border p-3 text-start transition-colors ' +
                      (strategy === 'create_only'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40')
                    }
                  >
                    <p className="text-[13px] font-medium">إضافة جديد فقط</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      المنتجات الجديدة فقط. أي SKU موجود مسبقاً سيُظهر خطأ ولن يُعدَّل.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy('update_by_sku')}
                    className={
                      'rounded-lg border p-3 text-start transition-colors ' +
                      (strategy === 'update_by_sku'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40')
                    }
                  >
                    <p className="text-[13px] font-medium">إضافة وتحديث حسب الكود</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      تتطلب صلاحية تعديل المنتجات. تُحدَّث الحقول المحددة فقط دون لمس الباقي.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
                <Checkbox
                  id="create-categories"
                  checked={createCategories}
                  onCheckedChange={(v) => setCreateCategories(Boolean(v))}
                />
                <div>
                  <Label htmlFor="create-categories" className="text-[13px]">
                    إنشاء تصنيفات غير موجودة تلقائياً
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    عند تفعيل هذا الخيار، يُنشأ تصنيف جديد باسم التصنيف إذا لم يكن موجوداً في متجرك.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border p-2.5 text-center">
                  <p className="text-[15px] font-semibold">{limits.max_rows.toLocaleString('ar-EG')}</p>
                  <p className="text-[11px] text-muted-foreground">أقصى عدد صفوف</p>
                </div>
                <div className="rounded-lg border border-border p-2.5 text-center">
                  <p className="text-[15px] font-semibold">{limits.max_mb.toLocaleString('ar-EG')} MB</p>
                  <p className="text-[11px] text-muted-foreground">أقصى حجم ملف</p>
                </div>
                <div className="rounded-lg border border-border p-2.5 text-center">
                  <p className="text-[15px] font-semibold">CSV / XLSX</p>
                  <p className="text-[11px] text-muted-foreground">الصيغ المدعومة</p>
                </div>
              </div>

              <Button className="w-full" disabled={!file || busy} onClick={() => void runPreview()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="rtl-flip h-4 w-4" />}
                متابعة إلى مطابقة الأعمدة
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                يتم رؤية البيانات مسبقاً ولا تُنشأ أي منتجات قبل تأكيدك.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-[15px]">مطابقة أعمدة الملف</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {mappingEntries.length} عمود — حددنا تلقائياً {activeCount} عموداً. عدّل الأعمدة المتبقية أو أبقِها "بدون
                استيراد".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                رجوع
              </Button>
              <Button size="sm" onClick={() => void runPreview()} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                )}
                المعاينة والمراجعة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {openMappingErrors.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <ul className="space-y-1">
                  {openMappingErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              {mappingEntries.map(({ header, field, index }) => (
                <div
                  key={`${header}-${index}`}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/10 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium" title={header}>
                      {header || `عمود ${index + 1}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">عمود رقم {index + 1}</p>
                  </div>
                  <Select value={field} onValueChange={(v) => setFieldForHeader(header, v)}>
                    <SelectTrigger className="w-[210px]">
                      <SelectValue placeholder="بدون استيراد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_FIELD}>بدون استيراد</SelectItem>
                      {FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} disabled={mappedField(opt.value) && field !== opt.value}>
                          {opt.label}
                          {opt.required ? ' (مطلوب)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                الأعمدة المحددة: {activeCount} — أعمدة متكررة معطّلة تلقائياً.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  رجوع
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void runPreview()}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronLeft className="rtl-flip h-4 w-4" />
                  )}
                  المعاينة والمراجعة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">مراجعة البيانات قبل الاستيراد</CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              لم يتم إنشاء أو تعديل أي منتج بعد — اعتمد البيانات التالية للرجوع أو التأكيد.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-semibold">{summary.total}</p>
                <p className="text-[11px] text-muted-foreground">إجمالي الصفوف</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-emerald-700">{summary.valid}</p>
                <p className="text-[11px] text-emerald-600">سليم</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-amber-700">
                  {summary.warnings + (summary.warnings_list?.length ? (summary.warnings_list.length - summary.warnings) : 0)}
                </p>
                <p className="text-[11px] text-amber-600">تحذيرات</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-red-700">{errors.length}</p>
                <p className="text-[11px] text-red-600">صفوف بها أخطاء</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border p-3 text-center sm:col-span-1">
                <p className="text-lg font-semibold">{summary.estimated_products}</p>
                <p className="text-[11px] text-muted-foreground">منتجات متوقعة</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{STRATEGY_LABELS[summary.strategy] || summary.strategy}</Badge>
              {createCategories && <Badge variant="secondary">إنشاء التصنيفات تلقائياً</Badge>}
              {summary.duplicates.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.duplicates.length} كود SKU مكرر داخل الملف
                </Badge>
              )}
            </div>

            {errors.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-red-700">
                  <XCircle className="h-4 w-4" />
                  أخطاء في {errors.length} صف — لن يتم استيرادها
                </h3>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">الصف</TableHead>
                        <TableHead>السبب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 50).map((r) => (
                        <TableRow key={r.row}>
                          <TableCell className="font-medium">{r.row}</TableCell>
                          <TableCell>
                            <ul className="space-y-0.5 text-[13px]">
                              {r.errors.map((e, i) => (
                                <li key={i}>{e.reason}</li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {errors.length > 50 && (
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      ... و {errors.length - 50} صفوف أخرى مرفقة في تقرير التنزيل.
                    </p>
                  )}
                </div>
              </div>
            )}

            {summary.warnings_list.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  تحذيرات (تُستورد مع تنبيه)
                </h3>
                <ul className="space-y-1 rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-[13px] text-amber-800">
                  {summary.warnings_list.slice(0, 10).map((w, i) => (
                    <li key={i}>
                      الصف {w.row}: {w.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errors.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrors}>
                <Download className="h-4 w-4" />
                تحميل تقرير الأخطاء CSV
              </Button>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep('mapping')} disabled={busy}>
                <ArrowLeft className="h-4 w-4" />
                تعديل المطابقة
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetWizard} disabled={busy}>
                  إعادة من البداية
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void runConfirm()}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  تأكيد الاستيراد ({summary.valid} صف)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'result' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">نتيجة الاستيراد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.status === 'completed' || result.status === 'completed_with_errors' ? (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-[15px] font-semibold">{result.message}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <p>{result.message || 'فشل الاستيراد'}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-emerald-700">{result.created}</p>
                <p className="text-[11px] text-emerald-600">منتجات جديدة</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-blue-700">{result.updated}</p>
                <p className="text-[11px] text-blue-600">منتجات محدَّثة</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-center">
                <p className="text-lg font-semibold text-red-700">{result.failed}</p>
                <p className="text-[11px] text-red-600">صفوف فشلت</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {result.failed > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrors}>
                  <Download className="h-4 w-4" />
                  تحميل تقرير الأخطاء CSV
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={resetWizard}>
                استيراد دفعة أخرى
              </Button>
              <Button size="sm" onClick={backToProducts}>
                <ArrowLeft className="h-4 w-4" />
                العودة إلى المنتجات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <History className="h-4 w-4 text-muted-foreground" />
            آخر عمليات الاستيراد
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد عمليات استيراد بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الملف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-end">جديد</TableHead>
                    <TableHead className="text-end">محدَّث</TableHead>
                    <TableHead className="text-end">فشل</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="max-w-[180px]">
                        <p className="truncate font-medium" title={h.original_filename}>
                          {h.original_filename}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.strategy === 'update_by_sku' ? 'إضافة وتحديث' : 'إضافة فقط'} · {h.total_rows} صف
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            h.status === 'completed'
                              ? 'success'
                              : h.status === 'completed_with_errors'
                                ? 'outline'
                                : h.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                          }
                          className={
                            h.status === 'completed_with_errors'
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : undefined
                          }
                        >
                          {STATUS_LABELS[h.status] || h.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end font-medium">{h.created_count}</TableCell>
                      <TableCell className="text-end font-medium">{h.updated_count}</TableCell>
                      <TableCell className="text-end font-medium">{h.failed_count}</TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground">
                        {h.completed_at ? h.completed_at : h.created_at}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}