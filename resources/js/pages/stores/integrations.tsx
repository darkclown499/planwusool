import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plug, Webhook, Boxes, Calculator, ArrowRight } from 'lucide-react';

interface Props {
  store: { id: number; name: string; slug: string };
}

export default function StoreIntegrations({ store }: Props) {
  return (
    <PageTemplate
      title="التكاملات"
      description="اربط متجرك بأنظمة المحاسبة والمخزون والخدمات الخارجية"
      url={`/stores/${store.id}/integrations`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'التكاملات' },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition">
            <CardHeader className="pb-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Boxes className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-base">Odoo</CardTitle>
              <CardDescription>نظام ERP مفتوح المصدر — مزامنة المنتجات والكميات والطلبات.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <a href={`/stores/${store.id}/integrations/erp`}>
                  <Plug className="h-4 w-4 me-1.5" />
                  إعداد Odoo
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition">
            <CardHeader className="pb-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Calculator className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-base">الشامل</CardTitle>
              <CardDescription>برنامج المحاسبة والمخزون المحلي عبر Webhook و Sync Agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a href={`/stores/${store.id}/integrations/erp`}>
                  <Plug className="h-4 w-4 me-1.5" />
                  إعداد الشامل
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition">
            <CardHeader className="pb-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Webhook className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-base">Webhook / JSON API</CardTitle>
              <CardDescription>أي نظام مخصص يتحدث JSON — ادفع المنتجات والمخزون عبر API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a href={`/stores/${store.id}/integrations/erp`}>
                  <Plug className="h-4 w-4 me-1.5" />
                  إعداد Webhook
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-800">كل التكاملات في مكان واحد</p>
              <p className="text-sm text-slate-500 mt-1">لا تبحث عن ERP داخل تبويب الميزات أو إعدادات المتجر — كل الربط هنا.</p>
            </div>
            <Button asChild>
              <a href={`/stores/${store.id}/integrations/erp`} className="gap-1.5">
                فتح لوحة التكاملات
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
