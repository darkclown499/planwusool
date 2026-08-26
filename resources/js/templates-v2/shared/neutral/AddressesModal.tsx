import { useCustomerAddresses } from '@/hooks/useCustomerAddresses';
import { toast } from '@/components/custom-toast';
import { Loader2, MapPin, Plus, Star, Trash2, X, Edit3 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const primary = 'var(--twc-primary-600, #059669)';

export const TemplateAddressesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addresses, loading, error, create, update, remove, setDefault } = useCustomerAddresses();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type:'shipping' as 'shipping'|'billing', address:'', city:'', state:'', postal_code:'', country:'', is_default:false });

  useEffect(()=>{ document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow='unset'; }},[]);

  const openAdd = () => { setEditing(null); setForm({ type:'shipping', address:'', city:'', state:'', postal_code:'', country:'', is_default: addresses.length===0 }); setFormOpen(true); };
  const openEdit = (a:any) => { setEditing(a); setForm({ type:a.type, address:a.address, city:a.city, state:a.state||'', postal_code:a.postal_code||'', country:a.country, is_default: !!a.is_default }); setFormOpen(true); };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!form.address.trim()||!form.city.trim()||!form.country.trim()) { toast.error('العنوان والمدينة والدولة مطلوبة'); return; }
    setSubmitting(true);
    try {
      if (editing) await update(editing.id, form);
      else await create(form as any);
      toast.success(editing ? 'تم تحديث العنوان' : 'تم إضافة العنوان');
      setFormOpen(false);
    } catch (err:any) { toast.error(err.message||'حدث خطأ'); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
        <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between border-b p-4" style={{borderColor:'var(--twc-border,#e5e7eb)'}}>
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{background:primary}}><MapPin className="h-5 w-5"/></div><h2 className="text-lg font-bold" style={{color:'var(--twc-text-primary,#111827)'}}>عناويني</h2></div>
            <button onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"><X className="h-5 w-5"/></button>
          </div>

          {!formOpen ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" style={{color:primary}}/></div>
              : error ? <p className="py-10 text-center text-sm text-red-600">{error}</p>
              : addresses.length===0 ? (
                <div className="py-10 text-center">
                  <p className="font-semibold" style={{color:'var(--twc-text-primary,#111827)'}}>لا توجد عناوين محفوظة</p>
                  <p className="mt-1 text-sm" style={{color:'var(--twc-text-muted,#6b7280)'}}>أضف عنوانك لتسريع إتمام الطلبات القادمة</p>
                  <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{background:primary}}><Plus className="h-4 w-4"/> إضافة عنوان</button>
                </div>
              ) : (
                <>
                  {addresses.map((a:any)=>(
                    <div key={a.id} className="rounded-2xl border p-4" style={{borderColor: a.is_default ? primary : 'var(--twc-border,#e5e7eb)', background: a.is_default ? 'var(--twc-primary-50,#ecfdf5)' : 'white'}}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="flex items-center gap-2 text-sm font-bold" style={{color:'var(--twc-text-primary,#111827)'}}>{a.address}<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold ring-1" style={{borderColor:'var(--twc-border,#e5e7eb)'}}>{a.type==='shipping'?'شحن':'فوترة'}</span>{a.is_default && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{background:primary}}><Star className="h-3 w-3 fill-white"/> افتراضي</span>}</p>
                          <p className="mt-1 text-sm" style={{color:'var(--twc-text-muted,#6b7280)'}}>{[a.city, a.state, a.postal_code, a.country].filter(Boolean).join('، ')}</p>
                        </div>
                        <button onClick={()=>openEdit(a)} className="rounded-full p-2 hover:bg-black/5"><Edit3 className="h-4 w-4"/></button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {!a.is_default && <button onClick={()=>setDefault(a.id)} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{borderColor:primary, color:primary}}>تحديد كافتراضي</button>}
                        <button onClick={async()=>{ if(confirm('حذف العنوان؟')) { try{ await remove(a.id); toast.success('تم الحذف'); }catch{ toast.error('فشل الحذف'); } } }} className="ms-auto flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/> حذف</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={openAdd} className="w-full rounded-xl border-2 border-dashed py-3 text-sm font-bold hover:bg-black/[0.02]" style={{borderColor:'var(--twc-border,#e5e7eb)', color:primary}}>+ إضافة عنوان آخر</button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-2">
                {(['shipping','billing'] as const).map(t=>(
                  <button key={t} type="button" onClick={()=>setForm({...form, type:t})} className={`flex-1 rounded-xl border py-2 text-sm font-bold ${form.type===t ? 'bg-black text-white border-black' : 'bg-white border-gray-200'}`}>{t==='shipping'?'عنوان الشحن':'عنوان الفوترة'}</button>
                ))}
              </div>
              <div><label className="mb-1 block text-sm font-semibold">العنوان *</label><input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} required className="w-full rounded-xl border px-4 py-3 text-sm" placeholder="الشارع ورقم المنزل" style={{borderColor:'var(--twc-border,#e5e7eb)'}}/></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-semibold">المدينة *</label><input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} required className="w-full rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--twc-border,#e5e7eb)'}}/></div><div><label className="mb-1 block text-sm font-semibold">الدولة *</label><input value={form.country} onChange={e=>setForm({...form, country:e.target.value})} required className="w-full rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--twc-border,#e5e7eb)'}}/></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-semibold">المنطقة/الولاية</label><input value={form.state} onChange={e=>setForm({...form, state:e.target.value})} className="w-full rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--twc-border,#e5e7eb)'}}/></div><div><label className="mb-1 block text-sm font-semibold">الرمز البريدي</label><input value={form.postal_code} onChange={e=>setForm({...form, postal_code:e.target.value})} className="w-full rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--twc-border,#e5e7eb)'}}/></div></div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.is_default} onChange={e=>setForm({...form, is_default:e.target.checked})} className="h-4 w-4"/> تعيين كافتراضي لهذا النوع</label>
              <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setFormOpen(false)} className="flex-1 rounded-xl border py-3 font-bold" style={{borderColor:'var(--twc-border,#e5e7eb)'}}>إلغاء</button><button type="submit" disabled={submitting} className="flex-1 rounded-xl py-3 font-bold text-white disabled:opacity-60" style={{background:primary}}>{submitting?'جاري الحفظ...': editing?'تحديث':'إضافة'}</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
