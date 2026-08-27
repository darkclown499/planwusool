<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Store;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Models\GdprExport;
use App\Support\ThemeAssetSanitizer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class GdprDataExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $exportId;
    public int $tries = 2;
    public int $timeout = 180;

    public function __construct(int $exportId)
    {
        $this->exportId = $exportId;
    }

    public function handle(): void
    {
        $export = GdprExport::find($this->exportId);
        if (!$export || !in_array($export->status, ['pending', 'failed'], true)) {
            return;
        }

        $export->update(['status' => 'processing']);

        $zipPath = null;
        $filePath = null;
        try {
            $user = User::find($export->user_id);
            if (!$user) {
                throw new \Exception('User not found');
            }

            $zipPath = storage_path("app/private/gdpr-exports/gdpr-export-{$export->id}.zip");
            @mkdir(dirname($zipPath), 0755, true);
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \Exception('Could not create zip archive');
            }

            $this->addUserDataToZip($zip, $user);
            $this->addStoresToZip($zip, $user);
            $this->addOrdersToZip($zip, $user);
            $this->addProductsToZip($zip, $user);
            $this->addCustomersToZip($zip, $user);
            $this->addSettingsToZip($zip, $user);

            $zip->close();

            $diskName = config('filesystems.default', 'public');
            // Prefer private disk if exists, else configured default, never hardcode s3
            $disk = $diskName;
            if (!array_key_exists($diskName, config('filesystems.disks', []))) {
                $disk = 'public';
            }
            // If s3 configured but default is public, keep public - do not force s3
            $availableDisks = array_keys(config('filesystems.disks', []));
            if (!in_array($disk, $availableDisks, true)) {
                $disk = $availableDisks[0] ?? 'public';
            }
            // For sensitive GDPR we prefer private/public local; if s3 is default it will be s3 - respect config
            $filePath = "gdpr-exports/gdpr-export-{$export->id}-".uniqid().".zip";
            $contents = @file_get_contents($zipPath);
            if ($contents === false) {
                throw new \Exception('Could not read zip');
            }
            Storage::disk($disk)->put($filePath, $contents);

            $export->update([
                'status' => 'completed',
                'file_path' => $disk . '://' . $filePath,
                'completed_at' => now(),
                'expires_at' => now()->addDays(30),
            ]);

            // Send notification without leaking PII in log
            try {
                Mail::to($user->email)->send(new \App\Mail\GdprDataExportReady($export));
            } catch (\Throwable $e) {
                Log::warning('GdprDataExportJob mail failed', ['export_id' => $export->id]);
            }
        } catch (\Throwable $e) {
            $safe = $this->redact($e->getMessage());
            $export->update([
                'status' => 'failed',
                'error_message' => mb_substr($safe, 0, 1000),
            ]);
            Log::warning('GDPR export failed', ['export_id' => $this->exportId, 'error' => $safe]);
            throw $e;
        } finally {
            if ($zipPath && file_exists($zipPath)) {
                @unlink($zipPath);
            }
        }
    }

    public function failed(\Throwable $e): void
    {
        try {
            $exp = GdprExport::find($this->exportId);
            if ($exp) $exp->update(['status' => 'failed', 'error_message' => mb_substr($this->redact($e->getMessage()),0,1000)]);
        } catch (\Throwable $ignored) {}
    }

    private function redact(string $msg): string
    {
        $msg = preg_replace('/(password|secret|token|api[_-]?key|authorization)[^\s,]*/i', '[redacted]', $msg) ?? $msg;
        $msg = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[email]', $msg) ?? $msg;
        return $msg;
    }

    private function addUserDataToZip(ZipArchive $zip, $user): void
    {
        // Allowlist only — never export secrets
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => $user->type,
            'lang' => $user->lang,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'plan_id' => $user->plan_id,
            'status' => $user->status,
        ];
        $zip->addFromString('user/profile.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addStoresToZip(ZipArchive $zip, $user): void
    {
        $stores = Store::where('user_id', $user->id)->get();
        $out = [];
        foreach ($stores as $store) {
            // Only explicit store fields, not configuration secrets
            $out[] = [
                'store' => [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'email' => $store->email,
                    'created_at' => $store->created_at,
                ],
            ];
        }
        $zip->addFromString('stores/stores.json', json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addOrdersToZip(ZipArchive $zip, $user): void
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $orders = Order::whereIn('store_id', $storeIds)->get();
        $data = $orders->map(fn($o) => [
            'order_number' => $o->order_number,
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'total_amount' => $o->total_amount,
            'currency' => $o->currency,
            'created_at' => $o->created_at,
        ])->toArray();
        $zip->addFromString('orders/orders.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addProductsToZip(ZipArchive $zip, $user): void
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $products = Product::whereIn('store_id', $storeIds)->get(['id','store_id','name','price','created_at']);
        $zip->addFromString('products/products.json', json_encode($products->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addCustomersToZip(ZipArchive $zip, $user): void
    {
        $storeIds = Store::where('user_id', $user->id)->pluck('id');
        $customers = Customer::whereIn('store_id', $storeIds)->get(['id','store_id','first_name','last_name','email','created_at']);
        $zip->addFromString('customers/customers.json', json_encode($customers->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function addSettingsToZip(ZipArchive $zip, $user): void
    {
        // Never export raw settings that may contain secrets — only metadata
        $all = ['note' => 'Settings omitted for privacy — contact support for export of non-secret settings.'];
        $zip->addFromString('settings/settings.json', json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
