<?php

namespace App\Http\Controllers;

use App\Models\MediaItem;
use App\Models\User;
use App\Services\StorageConfigService;
use App\Services\DynamicStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        DynamicStorageService::configureDynamicDisks();

        // Store-scoped listing: superadmin sees all, others only their current store's media
        $storeId = null;
        try { $storeId = getCurrentStoreId($user); } catch (\Throwable $e) {}
        $hasStoreColumn = \Illuminate\Support\Facades\Schema::hasColumn('media', 'store_id');

        $mediaItems = MediaItem::with('media')->latest()->get();

        $media = $mediaItems->flatMap(function ($item) use ($user, $storeId, $hasStoreColumn, $request) {
            $mediaQuery = $item->getMedia('images');

            if ($user->type === 'superadmin') {
                // superadmin optionally filtered by ?store_id for isolation tests
                if ($hasStoreColumn && $request->filled('store_id')) {
                    $mediaQuery = $mediaQuery->where('store_id', (int) $request->input('store_id'));
                }
            } elseif ($user->hasPermissionTo('manage-any-media')) {
                if ($hasStoreColumn && $storeId) {
                    $mediaQuery = $mediaQuery->where(function ($q) use ($storeId, $user) {
                        $q->where('store_id', $storeId)->orWhere(function ($qq) use ($user) {
                            $qq->whereNull('store_id')->where('user_id', $user->id);
                        });
                    });
                } else {
                    $mediaQuery = $mediaQuery->where('user_id', $user->id);
                }
            } else {
                if ($hasStoreColumn && $storeId) {
                    $mediaQuery = $mediaQuery->where('store_id', $storeId);
                } else {
                    $mediaQuery = $mediaQuery->where('user_id', $user->id);
                }
            }

            return $mediaQuery->map(function ($media) {
                try {
                    $originalUrl = $this->getMediaUrl($media);
                    $thumbUrl = $originalUrl;

                    try {
                        $thumbUrl = $this->getMediaUrl($media, 'thumb');
                    } catch (\Exception $e) {
                    }

                    return [
                        'id' => $media->id,
                        'name' => $media->name,
                        'file_name' => $media->file_name,
                        'disk' => $media->disk,
                        'mime_type' => $media->mime_type,
                        'size' => $media->size,
                        'url' => $originalUrl,
                        'thumb_url' => $thumbUrl,
                        'model_id' => $media->model_id,
                        'user_id' => $media->user_id,
                        'created_at' => $media->created_at,
                    ];
                } catch (\Exception $e) {
                    return null;
                }
            })->filter();
        });

        return response()->json($media);
    }

    public function batchStore(Request $request)
    {
        DynamicStorageService::configureDynamicDisks();

        if (!$request->hasFile('files') || !is_array($request->file('files'))) {
            return response()->json([
                'message' => __('No files provided'),
                'errors' => [__('Please select files to upload')]
            ], 422);
        }

        $storageCheck = $this->checkStorageLimit($request->file('files'));
        if ($storageCheck) {
            return $storageCheck;
        }

        $config = StorageConfigService::getStorageConfig();
        $allowedTypes = array_map('trim', explode(',', strtolower($config['allowed_file_types'])));

        $mimeTypeMap = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'bmp' => 'image/bmp', 'ico' => 'image/x-icon',
            'pdf' => 'application/pdf', 'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'csv' => 'text/csv', 'txt' => 'text/plain',
            'zip' => 'application/zip', 'mp4' => 'video/mp4', 'mp3' => 'audio/mpeg',
            'webm' => 'video/webm', 'ogg' => 'audio/ogg', 'wav' => 'audio/wav',
        ];

        $allowedMimes = [];
        foreach ($allowedTypes as $type) {
            if (isset($mimeTypeMap[$type])) {
                $allowedMimes[] = $mimeTypeMap[$type];
            }
        }
        $allowedMimes = array_unique($allowedMimes);

        $validator = \Validator::make($request->all(), [
            'files' => 'required|array|min:1',
            'files.*' => [
                'required',
                'file',
                'mimes:' . implode(',', $allowedTypes),
                'max:' . min($config['max_file_size_kb'], 10240)
            ],
        ], [
            'files.required' => __('Please select files to upload.'),
            'files.array' => __('Invalid file format.'),
            'files.min' => __('Please select at least one file.'),
            'files.*.required' => __('Please select a valid file.'),
            'files.*.file' => __('Please select a valid file.'),
            'files.*.mimes' => __('Only these file types are allowed: :types', [
                'types' => strtoupper(implode(', ', $allowedTypes))
            ]),
            'files.*.max' => __('File size cannot exceed :max KB.', ['max' => min($config['max_file_size_kb'], 10240)]),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => __('File validation failed'),
                'errors' => $validator->errors()->all(),
                'allowed_types' => $config['allowed_file_types'],
                'max_size_kb' => $config['max_file_size_kb']
            ], 422);
        }

        foreach ($request->file('files') as $file) {
            if (!empty($allowedMimes)) {
                try {
                    $realMimeType = $file->getMimeType();
                    if ($realMimeType && !in_array($realMimeType, $allowedMimes)) {
                        return response()->json([
                            'message' => __('File validation failed'),
                            'errors' => [__('File type not allowed: :type (detected by content)', [
                                'type' => strtoupper(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION))
                            ])],
                        ], 422);
                    }
                } catch (\Exception $e) {
                    \Log::warning('MIME type detection failed for upload', [
                        'file' => $file->getClientOriginalName(),
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $uploadedMedia = [];
        $errors = [];
        $storeIdForUpload = null;
        try { $storeIdForUpload = getCurrentStoreId(auth()->user()); } catch (\Throwable $e) {}
        $hasStoreColItem = \Illuminate\Support\Facades\Schema::hasColumn('media_items', 'store_id');
        $hasStoreColMedia = \Illuminate\Support\Facades\Schema::hasColumn('media', 'store_id');

        DB::transaction(function () use ($request, &$uploadedMedia, &$errors, $allowedMimes, $allowedTypes, $storeIdForUpload, $hasStoreColItem, $hasStoreColMedia) {
            // P0: concurrent quota protection ΓÇö lock company row and re-verify within transaction (TOCTOU guard)
            $authUser = auth()->user();
            if ($authUser->type !== 'superadmin') {
                $limit = $this->getUserStorageLimit($authUser);
                if ($limit) {
                    $company = $authUser->type === 'company' ? $authUser : \App\Models\User::find($authUser->created_by);
                    if ($company) {
                        \Illuminate\Support\Facades\DB::table('users')->where('id', $company->id)->lockForUpdate()->first();
                    }
                    $current = $this->getUserStorageUsage($authUser);
                    $incoming = collect($request->file('files'))->sum(fn($f) => $f instanceof \Illuminate\Http\UploadedFile ? $f->getSize() : 0);
                    if (($current + $incoming) > $limit) {
                        throw new \Illuminate\Http\Exceptions\HttpResponseException(
                            response()->json(['message' => __('Storage limit exceeded'), 'errors' => [__('Please delete files or upgrade plan')]], 422)
                        );
                    }
                }
            }
            foreach ($request->file('files') as $file) {
                $tempFilePath = null;
                $optimizedPath = null;
                try {
                    $sanitizedName = $this->sanitizeFilename($file->getClientOriginalName());

                    $itemData = ['name' => $sanitizedName];
                    if ($hasStoreColItem && $storeIdForUpload) $itemData['store_id'] = $storeIdForUpload;
                    $mediaItem = MediaItem::create($itemData);

                    $isSvg = strtolower(pathinfo($sanitizedName, PATHINFO_EXTENSION)) === 'svg';

                    if ($isSvg) {
                        // SVG can contain scripts when served inline — strip
                        // dangerous content before persisting.
                        $tempFilePath = tempnam(sys_get_temp_dir(), 'med_svg_');
                        file_put_contents($tempFilePath, $this->sanitizeSvgContent($file->get()));
                        $source = $tempFilePath;
                    } else {
                        $source = $file;

                        // Downscale raster uploads and store them as WebP so the
                        // storefront serves small, modern images instead of the
                        // raw multi-megabyte camera file the user picked.
                        $optimizedPath = $this->optimizePhoto($file->getPathname(), $sanitizedName, $allowedTypes);
                        if ($optimizedPath) {
                            $tempFilePath = $optimizedPath;
                            $source = $optimizedPath;
                        }
                    }

                    $fileAdder = $mediaItem
                        ->addMedia($source)
                        ->usingName($sanitizedName);

                    if ($isSvg) {
                        $fileAdder->usingFileName($sanitizedName);
                    } elseif (isset($optimizedPath)) {
                        // The source is a temp WebP file — give it a clean name.
                        $fileAdder->usingFileName(pathinfo($sanitizedName, PATHINFO_FILENAME) . '.webp');
                    }

                    $media = $fileAdder->toMediaCollection('images');

                    if ($tempFilePath) {
                        @unlink($tempFilePath);
                        $tempFilePath = null;
                    }

                    $media->user_id = auth()->id();
                    if ($hasStoreColMedia && $storeIdForUpload) {
                        $media->store_id = $storeIdForUpload;
                    }
                    $media->save();

                    $this->updateStorageUsage(auth()->user(), $media->size);

                    try {
                        $this->getMediaUrl($media, 'thumb');
                    } catch (\Exception $e) {
                    }

                    $this->createPWAVersionIfNeeded($media);

                    $uploadedMedia[] = [
                        'id' => $media->id,
                        'name' => $media->name,
                        'file_name' => $media->file_name,
                        'disk' => $media->disk,
                        'mime_type' => $media->mime_type,
                        'size' => $media->size,
                        'url' => $this->getMediaUrl($media),
                        'thumb_url' => $this->getMediaUrl($media, 'thumb'),
                        'model_id' => $media->model_id,
                        'user_id' => $media->user_id,
                        'created_at' => $media->created_at,
                    ];
                } catch (\Exception $e) {
                    if ($tempFilePath) {
                        @unlink($tempFilePath);
                    }
                    if (isset($mediaItem)) {
                        $mediaItem->delete();
                    }
                    $errors[] = [
                        'file' => $file->getClientOriginalName(),
                        'error' => $this->getUserFriendlyError($e, $file->getClientOriginalName())
                    ];
                }
            }
        });

        if (count($uploadedMedia) > 0 && empty($errors)) {
            return response()->json([
                'message' => count($uploadedMedia) . ' file(s) uploaded successfully',
                'data' => $uploadedMedia
            ]);
        } elseif (count($uploadedMedia) > 0 && !empty($errors)) {
            return response()->json([
                'message' => count($uploadedMedia) . ' uploaded, ' . count($errors) . ' failed',
                'data' => $uploadedMedia,
                'errors' => array_column($errors, 'error')
            ]);
        } else {
            return response()->json([
                'message' => 'Upload failed',
                'errors' => array_column($errors, 'error')
            ], 422);
        }
    }

    public function download($id)
    {
        $user = auth()->user();
        $query = Media::where('id', $id);

        if ($user->type !== 'superadmin' && !$user->hasPermissionTo('manage-any-media')) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('media', 'store_id')) {
                try {
                    $storeId = getCurrentStoreId($user);
                    $query->where('store_id', $storeId);
                } catch (\Throwable $e) {
                    $query->where('user_id', $user->id);
                }
            } else {
                $query->where('user_id', $user->id);
            }
        }

        $media = $query->firstOrFail();

        try {
            DynamicStorageService::configureDynamicDisks();
            $disk = $media->disk ?? StorageConfigService::getActiveDisk();
            $path = $media->getPath();

            if ($disk === 'public' || $disk === 'local') {
                if (!file_exists($path)) {
                    abort(404, __('File not found'));
                }
                return response()->download($path, $media->file_name);
            }

            if (!Storage::disk($disk)->exists($media->getPath())) {
                abort(404, __('File not found'));
            }

            $contents = Storage::disk($disk)->get($media->getPath());
            return response($contents, 200, [
                'Content-Type' => $media->mime_type,
                'Content-Disposition' => 'attachment; filename="' . $media->file_name . '"',
            ]);
        } catch (\Exception $e) {
            abort(404, __('File storage unavailable'));
        }
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $query = Media::where('id', $id);

        if ($user->type !== 'superadmin' && !$user->hasPermissionTo('manage-any-media')) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('media', 'store_id')) {
                try {
                    $storeId = getCurrentStoreId($user);
                    $query->where('store_id', $storeId);
                } catch (\Throwable $e) {
                    $query->where('user_id', $user->id);
                }
            } else {
                $query->where('user_id', $user->id);
            }
        }

        $media = $query->firstOrFail();
        $mediaItem = $media->model;

        $fileSize = $media->size;

        try {
            DynamicStorageService::configureDynamicDisks();
            $disk = $media->disk ?? StorageConfigService::getActiveDisk();

            $this->deletePhysicalFile($media, $disk);

            $media->forceDelete();
        } catch (\Exception $e) {
            try {
                $media->forceDelete();
            } catch (\Exception $e2) {
            }
        }

        $this->updateStorageUsage(auth()->user(), -$fileSize);

        if ($mediaItem && $mediaItem->getMedia()->count() === 0) {
            $mediaItem->delete();
        }

        return response()->json(['message' => __('Media deleted successfully')]);
    }

    private function getMediaUrl($media, string $conversion = ''): string
    {
        $url = $conversion ? $media->getUrl($conversion) : $media->getUrl();

        if (($media->disk ?? 'public') === 'public' && \Illuminate\Support\Str::startsWith($url, '/media/')) {
            return '/storage' . $url;
        }

        return $url;
    }

    private function deletePhysicalFile(Media $media, string $disk): void
    {
        $mainPath = $media->getPath();

        if ($disk === 'public' || $disk === 'local') {
            $fullPath = storage_path('app/public/' . $mainPath);
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }

            $conversionsPath = storage_path('app/public/' . $media->getPath('conversions'));
            if (is_dir($conversionsPath)) {
                $files = glob($conversionsPath . '*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        @unlink($file);
                    }
                }
            }

            $responsivePath = storage_path('app/public/' . $media->getPath('responsive-images'));
            if (is_dir($responsivePath)) {
                $files = glob($responsivePath . '*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        @unlink($file);
                    }
                }
            }

            return;
        }

        try {
            if (Storage::disk($disk)->exists($mainPath)) {
                Storage::disk($disk)->delete($mainPath);
            }
        } catch (\Exception $e) {
        }
    }

    private function sanitizeFilename(string $filename): string
    {
        $baseName = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        if (empty($baseName)) {
            $baseName = 'file';
        }

        $safeName = \Illuminate\Support\Str::slug($baseName, '_');

        if (empty($safeName)) {
            $safeName = 'file_' . time();
        }

        return $extension ? $safeName . '.' . $extension : $safeName;
    }

    /**
     * Downscale a raster upload and re-encode it as WebP so originals stay
     * small when served on the storefront. Returns a temp file path (caller
     * must clean it up) or null to store the uploaded file unchanged.
     */
    private function optimizePhoto(string $sourcePath, string $originalName, array $allowedTypes): ?string
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // Only optimize raster images. Keep GIF/SVG (animation/interactivity)
        // and non-image uploads (PDF/ZIP/etc.) exactly as provided.
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'bmp'])) {
            return null;
        }

        // Never store a format the tenant's allowed list forbids.
        if (!in_array('webp', $allowedTypes)) {
            return null;
        }

        $info = @getimagesize($sourcePath);
        if (!$info || $info[0] < 1 || $info[1] < 1) {
            return null;
        }

        $width = $info[0];
        $height = $info[1];
        $type = $info[2];

        $source = null;
        switch ($type) {
            case IMAGETYPE_JPEG:
                $source = @imagecreatefromjpeg($sourcePath);
                break;
            case IMAGETYPE_PNG:
                $source = @imagecreatefrompng($sourcePath);
                break;
            case IMAGETYPE_WEBP:
                $source = @imagecreatefromwebp($sourcePath);
                break;
            default:
                return null;
        }

        if (!$source) {
            return null;
        }

        // Correct EXIF orientation from phone cameras before downscaling so
        // width/height are measured on the upright image.
        $orientation = 1;
        if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($sourcePath);
            $orientation = (int) ($exif['Orientation'] ?? 1);
        }

        if ($orientation !== 1 && in_array($orientation, [3, 6, 8], true)) {
            $rotation = [3 => 180, 6 => -90, 8 => 90][$orientation];
            $rotated = imagerotate($source, $rotation, 0);
            if ($rotated) {
                imagedestroy($source);
                $source = $rotated;
            }
        }

        $width = imagesx($source);
        $height = imagesy($source);

        // Max target dimension — lowered from 1280 to 900 to halve bytes for storefront heroes,
        // grid cards use the 300-400 thumb/small conversions instead.
        $maxDim = 900;
        $scale = min(1.0, $maxDim / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve alpha for PNG/WebP sources.
        if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefill($target, 0, 0, $transparent);
        }

        imagecopyresampled($target, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $tempPath = tempnam(sys_get_temp_dir(), 'med_opt_') . '.webp';
        $saved = imagewebp($target, $tempPath, 78);

        imagedestroy($source);
        imagedestroy($target);

        if (!$saved || !is_file($tempPath)) {
            @unlink($tempPath);
            return null;
        }

        // Never return a "optimized" file that's bigger than the input.
        if (filesize($tempPath) >= filesize($sourcePath)) {
            @unlink($tempPath);
            return null;
        }

        return $tempPath;
    }

    /**
     * Strip executable content from uploaded SVG files so they cannot run
     * scripts when served inline from the storage disk.
     */
    private function sanitizeSvgContent(string $content): string
    {
        if ($content === '') {
            return $content;
        }

        // Remove entire <script> blocks
        $content = preg_replace('/<script\b[^>]*>.*?<\/script\s*>/is', '', $content);

        // Remove unsafe embedded/executable elements
        $content = preg_replace('/<\s*(iframe|object|embed|foreignObject|animate|animateTransform|set|handler)\b[^>]*>.*?<\s*\/\s*(iframe|object|embed|foreignObject|animate|animateTransform|set|handler)\s*>/is', '', $content);

        // Remove leftover event handler attributes
        $content = preg_replace('/\s+on\w+\s*=\s*"[^"]*"/i', '', $content);
        $content = preg_replace("/\s+on\w+\s*=\s*'[^']*'/i", '', $content);

        // Drop javascript:, vbscript: and data: URLs in link/src attributes
        $content = preg_replace('/(\s(?:href|xlink:href|src)\s*=\s*["\'])\s*(?:javascript|vbscript|data)\s*:/i', '$1removed:', $content);

        // Remove processing instructions that can pull external resources
        $content = preg_replace('/<\?xml-stylesheet\b[^>]*\?>/i', '', $content);

        return $content;
    }

    private function getUserFriendlyError(\Exception $e, $fileName): string
    {
        $message = $e->getMessage();
        $extension = strtoupper(pathinfo($fileName, PATHINFO_EXTENSION));

        \Log::error('Media upload failed', [
            'file' => $fileName,
            'exception_class' => get_class($e),
            'message' => $message,
        ]);

        if (str_contains($message, 'not accepted') || str_contains($message, 'acceptsFile')) {
            if (str_contains($message, 'mime') || str_contains($message, 'MIME')) {
                return __('File type not allowed: :type', ['type' => $extension]);
            }
            return __('File format not supported: :type', ['type' => $extension]);
        }

        if (str_contains($message, 'storage') || str_contains($message, 'disk')) {
            return __('Storage error: :type', ['type' => $extension]);
        }

        if (str_contains($message, 'size') || str_contains($message, 'large') || str_contains($message, 'exceed')) {
            return __('File too large: :type', ['type' => $extension]);
        }

        if (str_contains($message, 'permission') || str_contains($message, 'denied') || str_contains($message, 'Forbidden')) {
            return __('Permission denied: :type', ['type' => $extension]);
        }

        if (str_contains($message, 'Could not') || str_contains($message, 'failed to')) {
            return __('Upload error: :detail', ['detail' => $message]);
        }

        return __('Upload failed: :type — :reason', ['type' => $extension, 'reason' => $message]);
    }

    private function checkStorageLimit($files)
    {
        $user = auth()->user();
        if ($user->type === 'superadmin') return null;

        $limit = $this->getUserStorageLimit($user);
        if (!$limit) return null;

        $uploadSize = collect($files)->sum(fn($f) => $f instanceof \Illuminate\Http\UploadedFile ? $f->getSize() : ($f['size'] ?? 0));
        $currentUsage = $this->getUserStorageUsage($user);

        if (($currentUsage + $uploadSize) > $limit) {
            return response()->json([
                'message' => __('Storage limit exceeded'),
                'errors' => [__('Please delete files or upgrade plan')]
            ], 422);
        }

        return null;
    }

    private function getUserStorageLimit($user)
    {
        if ($user->type === 'company' && $user->plan) {
            return (float) $user->plan->storage_limit * 1024 * 1024 * 1024;
        }

        if ($user->created_by) {
            $company = User::find($user->created_by);
            if ($company && $company->plan) {
                return (float) $company->plan->storage_limit * 1024 * 1024 * 1024;
            }
        }

        return null;
    }

    /**
     * P0: storage usage derived from real persisted media (store_id scoped, company-aggregated)
     * NOT from a misnamed counter. Falls back to storage_used column for legacy rows.
     */
    private function getUserStorageUsage($user): int
    {
        try {
            $company = null;
            if ($user->type === 'company') $company = $user;
            elseif ($user->created_by) $company = User::find($user->created_by);
            if (!$company) return (int) ($user->storage_used ?? 0);

            $storeIds = \App\Models\Store::where('user_id', $company->id)->pluck('id');
            $mediaSum = 0;
            if ($storeIds->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasColumn('media', 'store_id')) {
                $mediaSum = \Spatie\MediaLibrary\MediaCollections\Models\Media::whereIn('store_id', $storeIds)->sum('size');
                // Include legacy media without store_id (null) that belongs to this company's users
                $companyUserIds = User::where('created_by', $company->id)->orWhere('id', $company->id)->pluck('id');
                $legacySum = \Spatie\MediaLibrary\MediaCollections\Models\Media::whereNull('store_id')->whereIn('user_id', $companyUserIds)->sum('size');
                $mediaSum += $legacySum;
            } else {
                // Fallback: sum storage_used column
                $mediaSum = User::where('created_by', $company->id)->orWhere('id', $company->id)->sum('storage_used');
                // If still 0 but old counter has data, fallback to old misnamed column for transition period
                if ($mediaSum == 0) {
                    $mediaSum = User::where('created_by', $company->id)->orWhere('id', $company->id)->sum('storage_limit');
                }
            }
            return (int) $mediaSum;
        } catch (\Throwable $e) {
            return (int) ($user->storage_used ?? $user->storage_limit ?? 0);
        }
    }

    private function updateStorageUsage($user, $size)
    {
        // P0: atomic increment on dedicated storage_used column (additive, production-safe)
        // Keep legacy storage_limit in sync for transition period but primary is storage_used.
        try {
            if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'storage_used')) {
                // Use atomic DB increment with company-scope locking to prevent concurrent bypass
                $company = $user->type === 'company' ? $user : User::find($user->created_by);
                $target = $company ?? $user;
                // Lock company row for quota serialization (prevents TOCTOU)
                \Illuminate\Support\Facades\DB::transaction(function () use ($target, $size) {
                    \Illuminate\Support\Facades\DB::table('users')->where('id', $target->id)->lockForUpdate()->first();
                    \Illuminate\Support\Facades\DB::table('users')->where('id', $target->id)->increment('storage_used', $size);
                });
                // Keep legacy column in sync (do not let negative underflow)
                try { $target->increment('storage_limit', $size); } catch (\Throwable $e) {}
            } else {
                $user->increment('storage_limit', $size);
            }
        } catch (\Throwable $e) {
            try { $user->increment('storage_used', $size); } catch (\Throwable $e2) { $user->increment('storage_limit', $size); }
        }
    }

    private function createPWAVersionIfNeeded($media)
    {
        try {
            $filePath = $media->getPath();
            $disk = $media->disk ?? StorageConfigService::getActiveDisk();

            $localPath = $filePath;
            if (!($disk === 'public' || $disk === 'local') || !file_exists($filePath)) {
                return;
            }

            $imageInfo = getimagesize($localPath);

            if (!$imageInfo || $imageInfo[0] < 192 || $imageInfo[1] < 192) {
                return;
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $type = $imageInfo[2];

            switch ($type) {
                case IMAGETYPE_JPEG:
                    $source = imagecreatefromjpeg($localPath);
                    break;
                case IMAGETYPE_PNG:
                    $source = imagecreatefrompng($localPath);
                    break;
                case IMAGETYPE_WEBP:
                    $source = imagecreatefromwebp($localPath);
                    break;
                default:
                    return;
            }

            if (!$source) return;

            $resized = imagecreatetruecolor(512, 512);

            if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
                imagefill($resized, 0, 0, $transparent);
            }

            $cropSize = min($width, $height);
            $cropX = ($width - $cropSize) / 2;
            $cropY = ($height - $cropSize) / 2;

            imagecopyresampled($resized, $source, 0, 0, $cropX, $cropY, 512, 512, $cropSize, $cropSize);

            $pathInfo = pathinfo($media->file_name);
            $pwaFileName = $pathInfo['filename'] . '_pwa.png';
            $pwaPath = dirname($localPath) . '/' . $pwaFileName;

            @imagepng($resized, $pwaPath, 9);

            imagedestroy($source);
            imagedestroy($resized);

        } catch (\Exception $e) {
        }
    }
}
