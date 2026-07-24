<?php

namespace App\Http\Controllers;

use App\Models\MediaItem;
use App\Models\User;
use App\Services\StorageConfigService;
use App\Services\DynamicStorageService;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
class MediaController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        // Ensure storage is configured before loading media
        \App\Services\DynamicStorageService::configureDynamicDisks();
        
        $mediaItems = MediaItem::with('media')->latest()->get();
        
        $media = $mediaItems->flatMap(function ($item) use ($user) {
            $mediaQuery = $item->getMedia('images');
            
            // SuperAdmin can see all media
            if ($user->type === 'superadmin') {
                // No user_id filter for superadmin
            }
            // Users with manage-any-media can see all media
            elseif ($user->hasPermissionTo('manage-any-media')) {
                // No user_id filter for manage-any-media
            }
            // Others can only see their own media
            else {
                $mediaQuery = $mediaQuery->where('user_id', $user->id);
            }
            
            return $mediaQuery->map(function ($media) {
                try {
                    $originalUrl = $this->getFullUrl($media->getUrl());
                    $thumbUrl = $originalUrl;
                    
                    try {
                        $thumbUrl = $this->getFullUrl($media->getUrl('thumb'));
                    } catch (\Exception $e) {
                        // If thumb conversion fails, use original
                    }
                    
                    return [
                        'id' => $media->id,
                        'name' => $media->name,
                        'file_name' => $media->file_name,
                        'url' => $media->getUrl(), // Return relative path
                        'thumb_url' => $thumbUrl,
                        'size' => $media->size,
                        'mime_type' => $media->mime_type,
                        'user_id' => $media->user_id,
                        'created_at' => $media->created_at,
                    ];
                } catch (\Exception $e) {
                    // Skip media files with unavailable storage disks
                    return null;
                }
            })->filter(); // Remove null entries
        });

        return response()->json($media);
    }

    private function getFullUrl($url)
    {
        if (str_starts_with($url, 'http')) {
            return $url;
        }
        
        // Get the base URL from the APP_URL environment variable
        $baseUrl = rtrim(config('app.url'), '/');
        
        // Make sure the URL starts with a slash
        if (!str_starts_with($url, '/')) {
            $url = '/' . $url;
        }
        
        return $baseUrl . $url;
    }

    private function getUserFriendlyError(\Exception $e, $fileName): string
    {
        $message = $e->getMessage();
        $extension = strtoupper(pathinfo($fileName, PATHINFO_EXTENSION));
        
        // Handle media library collection errors
        if (str_contains($message, 'was not accepted into the collection')) {
            if (str_contains($message, 'mime:')) {
                return "File type not allowed : {$extension}";
            }
            return "File format not supported : {$extension}";
        }
        
        // Handle storage errors
        if (str_contains($message, 'storage') || str_contains($message, 'disk')) {
            return "Storage error : {$extension}";
        }
        
        // Handle file size errors
        if (str_contains($message, 'size') || str_contains($message, 'large')) {
            return "File too large : {$extension}";
        }
        
        // Handle permission errors
        if (str_contains($message, 'permission') || str_contains($message, 'denied')) {
            return "Permission denied : {$extension}";
        }
        
        // Generic fallback
        return "Upload failed : {$extension}";
    }

    public function batchStore(Request $request)
    {
        // Ensure storage is configured before upload
        \App\Services\DynamicStorageService::configureDynamicDisks();
        
        // Validate that files are present
        if (!$request->hasFile('files') || !is_array($request->file('files'))) {
            return response()->json([
                'message' => __('No files provided'),
                'errors' => [__('Please select files to upload')]
            ], 422);
        }
        
        // Check storage limits
        $storageCheck = $this->checkStorageLimit($request->file('files'));
        if ($storageCheck) {
            return $storageCheck;
        }
        
        // Get fresh configuration from service (handles fallback to SuperAdmin)
        $config = StorageConfigService::getStorageConfig();
        
        // Get all allowed file types from config
        $allowedTypes = array_map('trim', explode(',', strtolower($config['allowed_file_types'])));
        
        // Custom validation with user-friendly messages
        $validator = \Validator::make($request->all(), [
            'files' => 'required|array|min:1',
            'files.*' => [
                'required',
                'file',
                'mimes:' . implode(',', $allowedTypes),
                'max:' . min($config['max_file_size_kb'], 10240) // Cap at 10MB for safety
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
        
        try {

        $uploadedMedia = [];
        $errors = [];
        
        foreach ($request->file('files') as $file) {
            try {
                $mediaItem = MediaItem::create([
                    'name' => $file->getClientOriginalName(),
                ]);

                $media = $mediaItem->addMedia($file)
                    ->toMediaCollection('images');
                
                $media->user_id = auth()->id();
                $media->save();
                
                // Update user storage usage
                $this->updateStorageUsage(auth()->user(), $media->size);

                // Force thumbnail generation
                try {
                    $media->getUrl('thumb');
                } catch (\Exception $e) {
                    // Thumbnail generation failed, but continue
                }
                
                // Auto-resize for PWA if image is large
                $this->createPWAVersionIfNeeded($media);

                $originalUrl = $this->getFullUrl($media->getUrl());
                $thumbUrl = $originalUrl; // Default to original
                
                try {
                    $thumbUrl = $this->getFullUrl($media->getUrl('thumb'));
                } catch (\Exception $e) {
                    // If thumb conversion fails, use original
                }
                
                $uploadedMedia[] = [
                    'id' => $media->id,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'url' => $media->getUrl(), // Return relative path
                    'thumb_url' => $thumbUrl,
                    'size' => $media->size,
                    'mime_type' => $media->mime_type,
                    'user_id' => $media->user_id,
                    'created_at' => $media->created_at,
                ];
            } catch (\Exception $e) {
                if (isset($mediaItem)) {
                    $mediaItem->delete();
                }
                $errors[] = [
                    'file' => $file->getClientOriginalName(),
                    'error' => $this->getUserFriendlyError($e, $file->getClientOriginalName())
                ];
            }
        }
        
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
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Upload failed due to server error',
                'errors' => ['server_error']
            ], 500);
        }
    }

    public function download($id)
    {
        $user = auth()->user();
        $query = Media::where('id', $id);
        
        // SuperAdmin and users with manage-any-media can download any media
        if ($user->type !== 'superadmin' && !$user->hasPermissionTo('manage-any-media')) {
            $query->where('user_id', $user->id);
        }
        
        $media = $query->firstOrFail();
        
        try {
            $filePath = $media->getPath();
            
            if (!file_exists($filePath)) {
                abort(404, __('File not found'));
            }
            
            return response()->download($filePath, $media->file_name);
        } catch (\Exception $e) {
            abort(404, __('File storage unavailable'));
        }
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $query = Media::where('id', $id);
        
        // SuperAdmin and users with manage-any-media can delete any media
        if ($user->type !== 'superadmin' && !$user->hasPermissionTo('manage-any-media')) {
            $query->where('user_id', $user->id);
        }
        
        $media = $query->firstOrFail();
        $mediaItem = $media->model;
        
        $fileSize = $media->size;
        
        try {
            $media->delete();
        } catch (\Exception $e) {
            // If storage disk is unavailable, force delete from database
            $media->forceDelete();
        }
        
        // Update user storage usage
        $this->updateStorageUsage(auth()->user(), -$fileSize);
        
        // Delete the MediaItem if it has no more media files
        if ($mediaItem && $mediaItem->getMedia()->count() === 0) {
            $mediaItem->delete();
        }

        return response()->json(['message' => __('Media deleted successfully')]);
    }
    
    private function checkStorageLimit($files)
    {
        $user = auth()->user();
        if ($user->type === 'superadmin') return null;
        
        $limit = $this->getUserStorageLimit($user);
        if (!$limit) return null;
        
        $uploadSize = collect($files)->sum('size');
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
            return $user->plan->storage_limit * 1024 * 1024 * 1024;
        }
        
        if ($user->created_by) {
            $company = User::find($user->created_by);
            if ($company && $company->plan) {
                return $company->plan->storage_limit * 1024 * 1024 * 1024;
            }
        }
        
        return null;
    }
    
    private function getUserStorageUsage($user)
    {
        if ($user->type === 'company') {
            return User::where('created_by', $user->id)
                ->orWhere('id', $user->id)
                ->sum('storage_limit');
        }
        
        if ($user->created_by) {
            $company = User::find($user->created_by);
            if ($company) {
                return User::where('created_by', $company->id)
                    ->orWhere('id', $company->id)
                    ->sum('storage_limit');
            }
        }
        
        return $user->storage_limit;
    }
    
    private function updateStorageUsage($user, $size)
    {
        $user->increment('storage_limit', $size);
    }
    
    /**
     * Create PWA-optimized version if image is suitable
     */
    private function createPWAVersionIfNeeded($media)
    {
        try {
            $filePath = $media->getPath();
            $imageInfo = getimagesize($filePath);
            
            if (!$imageInfo || $imageInfo[0] < 192 || $imageInfo[1] < 192) {
                return; // Too small for PWA
            }
            
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $type = $imageInfo[2];
            
            // Create image resource
            switch ($type) {
                case IMAGETYPE_JPEG:
                    $source = imagecreatefromjpeg($filePath);
                    break;
                case IMAGETYPE_PNG:
                    $source = imagecreatefrompng($filePath);
                    break;
                default:
                    return;
            }
            
            if (!$source) return;
            
            // Create 512x512 square version
            $resized = imagecreatetruecolor(512, 512);
            
            // Preserve transparency for PNG
            if ($type === IMAGETYPE_PNG) {
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
                imagefill($resized, 0, 0, $transparent);
            }
            
            // Calculate crop for square
            $cropSize = min($width, $height);
            $cropX = ($width - $cropSize) / 2;
            $cropY = ($height - $cropSize) / 2;
            
            // Resize with center crop
            imagecopyresampled($resized, $source, 0, 0, $cropX, $cropY, 512, 512, $cropSize, $cropSize);
            
            // Save PWA version
            $pathInfo = pathinfo($media->file_name);
            $pwaFileName = $pathInfo['filename'] . '_pwa.png';
            $pwaPath = dirname($filePath) . '/' . $pwaFileName;
            
            imagepng($resized, $pwaPath, 9);
            
            // Clean up
            imagedestroy($source);
            imagedestroy($resized);
            
        } catch (\Exception $e) {
            // Silently fail
        }
    }
}