import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';

export interface CustomerAddressDTO {
  id: number|string;
  type: 'billing'|'shipping';
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  formatted?: string;
}

export function useCustomerAddresses() {
  const { store } = useStore() as any;
  const storeId = store?.id;
  const [addresses, setAddresses] = useState<CustomerAddressDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/customer-addresses?store_id=${storeId}`, { headers: { Accept:'application/json', 'X-CSRF-TOKEN': csrf() } });
      if (res.status === 401) { setAddresses([]); return; }
      if (!res.ok) throw new Error('load failed');
      const json = await res.json();
      setAddresses(Array.isArray(json.addresses) ? json.addresses : []);
    } catch (e:any) { setError('تعذر تحميل العناوين'); } finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: Omit<CustomerAddressDTO,'id'|'formatted'> & {is_default?:boolean}) => {
    const res = await fetch('/api/customer-addresses', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN': csrf()}, body: JSON.stringify({ store_id: storeId, ...data }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل الإنشاء');
    await refresh();
    return json.address;
  };
  const update = async (id:number|string, data:Partial<CustomerAddressDTO>) => {
    const res = await fetch(`/api/customer-addresses/${id}`, { method:'PUT', headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN': csrf()}, body: JSON.stringify({ store_id: storeId, ...data }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'فشل التحديث');
    await refresh();
    return json.address;
  };
  const remove = async (id:number|string) => {
    const res = await fetch(`/api/customer-addresses/${id}?store_id=${storeId}`, { method:'DELETE', headers:{ Accept:'application/json','X-CSRF-TOKEN': csrf()} });
    if (!res.ok) throw new Error('فشل الحذف');
    await refresh();
  };
  const setDefault = async (id:number|string) => {
    const res = await fetch(`/api/customer-addresses/${id}/default`, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN': csrf()}, body: JSON.stringify({ store_id: storeId }) });
    if (!res.ok) throw new Error('فشل التحديد');
    await refresh();
  };

  return { addresses, loading, error, refresh, create, update, remove, setDefault };
}
