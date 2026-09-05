import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import { tPaymentMethod } from '@/utils/order-status';
import { formatCurrency } from '@/utils/currency-helper';
import { toast } from 'sonner';

interface EditOrderProps {
  order: {
    id: number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    customer: { id: number; name: string; email: string; phone: string; };
    shippingAddress: { address: string; city: string; state: string; postalCode: string; country: string; };
    items: Array<{ id: number; productId: number; name: string; quantity: number; price: number; variants?: any; }>;
    summary: { subtotal: number; shipping: number; tax: number; total: number; discount?: number; };
    shippingMethodId: number;
    trackingNumber?: string;
    notes?: string;
  };
  customers: Array<{ id: number; name: string; email: string; }>;
  products: Array<{ id: number; name: string; price: number; variants: Array<{ name: string; values: string[] }>; }>;
  shippingMethods: Array<{ id: number; name: string; cost: number; }>;
}

export default function EditOrder({ order, customers, products, shippingMethods }: EditOrderProps) {
  const safeOrder: any = order ?? ({} as any);
  const initialItems = ((safeOrder as any).items ?? []).map((item: any) => ({ ...item, variants: item.variants || {} }));
  const [orderItems, setOrderItems] = useState(initialItems);
  const [customerName, setCustomerName] = useState((safeOrder as any)?.customer?.name?.toString() ?? '');
  const [customerEmail, setCustomerEmail] = useState((safeOrder as any)?.customer?.email?.toString() ?? '');
  const [customerPhone, setCustomerPhone] = useState((safeOrder as any)?.customer?.phone?.toString() ?? '');
  const [shippingAddress, setShippingAddress] = useState((safeOrder as any)?.shippingAddress?.address?.toString() ?? '');
  const [shippingCity, setShippingCity] = useState((safeOrder as any)?.shippingAddress?.city?.toString() ?? '');
  const [shippingPostal, setShippingPostal] = useState((safeOrder as any)?.shippingAddress?.postalCode?.toString() ?? '');
  const [shippingMethodId, setShippingMethodId] = useState((safeOrder as any)?.shippingMethodId?.toString() ?? '');
  const [formData, setFormData] = useState({
    tracking_number: (safeOrder as any)?.trackingNumber?.toString() ?? (safeOrder as any)?.tracking_number?.toString() ?? '',
    notes: (safeOrder as any)?.notes?.toString() ?? '',
    items: initialItems,
  });
  const [saving, setSaving] = useState(false);
  const sumQty = orderItems.reduce((a:any,c:any)=>a+Number(c.quantity||0),0);

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    if (orderItems.length===0) { toast.error('يجب أن يحتوي الطلب على منتج واحد على الأقل'); setSaving(false); return; }
    for (const it of orderItems) {
      if (!it.productId || it.productId===0) { toast.error('اختر المنتج لكل بند'); setSaving(false); return; }
      if (Number(it.quantity) <1) { toast.error('الكمية يجب أن تكون 1 على الأقل'); setSaving(false); return; }
    }
    const parts = customerName.trim().split(' ');
    const first = parts.shift() || customerName.trim();
    const last = parts.join(' ') || ' ';
    router.put(route('orders.update', order.id), {
      customer_first_name: first,
      customer_last_name: last || '—',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_postal_code: shippingPostal,
      shipping_method_id: shippingMethodId ? parseInt(shippingMethodId) : null,
      tracking_number: formData.tracking_number,
      notes: formData.notes,
      items: orderItems.map((it:any)=>({ id: it.id, variants: it.variants })),
    }, {
      onSuccess: ()=> toast.success('تم حفظ التعديلات'),
      onError: (errors:any)=>{
        const first = Object.values(errors)[0] as any;
        toast.error(Array.isArray(first)? first[0] : (first || 'تعذر الحفظ — تحقق من البيانات'));
      },
      onFinish: ()=> setSaving(false),
    });
  };

  const addOrderItem = () => {
    const n = [...orderItems, { id: Date.now(), productId: 0, name: '', quantity: 1, price: 0, variants: {} }];
    setOrderItems(n);
    setFormData(prev => ({ ...prev, items: n }));
  };
  const removeOrderItem = (index: number) => {
    const n = orderItems.filter((_:any, i:number) => i !== index);
    setOrderItems(n); setFormData(prev => ({ ...prev, items: n }));
  };

  const summary = safeOrder?.summary ?? { subtotal:0, shipping:0, tax:0, total:0, discount:0 };

  return (
    <PageTemplate
      title={'تعديل الطلب ' + order.orderNumber}
      url="/orders/edit"
      backUrl={route('orders.show', order.id)}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'الطلبات', href: route('orders.index') },
        { title: order.orderNumber, href: route('orders.show', order.id) },
        { title: 'تعديل' }
      ]}
    >
      <div className="space-y-4" dir="rtl">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex gap-3 items-start">
          <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <p className="font-bold text-emerald-900">تصحيح بيانات الطلب</p>
            <p className="text-emerald-800">سيتم إعادة احتساب الأسعار والخصومات والضريبة والشحن تلقائياً عند حفظ التعديلات. حالة التنفيذ تُدار من صفحة تفاصيل الطلب عبر الإجراء الرئيسي.</p>
          </div>
        </div>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
            <TabsTrigger value="customer" className="text-xs sm:text-sm py-2">العميل</TabsTrigger>
            <TabsTrigger value="items" className="text-xs sm:text-sm py-2">المنتجات</TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm py-2">الشحن</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">بيانات العميل</CardTitle>
                <CardDescription>يمكن تعديل اسم العميل وطرق التواصل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>اسم العميل</Label>
                    <Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="الاسم الكامل" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="example@mail.com" dir="ltr" className="text-left" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>رقم الهاتف / واتساب</Label>
                    <Input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+970..." dir="ltr" className="text-left" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ملاحظات الطلب</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="ملاحظات داخلية..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">المنتجات والكميات</CardTitle>
                    <CardDescription>عدّل المنتجات والكميات — الأسعار تُحتسب من الخادم</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem} className="shrink-0">
                    <Plus className="h-4 w-4 me-1" /> إضافة منتج
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length===0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد بنود — أضف منتجاً</p>}
                {orderItems.map((item:any, index:number) => (
                  <div key={index} className="border rounded-xl p-3 sm:p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">بند {index + 1}</h4>
                      {orderItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(index)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs">المنتج</Label>
                        <Select
                          value={item.productId ? item.productId.toString() : ''}
                          onValueChange={(value) => {
                            const newItems = [...orderItems];
                            newItems[index].productId = parseInt(value);
                            const prod = products.find(p=>p.id===parseInt(value));
                            newItems[index].name = prod?.name || '';
                            newItems[index].price = prod?.price || 0;
                            newItems[index].variants = {};
                            setOrderItems(newItems);
                            setFormData(prev => ({ ...prev, items: newItems }));
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                          <SelectContent>
                            {(products ?? []).map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>{product.name} — {formatCurrency(Number(product.price))}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.productId > 0 && (products.find(p => p.id === item.productId)?.variants?.length ?? 0) > 0 && (
                          <div className="mt-2 space-y-2">
                            {products.find(p => p.id === item.productId)?.variants?.map((variant: any, vIndex:number) => (
                              <div key={vIndex}>
                                <Label className="text-xs">{variant.name}</Label>
                                <Select onValueChange={(value) => {
                                  const newItems = [...orderItems];
                                  if (!newItems[index].variants) newItems[index].variants = {};
                                  newItems[index].variants[variant.name] = value;
                                  setOrderItems(newItems);
                                  setFormData(prev => ({ ...prev, items: newItems }));
                                }} value={item.variants?.[variant.name] || ''}>
                                  <SelectTrigger className="h-8"><SelectValue placeholder={`اختر ${variant.name}`} /></SelectTrigger>
                                  <SelectContent>
                                    {variant.values?.map((value: string, valueIndex: number) => (
                                      <SelectItem key={valueIndex} value={value}>{value}</SelectItem>
                                    )) || []}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">الكمية</Label>
                        <Input type="number" min={1} value={item.quantity} onChange={e=>{
                          const v = Math.max(1, parseInt(e.target.value)||1);
                          const n=[...orderItems]; n[index].quantity=v; setOrderItems(n); setFormData(p=>({...p, items:n}));
                        }} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">سعر الوحدة والإجمالي يُحتسبان تلقائياً عند الحفظ</p>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">إجمالي الكمية: <span className="font-bold text-slate-900">{sumQty}</span></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">التوصيل</CardTitle>
                <CardDescription>طريقة التوصيل والعنوان ورقم التتبع — حالة الطلب تُدار من صفحة التفاصيل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>طريقة التوصيل</Label>
                    <Select value={shippingMethodId} onValueChange={setShippingMethodId}>
                      <SelectTrigger><SelectValue placeholder="اختر طريقة التوصيل" /></SelectTrigger>
                      <SelectContent>
                        {(shippingMethods ?? []).map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>{method.name} — {formatCurrency(Number(method.cost))}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>رقم التتبع</Label>
                    <Input value={formData.tracking_number} onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))} placeholder="اختياري" dir="ltr" className="text-left" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>عنوان الشحن</Label>
                  <Textarea value={shippingAddress} onChange={e=>setShippingAddress(e.target.value)} rows={2} placeholder="الشارع، المنطقة..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>المدينة</Label>
                    <Input value={shippingCity} onChange={e=>setShippingCity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الرمز البريدي</Label>
                    <Input value={shippingPostal} onChange={e=>setShippingPostal(e.target.value)} dir="ltr" className="text-left" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>طريقة الدفع</Label>
                    <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm">
                      {tPaymentMethod(String(safeOrder?.paymentMethod ?? '')) || '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">طريقة الدفع لا تُعدل من هنا — تُدار حسب نوع الدفع (بوابة / عند الاستلام)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>حالة الطلب الحالية</Label>
                    <div className="h-9 flex items-center px-3 border rounded-md bg-slate-50 text-sm font-bold">
                      {String(safeOrder?.status ?? '—')}
                    </div>
                    <p className="text-xs text-muted-foreground">لتغيير حالة التنفيذ استخدم الإجراء الرئيسي في صفحة تفاصيل الطلب</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
                  <p className="text-sm font-bold">ملخص مالي <Badge variant="secondary" className="ms-2 text-xs">للقراءة فقط</Badge></p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1.5"><Label className="text-xs">المجموع الفرعي</Label><Input value={formatCurrency(Number(summary.subtotal)||0)} disabled className="bg-white" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">الخصم</Label><Input value={formatCurrency(Number(summary.discount)||0)} disabled className="bg-white" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">الضريبة</Label><Input value={formatCurrency(Number(summary.tax)||0)} disabled className="bg-white" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">الشحن</Label><Input value={formatCurrency(Number(summary.shipping)||0)} disabled className="bg-white" /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">الإجمالي النهائي</Label><Input value={formatCurrency(Number(summary.total)||0)} disabled className="bg-white font-black text-base h-10" /></div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> يُعاد حساب هذه القيم تلقائياً على الخادم بعد حفظ المنتجات والشحن.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 sticky bottom-0 bg-white/95 backdrop-blur border-t -mx-6 px-6 py-3 sm:static sm:bg-transparent sm:border-0 sm:p-0">
          <Button variant="outline" onClick={()=>router.visit(route('orders.show', order.id))} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px] font-bold">
            {saving ? 'جارٍ الحفظ...' : <><Save className="h-4 w-4 me-2"/> حفظ التعديلات</>}
          </Button>
        </div>
      </div>
    </PageTemplate>
  );
}
