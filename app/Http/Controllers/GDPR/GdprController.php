<?php

namespace App\Http\Controllers\GDPR;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Store;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Models\PlanOrder;
use App\Models\Referral;
use App\Models\PayoutRequest;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\StoreConfiguration;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\GdprDataExportReady;
use Carbon\Carbon;
use ZipArchive;

class GdprController extends Controller
{
    /**
     * Request data export for the authenticated user
     */
    public function requestExport(Request $request)
    {
        $user = Auth::user();

        // Create export job record
        $export = \App\Models\GdprExport::create([
            'user_id' => $user->id,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // Dispatch export job to queue
        \App\Jobs\GdprDataExportJob::dispatch($export->id);

        return response()->json([
            'message' => 'Your data export has been requested. You will receive an email when it is ready for download.',
            'export_id' => $export->id,
        ]);
    }

    /**
     * Download the exported data
     */
    public function downloadExport(Request $request, $exportId)
    {
        $user = Auth::user();
        $export = \App\Models\GdprExport::where('id', $exportId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($export->status !== 'completed') {
            return response()->json([
                'message' => 'Export is not ready yet. Please try again later.',
            ], 400);
        }

        if ($export->expires_at && $export->expires_at->isPast()) {
            return response()->json([
                'message' => 'This export has expired.',
            ], 410);
        }

        $filePath = $export->file_path;

        if (!Storage::disk('s3')->exists($filePath)) {
            return response()->json([
                'message' => 'Export file not found.',
            ], 404);
        }

        return Storage::disk('s3')->download($filePath, "gdpr-export-{$user->id}-{$export->id}.zip");
    }

    /**
     * Request account deletion
     */
    public function requestDeletion(Request $request)
    {
        $request->validate([
            'password' => 'required|current_password',
            'confirmation' => 'required|accepted',
            'reason' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();

        // Create deletion request record
        $deletionRequest = \App\Models\GdprDeletionRequest::create([
            'user_id' => $user->id,
            'reason' => $request->reason,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // Send confirmation email
        Mail::to($user->email)->send(new \App\Mail\GdprDeletionConfirmation($deletionRequest));

        return response()->json([
            'message' => 'Your account deletion request has been received. You will receive a confirmation email. The deletion will be processed within 30 days.',
            'request_id' => $deletionRequest->id,
        ]);
    }

    /**
     * Cancel account deletion request
     */
    public function cancelDeletion(Request $request, $requestId)
    {
        $user = Auth::user();
        $deletionRequest = \App\Models\GdprDeletionRequest::where('id', $requestId)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $deletionRequest->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        return response()->json([
            'message' => 'Your account deletion request has been cancelled.',
        ]);
    }

    /**
     * Get user's data export status
     */
    public function exportStatus(Request $request)
    {
        $user = Auth::user();
        $exports = \App\Models\GdprExport::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($exports);
    }

    /**
     * Get user's deletion request status
     */
    public function deletionStatus(Request $request)
    {
        $user = Auth::user();
        $requests = \App\Models\GdprDeletionRequest::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($requests);
    }
}

// Job for generating GDPR data export
class GdprDataExportJob
{
    public $exportId;

    public function __construct(int $exportId)
    {
        $this->exportId = $exportId;
    }

    public function handle()
    {
        $export = \App\Models\GdprExport::find($this->exportId);
        if (!$export) {
            return;
        }

        $export->update(['status' => 'processing']);

        try {
            $user = \App\Models\User::find($export->user_id);
            if (!$user) {
                throw new \Exception('User not found');
            }

            $zipPath = storage_path("app/exports/gdpr-export-{$export->id}.zip");
            $zip = new ZipArchive();

            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \Exception('Could not create zip archive');
            }

            // Export user profile
            $this->addUserDataToZip($zip, $user);

            // Export stores
            $this->addStoresToZip($zip, $user);

            // Export orders
            $this->addOrdersToZip($zip, $user);

            // Export products
            $this->addProductsToZip($zip, $user);

            // Export customers
            $this->addCustomersToZip($zip, $user);

            // Export settings
            $this->addSettingsToZip($zip, $user);

            // Export notifications
            $this->addNotificationsToZip($zip, $user);

            // Export referrals
            $this->addReferralsToZip($zip, $user);

            // Export payout requests
            $this->addPayoutRequestsToZip($zip, $user);

            // Export plan orders
            $this->addPlanOrdersToZip($zip, $user);

            // Export media
            $this->addMediaToZip($zip, $user);

            $zip->close();

            // Upload to S3
            $filePath = "exports/gdpr-export-{$export->id}.zip";
            Storage::disk('s3')->put($filePath, fopen($zip->getStreamName(), 'r'));

            // Update export record
            $expiresAt = now()->addDays(30);
            $export->update([
                'status' => 'completed',
                'file_path' => $filePath,
                'completed_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            // Send notification email
            Mail::to($user->email)->send(new \App\Mail\GdprDataExportReady($export));

        } catch (\Exception $e) {
            $export->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            Log::error('GDPR export failed: ' . $e->getMessage());
        }
    }

    private function addUserDataToZip(ZipArchive $zip, $user)
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => $user->type,
            'avatar' => $user->avatar,
            'lang' => $user->lang,
            'current_store' => $user->current_store,
            'plan_id' => $user->plan_id,
            'plan_duration' => $user->plan_duration,
            'plan_expire_date' => $user->plan_expire_date,
            'plan_is_active' => $user->plan_is_active,
            'is_enable_login' => $user->is_enable_login,
            'storage_limit' => $user->storage_limit,
            'mode' => $user->mode,
            'created_by' => $user->created_by,
            'referral_code' => $user->referral_code,
            'used_referral_code' => $user->used_referral_code,
            'google2fa_enable' => $user->google2fa_enable,
            'status' => $user->status,
            'is_trial' => $user->is_trial,
            'trial_day' => $user->trial_day,
            'trial_expire_date' => $user->trial_expire_date,
            'active_module' => $user->active_module,
            'commission_amount' => $user->commission_amount,
            'terms_accepted_at' => $user->terms_accepted_at,
            'onboarded_at' => $user->onboarded_at,
            'last_login_at' => $user->last_login_at,
            'last_login_ip' => $user->last_login_ip,
            'last_login_ua' => $user->last_login_ua,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];

        $zip->addFromString('user/profile.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addStoresToZip(ZipArchive $zip, $user)
    {
        $stores = Store::where('user_id', $user->id)->get();
        $storesData = [];

        foreach ($stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            $settings = \App\Models\Setting::getUserSettings($user->id, $store->id);

            $storesData[] = [
                'store' => $store->toArray(),
                'configuration' => $config,
                'settings' => $settings,
            ];
        }

        $zip->addFromString('stores/stores.json', json_encode($storesData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addOrdersToZip(ZipArchive $zip, $user)
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $orders = Order::whereIn('store_id', $storeIds)->get();

        $ordersData = $orders->map(function ($order) {
            return [
                'order' => $order->toArray(),
                'items' => $order->items->map(function ($item) {
                    return $item->toArray();
                })->toArray(),
            ];
        })->toArray();

        $zip->addFromString('orders/orders.json', json_encode($ordersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addProductsToZip(ZipArchive $zip, $user)
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $products = Product::whereIn('store_id', $storeIds)->get();

        $productsData = $products->map(function ($product) {
            return $product->toArray();
        })->toArray();

        $zip->addFromString('products/products.json', json_encode($productsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addCustomersToZip(ZipArchive $zip, $user)
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $customers = Customer::whereIn('store_id', $storeIds)->get();

        $customersData = $customers->map(function ($customer) {
            return $customer->toArray();
        })->toArray();

        $zip->addFromString('customers/customers.json', json_encode($customersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addSettingsToZip(ZipArchive $zip, $user)
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $allSettings = [];

        // Global settings
        $globalSettings = Setting::where('user_id', $user->id)
            ->whereNull('store_id')
            ->get()
            ->pluck('value', 'key')
            ->toArray();
        $allSettings['global'] = $globalSettings;

        // Per-store settings
        $stores = Store::where('user_id', $user->id)->get();
        foreach ($stores as $store) {
            $storeSettings = Setting::where('user_id', $user->id)
                ->where('store_id', $store->id)
                ->get()
                ->pluck('value', 'key')
                ->toArray();
            $allSettings["store_{$store->id}"] = $storeSettings;
        }

        $zip->addFromString('settings/settings.json', json_encode($allSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addNotificationsToZip(ZipArchive $zip, $user)
    {
        $notifications = \App\Models\Notification::where('user_id', $user->id)->get();
        $notificationsData = $notifications->map(function ($n) {
            return $n->toArray();
        })->toArray();

        $zip->addFromString('notifications/notifications.json', json_encode($notificationsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addReferralsToZip(ZipArchive $zip, $user)
    {
        $referrals = Referral::where('company_id', $user->id)->get();
        $referralsData = $referrals->map(function ($r) {
            return $r->toArray();
        })->toArray();

        $zip->addFromString('referrals/referrals.json', json_encode($referralsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addPayoutRequestsToZip(ZipArchive $zip, $user)
    {
        $payouts = PayoutRequest::where('company_id', $user->id)->get();
        $payoutsData = $payouts->map(function ($p) {
            return $p->toArray();
        })->toArray();

        $zip->addFromString('payouts/payout_requests.json', json_encode($payoutsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addPlanOrdersToZip(ZipArchive $zip, $user)
    {
        $orders = PlanOrder::where('user_id', $user->id)->get();
        $ordersData = $orders->map(function ($o) {
            return $o->toArray();
        })->toArray();

        $zip->addFromString('plan_orders/plan_orders.json', json_encode($ordersData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addMediaToZip(ZipArchive $zip, $user)
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $media = Media::whereIn('model_id', $storeIds)
            ->where('model_type', Store::class)
            ->get();

        $mediaData = $media->map(function ($m) {
            return [
                'id' => $m->id,
                'file_name' => $m->file_name,
                'mime_type' => $m->mime_type,
                'size' => $m->size,
                'url' => $m->url,
                'created_at' => $m->created_at,
            ];
        })->toArray();

        $zip->addFromString('media/media.json', json_encode($mediaData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}