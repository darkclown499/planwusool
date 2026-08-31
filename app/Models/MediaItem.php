<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use App\Services\StorageConfigService;

class MediaItem extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected $fillable = ['name', 'description'];

    public function registerMediaCollections(): void
    {
        \App\Services\DynamicStorageService::configureDynamicDisks();

        $config = StorageConfigService::getStorageConfig();
        $allowedExtensions = array_map('trim', explode(',', strtolower($config['allowed_file_types'])));
        // Always accept the media formats the designer/storefront explicitly supports
        // for videos (served directly) and audio, even if a tenant's allowed_file_types
        // setting omits them. This mirrors MediaController so a tenant with only
        // image/document types can still upload the videos the designer offers.
        foreach (['mp4', 'webm', 'mp3'] as $alwaysType) {
            if (!in_array($alwaysType, $allowedExtensions, true)) {
                $allowedExtensions[] = $alwaysType;
            }
        }
        $allowedExtensions = array_values(array_unique(array_filter($allowedExtensions, fn($t) => $t !== '')));
        // Allow up to 50MB per file (videos are served directly, not downscaled).
        $maxSizeBytes = 50 * 1024 * 1024;

        $this->addMediaCollection('images')
            ->acceptsFile(function ($file) use ($allowedExtensions, $maxSizeBytes) {
                $fileName = $file->name ?? $file->getFilename();
                $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

                if (!in_array($extension, $allowedExtensions)) {
                    return false;
                }

                $fileSize = $file->size ?? @filesize($file->getPathname());
                if ($fileSize !== false && $fileSize > $maxSizeBytes) {
                    return false;
                }

                return true;
            })
            ->useDisk(StorageConfigService::getActiveDisk());
    }

    public function registerMediaConversions(Media $media = null): void
    {
        \App\Services\DynamicStorageService::configureDynamicDisks();

        // thumb 300x300 - used for tiny previews, remains non-queued
        $this->addMediaConversion('thumb')
            ->width(300)
            ->height(300)
            ->sharpen(10)
            ->format('webp')
            ->performOnCollections('images')
            ->nonQueued();

        // small 400 - ideal for product grid cards (200-300px displayed)
        $this->addMediaConversion('small')
            ->width(400)
            ->height(400)
            ->sharpen(8)
            ->format('webp')
            ->performOnCollections('images')
            ->nonQueued();

        // medium 800 - hero / detail / banner (400-800px displayed)
        $this->addMediaConversion('medium')
            ->width(800)
            ->height(800)
            ->sharpen(5)
            ->format('webp')
            ->performOnCollections('images')
            ->nonQueued();
    }
}
