import { useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';

export function useServerSearch(query: string, limit = 8) {
  const { store } = useStore() as any;
  const storeId = store?.id;
  const [results, setResults] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    const q = query.trim().slice(0,100);
    if (q.length < 2 || !storeId) { setResults(null); setLoading(false); setError(null); return; }
    let cancelled=false;
    setLoading(true); setError(null);
    const ctrl = new AbortController();
    const t = setTimeout(async()=>{
      try{
        const url=`/api/storefront/search?q=${encodeURIComponent(q)}&store_id=${encodeURIComponent(String(storeId))}&limit=${limit}`;
        const res = await fetch(url, { headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}, signal: ctrl.signal });
        if(!res.ok) throw new Error(`search ${res.status}`);
        const json:any = await res.json();
        if(!cancelled) setResults(Array.isArray(json.products)? json.products:[]);
      }catch(e:any){ if(e?.name==='AbortError') return; if(!cancelled){ setError('تعذر البحث'); setResults([]);} } finally{ if(!cancelled) setLoading(false); }
    }, 320);
    return()=>{ cancelled=true; ctrl.abort(); clearTimeout(t); };
  }, [query, storeId, limit]);

  return { results, loading, error };
}
