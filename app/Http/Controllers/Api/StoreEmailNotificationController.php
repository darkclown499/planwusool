<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreEmailLog;
use App\Services\StoreEmailNotificationService;
use Illuminate\Http\Request;

class StoreEmailNotificationController extends Controller
{
    public function show(Request $request, Store $store)
    {
        if (!$this->authorize($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $data = StoreEmailNotificationService::getGrouped($store);
        // add recent logs
        $logs = StoreEmailLog::where('store_id',$store->id)->latest()->limit(10)->get()->map(fn($l)=>[
            'id'=>$l->id,'type'=>$l->type,'recipient'=>$this->mask($l->recipient),'status'=>$l->status,'sent_at'=>$l->sent_at,'attempt_count'=>$l->attempt_count,
        ]);
        return response()->json(['success'=>true,'data'=>$data,'logs'=>$logs]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorize($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $validated = $request->validate(['key'=>'required|string','enabled'=>'required|boolean']);
        $ok = StoreEmailNotificationService::setPref($store, $validated['key'], (bool)$validated['enabled']);
        if (!$ok) return response()->json(['error'=>'Invalid notification type'],422);
        return response()->json(['success'=>true,'data'=>StoreEmailNotificationService::getGrouped($store)]);
    }

    public function preview(Request $request, Store $store)
    {
        if (!$this->authorize($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $type = $request->query('type','order_created');
        if (!isset(StoreEmailNotificationService::TYPES[$type])) return response()->json(['error'=>'Invalid type'],422);
        // Build sample preview using StoreEmailLayout
        $html = \App\Services\StoreEmailLayout::render($store, $this->previewSubject($store,$type), $this->previewBody($store,$type));
        return response()->json(['success'=>true,'html'=>$html,'subject'=>$this->previewSubject($store,$type)]);
    }

    public function logs(Request $request, Store $store)
    {
        if (!$this->authorize($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $logs = StoreEmailLog::where('store_id',$store->id)->latest()->limit(20)->get()->map(fn($l)=>[
            'id'=>$l->id,'type'=>$l->type,'recipient'=>$this->mask($l->recipient),'status'=>$l->status,'sent_at'=>$l->sent_at,'last_error'=>$l->last_error,
        ]);
        return response()->json(['success'=>true,'logs'=>$logs]);
    }

    private function mask(string $email): string { $at=strpos($email,'@'); if($at===false) return $email; $name=substr($email,0,$at); $domain=substr($email,$at); return substr($name,0,1).'***'.$domain; }
    private function previewSubject(Store $store, string $type): string {
        return [
            'order_created'=>'تم استلام طلبك #ORD-123456 — معاينة فقط',
            'shipment_created'=>'تم شحن طلبك — معاينة فقط',
            'shipment_delivered'=>'تم التسليم — معاينة فقط',
        ][$type] ?? $store->name.' — معاينة';
    }
    private function previewBody(Store $store, string $type): string {
        return '<div style="background:#fef3c7;border:1px solid #fcd34d;padding:8px;border-radius:8px;margin-bottom:12px;text-align:center;font-size:12px;">معاينة فقط — بيانات تجريبية</div>'
            .'<p style="color:#334155;">هذا مثال لإشعار نوع <strong>'.StoreEmailNotificationService::TYPES[$type]['label'].'</strong> من متجر '.e($store->name).'.</p>';
    }

    private function authorize(Request $request, Store $store): bool { $u=$request->user(); if(!$u) return false; if($u->isSuperAdmin()||$u->isAdmin()) return true; return (int)$store->user_id===(int)$u->id || (int)$store->id===(int)($u->current_store??0); }
}
