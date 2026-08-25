import React, { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';

/**
 * Fallback page for /stores/{store}/shipping
 * Ensures direct access never 404s — redirects to settings?tab=shipping
 * Uses store context via usePage props / route params.
 */
export default function StoreShipping() {
  const { store } = usePage<any>().props as any;
  const storeId = store?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : null);

  useEffect(() => {
    router.visit(route('shipping.index'), { replace: true });
  }, [storeId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">جاري تحويلك إلى إعدادات الشحن...</p>
        <p className="text-xs text-muted-foreground">Redirecting to shipping settings</p>
      </div>
    </div>
  );
}
