<?php

namespace App\Http\Controllers;

use App\Models\DigitalDownload;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class DigitalDownloadController extends Controller
{
    /**
     * Generate download tokens for a completed order.
     */
    public function generateForOrder(Order $order)
    {
        $store = $order->store;
        if (!$store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $orderItems = $order->items()->with('product')->get();
        $downloads = [];

        foreach ($orderItems as $item) {
            $product = $item->product;

            // Only generate for downloadable products
            if (!$product || !$product->is_downloadable || empty($product->downloadable_file)) {
                continue;
            }

            // Check if download already exists for this order item
            $existing = DigitalDownload::where('product_id', $product->id)
                ->where('order_id', $order->id)
                ->first();

            if ($existing) {
                $downloads[] = $existing;
                continue;
            }

            $download = DigitalDownload::create([
                'product_id' => $product->id,
                'store_id' => $store->id,
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'file_path' => $product->downloadable_file,
                'file_name' => basename($product->downloadable_file),
                'file_size' => $this->getFileSize($product->downloadable_file),
                'download_token' => DigitalDownload::generateToken(),
                'max_downloads' => 5,
                'expires_at' => now()->addDays(30),
            ]);

            $downloads[] = $download;
        }

        return response()->json([
            'success' => true,
            'downloads' => $downloads,
        ]);
    }

    /**
     * Download a file using a secure token.
     */
    public function download($token)
    {
        $download = DigitalDownload::where('download_token', $token)->first();

        if (!$download) {
            abort(404, 'Download link not found');
        }

        if (!$download->isUsable()) {
            if ($download->download_count >= $download->max_downloads) {
                abort(403, 'Download limit exceeded');
            }
            if ($download->expires_at && $download->expires_at->isPast()) {
                abort(403, 'Download link has expired');
            }
            abort(403, 'Download link is no longer valid');
        }

        // Verify the file exists
        if (!Storage::disk('public')->exists($download->file_path)) {
            abort(404, 'File not found');
        }

        // Increment download count
        $download->increment('download_count');
        $download->update(['last_download_at' => now()]);

        // Return the file as a download
        $fileName = $download->file_name ?: basename($download->file_path);

        return Storage::disk('public')->download($download->file_path, $fileName);
    }

    /**
     * API: Get available downloads for the authenticated customer.
     */
    public function customerDownloads(Request $request)
    {
        $customerId = Auth::guard('customer')->id();

        if (!$customerId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }

        $storeId = $request->store_id;

        $query = DigitalDownload::where('customer_id', $customerId)
            ->with('product:id,name,cover_image');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $downloads = $query->latest()->get()->map(function ($download) {
            return [
                'id' => $download->id,
                'product_name' => $download->product->name ?? 'Unknown',
                'product_image' => $download->product->cover_image ?? null,
                'file_name' => $download->file_name,
                'file_size' => $download->file_size,
                'download_count' => $download->download_count,
                'max_downloads' => $download->max_downloads,
                'is_usable' => $download->isUsable(),
                'download_url' => route('api.digital-downloads.download', $download->download_token),
                'created_at' => $download->created_at->toISOString(),
                'expires_at' => $download->expires_at ? $download->expires_at->toISOString() : null,
            ];
        });

        return response()->json([
            'success' => true,
            'downloads' => $downloads,
        ]);
    }

    /**
     * Show the order downloads page (for customers).
     */
    public function orderDownloads(Request $request, $orderNumber)
    {
        $customerId = Auth::guard('customer')->id();

        $order = Order::where('order_number', $orderNumber)
            ->where('customer_id', $customerId)
            ->first();

        if (!$order) {
            abort(404, 'Order not found');
        }

        $downloads = DigitalDownload::where('order_id', $order->id)
            ->with('product:id,name,cover_image')
            ->get()
            ->map(function ($download) {
                return [
                    'id' => $download->id,
                    'product_name' => $download->product->name ?? 'Unknown',
                    'product_image' => $download->product->cover_image ?? null,
                    'file_name' => $download->file_name,
                    'file_size' => $download->file_size,
                    'download_count' => $download->download_count,
                    'max_downloads' => $download->max_downloads,
                    'is_usable' => $download->isUsable(),
                    'download_url' => route('api.digital-downloads.download', $download->download_token),
                    'created_at' => $download->created_at->toISOString(),
                    'expires_at' => $download->expires_at ? $download->expires_at->toISOString() : null,
                ];
            });

        return response()->json([
            'success' => true,
            'order_number' => $orderNumber,
            'downloads' => $downloads,
        ]);
    }

    /**
     * Get the file size in human-readable format.
     */
    private function getFileSize($path): ?string
    {
        if (empty($path)) {
            return null;
        }

        try {
            $bytes = Storage::disk('public')->size($path);
            $units = ['B', 'KB', 'MB', 'GB'];
            $i = 0;
            while ($bytes >= 1024 && $i < count($units) - 1) {
                $bytes /= 1024;
                $i++;
            }
            return round($bytes, 2) . ' ' . $units[$i];
        } catch (\Exception $e) {
            return null;
        }
    }
}
