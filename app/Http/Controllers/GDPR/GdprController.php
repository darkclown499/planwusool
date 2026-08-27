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
        // file_path stored as "disk://path" — parse disk
        $disk = 'public';
        $path = $filePath;
        if (str_contains($filePath, '://')) {
            [$disk, $path] = explode('://', $filePath, 2);
        } else {
            // legacy s3-only path fallback
            $disk = Storage::disk('s3')->exists($filePath) ? 's3' : config('filesystems.default', 'public');
        }

        if (!Storage::disk($disk)->exists($path)) {
            return response()->json([
                'message' => 'Export file not found.',
            ], 404);
        }

        return Storage::disk($disk)->download($path, "gdpr-export-{$user->id}-{$export->id}.zip");
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
        try {
            Mail::to($user->email)->send(new \App\Mail\GdprDeletionConfirmation($deletionRequest));
        } catch (\Throwable $e) {
            Log::warning('GdprDeletionConfirmation mail failed', ['request_id' => $deletionRequest->id]);
        }

        // Dispatch queued deletion job (Phase 1 executes anonymization lifecycle; merchant hard-delete deferred to Phase 2)
        \App\Jobs\GdprDeletionJob::dispatch($deletionRequest->id)->afterCommit();

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