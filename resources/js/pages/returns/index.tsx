import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';

export default function ReturnsIndex() {
  const { returns, filters } = usePage().props as any;
  const list = returns?.data ?? [];
  return (
    <PageTemplate title="المرتجعات" url="/returns" breadcrumbs={[{title:'الطلبات', href: route('orders.index')},{title:'المرتجعات'}]}>
      <Card>
        <CardHeader><CardTitle>طلبات الإرجاع ({returns?.total ?? list.length})</CardTitle></CardHeader>
        <CardContent>
          {list.length===0 ? <p className="text-sm text-muted-foreground py-8 text-center">لا توجد طلبات إرجاع</p> : (
            <div className="space-y-3">
              {list.map((r:any)=>(
                <div key={r.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{r.return_number} — {r.order?.order_number ?? r.order_id}</p>
                    <p className="text-xs text-muted-foreground">{r.reason ?? ''} • {r.created_at ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{r.status}</Badge>
                    <Badge variant="outline">{r.refund_status}</Badge>
                    <Button size="sm" variant="outline" onClick={()=>router.visit(route('returns.show', r.id))}>عرض</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
