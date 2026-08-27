import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { ProductContext, useProduct } from '@/contexts/ProductContext';
import { requireTemplateModule } from '@/templates-v2/registry';
import { V2PreviewProviders, buildV2PreviewStoreData } from '@/templates-v2/shared/preview';
import type { TemplateModule } from '@/templates-v2/types';

interface Props {
  store: any;
  templateSlug: string;
  storeBranding?: Record<string, any>;
}

/**
 * Preview-only overlay host.
 *
 * The real storefront wraps the template with TemplateStorefrontV2, which
 * renders its bespoke product-detail overlay when the context flags it. The
 * standalone preview mounts <tpl.Root> bare, so clicking a demo product used
 * to fire a doomed /product/{id} fetch against the main domain (404 noise)
 * while nothing appeared. Here we override the product context with local
 * modal state — no fetching, demo products are not real catalog rows — and
 * render the template's own detail overlay on top.
 */
function PreviewProductLayer({ module, children }: { module: TemplateModule; children: React.ReactNode }) {
  const ctx = useProduct();
  const [selected, setSelected] = useState<any>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const close = () => {
    setSelected(null);
    setImgIndex(0);
  };

  const value: ReturnType<typeof useProduct> = {
    ...ctx,
    selectedProduct: selected,
    selectedImageIndex: imgIndex,
    showProductDetail: !!selected,
    handleProductClick: (p: any) => {
      setSelected(p);
      setImgIndex(0);
    },
    handleCloseProductDetail: close,
    handleImageSelect: setImgIndex,
  };

  const DetailModal = module.overlays?.product_detail;

  return (
    <ProductContext.Provider value={value}>
      {children}
      {selected && DetailModal && (
        <DetailModal
          product={selected}
          selectedImageIndex={imgIndex}
          onClose={close}
          onImageSelect={setImgIndex}
        />
      )}
    </ProductContext.Provider>
  );
}

/**
 * Standalone full-page template preview (v2). Renders the merchant's own
 * branding wearing the resolved template module with sector-authentic demo
 * content — "your store, already running" — in its own browser tab.
 */
export default function TemplatePreview({ store, templateSlug, storeBranding }: Props) {
  const [applying, setApplying] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>(store.theme || '');

  const tpl = useMemo(() => requireTemplateModule(templateSlug), [templateSlug]);
  const isActive = activeTheme === tpl.meta.slug;

  const storeData = useMemo(
    () => buildV2PreviewStoreData(tpl, store, storeBranding),
    [tpl, store, storeBranding]
  );

  const applyTheme = async () => {
    setApplying(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, {
        theme: tpl.meta.slug,
      });
      setActiveTheme(tpl.meta.slug);
      toast.success('تم تطبيق القالب بنجاح', {
        description: `قالب «${tpl.meta.name}» أصبح نشطاً على متجرك.`,
        action: {
          label: 'فتح تخصيص التصميم',
          onClick: () => window.open(`/stores/${store.id}/designer`, '_blank', 'noopener'),
        },
      });
    } catch (e) {
      console.error('Apply theme failed', e);
      toast.error('تعذر تطبيق القالب. حاول مرة أخرى.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div dir="rtl">
      <Head title={`معاينة قالب ${tpl.meta.name}`} />

      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/5"
            style={{ background: tpl.meta.preview }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-gray-900">
              معاينة حية — قالب «{tpl.meta.name}»
            </p>
            <p className="text-[11px] text-gray-400">
              تخصص: {tpl.meta.sector} · محتوى تجريبي لأغراض الاستعراض
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              القالب النشط
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={applying}
              onClick={applyTheme}
              style={{ backgroundColor: tpl.meta.accent }}
              className="gap-1.5 text-white hover:opacity-90"
            >
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              تطبيق على متجري
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => window.close()}>
            إغلاق المعاينة
          </Button>
        </div>
      </div>

      {/* The template itself, wearing the merchant's brand + demo catalog */}
      <V2PreviewProviders storeData={storeData}>
        <PreviewProductLayer module={tpl}>
          <tpl.Root storeData={storeData} mode="home" isPreview />
        </PreviewProductLayer>
      </V2PreviewProviders>
    </div>
  );
}
