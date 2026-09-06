<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderReturn;
use App\Services\ReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReturnController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $query = OrderReturn::where('store_id', $storeId)->with(['order','items.orderItem','customer'])->orderBy('created_at','desc');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->input('search')) {
            $query->where(function($q) use ($search){
                $q->where('return_number','like',"%{$search}%")
                  ->orWhereHas('order', fn($qq)=>$qq->where('order_number','like',"%{$search}%"));
            });
        }

        $returns = $query->paginate(15)->withQueryString();

        return Inertia::render('returns/index', [
            'returns' => $returns,
            'filters' => ['status'=>$request->input('status'),'search'=>$request->input('search')],
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->with(['order','items.orderItem.product','customer'])->firstOrFail();

        // also load order items for context
        $order = $ret->order()->with('items.product')->first();

        return Inertia::render('returns/show', [
            'ret' => $ret,
            'order' => $order,
        ]);
    }

    public function approve(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            $ret = ReturnService::transition($ret, 'approved', $request->input('merchant_note'));
            // email
            $this->sendEmail($ret, 'return_approved');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['status'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم قبول طلب الإرجاع');
    }

    public function reject(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        $request->validate(['merchant_note'=>'nullable|string|max:500']);
        try {
            $ret = ReturnService::transition($ret, 'rejected', $request->input('merchant_note'));
            $this->sendEmail($ret, 'return_rejected');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['status'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم رفض طلب الإرجاع');
    }

    public function markReceived(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            // approved -> received or in_transit -> received
            $target = $ret->status === 'approved' || $ret->status === 'in_transit' ? 'received' : 'received';
            if ($ret->status === 'requested') {
                // need approve first
                throw new \Exception('يجب الموافقة أولاً');
            }
            $ret = ReturnService::transition($ret, 'received');
            $this->sendEmail($ret, 'return_received');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['status'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم تسجيل استلام المرتجع');
    }

    public function restock(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.return_item_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
        ]);
        try {
            foreach ($request->input('items') as $it) {
                ReturnService::restock($ret, (int)$it['return_item_id'], (int)$it['quantity']);
            }
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['restock'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تمت إعادة الكمية للمخزون');
    }

    public function refund(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        if (!in_array($ret->status, ['received', 'approved', 'completed'], true)) {
            return back()->with('error', __('Refund can only be processed for approved or received returns.'));
        }
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:100',
        ]);
        try {
            ReturnService::recordRefund($ret, (float)$request->input('amount'), $request->input('method'), $request->input('reference'));
            $this->sendEmail($ret, 'refund_recorded');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['refund'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم تسجيل الاسترداد المالي');
    }

    public function complete(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            $ret = ReturnService::complete($ret);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['status'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم إكمال الإرجاع');
    }

    public function cancel(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $ret = OrderReturn::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            $ret = ReturnService::transition($ret, 'cancelled');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['status'=>$e->getMessage()]);
        }
        return redirect()->back()->with('success','تم إلغاء الإرجاع');
    }

    private function sendEmail(OrderReturn $ret, string $event): void
    {
        try {
            $order = $ret->order;
            if (!$order || !$order->customer_email) return;
            $store = $ret->store;
            if (!$store || !\App\Services\StoreMailService::isConnected($store)) return;
            // Use merchant-owned SMTP; simple raw email as placeholder
            // Real templates would be in StoreEmailNotificationService; failure non-blocking
            \Illuminate\Support\Facades\Log::info('Return email requested', ['event'=>$event,'return_id'=>$ret->id,'to'=>$order->customer_email]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Return email failed: '.$e->getMessage(), ['return_id'=>$ret->id]);
        }
    }
}
