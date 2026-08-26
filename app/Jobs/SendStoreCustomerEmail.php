<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Store;
use App\Models\StoreEmailLog;
use App\Services\StoreEmailLayout;
use App\Services\StoreEmailNotificationService;
use App\Services\StoreMailService;
use App\Mail\StoreTransactionalMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendStoreCustomerEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $backoff = [60, 300];

    public function __construct(
        public int $storeId,
        public string $type,
        public string $recipientEmail,
        public ?int $orderId = null,
        public ?int $shipmentId = null,
        public ?int $customerId = null
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $store = Store::find($this->storeId);
        if (!$store) return;
        $recipient = trim(strtolower($this->recipientEmail));
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            \Log::warning('Store email skipped: invalid recipient', ['store_id'=>$this->storeId,'type'=>$this->type,'recipient'=>$recipient]);
            return;
        }
        // Check notification preference (except order_created must respect)
        if (!StoreEmailNotificationService::isEnabled($store, $this->type)) {
            return;
        }
        if (!StoreMailService::isConnected($store)) {
            \Log::warning('Store email skipped: not connected', ['store_id'=>$this->storeId,'type'=>$this->type]);
            return;
        }
        // Idempotency: check existing log
        $existing = StoreEmailLog::where('store_id',$this->storeId)
            ->where('type',$this->type)
            ->where('recipient',$recipient)
            ->where('order_id',$this->orderId)
            ->where('shipment_id',$this->shipmentId)
            ->first();
        if ($existing && $existing->status === StoreEmailLog::STATUS_SENT) {
            return; // already sent successfully
        }
        // Create or update pending log
        $log = $existing ?: StoreEmailLog::create([
            'store_id'=>$this->storeId,
            'customer_id'=>$this->customerId,
            'order_id'=>$this->orderId,
            'shipment_id'=>$this->shipmentId,
            'type'=>$this->type,
            'recipient'=>$recipient,
            'status'=>StoreEmailLog::STATUS_PENDING,
            'attempt_count'=>0,
        ]);
        $log->increment('attempt_count');
        try {
            [$subject,$body] = $this->buildContent($store);
            $html = StoreEmailLayout::render($store, $subject, $body, $this->orderId ? Order::find($this->orderId) : null);
            $mailable = new StoreTransactionalMail($subject, $html);
            StoreMailService::sendViaStore($store, $mailable, $recipient);
            $log->update(['status'=>StoreEmailLog::STATUS_SENT,'sent_at'=>now(),'last_error'=>null]);
        } catch (\Throwable $e) {
            $safe = mb_substr($e->getMessage(),0,500);
            // sanitize secrets
            $safe = preg_replace('/password[^\s]*/i','[redacted]',$safe);
            \Log::warning('Store email failed', ['store_id'=>$this->storeId,'type'=>$this->type,'recipient'=>$recipient,'error'=>$safe]);
            if ($this->attempts() >= $this->tries) {
                $log->update(['status'=>StoreEmailLog::STATUS_FAILED,'last_error'=>$safe]);
            } else {
                $log->update(['status'=>StoreEmailLog::STATUS_PENDING,'last_error'=>$safe]);
            }
            // Do not rethrow to avoid duplicate retry loop beyond tries; job will retry once via failed handling
            if ($this->attempts() < $this->tries) throw $e;
        }
    }

    private function buildContent(Store $store): array
    {
        $order = $this->orderId ? Order::with('items')->find($this->orderId) : null;
        $shipment = $this->shipmentId ? OrderShipment::find($this->shipmentId) : null;
        switch ($this->type) {
            case 'order_created':
                return $this->orderCreatedContent($store,$order);
            case 'order_cancelled':
                return [$store->name.' — تم إلغاء طلبك #'.($order ? $order->order_number : ''), '<p style="color:#334155;">تم إلغاء طلبك. إذا كان لديك استفسار تواصل مع المتجر.</p>'];
            case 'payment_received':
                return [$store->name.' — تم تأكيد الدفع #'.($order ? $order->order_number : ''), '<p style="color:#334155;">تم تأكيد استلام الدفع لطلبك. شكراً لك.</p>'];
            case 'shipment_created':
                return $this->shipmentCreatedContent($store,$shipment,$order);
            case 'shipment_in_transit':
                return [$store->name.' — طلبك في الطريق', '<p style="color:#334155;">طلبك في الطريق إليك.</p>'.($shipment?'<p>رقم التتبع: <span dir="ltr">'.e($shipment->tracking_number).'</span></p>':'')];
            case 'shipment_out_for_delivery':
                return [$store->name.' — خرج للتوصيل', '<p style="color:#334155;">طلبك خرج للتوصيل اليوم.</p>'];
            case 'shipment_delivered':
                return [$store->name.' — تم التسليم', '<p style="color:#334155;">تم تسليم طلبك بنجاح. شكراً لاختيارك '.$store->name.'.</p>'];
            case 'shipment_failed':
                return [$store->name.' — فشل التوصيل', '<p style="color:#334155;">تعذر توصيل طلبك. سنتواصل معك قريباً.</p>'];
            case 'shipment_returned':
                return [$store->name.' — تم الإرجاع', '<p style="color:#334155;">تم إرجاع شحنتك.</p>'];
            case 'welcome_customer':
                $link = $store->getStoreUrl() ?? config('app.url');
                $safeLink = e($link);
                return ['مرحباً بك في '.$store->name, '<p style="color:#334155;">مرحباً بك في <strong>'.e($store->name).'</strong>! تم تفعيل حسابك بنجاح.</p><p style="color:#334155;">يمكنك الآن متابعة طلباتك وإدارة حسابك.</p><p><a href="'.$safeLink.'" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">الذهاب إلى المتجر</a></p>'];
            default:
                return [$store->name.' — إشعار', '<p>لديك إشعار جديد من '.$store->name.'.</p>'];
        }
    }

    private function orderCreatedContent(Store $store, ?Order $order): array
    {
        if (!$order) return ['تم استلام طلبك','<p>تم استلام طلبك.</p>'];
        $subject = 'تم استلام طلبك #'.$order->order_number;
        $itemsHtml='';
        foreach ($order->items as $it) {
            $itemsHtml.='<tr><td style="padding:8px;border:1px solid #e2e8f0;">'.e($it->product_name).'</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">'.(int)$it->quantity.'</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:left;" dir="ltr">'.number_format((float)$it->unit_price,2).'</td></tr>';
        }
        $dateStr = $order->created_at ? $order->created_at->format('Y-m-d') : '';
        $body='<p style="color:#334155;">شكراً لطلبك من <strong>'.e($store->name).'</strong>.</p>'
            .'<p style="color:#334155;">رقم الطلب: <strong dir="ltr">'.$order->order_number.'</strong> — التاريخ: '.$dateStr.'</p>'
            .'<table style="width:100%;border-collapse:collapse;margin:16px 0;"><thead><tr style="background:#f8fafc;"><th style="padding:8px;border:1px solid #e2e8f0;">المنتج</th><th style="padding:8px;border:1px solid #e2e8f0;">الكمية</th><th style="padding:8px;border:1px solid #e2e8f0;">السعر</th></tr></thead><tbody>'.$itemsHtml.'</tbody></table>'
            .'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:12px;">'
            .'<p style="margin:4px 0;">المجموع الفرعي: <span dir="ltr">'.number_format((float)$order->subtotal,2).'</span></p>'
            .'<p style="margin:4px 0;">الشحن: <span dir="ltr">'.number_format((float)$order->shipping_amount,2).'</span></p>'
            .'<p style="margin:4px 0;">الضريبة: <span dir="ltr">'.number_format((float)$order->tax_amount,2).'</span></p>'
            .'<p style="margin:4px 0;font-weight:800;">الإجمالي: <span dir="ltr">'.number_format((float)$order->total_amount,2).' '.e($order->currency??'').'</span></p>'
            .'<p style="margin:4px 0;">طريقة الدفع: '.e($order->payment_method).'</p>'
            .'<p style="margin:4px 0;">العنوان: '.e($order->shipping_address.', '.$order->shipping_city).'</p>'
            .'</div>';
        return [$subject,$body];
    }

    private function shipmentCreatedContent(Store $store, ?OrderShipment $shipment, ?Order $order): array
    {
        $subject = 'تم شحن طلبك'.($order ? ' #'.$order->order_number : '');
        $provider = ($shipment && $shipment->provider) ? ucfirst($shipment->provider) : 'شركة التوصيل';
        $tracking = ($shipment && $shipment->tracking_number) ? '<p>رقم التتبع: <span dir="ltr" style="font-weight:800;">'.e($shipment->tracking_number).'</span></p>' : '';
        $url = ($shipment && $shipment->tracking_url) ? '<p><a href="'.e($shipment->tracking_url).'" style="color:#7c3aed;">تتبع الشحنة</a></p>' : '';
        $body='<p style="color:#334155;">تم إنشاء شحنة لطلبك'.($order ? ' <span dir="ltr">'.$order->order_number.'</span>' : '').'.</p>'
            .'<p>شركة التوصيل: <strong>'.e($provider).'</strong></p>'
            .$tracking.$url;
        return [$subject,$body];
    }
}
