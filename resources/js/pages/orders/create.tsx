import React, { useMemo, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, useForm } from '@inertiajs/react';

interface CustomerOption { id: number; name: string; email: string }
interface VariantOption { id: string; uuid: string; label: string; price: number; sku: string; stock: number }
interface ProductOption {
  id: number; name: string; sku: string; price: number; is_tax_included: boolean;
  stock: number; has_variants: boolean; variant_combinations: VariantOption[];
}
interface ShippingOption { id: number; name: string; type: string; cost: number; handling_fee: number }
interface PaymentOption { value: string; label: string }

interface CreateOrderPageProps {
  customers: CustomerOption[];
  products: ProductOption[];
  shippingMethods: ShippingOption[];
  paymentMethods: PaymentOption[];
  currency: string;
}

interface OrderLine { product_id: string; variant_id: string; quantity: number }

export default function CreateOrder(props: CreateOrderPageProps) {
  const { t } = useTranslation();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  const { data, setData, errors, processing } = useForm({
    idempotency_key: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `manual-${Date.now()}`,
    customer_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    items: [{ product_id: '', variant_id: '', quantity: 1 }] as OrderLine[],
    shipping_method_id: '',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: '',
    payment_method: 'cod',
    notes: '',
  });

  const setItem = (index: number, patch: Partial<OrderLine>) => {
    setData('items', data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setData('items', [...data.items, { product_id: '', variant_id: '', quantity: 1 }]);
  const removeItem = (index: number) =>
    setData('items', data.items.length > 1 ? data.items.filter((_, i) => i !== index) : data.items);

  const unitPrice = (line: OrderLine): number => {
    const product = props.products.find((p) => p.id === Number(line.product_id));
    if (!product) return 0;
    if (product.has_variants && line.variant_id) {
      const combo = product.variant_combinations.find((v) => v.id === line.variant_id || v.uuid === line.variant_id);
      if (combo && combo.price) return combo.price;
    }
    return product.price;
  };

  const lineTotal = (line: OrderLine) => unitPrice(line) * line.quantity;

  const subtotal = useMemo(
    () => data.items.reduce((sum, line) => sum + (Number(line.product_id) ? lineTotal(line) : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.items, props.products]
  );

  const shippingPreview = useMemo(() => {
    const method = props.shippingMethods.find((m) => m.id === Number(data.shipping_method_id));
    if (!method) return 0;
    if (method.type === 'free_shipping' || method.type === 'free') return 0;
    if (method.type === 'percentage_based' || method.type === 'percentage') {
      return subtotal * method.cost / 100 + method.handling_fee;
    }
    return method.cost + method.handling_fee;
  }, [data.shipping_method_id, subtotal, props.shippingMethods]);

  const totalPreview = subtotal + shippingPreview;

  const submit = () => {
    const payload = {
      ...data,
      customer_id: customerMode === 'new' ? '' : data.customer_id,
      items: data.items.map((line) => ({ ...line, product_id: Number(line.product_id) })),
    };
    router.post(route('orders.store'), payload, { preserveScroll: false });
  };

  const pageActions = [
    {
      label: t('Create Order'),
      icon: processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      disabled: processing,
      onClick: () => submit(),
    },
  ];

  const serverError = Object.values(errors)[0] ?? null;

  return (
    <PageTemplate
      title={t('Create Order')}
      url="/orders/create"
      actions={pageActions}
      backUrl={route('orders.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Order Management'), href: route('orders.index') },
        { title: t('Create') },
      ]}
    >
      <div className="space-y-6">
        {serverError && (
          <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {String(serverError)}
          </div>
        )}

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <TabsTrigger value="customer">{t('Customer')}</TabsTrigger>
            <TabsTrigger value="items">{t('Items')}</TabsTrigger>
            <TabsTrigger value="shipping">{t('Shipping')}</TabsTrigger>
            <TabsTrigger value="payment">{t('Payment')}</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Customer Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={customerMode} onValueChange={(v) => setCustomerMode(v as 'existing' | 'new')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Choose existing customer or create new')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">{t('Existing Customer')}</SelectItem>
                    <SelectItem value="new">{t('+ New Customer (no CRM save)')}</SelectItem>
                  </SelectContent>
                </Select>

                {customerMode === 'existing' ? (
                  <Select
                    value={data.customer_id}
                    onValueChange={(v) => {
                      const c = props.customers.find((x) => x.id === Number(v));
                      const parts = (c?.name ?? '').split(' ');
                      setData({
                        customer_id: v,
                        first_name: parts.shift() ?? '',
                        last_name: parts.join(' '),
                        email: c?.email ?? '',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select customer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.email ? ` - ${c.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t('First Name')}</Label>
                    <Input id="first_name" value={data.first_name}
                      onChange={(e) => setData('first_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t('Last Name')}</Label>
                    <Input id="last_name" value={data.last_name}
                      onChange={(e) => setData('last_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('Email Address')}</Label>
                    <Input id="email" type="email" value={data.email}
                      onChange={(e) => setData('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('Phone Number')}</Label>
                    <Input id="phone" dir="ltr" value={data.phone}
                      onChange={(e) => setData('phone', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Order Items')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 me-2" />
                    {t('Add Item')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.items.map((item, index) => {
                  const product = props.products.find((p) => p.id === Number(item.product_id));
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{t('Item {{number}}', { number: index + 1 })}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                        <div className="sm:col-span-5 space-y-2">
                          <Label>{t('Product')}</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(v) => setItem(index, { product_id: v, variant_id: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('Select product')} />
                            </SelectTrigger>
                            <SelectContent>
                              {props.products.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name} - {p.price.toFixed(2)} {props.currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {product?.has_variants ? (
                          <div className="sm:col-span-3 space-y-2">
                            <Label>{t('Variant')}</Label>
                            <Select
                              value={item.variant_id}
                              onValueChange={(v) => setItem(index, { variant_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('Select variant')} />
                              </SelectTrigger>
                              <SelectContent>
                                {product.variant_combinations.map((v) => (
                                  <SelectItem key={`${v.id}-${v.uuid}`} value={v.uuid || v.id}>
                                    {v.label} - {v.price.toFixed(2)} {props.currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        <div className="sm:col-span-2 space-y-2">
                          <Label>{t('Quantity')}</Label>
                          <Input
                            type="number" min="1"
                            value={item.quantity}
                            onChange={(e) => setItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label>{t('Unit Price')}</Label>
                          <Input type="text" readOnly value={`${unitPrice(item).toFixed(2)} ${props.currency}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Shipping Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_method">{t('Shipping Method')}</Label>
                  <Select
                    value={data.shipping_method_id}
                    onValueChange={(v) => setData('shipping_method_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select shipping method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.shippingMethods.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_address">{t('Shipping Address')}</Label>
                  <Textarea id="shipping_address" rows={3} value={data.shipping_address}
                    onChange={(e) => setData('shipping_address', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_city">{t('City')}</Label>
                    <Input id="shipping_city" value={data.shipping_city}
                      onChange={(e) => setData('shipping_city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_postal">{t('Postal Code')}</Label>
                    <Input id="shipping_postal" dir="ltr" value={data.shipping_postal_code}
                      onChange={(e) => setData('shipping_postal_code', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_state">{t('State')}</Label>
                    <Input id="shipping_state" value={data.shipping_state}
                      onChange={(e) => setData('shipping_state', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_country">{t('Country')}</Label>
                    <Input id="shipping_country" value={data.shipping_country}
                      onChange={(e) => setData('shipping_country', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Payment Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">{t('Payment Method')}</Label>
                  <Select
                    value={data.payment_method}
                    onValueChange={(v) => setData('payment_method', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select payment method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {props.paymentMethods.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>
                          {pm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('Order Notes')}</Label>
                  <Textarea id="notes" value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)} />
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>{t('Subtotal')}</span>
                    <span dir="ltr">{subtotal.toFixed(2)} {props.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Shipping')}</span>
                    <span dir="ltr">{shippingPreview.toFixed(2)} {props.currency}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                    <span>{t('Total (computed by the server)')}</span>
                    <span dir="ltr">{totalPreview.toFixed(2)} {props.currency}</span>
                  </div>
                </div>
                <Button type="button" disabled={processing || subtotal <= 0} onClick={submit}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                  {t('Create Order')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTemplate>
  );
}